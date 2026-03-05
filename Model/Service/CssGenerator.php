<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;

/**
 * Generate CSS from saved theme values
 */
class CssGenerator
{
    public function __construct(
        private ValueService $valueService,
        private StatusProvider $statusProvider,
        private ConfigProvider $configProvider,
        private ColorFormatResolver $colorFormatResolver
    ) {}

    /**
     * Generate CSS variables from saved values
     *
     * @param int $themeId
     * @param int $storeId
     * @param string $status 'PUBLISHED' or 'DRAFT'
     * @return string CSS code with :root { ... }
     */
    public function generate(int $themeId, int $storeId, string $status = 'PUBLISHED'): string
    {
        $statusId = $this->statusProvider->getStatusId($status);
        $values = $this->valueService->getValuesByTheme($themeId, $storeId, $statusId, null);

        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $fieldMap = $this->buildFieldMap($config['sections'] ?? []);

        $paletteVarsToEmit = $this->buildPaletteVarsToEmit($values, $config);
        $selectorBlocks = empty($values) ? [] : $this->buildSelectorBlocks($values, $fieldMap);
        $fontImports = $this->buildFontImports($values, $fieldMap);

        return $this->renderCss($paletteVarsToEmit, $selectorBlocks, $fontImports);
    }

    /**
     * Generate CSS from values map (for publications)
     *
     * @param int $themeId
     * @param array $valuesMap Map of 'section.setting' => 'value'
     * @return string
     */
    public function generateFromValuesMap(int $themeId, array $valuesMap): string
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $fieldMap = $this->buildFieldMap($config['sections'] ?? []);

        // Convert valuesMap to the same row format used by generate()
        $values = [];
        foreach ($valuesMap as $key => $value) {
            $parts = explode('.', $key, 2);
            if (count($parts) === 2) {
                $values[] = [
                    'section_code' => $parts[0],
                    'setting_code' => $parts[1],
                    'value' => $value
                ];
            }
        }

        $paletteVarsToEmit = $this->buildPaletteVarsToEmit($values, $config);
        $selectorBlocks = empty($values) ? [] : $this->buildSelectorBlocks($values, $fieldMap);
        $fontImports = $this->buildFontImports($values, $fieldMap);

