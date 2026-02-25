<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Config;

use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;

/**
 * Resolves palette color references to actual color values
 * Converts var(--color-brand-primary) → #1979c3
 */
class PaletteResolver
{
    public function __construct(
        private ConfigProvider $configProvider,
        private ValueInheritanceResolver $valueInheritanceResolver,
        private PaletteProvider $paletteProvider
    ) {}

    /**
     * Resolve a color value (either custom hex or palette reference)
     * 
     * @param string $value The value to resolve (e.g., "var(--color-brand-primary)" or "#ff0000")
     * @param int $storeId Store ID for palette values
     * @param int $themeId Theme ID
     * @return string Resolved HEX value (e.g., "#1979c3") or original value
     */
    public function resolve(string $value, int $storeId, int $themeId): string
    {
        // If it's not a CSS variable reference, return as-is
        if (!str_starts_with($value, 'var(--color-')) {
            return $value;
        }

        // Extract CSS variable name from var(--color-brand-primary)
        if (!preg_match('/var\((--color-[^)]+)\)/', $value, $matches)) {
            return $value;
        }

        $cssVar = $matches[1];

        // Try to get custom value from database (section: _palette)
        $customValue = $this->getCustomPaletteValue($cssVar, $storeId, $themeId);
        if ($customValue !== null) {
            return $customValue;
        }

        // Fallback to default from theme.json
        return $this->getDefaultPaletteValue($cssVar, $themeId);
    }

    /**
     * Get custom palette value from database
     * 
     * Returns HEX format, converts legacy RGB if needed.
     * 
     * @param string $cssVar CSS variable name (e.g., "--color-brand-primary")
     * @param int $storeId
     * @param int $themeId
     * @return string|null HEX value or null if not found
     */
    private function getCustomPaletteValue(string $cssVar, int $storeId, int $themeId): ?string
    {
        // Palette values are stored in section "_palette"
        // Setting code is the CSS variable name (e.g., "--color-brand-primary")
        $result = $this->valueInheritanceResolver->resolveSingleValue(
            $themeId,
            $storeId,
            1, // statusId = 1 (PUBLISHED)
            '_palette',
            $cssVar,
            null  // userId (null = published/global values)
        );

        $value = $result['value'] ?? null;
        
        if ($value === null) {
            return null;
        }
        
        // Check if legacy RGB format, convert to HEX
        if (preg_match('/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/', $value)) {
            return ColorConverter::rgbToHex($value);
        }
        
        // Already HEX format
        return $value;
    }

    /**
     * Get default palette value from theme.json
     * 
     * @param string $cssVar CSS variable name
     * @param int $themeId
     * @return string HEX value or "#000000" if not found
     */
    private function getDefaultPaletteValue(string $cssVar, int $themeId): string
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $palettes = $config['palettes'] ?? [];

        // Search through all palettes
        foreach ($palettes as $palette) {
            $groups = $palette['groups'] ?? [];
            foreach ($groups as $group) {
                $colors = $group['colors'] ?? [];
                foreach ($colors as $color) {
                    if (($color['property'] ?? $color['css_var'] ?? '') === $cssVar) {
                        // Return HEX directly (no conversion)
                        return $color['default'] ?? '#000000';
                    }
                }
            }
        }

        // Fallback to black if not found
        return '#000000';
    }

    /**
     * Get all fields that reference a specific palette color
     * 
     * @param string $cssVar CSS variable name (e.g., "--color-brand-primary")
     * @param int $themeId
     * @return array List of field codes that use this color
     */
    public function getFieldsUsingColor(string $cssVar, int $themeId): array
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $fields = [];

        $sections = $config['sections'] ?? [];
        foreach ($sections as $section) {
            $settings = $section['settings'] ?? [];
            foreach ($settings as $setting) {
                $default = $setting['default'] ?? '';
                
                // Check if default value references this palette variable
                if (is_string($default) && str_contains($default, "var($cssVar)")) {
                    $fields[] = [
                        'section' => $section['id'],
                        'field' => $setting['id'],
                        'label' => $setting['label'] ?? $setting['id']
                    ];
                }
            }
        }

        return $fields;
    }
}
