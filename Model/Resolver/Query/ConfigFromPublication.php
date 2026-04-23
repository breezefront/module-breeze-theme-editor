<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\Api\SearchCriteriaBuilderFactory;
use Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter;
use Swissup\BreezeThemeEditor\Model\Formatter\PresetFormatter;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;

/**
 * Get theme configuration from specific publication.
 *
 * ACL: Inherits ::editor_view from AbstractConfigResolver -> AbstractQueryResolver
 */
class ConfigFromPublication extends AbstractConfigResolver
{
    use PublicationChangelogTrait;

    public function __construct(
        SectionFormatter $sectionFormatter,
        PresetFormatter $presetFormatter,
        PaletteProvider $paletteProvider,
        FontPaletteProvider $fontPaletteProvider,
        private ConfigProvider $configProvider,
        private ThemeResolver $themeResolver,
        private PublicationRepositoryInterface $publicationRepository,
        private ChangelogRepositoryInterface $changelogRepository,
        private SearchCriteriaBuilderFactory $searchCriteriaBuilderFactory,
        private ScopeFactory $scopeFactory
    ) {
        parent::__construct($sectionFormatter, $presetFormatter, $paletteProvider, $fontPaletteProvider);
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        // 1. Validate publicationId
        if (!isset($args['publicationId']) || !$args['publicationId']) {
            throw new GraphQlInputException(__('publicationId is required'));
        }

        $publicationId = (int)$args['publicationId'];

        // 2. Verify publication exists; take scope/scopeId/themeId from publication record
        try {
            $publication = $this->publicationRepository->getById($publicationId);
        } catch (\Exception $e) {
            throw new GraphQlInputException(
                __('Publication #%1 not found', $publicationId)
            );
        }

        $themeId = $publication->getThemeId();
        if (!$themeId) {
            $scope   = $this->scopeFactory->create(
                $publication->getScope() ?: 'stores',
                (int)$publication->getStoreId()
            );
            $themeId = $this->themeResolver->getThemeIdByScope($scope);
        }

        // 3. Get base theme config
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);

        // 4. Get publication changelog
        $changelog = $this->getPublicationChangelog($publicationId);

        // 5. Reconstruct values from changelog
        $valuesMap = $this->buildValuesMapFromChangelog($changelog);

        // 6. Merge sections with values
        $sections = $this->sectionFormatter->mergeSectionsWithValues(
            $config['sections'] ?? [],
            $valuesMap,
            $themeId
        );

        // 6b. Auto-generate _font_palette section from font_palettes.fonts[]
        $fontPalettes = $this->formatFontPalettes($themeId);
        $fontSection  = $this->sectionFormatter->mergeFontPaletteRolesAsFields($fontPalettes, $valuesMap);
        if ($fontSection !== null) {
            $sections[] = $fontSection;
        }

        // 7. Metadata
        $metadata                          = $this->configProvider->getMetadata($themeId);
        $metadata['themeVersion']          = $config['version'] ?? null;
        $metadata['lastPublished']         = $publication->getPublishedAt();
        $metadata['hasUnpublishedChanges'] = false;
        $metadata['draftChangesCount']     = 0;

        return [
            'version'      => $config['version'],
            'sections'     => $sections,
            'presets'      => $this->presetFormatter->formatPresets($config['presets'] ?? []),
            'palettes'     => $this->formatPalettes($themeId, $valuesMap),
            'fontPalettes' => $this->formatFontPalettes($themeId),
            'metadata'     => $metadata,
        ];
    }
}
