<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;

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

        // ========================================
        // INJECT USER-MODIFIED VALUES (including palette from DB)
        // ========================================
        // Note: Default palette colors are already available in Breeze base styles.
        // Only custom/modified palette values from DB (section "_palette") are output here.
        if (empty($values)) {
            $css .= "}\n";
            return $css;
        }

        // CRITICAL: Process _palette changes FIRST (before other fields)
        // This ensures palette variables are defined before they're referenced via var()
        $hasPaletteChanges = false;
        
        // Extract palette defaults from config (ONCE before loop)
        $paletteDefaults = $this->extractPaletteDefaults($config);
        
        foreach ($values as $value) {
            $sectionCode = $value['section_code'];
            
            // Skip non-palette entries in this pass
            if ($sectionCode !== '_palette') {
                continue;
            }
            
            $settingCode = $value['setting_code'];
            $rawValue = $value['value'] ?? null;

            if ($rawValue === null || $rawValue === '') {
                continue;
            }

            $cssVar = $settingCode; // CSS var = setting code (e.g., --color-brand-primary)
            
            // Convert legacy RGB to HEX if needed
            if (preg_match('/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/', $rawValue)) {
                $rawValue = ColorConverter::rgbToHex($rawValue);
            }
            
            // Check if value differs from default
            $default = $paletteDefaults[$cssVar] ?? null;
            if ($default !== null) {
                // Normalize both values to lowercase HEX for comparison
                $normalizedValue = strtolower(trim($rawValue));
                $normalizedDefault = strtolower(trim($default));
                
                // Skip if value equals default (use Breeze base style)
                if ($normalizedValue === $normalizedDefault) {
                    continue;
                }
            }
            
            // Output HEX value (Breeze 3.0 format)
            $formattedValue = $rawValue;
            
            // Extract label from CSS variable name
            $label = str_replace('--color-brand-', '', $cssVar);
            $label = ucwords(str_replace('-', ' ', $label)); // Format: "Amber Primary"
            
            $css .= "    $cssVar: $formattedValue;  /* Palette: $label */\n";
            $hasPaletteChanges = true;
        }

        // Add blank line separator after palette colors (if any were added)
        if ($hasPaletteChanges) {
            $css .= "\n";
        }

        // Now process all OTHER field values (which may reference palette variables)
        $css .= $this->generateCssFromFields($values, $fieldMap);

        $css .= "}\n";

        return $css;
    }

    /**
     * Generate CSS rules from field values
     *
     * @param array $values
     * @param array $fieldMap
     * @return string
     */
    private function generateCssFromFields(array $values, array $fieldMap): string
    {
        $css = '';
        
        foreach ($values as $value) {
            $sectionCode = $value['section_code'];
            $settingCode = $value['setting_code'];
            $rawValue = $value['value'] ?? null;

            if ($rawValue === null || $rawValue === '') {
                continue;
            }

            // Skip _palette entries (already processed above)
            if ($sectionCode === '_palette') {
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

            $formattedValue = $this->formatValue($rawValue, $field);
            $comment = $this->getComment($rawValue, $field['type'] ?? null);
            $important = $field['important'] ?? false;

            $css .= "    $cssVar: $formattedValue" . ($important ? ' !important' : '') . ";";
            if ($comment) {
                $css .= "  /* $comment */";
            }
            $css .= "\n";
        }
        
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

        // ========================================
        // INJECT USER-MODIFIED VALUES (including palette from DB)
        // ========================================
        // Note: Default palette colors are already available in Breeze base styles.
        // Only custom/modified palette values from DB (section "_palette") are output here.
        if (empty($valuesMap)) {
            $css .= "}\n";
            return $css;
        }

        // CRITICAL: Process _palette changes FIRST (before other fields)
        // This ensures palette variables are defined before they're referenced via var()
        $hasPaletteChanges = false;

        // Extract palette defaults from config (ONCE before loop)
        $paletteDefaults = $this->extractPaletteDefaults($config);

        foreach ($valuesMap as $key => $rawValue) {
            if ($rawValue === null || $rawValue === '') {
                continue;
            }

            // Parse section.setting format
            $parts = explode('.', $key, 2);
            if (count($parts) !== 2) {
                continue;
            }
            
            [$sectionCode, $settingCode] = $parts;

            // Skip non-palette entries in this pass
            if ($sectionCode !== '_palette') {
                continue;
            }

            $cssVar = $settingCode; // e.g., --color-brand-primary
            
            // Convert legacy RGB to HEX if needed
            if (preg_match('/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/', $rawValue)) {
                $rawValue = ColorConverter::rgbToHex($rawValue);
            }
            
            // Check if value differs from default
            $default = $paletteDefaults[$cssVar] ?? null;
            if ($default !== null) {
                // Normalize both values to lowercase HEX for comparison
                $normalizedValue = strtolower(trim($rawValue));
                $normalizedDefault = strtolower(trim($default));
                
                // Skip if value equals default (use Breeze base style)
                if ($normalizedValue === $normalizedDefault) {
                    continue;
                }
            }
            
            // Output HEX value (Breeze 3.0 format)
            $formattedValue = $rawValue;
            
            // Generate friendly label for comment
            $label = str_replace('--color-brand-', '', $cssVar);
            $label = ucwords(str_replace('-', ' ', $label));
            
            $css .= "    $cssVar: $formattedValue;  /* Palette: $label */\n";
            $hasPaletteChanges = true;
        }

        // Add blank line separator after palette colors (if any were added)
        if ($hasPaletteChanges) {
            $css .= "\n";
        }

        // Now process all OTHER field values (which may reference palette variables)
        // Convert valuesMap to same format as $values array
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
        
        $css .= $this->generateCssFromFields($values, $fieldMap);

        $css .= "}\n";

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
                $field['format'] ?? null,
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
     * Format options:
     * - 'hex': Output HEX format (Breeze 3.0) → #ffffff
     * - 'rgb': Output RGB format (Breeze 2.0) → 255, 255, 255
     * - 'auto': Auto-detect from value format
     * 
     * Supports:
     * - Palette references: --color-brand-primary → var(--color-brand-primary)
     * - Already wrapped: var(--color-test) → var(--color-test)
     * - HEX colors: #ffffff → format based on $format parameter
     * - RGB colors: 255, 255, 255 → format based on $format parameter
     * 
     * @param string $value Color value (HEX, RGB, or palette reference)
     * @param string|null $format Output format: 'hex' (default), 'rgb', or 'auto'
     * @param string|null $defaultValue Default value for auto-detection (optional)
     * @return string Formatted color value
     */
    private function formatColor(string $value, ?string $format = null, ?string $defaultValue = null): string
    {
        // If it's a palette reference (starts with --)
        if (str_starts_with($value, '--')) {
            return 'var(' . $value . ')';  // --color-brand-primary → var(--color-brand-primary)
        }
        
        // If already wrapped in var() - return as-is (backward compatibility)
        if (str_starts_with($value, 'var(')) {
            return $value;
        }
        
        // Determine format: auto if default exists but no format specified, otherwise hex
        if ($format === null) {
            $format = ($defaultValue !== null) ? 'auto' : 'hex';
        }
        
        $format = strtolower($format);
        
        // Auto-detect format from default value
        if ($format === 'auto') {
            if ($defaultValue !== null && ColorConverter::isRgb($defaultValue)) {
                $format = 'rgb';
            } else {
                $format = 'hex';
            }
        }
        
        // Apply requested format
        if ($format === 'rgb') {
            // Breeze 2.0: Output RGB format (255, 255, 255)
            if (ColorConverter::isHex($value)) {
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

    /**
     * Extract palette default values from config
     * Builds a map of css_var => default_hex for comparison
     * 
     * @param array $config Configuration array with palettes
     * @return array Map of css_var => default_hex (e.g., ['--color-brand-primary' => '#1979c3'])
     */
    private function extractPaletteDefaults(array $config): array
    {
        $defaults = [];
        $palettes = $config['palettes'] ?? [];
        
        foreach ($palettes as $palette) {
            $groups = $palette['groups'] ?? [];
            foreach ($groups as $group) {
                $colors = $group['colors'] ?? [];
                foreach ($colors as $color) {
                    $cssVar = $color['css_var'] ?? null;
                    $default = $color['default'] ?? null;
                    
                    if ($cssVar && $default) {
                        $defaults[$cssVar] = $default;
                    }
                }
            }
        }
        
        return $defaults;
    }
}
