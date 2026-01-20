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
     * @return array
     */
    public function getPalettes(int $themeId): array
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $palettes = $config['palettes'] ?? [];

        if (empty($palettes)) {
            return [];
        }

        $result = [];
        foreach ($palettes as $paletteId => $palette) {
            $result[] = $this->processPalette($themeId, $paletteId, $palette);
        }

        return $result;
    }

    /**
     * Get single palette by ID
     *
     * @param int $themeId
     * @param string $paletteId
     * @return array|null
     */
    public function getPaletteById(int $themeId, string $paletteId): ?array
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $palettes = $config['palettes'] ?? [];

        if (!isset($palettes[$paletteId])) {
            return null;
        }

        return $this->processPalette($themeId, $paletteId, $palettes[$paletteId]);
    }

    /**
     * Process palette data and calculate usage counts
     *
     * @param int $themeId
     * @param string $paletteId
     * @param array $palette
     * @return array
     */
    private function processPalette(int $themeId, string $paletteId, array $palette): array
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $usageCounts = $this->calculateUsageCounts($config, $palette);

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
     *
     * @param array $config
     * @param array $palette
     * @return array Map of cssVar => count
     */
    private function calculateUsageCounts(array $config, array $palette): array
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

        // Count references in field defaults
        $sections = $config['sections'] ?? [];
        foreach ($sections as $section) {
            $settings = $section['settings'] ?? [];
            foreach ($settings as $setting) {
                $default = $setting['default'] ?? '';
                
                // Check if default value references a palette variable
                if (is_string($default) && str_starts_with($default, 'var(--color-')) {
                    // Extract CSS variable name from var(--color-brand-primary)
                    if (preg_match('/var\((--color-[^)]+)\)/', $default, $matches)) {
                        $cssVar = $matches[1];
                        if (isset($paletteCssVars[$cssVar])) {
                            $paletteCssVars[$cssVar]++;
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
