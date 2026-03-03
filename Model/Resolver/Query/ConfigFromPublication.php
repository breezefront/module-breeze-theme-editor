<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\Api\SearchCriteriaBuilderFactory;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;

/**
 * Get theme configuration from specific publication
 * 
 * ACL: Inherits ::editor_view from AbstractConfigResolver -> AbstractQueryResolver
 */
class ConfigFromPublication extends AbstractConfigResolver
{
    use PublicationChangelogTrait;

    public function __construct(
        SerializerInterface $serializer,
        ConfigProvider $configProvider,
        PaletteProvider $paletteProvider,
        FontPaletteProvider $fontPaletteProvider,
        ColorFormatResolver $colorFormatResolver,
        ColorFormatter $colorFormatter,
        private ThemeResolver $themeResolver,
        private PublicationRepositoryInterface $publicationRepository,
        private ChangelogRepositoryInterface $changelogRepository,
        private SearchCriteriaBuilderFactory $searchCriteriaBuilderFactory
    ) {
        parent::__construct($serializer, $configProvider, $paletteProvider, $fontPaletteProvider, $colorFormatResolver, $colorFormatter);
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        // 1. Validate publicationId
        if (!isset($args['publicationId']) || !$args['publicationId']) {
            throw new GraphQlInputException(__('publicationId is required'));
        }

        $publicationId = (int)$args['publicationId'];
        $storeId = (int)$args['storeId'];

        // 2. Визначити theme ID
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        // 3. Перевірити, що публікація існує
        try {
            $publication = $this->publicationRepository->getById($publicationId);
        } catch (\Exception $e) {
            throw new GraphQlInputException(
                __('Publication #%1 not found', $publicationId)
            );
        }

        // 4. Отримати базовий конфіг теми
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);

        // 5. Отримати changelog публікації
        $changelog = $this->getPublicationChangelog($publicationId);

        // 6. Реконструювати values з changelog
        $valuesMap = $this->buildValuesMapFromChangelog($changelog);

        // 7. Змержити sections з values (inherited method)
        $sections = $this->mergeSectionsWithValues(
            $config['sections'] ?? [],
            $valuesMap,
            $themeId
        );

        // 8. Metadata
        $metadata = $this->configProvider->getMetadata($themeId);
        $metadata['themeVersion'] = $config['version'] ?? null;
        $metadata['lastPublished'] = $publication->getPublishedAt();
        $metadata['hasUnpublishedChanges'] = false;
        $metadata['draftChangesCount'] = 0;

        return [
            'version' => $config['version'],
            'sections' => $sections,
            'presets' => $this->formatPresets($config['presets'] ?? []),
            'palettes' => $this->formatPalettes($themeId, $valuesMap),
            'fontPalettes' => $this->formatFontPalettes($themeId),
            'metadata' => $metadata
        ];
    }
}
