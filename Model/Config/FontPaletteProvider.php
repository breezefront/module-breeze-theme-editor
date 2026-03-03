<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Config;

use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

/**
 * Provides font palette data from theme configuration
 *
 * Reads `font_palettes` key from settings.json and returns structured data:
 * - options[] — the shared list of available fonts (shown in every font_picker)
 * - fonts[]   — the named role definitions (Primary / Secondary / Utility, etc.)
 *
 * Mirrors PaletteProvider but without color-specific logic (no RGB conversion,
 * no usage counts).  Font palette roles are saved as regular field values, so
 * no separate palette-save mutation is needed.
 */
class FontPaletteProvider
{
    public function __construct(
        private ConfigProvider $configProvider
    ) {}

    /**
     * Get all font palettes for a theme
     *
     * @param int $themeId
     * @return array
     */
    public function getFontPalettes(int $themeId): array
    {
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $fontPalettes = $config['font_palettes'] ?? [];

        if (empty($fontPalettes)) {
            return [];
        }

        $result = [];
        foreach ($fontPalettes as $paletteId => $palette) {
            $result[] = $this->processPalette($paletteId, $palette);
        }

        return $result;
    }

    /**
     * Process a single font palette entry
     *
     * @param string $paletteId
     * @param array  $palette
     * @return array
     */
    private function processPalette(string $paletteId, array $palette): array
    {
        $options = [];
        foreach ($palette['options'] ?? [] as $option) {
            $options[] = [
                'value' => $option['value'] ?? '',
                'label' => $option['label'] ?? '',
                'url'   => $option['url'] ?? null,
            ];
        }

        $fonts = [];
        foreach ($palette['fonts'] ?? [] as $font) {
            $fonts[] = [
                'id'       => $font['id'] ?? '',
                'label'    => $font['label'] ?? '',
                'property' => $font['property'] ?? '',
                'default'  => $font['default'] ?? '',
            ];
        }

        return [
            'id'      => $paletteId,
            'label'   => $palette['label'] ?? $paletteId,
            'options' => $options,
            'fonts'   => $fonts,
        ];
    }
}
