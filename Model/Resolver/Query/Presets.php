<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Service\PresetService;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
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
        private PresetService $presetManager,
        private ScopeFactory $scopeFactory
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $scope = $this->scopeFactory->create(
            $args['scope']['type'] ?? 'stores',
            (int)($args['scope']['scopeId'] ?? 0)
        );
        $themeId = $this->themeResolver->getThemeIdByScope($scope);

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
