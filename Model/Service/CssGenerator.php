<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

/**
 * Generate CSS from saved theme values
 */
class CssGenerator
{
    public function __construct(
        private ValueService $valueService,
        private StatusProvider $statusProvider,
        private ConfigProvider $configProvider
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

        if (empty($values)) {
            return '';
        }

        // Get config WITH inheritance
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $sections = $config['sections'] ?? [];

        // Build field lookup map:  section.setting → field config
        $fieldMap = [];
        foreach ($sections as $section) {
            foreach ($section['settings'] ??  [] as $setting) {
                $key = $section['id'] . '.' . $setting['id'];
                $fieldMap[$key] = $setting;
            }
        }

        $css = ":root {\n";

        foreach ($values as $value) {
            $sectionCode = $value['section_code'];
            $settingCode = $value['setting_code'];
            $rawValue = $value['value'] ?? null;

            if ($rawValue === null || $rawValue === '') {
                continue;
            }

            // Lookup field in map
            $key = $sectionCode . '.' . $settingCode;
            $field = $fieldMap[$key] ?? null;

            if (!$field) {
                continue;
            }

            $default = $field['default'] ?? null;
            if ($default !== null && $this->valuesAreEqual($rawValue, $default)) {
                continue;  // Use Breeze default, don't override
            }

            $cssVar = $field['css_var'] ?? null;

            if (!$cssVar) {
                continue;
            }

            $fieldType = $field['type'] ?? null;
            $formattedValue = $this->formatValue($rawValue, $fieldType);
            $comment = $this->getComment($rawValue, $fieldType);
            $important = $field['important'] ?? false;

            $css .= "    $cssVar: $formattedValue" . ($important ? ' !important' : '') . ";";
            if ($comment) {
                $css .= "  /* $comment */";
            }
            $css .= "\n";
        }

        $css .= "}\n";

        return $css;
    }

    /**
     * Generate CSS from values map (for publications)
     * 
     * @param int $themeId
     * @param array $valuesMap Map of 'section.setting' => 'value'
     * @return string CSS code with :root { ... }
     */
    public function generateFromValuesMap(int $themeId, array $valuesMap): string
    {
        if (empty($valuesMap)) {
            return '';
        }

        // Get config WITH inheritance
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $sections = $config['sections'] ?? [];

        // Build field lookup map: section.setting → field config
        $fieldMap = [];
        foreach ($sections as $section) {
            foreach ($section['settings'] ?? [] as $setting) {
                $key = $section['id'] . '.' . $setting['id'];
                $fieldMap[$key] = $setting;
            }
        }

        $css = ":root {\n";

        foreach ($valuesMap as $key => $rawValue) {
            if ($rawValue === null || $rawValue === '') {
                continue;
            }

            // Lookup field in map
            $field = $fieldMap[$key] ?? null;

            if (!$field) {
                continue;
            }

            $default = $field['default'] ?? null;
            if ($default !== null && $this->valuesAreEqual($rawValue, $default)) {
                continue; // Use Breeze default, don't override
            }

            $cssVar = $field['css_var'] ?? null;

            if (!$cssVar) {
                continue;
            }

            $fieldType = $field['type'] ?? null;
            $formattedValue = $this->formatValue($rawValue, $fieldType);
            $comment = $this->getComment($rawValue, $fieldType);
            $important = $field['important'] ?? false;

            $css .= "    $cssVar: $formattedValue" . ($important ? ' !important' : '') . ";";
            if ($comment) {
                $css .= "  /* $comment */";
            }
            $css .= "\n";
        }

        $css .= "}\n";

        return $css;
    }

    /**
     * Format value based on field type
     * @param mixed $value
     * @param string|null $fieldType
     * @return string
     */
    private function formatValue($value, ?string $fieldType): string
    {
        if (! $fieldType) {
            return $this->escapeValue((string)$value);
        }

        $fieldType = strtolower($fieldType);

        return match ($fieldType) {
            'color' => $this->hexToRgb($value),
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
     * Convert HEX to RGB (Breeze format: "255, 0, 0")
     * @param string $hex
     * @return string
     */
    private function hexToRgb(string $hex): string
    {
        if (! str_starts_with($hex, '#')) {
            return $hex;
        }

        $hex = ltrim($hex, '#');

        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] .  $hex[2] . $hex[2];
        }

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return "$r, $g, $b";
    }

    /**
     * Format font family with fallback
     * @param string $font
     * @return string
     */
    private function formatFont(string $font): string
    {
        // Already has quotes - assume it's properly formatted
        if (str_starts_with($font, '"') || str_starts_with($font, "'")) {
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
}
