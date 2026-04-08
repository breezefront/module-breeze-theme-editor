<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Config;

use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;

/**
 * Provides color palette data from theme configuration
 */
class PaletteProvider
{
    public function __construct(
        private ConfigProvider $configProvider
    ) {}

    /**
     * Get all palettes for a theme
     *
     * @param int $themeId
     * @param array $valuesMap - Map of 'section.setting' => value (for usage count)
     * @return array
     */
    public function getPalettes(int $themeId, array $valuesMap = []): array
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $palettes = $config['palettes'] ?? [];

        if (empty($palettes)) {
            return [];
        }

        $result = [];
        foreach ($palettes as $paletteId => $palette) {
            $result[] = $this->processPalette($themeId, $paletteId, $palette, $valuesMap);
        }

        return $result;
    }

    /**
     * Process palette data and calculate usage counts
     *
     * @param int $themeId
     * @param string $paletteId
     * @param array $palette
     * @param array $valuesMap - Map of 'section.setting' => value (for usage count)
     * @return array
     */
    private function processPalette(int $themeId, string $paletteId, array $palette, array $valuesMap = []): array
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $usageCounts = $this->calculateUsageCounts($config, $palette, $valuesMap);

        $processedPalette = [
            'id' => $paletteId,
            'label' => $palette['label'] ?? $paletteId,
            'description' => $palette['description'] ?? null,
            'groups' => []
        ];

        $groups = $palette['groups'] ?? [];
        foreach ($groups as $groupId => $group) {
            $processedGroup = [
                'id' => $groupId,
                'label' => $group['label'] ?? $groupId,
                'description' => $group['description'] ?? null,
                'colors' => []
            ];

            $colors = $group['colors'] ?? [];
            foreach ($colors as $color) {
                $colorId = $color['id'] ?? '';
                $cssVar = $color['property'] ?? $color['css_var'] ?? '';
                
                // Get saved value from database (section: _palette, setting: cssVar)
                $paletteKey = '_palette.' . $cssVar;
                $savedValue = $valuesMap[$paletteKey] ?? null;
                
                // Determine current value (HEX format)
                if ($savedValue) {
                    // Check if saved value is legacy RGB format
                    if (preg_match('/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/', $savedValue)) {
                        // Convert legacy RGB to HEX for backward compatibility
                        $currentValue = ColorConverter::rgbToHex($savedValue);
                    } else {
                        // Already HEX format, use as-is
                        $currentValue = $savedValue;
                    }
                } else {
                    // No saved value, use default (already HEX)
                    $currentValue = $color['default'] ?? '#000000';
                }

                $processedGroup['colors'][] = [
                    'id' => $colorId,
                    'label' => $color['label'] ?? $colorId,
                    'description' => $color['description'] ?? null,
                    'property' => $cssVar,
                    'value' => $currentValue,
                    'default' => $color['default'] ?? '#000000',
                    'usageCount' => $usageCounts[$cssVar] ?? 0
                ];
            }

            $processedPalette['groups'][] = $processedGroup;
        }

        return $processedPalette;
    }

    /**
     * Calculate how many fields use each palette color
     * Checks ACTUAL saved values (from $valuesMap), not just config defaults
     *
     * @param array $config
     * @param array $palette
     * @param array $valuesMap - Map of 'section.setting' => value
     * @return array Map of cssVar => count
     */
    private function calculateUsageCounts(array $config, array $palette, array $valuesMap = []): array
    {
        $usageCounts = [];

        // Build list of all palette CSS variables
        $paletteCssVars = [];
        $groups = $palette['groups'] ?? [];
        foreach ($groups as $group) {
            $colors = $group['colors'] ?? [];
            foreach ($colors as $color) {
                if (isset($color['property']) || isset($color['css_var'])) {
                    $propKey = $color['property'] ?? $color['css_var'];
                    $paletteCssVars[$propKey] = 0;
                }
            }
        }

        // Count references in ACTUAL saved values (or fallback to defaults)
        $sections = $config['sections'] ?? [];
        foreach ($sections as $section) {
            $settings = $section['settings'] ?? [];
            foreach ($settings as $setting) {
                $key = $section['id'] . '.' . $setting['id'];
                
                // ✅ NEW: Use actual saved value, fallback to default
                $currentValue = $valuesMap[$key] ?? $setting['default'] ?? '';
                
                // Check if value is a palette reference
                if (is_string($currentValue)) {
                    // Direct palette reference (e.g., "--color-brand-primary")
                    if (str_starts_with($currentValue, '--color-')) {
                        $cssVar = $currentValue;
                        if (isset($paletteCssVars[$cssVar])) {
                            $paletteCssVars[$cssVar]++;
                        }
                    }
                    // Legacy var() format (e.g., "var(--color-brand-primary)")
                    elseif (str_starts_with($currentValue, 'var(--color-')) {
                        if (preg_match('/var\((--color-[^)]+)\)/', $currentValue, $matches)) {
                            $cssVar = $matches[1];
                            if (isset($paletteCssVars[$cssVar])) {
                                $paletteCssVars[$cssVar]++;
                            }
                        }
                    }
                }
            }
        }

        return $paletteCssVars;
    }
}
