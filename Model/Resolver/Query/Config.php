<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Exception\GraphQlNoSuchEntityException;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter;
use Swissup\BreezeThemeEditor\Model\Formatter\PresetFormatter;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * Get theme configuration with current values.
 *
 * ACL: Inherits ::editor_view from AbstractConfigResolver -> AbstractQueryResolver
 */
class Config extends AbstractConfigResolver
{
    use ResolvesValuesTrait;

    public function __construct(
        SectionFormatter $sectionFormatter,
        PresetFormatter $presetFormatter,
        PaletteProvider $paletteProvider,
        FontPaletteProvider $fontPaletteProvider,
        private ConfigProvider $configProvider,
        private ValueInheritanceResolver $valueInheritanceResolver,
        private StatusProvider $statusProvider,
        private CompareProvider $compareProvider,
        private ThemeResolver $themeResolver,
        private UserResolver $userResolver,
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
        // 1. Get userId
        $userId = $this->userResolver->getCurrentUserId($context);

        // 2. Get scope / scopeId
        $scope = $this->scopeFactory->fromInput($args['scope'] ?? []);

        // 3. Determine theme ID
        try {
            $themeId = isset($args['themeId'])
                ? (int)$args['themeId']
                : $this->themeResolver->getThemeIdByScope($scope);
        } catch (LocalizedException $e) {
            throw new GraphQlInputException(__($e->getMessage()));
        }

        // 4. Determine status
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

        // 5. Get configuration with inheritance
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);

        // 6. Get saved values via InheritanceResolver
        // For DRAFT: merge published values (base) + draft overrides so that fields
        // without a draft row still display the published value, not the theme default.
        $savedValues = $this->resolveValues($statusCode, $themeId, $scope, $statusId, $userId);

        // 7. Build values map
        $valuesMap = [];
        foreach ($savedValues as $val) {
            $key             = $val['section_code'] . '.' . $val['setting_code'];
            $valuesMap[$key] = $val['value'];
        }

        // 8. Merge config + values
        $sections = $this->sectionFormatter->mergeSectionsWithValues(
            $config['sections'] ?? [],
            $valuesMap,
            $themeId
        );

        // 8b. Auto-generate _font_palette section from font_palettes.fonts[]
        $fontPalettes = $this->formatFontPalettes($themeId);
        $fontSection  = $this->sectionFormatter->mergeFontPaletteRolesAsFields($fontPalettes, $valuesMap);
        if ($fontSection !== null) {
            $sections[] = $fontSection;
        }

        // 9. Metadata from ConfigProvider
        $metadata                          = $this->configProvider->getMetadata($themeId);
        $metadata['themeVersion']          = $config['version'] ?? null;
        $metadata['lastPublished']         = null;
        $metadata['hasUnpublishedChanges'] = false;
        $metadata['draftChangesCount']     = 0;
        $metadata['modifiedCount']         = 0;

        // 10. If no theme in the hierarchy has settings.json — report explicitly.
        //     GraphQlNoSuchEntityException is not masked in production (unlike GraphQlInputException).
        if (empty($config['sections'])) {
            $themeName = $metadata['themeName'] ?? (string)$themeId;
            throw new GraphQlNoSuchEntityException(
                __('Theme editor configuration file not found for theme: %1', $themeName)
            );
        }

        // 11. If draft - check for changes
        if ($statusCode === StatusCode::DRAFT) {
            $comparison                        = $this->compareProvider->compare($themeId, $scope, $userId);
            $metadata['hasUnpublishedChanges'] = $comparison['hasChanges'];
            $metadata['draftChangesCount']     = $comparison['changesCount'];
        }

        // 12. Count modifiedCount — number of published fields that differ from defaults.
        //     Computed from current $sections (already merged with saved values).
        //     For DRAFT requests, the metadata-loader makes a separate PUBLISHED request.
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
            'version'      => $config['version'] ?? '1.0',
            'sections'     => $sections,
            'presets'      => $this->presetFormatter->formatPresets($config['presets'] ?? []),
            'palettes'     => $this->formatPalettes($themeId, $valuesMap),
            'fontPalettes' => $this->formatFontPalettes($themeId),
            'metadata'     => $metadata,
        ];
    }
}
