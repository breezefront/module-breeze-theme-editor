<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Config;

use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

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
     * Get single palette by ID
     *
     * @param int $themeId
     * @param string $paletteId
     * @param array $valuesMap - Map of 'section.setting' => value (for usage count)
     * @return array|null
     */
    public function getPaletteById(int $themeId, string $paletteId, array $valuesMap = []): ?array
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $palettes = $config['palettes'] ?? [];

        if (!isset($palettes[$paletteId])) {
            return null;
        }

        return $this->processPalette($themeId, $paletteId, $palettes[$paletteId], $valuesMap);
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
                $cssVar = $color['css_var'] ?? '';

                $processedGroup['colors'][] = [
                    'id' => $colorId,
                    'label' => $color['label'] ?? $colorId,
                    'description' => $color['description'] ?? null,
                    'cssVar' => $cssVar,
                    'value' => $this->hexToRgb($color['default'] ?? '#000000'),
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
                if (isset($color['css_var'])) {
                    $paletteCssVars[$color['css_var']] = 0;
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

    /**
     * Convert HEX to RGB format (same as CssGenerator)
     *
     * @param string $hex
     * @return string RGB format: "255, 0, 0"
     */
    private function hexToRgb(string $hex): string
    {
        if (!str_starts_with($hex, '#')) {
            return $hex;
        }

        $hex = ltrim($hex, '#');

        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return "$r, $g, $b";
    }
}
