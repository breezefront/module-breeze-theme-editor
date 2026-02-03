<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class Config extends AbstractConfigResolver implements ResolverInterface
{
    public function __construct(
        SerializerInterface $serializer,
        ConfigProvider $configProvider,
        PaletteProvider $paletteProvider,
        private ValueInheritanceResolver $valueInheritanceResolver,
        private StatusProvider $statusProvider,
        private CompareProvider $compareProvider,
        private ThemeResolver $themeResolver,
        private UserResolver $userResolver
    ) {
        parent::__construct($serializer, $configProvider, $paletteProvider);
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        // 1. Отримати userId
        $userId = $this->userResolver->getCurrentUserId();

        // 2. Отримати store ID
        $storeId = (int)$args['storeId'];

        // 3. Визначити theme ID
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int)$args['themeId']
            :  $this->themeResolver->getThemeIdByStoreId($storeId);

        // 4. Визначити статус
        $statusCode = $args['status'] ?? 'PUBLISHED';
        
        // Validate: PUBLICATION not supported for this query
        if ($statusCode === 'PUBLICATION') {
            throw new GraphQlInputException(
                __('PUBLICATION status is not supported. Use breezeThemeEditorConfigFromPublication query instead.')
            );
        }
        
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // 5. Отримати конфігурацію з inheritance
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);

        // 6. Отримати збережені значення через InheritanceResolver
        if ($statusCode === 'PUBLISHED') {
            $savedValues = $this->valueInheritanceResolver->resolveAllValues($themeId, $storeId, $statusId, null);
        } else {
            $savedValues = $this->valueInheritanceResolver->resolveAllValues($themeId, $storeId, $statusId, $userId);
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

        // 10. Якщо draft - перевірити зміни
        if ($statusCode === 'DRAFT') {
            $comparison = $this->compareProvider->compare($themeId, $storeId, $userId);
            $metadata['hasUnpublishedChanges'] = $comparison['hasChanges'];
            $metadata['draftChangesCount'] = $comparison['changesCount'];
        }

        return [
            'version' => $config['version'],
            'sections' => $sections,
            'presets' => $this->formatPresets($config['presets'] ?? []),
            'palettes' => $this->formatPalettes($themeId, $valuesMap),
            'metadata' => $metadata
        ];
    }
}
