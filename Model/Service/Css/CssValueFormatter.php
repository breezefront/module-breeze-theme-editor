<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service\Css;

use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;

/**
 * Formats individual field values into CSS-compatible strings.
 *
 * Handles color conversion (HEX/RGB/palette references), font family fallbacks,
 * CSS spacing shorthand, repeater JSON serialization, and general value escaping.
 */
class CssValueFormatter
{
    public function __construct(
        private ColorFormatResolver $colorFormatResolver
    ) {}

    /**
     * Format a field value into a CSS-compatible string based on field type.
     *
     * @param mixed $value
     * @param array|null $field Field configuration (type, format, default, etc.)
     * @return string
     */
    public function formatValue($value, ?array $field): string
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
            'number', 'range' => (string)$value,
            'textarea', 'text', 'code' => $this->escapeValue((string)$value),
            'image_upload' => $this->escapeValue((string)$value),
            'spacing' => $this->formatSpacing($value),
            'repeater' => $this->formatRepeater($value),
            default => $this->escapeValue((string)$value)
        };
    }

    /**
     * Format color value with configurable output format.
     *
     * NOTE: $format should be resolved via ColorFormatResolver::resolve()
     * before calling this method to ensure proper format detection.
     *
     * Format options:
     * - 'hex': Output HEX format (Breeze 3.0) → #ffffff
     * - 'rgb': Output RGB format (Breeze 2.0) → 255, 255, 255
     *
     * Supports:
     * - Palette references: --color-brand-primary → var(--color-brand-primary[-rgb])
     * - Already wrapped: var(--color-test) → var(--color-test)
     * - HEX colors: #ffffff → formatted per $format
     * - RGB colors: 255, 255, 255 → formatted per $format
     *
     * @param string $value Color value (HEX, RGB, or palette reference)
     * @param string $format Output format: 'hex' or 'rgb' (resolved, never 'auto' or null)
     * @param string|null $defaultValue Default value (optional, for backward compatibility)
     * @return string
     */
    public function formatColor(string $value, string $format, ?string $defaultValue = null): string
    {
        // Palette reference (starts with --): smart mapping based on required format
        if (str_starts_with($value, '--')) {
            if ($format === 'rgb') {
                return 'var(' . $value . '-rgb)';
            }
            return 'var(' . $value . ')';
        }

        // Already wrapped in var() — return as-is (backward compatibility)
        if (str_starts_with($value, 'var(')) {
            return $value;
        }

        if ($format === 'rgb') {
            // Breeze 2.0: output RGB format
            if (ColorConverter::isHex($value)) {
                // HEX8 (#rrggbbaa) → rgba(r, g, b, a) to preserve alpha channel
                $rgba = ColorConverter::hex8ToRgba($value);
                if ($rgba !== null) {
                    return $rgba;
                }
                return ColorConverter::hexToRgb($value);
            }
            if (ColorConverter::isRgb($value)) {
                return $value;
            }
        } else {
            // Breeze 3.0: output HEX format
            if (ColorConverter::isHex($value)) {
                return ColorConverter::normalizeHex($value);
            }
            if (ColorConverter::isRgb($value)) {
                return ColorConverter::rgbToHex($value);
            }
        }

        // Fallback: return as-is
        return $value;
    }

    /**
     * Format font family name with appropriate generic family fallback.
     *
     * - CSS-var role reference (--primary-font) → var(--primary-font)
     * - Already quoted or comma-separated → pass through unchanged
     * - Serif fonts → "FontName", serif
     * - Monospace fonts → "FontName", monospace
     * - All others → "FontName", sans-serif
     *
     * @param string $font
     * @return string
     */
    public function formatFont(string $font): string
    {
        if (str_starts_with($font, '--')) {
            return 'var(' . $font . ')';
        }

        if (str_starts_with($font, '"') || str_starts_with($font, "'")) {
            return $font;
        }

        if (str_contains($font, ',')) {
            return $font;
        }

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

        foreach ($serifFonts as $serifFont) {
            if (stripos($font, $serifFont) !== false) {
                return '"' . $font . '", serif';
            }
        }

        foreach ($monospaceFonts as $monospaceFont) {
            if (stripos($font, $monospaceFont) !== false) {
                return '"' . $font . '", monospace';
            }
        }

        return '"' . $font . '", sans-serif';
    }

    /**
     * Format spacing value into a CSS shorthand string.
     *
     * Accepts a JSON string or array with keys top/right/bottom/left/unit
     * and converts it to the shortest equivalent CSS shorthand.
     *
     * @param mixed $value JSON string or array
     * @return string e.g. "10px 20px"
     */
    public function formatSpacing($value): string
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $value = $decoded;
            } else {
                return $this->escapeValue($value);
            }
        }

        if (!is_array($value)) {
            return '0';
        }

        $top    = $value['top']    ?? 0;
        $right  = $value['right']  ?? 0;
        $bottom = $value['bottom'] ?? 0;
        $left   = $value['left']   ?? 0;
        $unit   = $value['unit']   ?? 'px';

        if ($top === $right && $right === $bottom && $bottom === $left) {
            return $top . $unit;
        } elseif ($top === $bottom && $left === $right) {
            return $top . $unit . ' ' . $right . $unit;
        } elseif ($left === $right) {
            return $top . $unit . ' ' . $right . $unit . ' ' . $bottom . $unit;
        } else {
            return $top . $unit . ' ' . $right . $unit . ' ' . $bottom . $unit . ' ' . $left . $unit;
        }
    }

    /**
     * Format repeater value as an escaped JSON string for use in CSS.
     *
     * @param mixed $value
     * @return string
     */
    public function formatRepeater($value): string
    {
        if (is_string($value)) {
            return $this->escapeValue($value);
        }

        if (is_array($value)) {
            return $this->escapeValue(json_encode($value));
        }

        return '';
    }

    /**
     * Return an inline CSS comment string for certain field types, or null if none needed.
     *
     * - color + hex value → the original hex (e.g. "#1979c3")
     * - spacing → the raw JSON representation
     *
     * @param mixed $value
     * @param string|null $fieldType
     * @return string|null
     */
    public function getComment($value, ?string $fieldType): ?string
    {
        if (!$fieldType) {
            return null;
        }

        return match (strtolower($fieldType)) {
            'color' => str_starts_with((string)$value, '#') ? (string)$value : null,
            'spacing' => 'JSON: ' . (is_string($value) ? $value : json_encode($value)),
            default => null
        };
    }

    /**
     * Escape CSS comment delimiters to prevent comment injection.
     *
     * @param string $value
     * @return string
     */
    public function escapeValue(string $value): string
    {
        return str_replace(['/*', '*/'], ['/ *', '* /'], $value);
    }
}
