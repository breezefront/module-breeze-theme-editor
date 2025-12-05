<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class Config implements ResolverInterface
{
    public function __construct(
        private ConfigProvider $configProvider,
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider,
        private CompareProvider $compareProvider,
        private ThemeResolver $themeResolver,
        private UserResolver $userResolver,
        private SerializerInterface $serializer
    ) {}

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
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        // 4.  Визначити статус
        $statusCode = $args['status'] ?? 'PUBLISHED';
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // ✅ Отримати конфігурацію з inheritance
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);

        // ✅ Отримати збережені значення з inheritance
        if ($statusCode === 'PUBLISHED') {
            $savedValues = $this->valueRepository->getAllValuesWithInheritance($themeId, $storeId, $statusId, null);
        } else {
            $savedValues = $this->valueRepository->getAllValuesWithInheritance($themeId, $storeId, $statusId, $userId);
        }

        // Змержити конфіг + значення
        $sections = $this->mergeSectionsWithValues(
            $config['sections'] ?? [],
            $savedValues,
            $themeId
        );

        // Metadata з ConfigProvider
        $metadata = $this->configProvider->getMetadata($themeId);
        $metadata['themeVersion'] = $config['version'] ?? null;
        $metadata['lastPublished'] = null;
        $metadata['hasUnpublishedChanges'] = false;
        $metadata['draftChangesCount'] = 0;

        // Якщо draft - перевірити зміни
        if ($statusCode === 'DRAFT') {
            $comparison = $this->compareProvider->compare($themeId, $storeId, $userId);
            $metadata['hasUnpublishedChanges'] = $comparison['hasChanges'];
            $metadata['draftChangesCount'] = $comparison['changesCount'];
        }

        return [
            'version' => $config['version'],
            'sections' => $sections,
            'presets' => $this->formatPresets($config['presets'] ?? []),
            'metadata' => $metadata
        ];
    }

    private function mergeSectionsWithValues(array $sections, array $savedValues, int $themeId): array
    {
        $valuesMap = [];
        foreach ($savedValues as $val) {
            $key = $val['section_code'] . '.' . $val['setting_code'];
            $valuesMap[$key] = $val['value'];
        }

        $defaults = $this->configProvider->getAllDefaults($themeId);

        $result = [];
        $order = 0;

        foreach ($sections as $section) {
            $fields = [];

            foreach ($section['settings'] ??  [] as $setting) {
                $key = $section['id'] . '.' . $setting['id'];
                $currentValue = $valuesMap[$key] ?? null;
                $defaultValue = $defaults[$key] ?? ($setting['default'] ?? null);

                $fields[] = [
                    'code' => $setting['id'],
                    'label' => $setting['label'],
                    'type' => strtoupper($setting['type']),
                    'description' => $setting['description'] ??  null,
                    'value' => $currentValue,
                    'default' => $this->encodeValue($defaultValue),
                    'isModified' => $currentValue !== null && $currentValue !== $defaultValue,
                    'cssVar' => $setting['css_var'] ?? null,
                    'required' => $setting['required'] ??  false,
                    'validation' => $this->formatValidation($setting),
                    'placeholder' => $setting['placeholder'] ??  null,
                    'helpText' => $setting['help_text'] ?? null,
                    'params' => $this->formatParams($setting),
                    'dependsOn' => $this->formatDependency($setting)
                ];
            }

            $result[] = [
                'code' => $section['id'],
                'label' => $section['name'],
                'icon' => $section['icon'] ??  null,
                'description' => $section['description'] ??  null,
                'fields' => $fields,
                'order' => $section['order'] ?? $order++
            ];
        }

        return $result;
    }

    private function formatValidation(array $setting): ?  array
    {
        $validation = [];

        if (isset($setting['minLength'])) {
            $validation['minLength'] = $setting['minLength'];
        }
        if (isset($setting['maxLength'])) {
            $validation['maxLength'] = $setting['maxLength'];
        }
        if (isset($setting['min'])) {
            $validation['min'] = (float)$setting['min'];
        }
        if (isset($setting['max'])) {
            $validation['max'] = (float)$setting['max'];
        }
        if (isset($setting['pattern'])) {
            $validation['pattern'] = $setting['pattern'];
        }
        if (isset($setting['validationMessage'])) {
            $validation['message'] = $setting['validationMessage'];
        }

        return empty($validation) ? null : $validation;
    }

    private function formatParams(array $setting): ?  array
    {
        $params = [];

        if (isset($setting['min'])) {
            $params['min'] = (float)$setting['min'];
        }
        if (isset($setting['max'])) {
            $params['max'] = (float)$setting['max'];
        }
        if (isset($setting['step'])) {
            $params['step'] = (float)$setting['step'];
        }
        if (isset($setting['unit'])) {
            $params['unit'] = $setting['unit'];
        }
        if (isset($setting['options'])) {
            $params['options'] = $this->formatOptions($setting['options']);
        }
        if (isset($setting['language'])) {
            $params['language'] = $setting['language'];
        }
        if (isset($setting['fallback'])) {
            $params['fallback'] = $setting['fallback'];
        }
        if (isset($setting['fontWeights'])) {
            $params['fontWeights'] = $setting['fontWeights'];
        }
        if (isset($setting['platforms'])) {
            $params['platforms'] = $setting['platforms'];
        }
        if (isset($setting['maxItems'])) {
            $params['maxItems'] = $setting['maxItems'];
        }
        if (isset($setting['allowedExtensions'])) {
            $params['allowedExtensions'] = $setting['allowedExtensions'];
        }
        if (isset($setting['maxFileSize'])) {
            $params['maxFileSize'] = $setting['maxFileSize'];
        }
        if (isset($setting['sides'])) {
            $params['sides'] = $setting['sides'];
        }

        return empty($params) ? null : $params;
    }

    private function formatOptions(array $options): array
    {
        $result = [];
        foreach ($options as $option) {
            $result[] = [
                'label' => $option['label'],
                'value' => $option['value'],
                'icon' => $option['icon'] ??  null,
                'preview' => $option['preview'] ?? null
            ];
        }
        return $result;
    }

    private function formatDependency(array $setting): ?  array
    {
        if (! isset($setting['dependsOn'])) {
            return null;
        }

        $dep = $setting['dependsOn'];

        return [
            'fieldCode' => $dep['field'],
            'value' => $dep['value'],
            'operator' => strtoupper($dep['operator'] ?? 'EQUALS')
        ];
    }

    private function formatPresets(array $presets): array
    {
        $result = [];
        foreach ($presets as $preset) {
            $result[] = [
                'id' => $preset['id'],
                'name' => $preset['name'],
                'description' => $preset['description'] ?? null,
                'preview' => $preset['preview'] ?? null,
                'settings' => $this->formatPresetSettings($preset['settings'] ??  [])
            ];
        }
        return $result;
    }

    private function formatPresetSettings(array $settings): array
    {
        $result = [];
        foreach ($settings as $key => $value) {
            if (strpos($key, '. ') !== false) {
                [$sectionCode, $fieldCode] = explode('.', $key, 2);
                $result[] = [
                    'sectionCode' => $sectionCode,
                    'fieldCode' => $fieldCode,
                    'value' => is_string($value) ? $value : $this->serializer->serialize($value),
                    'isModified' => false,
                    'updatedAt' => null
                ];
            }
        }
        return $result;
    }

    private function encodeValue($value): ? string
    {
        if ($value === null) {
            return null;
        }

        return is_string($value) ? $value : $this->serializer->serialize($value);
    }
}
