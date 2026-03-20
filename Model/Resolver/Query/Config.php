<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Exception\GraphQlNoSuchEntityException;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * Get theme configuration with current values
 * 
 * ACL: Inherits ::editor_view from AbstractConfigResolver -> AbstractQueryResolver
 */
class Config extends AbstractConfigResolver
{
    public function __construct(
        SerializerInterface $serializer,
        ConfigProvider $configProvider,
        PaletteProvider $paletteProvider,
        FontPaletteProvider $fontPaletteProvider,
        ColorFormatResolver $colorFormatResolver,
        ColorFormatter $colorFormatter,
        private ValueInheritanceResolver $valueInheritanceResolver,
        private StatusProvider $statusProvider,
        private CompareProvider $compareProvider,
        private ThemeResolver $themeResolver,
        private UserResolver $userResolver,
        private ScopeFactory $scopeFactory
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
        // 1. Отримати userId
        $userId = $this->userResolver->getCurrentUserId($context);

        // 2. Отримати scope / scopeId
        $scope = $this->scopeFactory->fromInput($args['scope'] ?? []);

        // 3. Визначити theme ID
        try {
            $themeId = isset($args['themeId'])
                ? (int)$args['themeId']
                : $this->themeResolver->getThemeIdByScope($scope);
        } catch (LocalizedException $e) {
            throw new GraphQlInputException(__($e->getMessage()));
        }

        // 4. Визначити статус
        $statusCode = $args['status'] ?? StatusCode::PUBLISHED;

        // Validate: PUBLICATION not supported for this query
        if ($statusCode === 'PUBLICATION') {
            throw new GraphQlInputException(
                __('PUBLICATION status is not supported. Use breezeThemeEditorConfigFromPublication query instead.')
            );
        }

        try {
            $statusId = $this->statusProvider->getStatusId($statusCode);
        } catch (\Exception $e) {
            throw new GraphQlInputException(__($e->getMessage()));
        }

        // 5. Отримати конфігурацію з inheritance
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);

        // 6. Отримати збережені значення через InheritanceResolver
        // For DRAFT: merge published values (base) + draft overrides so that fields
        // without a draft row still display the published value, not the theme default.
        if ($statusCode === StatusCode::PUBLISHED) {
            $savedValues = $this->valueInheritanceResolver->resolveAllValues($themeId, $scope, $statusId, null);
        } else {
            $publishedStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);
            $savedValues = $this->valueInheritanceResolver->resolveAllValuesWithFallback(
                $themeId,
                $scope,
                $statusId,
                $publishedStatusId,
                $userId
            );
        }

        // 7. Build values map
        $valuesMap = [];
        foreach ($savedValues as $val) {
            $key = $val['section_code'] . '.' . $val['setting_code'];
            $valuesMap[$key] = $val['value'];
        }

        // 8. Змержити конфіг + значення (inherited method)
        $sections = $this->mergeSectionsWithValues(
            $config['sections'] ?? [],
            $valuesMap,
            $themeId
        );

        // 9. Metadata з ConfigProvider
        $metadata = $this->configProvider->getMetadata($themeId);
        $metadata['themeVersion'] = $config['version'] ?? null;
        $metadata['lastPublished'] = null;
        $metadata['hasUnpublishedChanges'] = false;
        $metadata['draftChangesCount'] = 0;
        $metadata['modifiedCount'] = 0;

        // 10. Якщо жодна тема в ієрархії не має settings.json — повідомити явно.
        //     GraphQlNoSuchEntityException не маскується в production (на відміну від GraphQlInputException).
        if (empty($config['sections'])) {
            $themeName = $metadata['themeName'] ?? (string)$themeId;
            throw new GraphQlNoSuchEntityException(
                __('Theme editor configuration file not found for theme: %1', $themeName)
            );
        }

        // 11. Якщо draft - перевірити зміни
        if ($statusCode === StatusCode::DRAFT) {
            $comparison = $this->compareProvider->compare($themeId, $scope, $userId);
            $metadata['hasUnpublishedChanges'] = $comparison['hasChanges'];
            $metadata['draftChangesCount'] = $comparison['changesCount'];
        }

        // 12. Порахувати modifiedCount — кількість опублікованих полів що відрізняються від defaults
        //     Обчислюється з поточних $sections (вже змержених з saved values).
        //     Для DRAFT-запиту metadata-loader робить окремий PUBLISHED запит.
        $modifiedCount = 0;
        foreach ($sections as $section) {
            foreach (($section['fields'] ?? []) as $f) {
                if (!empty($f['isModified'])) {
                    $modifiedCount++;
                }
            }
        }
        $metadata['modifiedCount'] = $modifiedCount;

        return [
            'version' => $config['version'] ?? '1.0',
            'sections' => $sections,
            'presets' => $this->formatPresets($config['presets'] ?? []),
            'palettes' => $this->formatPalettes($themeId, $valuesMap),
            'fontPalettes' => $this->formatFontPalettes($themeId),
            'metadata' => $metadata
        ];
    }
}
