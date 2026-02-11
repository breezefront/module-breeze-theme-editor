<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Service\PresetService;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * Get available presets from theme config
 * 
 * ACL: Inherits ::editor_view from AbstractQueryResolver
 */
class Presets extends AbstractQueryResolver
{
    public function __construct(
        private ConfigProvider $configProvider,
        private ThemeResolver $themeResolver,
        private PresetService $presetManager
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $storeId = (int)$args['storeId'];
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        // Use getConfigurationWithInheritance to get presets from parent themes
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $presets = $config['presets'] ?? [];

        if (empty($presets)) {
            return [];
        }

        $result = [];
        foreach ($presets as $preset) {
            // Get parsed values through PresetService
            $values = $this->presetManager->getPresetValues($themeId, $preset['id']);

            $settings = [];
            foreach ($values as $val) {
                $settings[] = [
                    'sectionCode' => $val['sectionCode'],
                    'fieldCode' => $val['fieldCode'],
                    'value' => $val['value'],
                    'isModified' => false,
                    'updatedAt' => null
                ];
            }

            $result[] = [
                'id' => $preset['id'],
                'name' => $preset['name'],
                'description' => $preset['description'] ?? '',
                'preview' => $preset['preview'] ?? null,
                'settings' => $settings
            ];
        }

        return $result;
    }
}
