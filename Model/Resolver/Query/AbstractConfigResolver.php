<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter;
use Swissup\BreezeThemeEditor\Model\Formatter\PresetFormatter;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * Abstract base class for Config resolvers.
 *
 * Thin coordinator — delegates all formatting work to dedicated Formatter classes.
 * Extends AbstractQueryResolver to inherit ACL permission checking.
 */
abstract class AbstractConfigResolver extends AbstractQueryResolver
{
    public function __construct(
        protected SectionFormatter $sectionFormatter,
        protected PresetFormatter $presetFormatter,
        protected PaletteProvider $paletteProvider,
        protected FontPaletteProvider $fontPaletteProvider,
    ) {}

    /**
     * Format palettes for GraphQL response.
     *
     * @param int   $themeId
     * @param array $valuesMap Map of 'section.setting' => value (for usage count)
     */
    protected function formatPalettes(int $themeId, array $valuesMap = []): array
    {
        return $this->paletteProvider->getPalettes($themeId, $valuesMap);
    }

    /**
     * Format font palettes for GraphQL response.
     */
    protected function formatFontPalettes(int $themeId): array
    {
        return $this->fontPaletteProvider->getFontPalettes($themeId);
    }
}
