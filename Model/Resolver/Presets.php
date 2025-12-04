<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\ThemeResolver;

class Presets implements ResolverInterface
{
    public function __construct(
        private ConfigProvider $configProvider,
        private ThemeResolver $themeResolver,
        private SerializerInterface $serializer
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $themeId = (int)$args['themeId'];

        $config = $this->configProvider->getConfiguration($themeId);
        $presets = $config['presets'] ??  [];

        $result = [];
        foreach ($presets as $preset) {
            $settings = [];

            foreach ($preset['settings'] ??  [] as $key => $value) {
                if (strpos($key, '. ') !== false) {
                    [$sectionCode, $fieldCode] = explode('.', $key, 2);
                    $settings[] = [
                        'sectionCode' => $sectionCode,
                        'fieldCode' => $fieldCode,
                        'value' => is_string($value) ? $value : $this->serializer->serialize($value),
                        'isModified' => false,
                        'updatedAt' => null
                    ];
                }
            }

            $result[] = [
                'id' => $preset['id'],
                'name' => $preset['name'],
                'description' => $preset['description'] ?? null,
                'preview' => $preset['preview'] ??  null,
                'settings' => $settings
            ];
        }

        return $result;
    }
}