        return $this->renderCss($paletteVarsToEmit, $selectorBlocks, $fontImports);
    }

    /**
     * Build field lookup map: 'section.setting' => field config with resolved selector.
     *
     * The '_selector' key holds the resolved CSS selector for the field:
     *   - setting-level 'selector' takes priority over section-level 'selector'
     *   - falls back to ':root' when neither is set
     *
     * @param array $sections
     * @return array
     */
    private function buildFieldMap(array $sections): array
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
     * Group CSS lines by their target selector.
     *
     * Supports both 'property' (new) and legacy 'css_var' field names.
     * Returns [ selector => [ 'line1', 'line2', ... ], ... ]
     *
     * @param array $values
     * @param array $fieldMap
     * @return array
     */
    private function buildSelectorBlocks(array $values, array $fieldMap): array
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

            $formattedValue = $this->formatValue($rawValue, $field);
            $comment        = $this->getComment($rawValue, $field['type'] ?? null);
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
     * Render final CSS string from palette vars and per-selector blocks.
     *
     * :root is always emitted first (palette vars + root-scoped fields),
     * followed by any additional selector blocks in insertion order.
     * @import rules for web fonts are prepended before :root when present.
     *
     * @param array $paletteVarsToEmit  cssVar => rawHexValue
     * @param array $selectorBlocks     selector => [lines]
     * @param array $fontImports        List of stylesheet URLs to @import
     * @return string
     */
    private function renderCss(array $paletteVarsToEmit, array $selectorBlocks, array $fontImports = []): string
    {
        $rootLines = [];

        if (!empty($paletteVarsToEmit)) {
            foreach ($paletteVarsToEmit as $cssVar => $rawValue) {
                $rootLines[] = $this->processPaletteColor($cssVar, $rawValue);
            }
            $rootLines[] = "\n";
        }

        foreach ($selectorBlocks[':root'] ?? [] as $line) {
            $rootLines[] = $line;
        }

        $css = '';

        foreach ($fontImports as $url) {
            $css .= "@import url('" . addslashes($url) . "');\n";
        }
        if (!empty($fontImports)) {
            $css .= "\n";
        }

        $css .= ":root {\n" . implode('', $rootLines) . "}\n";

        foreach ($selectorBlocks as $selector => $lines) {
            if ($selector === ':root') {
                continue;
            }
            $css .= "$selector {\n" . implode('', $lines) . "}\n";
        }

        return $css;
    }

    /**
     * Format value based on field type and configuration
     * @param mixed $value
     * @param array|null $field Field configuration (including type, format, default, etc.)
     * @return string
     */
    private function formatValue($value, ?array $field): string
    {
        if (!$field || !isset($field['type'])) {
            return $this->escapeValue((string)$value);
        }

        $fieldType = strtolower($field['type']);

        return match ($fieldType) {
            'color' => $this->formatColor(
                $value,
                $this->colorFormatResolver->resolve(
                    $field['format'] ?? null,
                    $field['default'] ?? null
                ),
                $field['default'] ?? null
            ),
            'font_picker' => $this->formatFont($value),
            'toggle', 'checkbox' => ($value === true || $value === '1' || $value === 1) ? '1' : '0',
            'number', 'range' => (string)$value, // Numbers don't need escaping
            'textarea', 'text', 'code' => $this->escapeValue((string)$value),
            'image_upload' => $this->escapeValue((string)$value), // URL or data URL
            'spacing' => $this->formatSpacing($value),
            'repeater' => $this->formatRepeater($value),
            default => $this->escapeValue((string)$value)
        };
    }

    /**
     * Escapes certain characters within the given string to prevent unintended behavior.
     *
     * @param string $value The input string to be escaped.
     * @return string The escaped string where specific characters are replaced.
     */
    private function escapeValue(string $value): string
    {
        return str_replace(['/*', '*/'], ['/ *', '* /'], $value);
    }

    /**
     * Compare two values for equality, normalizing types
     * @param mixed $value1
     * @param mixed $value2
     * @return bool
     */
    private function valuesAreEqual($value1, $value2): bool
    {
        // Normalize types
        $v1 = $this->normalizeValue($value1);
        $v2 = $this->normalizeValue($value2);

        return $v1 === $v2;
    }

    /**
     * Normalize value for comparison
     * @param mixed $value
     * @return string
     */
    private function normalizeValue($value): string
    {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_numeric($value)) {
            return (string)$value;
        }

        $stringValue = trim((string)$value);
        
        // Normalize RGB formats for comparison
        // "rgb(255, 0, 0)" → "255, 0, 0"
        // "rgba(255, 0, 0, 0.5)" → "255, 0, 0, 0.5"
        if (preg_match('/^rgba?\((.+)\)$/i', $stringValue, $matches)) {
            return trim($matches[1]);
        }

        return $stringValue;
    }

    /**
     * Get comment for CSS variable
     * @param mixed $value
     * @param string|null $fieldType
     * @return string|null
     */
    private function getComment($value, ?string $fieldType): ?string
    {
        if (!$fieldType) {
            return null;
        }

        $fieldType = strtolower($fieldType);

        return match ($fieldType) {
            'color' => str_starts_with((string)$value, '#') ? (string)$value : null,
            'spacing' => 'JSON: ' . (is_string($value) ? $value : json_encode($value)),
            default => null
        };
    }

    /**
     * Format color value with configurable output format
     * 
     * NOTE: $format parameter should be resolved via ColorFormatResolver::resolve()
     * before calling this method to ensure proper format detection from field config.
     * 
     * Format options:
     * - 'hex': Output HEX format (Breeze 3.0) → #ffffff
     * - 'rgb': Output RGB format (Breeze 2.0) → 255, 255, 255
     * 
     * Supports:
     * - Palette references with format:
     *   • format='hex': --color-brand-primary → var(--color-brand-primary)
     *   • format='rgb': --color-brand-primary → var(--color-brand-primary-rgb)
     * - Already wrapped: var(--color-test) → var(--color-test)
     * - HEX colors: #ffffff → format based on $format parameter
     * - RGB colors: 255, 255, 255 → format based on $format parameter
     * 
     * @param string $value Color value (HEX, RGB, or palette reference)
     * @param string $format Output format: 'hex' or 'rgb' (resolved, never 'auto' or null)
     * @param string|null $defaultValue Default value (optional, for backward compatibility)
     * @return string Formatted color value
     */
    private function formatColor(string $value, string $format, ?string $defaultValue = null): string
    {
        // If it's a palette reference (starts with --)
        if (str_starts_with($value, '--')) {
            // Smart mapping: append -rgb suffix if field requires RGB format
            if ($format === 'rgb') {
                return 'var(' . $value . '-rgb)';  // --color-brand-primary-rgb
            }
            return 'var(' . $value . ')';  // --color-brand-primary (HEX by default)
        }
        
        // If already wrapped in var() - return as-is (backward compatibility)
        if (str_starts_with($value, 'var(')) {
            return $value;
        }
        
        // Apply requested format (already resolved via ColorFormatResolver in formatValue)
        if ($format === 'rgb') {
            // Breeze 2.0: Output RGB format (255, 255, 255)
            if (ColorConverter::isHex($value)) {
                // HEX8 (#rrggbbaa) → rgba(r, g, b, a) to preserve alpha channel
                $hexBody = ltrim($value, '#');
                if (strlen($hexBody) === 8) {
                    $r = hexdec(substr($hexBody, 0, 2));
                    $g = hexdec(substr($hexBody, 2, 2));
                    $b = hexdec(substr($hexBody, 4, 2));
                    $a = round(hexdec(substr($hexBody, 6, 2)) / 255, 3);
                    return "rgba($r, $g, $b, $a)";
                }
                return ColorConverter::hexToRgb($value);  // #ffffff → 255, 255, 255
            }
            if (ColorConverter::isRgb($value)) {
                return $value;  // Already RGB, return as-is
            }
        } else {
            // Breeze 3.0: Output HEX format (#ffffff)
            if (ColorConverter::isHex($value)) {
                return ColorConverter::normalizeHex($value);  // #FFFFFF → #ffffff
            }
            if (ColorConverter::isRgb($value)) {
                return ColorConverter::rgbToHex($value);  // 255, 255, 255 → #ffffff
            }
        }
        
        // Fallback: return as-is (shouldn't happen with valid data)
        return $value;
    }

    /**
     * Format font family with fallback
     * @param string $font
     * @return string
     */
    private function formatFont(string $font): string
    {
        // CSS-var role reference (e.g. '--primary-font') → wrap in var()
        if (str_starts_with($font, '--')) {
            return 'var(' . $font . ')';
        }

        // Already quoted — assume properly formatted
        if (str_starts_with($font, '"') || str_starts_with($font, "'")) {
            return $font;
        }

        // Already a full CSS font stack (contains a comma, e.g. "Arial, sans-serif") — pass through as-is
        if (str_contains($font, ',')) {
            return $font;
        }

        // Determine appropriate fallback based on font family
        $serifFonts = [
            'Georgia',
            'Times New Roman',
            'Times',
            'Garamond',
            'Palatino',
            'Baskerville',
            'Didot',
            'Bodoni',
            'Cambria',
            'serif'
        ];
        
        $monospaceFonts = [
            'Courier New',
            'Courier',
            'Monaco',
            'Consolas',
            'Lucida Console',
            'monospace'
        ];

        // Check if font is serif
        foreach ($serifFonts as $serifFont) {
            if (stripos($font, $serifFont) !== false) {
                return '"' . $font . '", serif';
            }
        }
        
        // Check if font is monospace
        foreach ($monospaceFonts as $monospaceFont) {
            if (stripos($font, $monospaceFont) !== false) {
                return '"' . $font . '", monospace';
            }
        }

        // Default to sans-serif
        return '"' . $font . '", sans-serif';
    }

    /**
     * Format spacing value for CSS
     * Converts JSON object to CSS shorthand
     *
     * @param mixed $value JSON string or array
     * @return string CSS shorthand (e.g., "10px 20px 30px 40px")
     */
    private function formatSpacing($value): string
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $value = $decoded;
            } else {
                // If not JSON, assume it's already formatted CSS
                return $this->escapeValue($value);
            }
        }

        if (!is_array($value)) {
            return '0';
        }

        $top = $value['top'] ?? 0;
        $right = $value['right'] ?? 0;
        $bottom = $value['bottom'] ?? 0;
        $left = $value['left'] ?? 0;
        $unit = $value['unit'] ?? 'px';

        // Generate CSS shorthand
        if ($top === $right && $right === $bottom && $bottom === $left) {
            // All sides same
            return $top . $unit;
        } elseif ($top === $bottom && $left === $right) {
            // top/bottom same, left/right same
            return $top . $unit . ' ' . $right . $unit;
        } elseif ($left === $right) {
            // left/right same
            return $top . $unit . ' ' . $right . $unit . ' ' . $bottom . $unit;
        } else {
            // All different
            return $top . $unit . ' ' . $right . $unit . ' ' . $bottom . $unit . ' ' . $left . $unit;
        }
    }

    /**
     * Format repeater value for CSS
     * Note: Repeater fields typically don't output to CSS directly,
     * but this provides JSON string representation if needed
     *
     * @param mixed $value
     * @return string
     */
    private function formatRepeater($value): string
    {
        if (is_string($value)) {
            // Already a JSON string, just escape it
            return $this->escapeValue($value);
        }

        if (is_array($value)) {
            // Convert to JSON string
            return $this->escapeValue(json_encode($value));
        }

        return '';
    }

    /**
     * Collect unique stylesheet URLs for all font_picker values that require
     * loading an external font (i.e. the matching option has a 'url' key).
     *
     * Only URLs for values that differ from the field's default are included —
     * consistent with how buildSelectorBlocks() skips default values.
     *
     * @param array $values   Rows from the DB (each has section_code / setting_code / value)
     * @param array $fieldMap 'section.setting' => field config (built by buildFieldMap())
     * @return string[]  Unique stylesheet URLs, in order of first appearance
     */
    private function buildFontImports(array $values, array $fieldMap): array
    {
        $urls = [];

        foreach ($values as $value) {
            $sectionCode = $value['section_code'] ?? '';
            $settingCode = $value['setting_code'] ?? '';
            $rawValue    = $value['value'] ?? null;

            if ($rawValue === null || $rawValue === '' || $sectionCode === '_palette') {
                continue;
            }

            $key   = $sectionCode . '.' . $settingCode;
            $field = $fieldMap[$key] ?? null;
            if (!$field || strtolower($field['type'] ?? '') !== 'font_picker') {
                continue;
            }

            // Skip if value equals the field default (same logic as buildSelectorBlocks)
            $default = $field['default'] ?? null;
            if ($default !== null && $this->valuesAreEqual($rawValue, $default)) {
                continue;
            }

            foreach ($field['options'] ?? [] as $option) {
                if (!empty($option['url']) && ($option['value'] ?? '') === $rawValue) {
                    $urls[] = $option['url'];
                    break;
                }
            }
        }

        return array_values(array_unique($urls));
    }

    /**
     * Build the ordered map of palette CSS variables that must be emitted.
     *
     * Palette variables need to be emitted in two cases:
     *   1. The variable was explicitly saved in the DB (section '_palette').
     *   2. The variable is referenced by a field value (e.g. '--color-brand-amber-dark')
     *      but was never changed by the user, so it has no DB entry. In this case we
     *      fall back to the default value from the theme config.
     *
     * Both the HEX variant and the -rgb variant must be present in the output CSS
     * because the Breeze base CSS only defines the HEX form; the -rgb form is absent
     * from the base stylesheet and would otherwise be undefined.
     *
     * @param array  $values Rows from the DB (each has section_code / setting_code / value)
     * @param array  $config Full theme configuration (with 'palettes' key)
     * @return array<string, string>  Map of cssVar → rawHexValue, palette entries first
     */
    private function buildPaletteVarsToEmit(array $values, array $config): array
    {
        // Step 1: collect palette vars explicitly saved in DB
        $paletteVarsToEmit = [];
        foreach ($values as $value) {
            if (($value['section_code'] ?? '') !== '_palette') {
                continue;
            }
            $cssVar  = $value['setting_code'] ?? '';
            $rawValue = $value['value'] ?? null;
            if ($cssVar && $rawValue !== null && $rawValue !== '') {
                $paletteVarsToEmit[$cssVar] = $rawValue;
            }
        }

        // Step 2: for every field that stores a palette reference (e.g. '--color-brand-amber-dark')
        // ensure the referenced palette var will be emitted.  If it is not already in the
        // DB set, look up the config default and use that.
        $paletteDefaults = $this->extractPaletteDefaults($config);
        foreach ($values as $value) {
            if (($value['section_code'] ?? '') === '_palette') {
                continue;
            }
            $rawValue = $value['value'] ?? null;
            if ($rawValue === null || !str_starts_with($rawValue, '--')) {
                continue;
            }
            $cssVar = $rawValue; // the palette variable name stored as the field value
            if (isset($paletteVarsToEmit[$cssVar])) {
                continue; // already have a value for it
            }
            if (isset($paletteDefaults[$cssVar])) {
                $paletteVarsToEmit[$cssVar] = $paletteDefaults[$cssVar];
            }
        }

        return $paletteVarsToEmit;
    }

    /**
     * Extract palette default values from config.
     * Returns a map of css_var => default_hex, e.g. ['--color-brand-primary' => '#1979c3'].
     *
     * @param array $config Configuration array with 'palettes' key
     * @return array<string, string>
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
     * Process palette color value and generate CSS
     * Handles conversion and CSS output for a single palette color.
     *
     * Always emits both HEX and RGB variants, even when the value equals the
     * palette default. The Breeze base CSS defines the HEX variable but does
     * NOT define the -rgb variant, so omitting it would leave any field that
     * references var(--color-brand-*-rgb) with an undefined (empty) value.
     *
     * @param string $cssVar CSS variable name (e.g., --color-brand-primary)
     * @param string $rawValue Raw color value from database
     * @return string Generated CSS for this palette color (both HEX and RGB formats)
     */
    private function processPaletteColor(string $cssVar, string $rawValue): string
    {
        // Convert legacy RGB to HEX if needed
        if (preg_match('/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/', $rawValue)) {
            $rawValue = ColorConverter::rgbToHex($rawValue);
        }

        // Generate BOTH HEX and RGB formats for palette colors
        $hexValue = $rawValue;  // Already in HEX format
        $rgbValue = ColorConverter::hexToRgb($hexValue);  // Convert to RGB
        
        // Extract label from CSS variable name
        $label = str_replace('--color-brand-', '', $cssVar);
        $label = ucwords(str_replace('-', ' ', $label)); // Format: "Amber Primary"
        
        // Output both formats
        $css = "    $cssVar: $hexValue;  /* Palette: $label */\n";
        $css .= "    $cssVar-rgb: $rgbValue;  /* Palette: $label (RGB) */\n";
        
        return $css;
    }
}
