<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service\Css;

/**
 * Builds the data structures needed to render CSS blocks.
 *
 * Responsibilities:
 * - Flatten sections/settings config into a field lookup map
 * - Group field values into per-selector CSS line arrays (selector blocks)
 * - Collect palette CSS variables that must be emitted in :root
 */
class CssVariableBuilder
{
    public function __construct(
        private CssValueFormatter $formatter
    ) {}

    /**
     * Build a flat field lookup map from the sections config.
     *
     * Returns [ 'sectionId.settingId' => fieldConfig ] where each entry
     * has an additional '_selector' key with the resolved CSS selector:
     * - Setting-level 'selector' takes priority over section-level 'selector'
     * - Falls back to ':root' when neither is set
     * - Array selectors are joined with ', '
     *
     * @param array $sections
     * @return array
     */
    public function buildFieldMap(array $sections): array
    {
        $fieldMap = [];
        foreach ($sections as $section) {
            $sectionSelector = $section['selector'] ?? null;
            foreach ($section['settings'] ?? [] as $setting) {
                $key = $section['id'] . '.' . $setting['id'];
                $rawSelector = $setting['selector'] ?? $sectionSelector ?? ':root';
                $setting['_selector'] = is_array($rawSelector)
                    ? implode(', ', $rawSelector)
                    : $rawSelector;
                $fieldMap[$key] = $setting;
            }
        }
        return $fieldMap;
    }

    /**
     * Group CSS variable lines by their target selector.
     *
     * Skips:
     * - Null / empty values
     * - Palette section entries (section_code === '_palette')
     * - Values equal to their field default
     * - Fields without a 'property' or legacy 'css_var' key
     *
     * Returns [ selector => [ 'line1', 'line2', ... ], ... ]
     *
     * @param array $values  Rows from the DB (section_code / setting_code / value)
     * @param array $fieldMap  Built by buildFieldMap()
     * @return array
     */
    public function buildSelectorBlocks(array $values, array $fieldMap): array
    {
        $blocks = [];

        foreach ($values as $value) {
            $sectionCode = $value['section_code'];
            $settingCode = $value['setting_code'];
            $rawValue    = $value['value'] ?? null;

            if ($rawValue === null || $rawValue === '' || $sectionCode === '_palette') {
                continue;
            }

            $key   = $sectionCode . '.' . $settingCode;
            $field = $fieldMap[$key] ?? null;
            if (!$field) {
                continue;
            }

            $default = $field['default'] ?? null;
            if ($default !== null && $this->valuesAreEqual($rawValue, $default)) {
                continue;
            }

            // Support both 'property' (new) and legacy 'css_var'
            $property = $field['property'] ?? $field['css_var'] ?? null;
            if (!$property) {
                continue;
            }

            $formattedValue = $this->formatter->formatValue($rawValue, $field);
            $comment        = $this->formatter->getComment($rawValue, $field['type'] ?? null);
            $important      = $field['important'] ?? false;

            $line = "    $property: $formattedValue" . ($important ? ' !important' : '') . ";";
            if ($comment) {
                $line .= "  /* $comment */";
            }
            $line .= "\n";

            $selector = $field['_selector'] ?? ':root';
            $blocks[$selector][] = $line;
        }

        return $blocks;
    }

    /**
     * Build the ordered map of palette CSS variables that must be emitted.
     *
     * Palette variables need to be emitted in two cases:
     *   1. Explicitly saved in DB (section_code === '_palette')
     *   2. Referenced by a color field value (e.g. '--color-brand-amber-dark')
     *      but absent from DB — falls back to the config default
     *
     * Both HEX and -rgb variants must be emitted because Breeze base CSS defines
     * only the HEX form; the -rgb form would otherwise be undefined.
     *
     * @param array $values   DB rows (section_code / setting_code / value)
     * @param array $config   Full theme configuration (with 'palettes' key)
     * @param array $fieldMap Built by buildFieldMap()
     * @return array<string, string>  cssVar => rawHexValue
     */
    public function buildPaletteVarsToEmit(array $values, array $config, array $fieldMap): array
    {
        // Step 1: collect palette vars explicitly saved in DB
        $paletteVarsToEmit = [];
        foreach ($values as $value) {
            if (($value['section_code'] ?? '') !== '_palette') {
                continue;
            }
            $cssVar   = $value['setting_code'] ?? '';
            $rawValue = $value['value'] ?? null;
            if ($cssVar && $rawValue !== null && $rawValue !== '') {
                $paletteVarsToEmit[$cssVar] = $rawValue;
            }
        }

        // Step 2: for every color field referencing a palette var, ensure that var
        // is emitted even when not in the DB (use config default as fallback).
        // Only color-type fields are considered; font-role refs (--primary-font etc.)
        // also start with '--' but must not be fed to processPaletteColor().
        $paletteDefaults = $this->extractPaletteDefaults($config);
        foreach ($values as $value) {
            if (($value['section_code'] ?? '') === '_palette') {
                continue;
            }
            $rawValue = $value['value'] ?? null;
            if ($rawValue === null || !str_starts_with($rawValue, '--')) {
                continue;
            }
            $key       = ($value['section_code'] ?? '') . '.' . ($value['setting_code'] ?? '');
            $fieldType = strtolower($fieldMap[$key]['type'] ?? '');
            if ($fieldType !== 'color') {
                continue;
            }
            $cssVar = $rawValue;
            if (isset($paletteVarsToEmit[$cssVar])) {
                continue;
            }
            if (isset($paletteDefaults[$cssVar])) {
                $paletteVarsToEmit[$cssVar] = $paletteDefaults[$cssVar];
            }
        }

        return $paletteVarsToEmit;
    }

    /**
     * Extract palette default values from config.
     *
     * @param array $config Configuration array with 'palettes' key
     * @return array<string, string>  cssVar => defaultHex
     */
    private function extractPaletteDefaults(array $config): array
    {
        $defaults = [];
        foreach ($config['palettes'] ?? [] as $palette) {
            foreach ($palette['groups'] ?? [] as $group) {
                foreach ($group['colors'] ?? [] as $color) {
                    $cssVar  = $color['property'] ?? $color['css_var'] ?? null;
                    $default = $color['default'] ?? null;
                    if ($cssVar && $default) {
                        $defaults[$cssVar] = $default;
                    }
                }
            }
        }
        return $defaults;
    }

    /**
     * Compare two values for equality, normalizing types and RGB wrapper formats.
     *
     * @param mixed $value1
     * @param mixed $value2
     * @return bool
     */
    public function valuesAreEqual($value1, $value2): bool
    {
        return $this->normalizeValue($value1) === $this->normalizeValue($value2);
    }

    /**
     * Normalize a value to a canonical string for comparison.
     *
     * - Booleans → '0' / '1'
     * - Numerics → string cast
     * - "rgb(r, g, b)" / "rgba(r,g,b,a)" → strips wrapper, trims
     *
     * @param mixed $value
     * @return string
     */
    public function normalizeValue($value): string
    {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_numeric($value)) {
            return (string)$value;
        }

        $stringValue = trim((string)$value);

        if (preg_match('/^rgba?\((.+)\)$/i', $stringValue, $matches)) {
            return trim($matches[1]);
        }

        return $stringValue;
    }
}
