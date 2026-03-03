<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * Abstract base class for Config resolvers
 * Contains shared formatting logic to avoid code duplication
 * 
 * Extends AbstractQueryResolver to inherit ACL permission checking
 */
abstract class AbstractConfigResolver extends AbstractQueryResolver
{
    public function __construct(
        protected SerializerInterface $serializer,
        protected ConfigProvider $configProvider,
        protected PaletteProvider $paletteProvider,
        protected ColorFormatResolver $colorFormatResolver,
        protected ColorFormatter $colorFormatter
    ) {}

    /**
     * Merge sections with values
     */
    protected function mergeSectionsWithValues(array $sections, array $valuesMap, int $themeId): array
    {
        $defaults = $this->configProvider->getAllDefaults($themeId);

        $result = [];
        $order = 0;

        foreach ($sections as $section) {
            $fields = [];

            foreach (($section['settings'] ?? []) as $setting) {
                $type = strtolower($setting['type'] ?? '');

                // UI-only types (heading, etc.) carry no value — include as minimal display fields
                if ($type === 'heading') {
                    $fields[] = [
                        'code' => $setting['id'] ?? null,
                        'label' => $setting['label'] ?? null,
                        'type' => 'HEADING',
                        'description' => $setting['description'] ?? null,
                        'value' => null,
                        'default' => null,
                        'isModified' => false,
                        'property' => null,
                        'selector' => null,
                        'required' => false,
                        'validation' => null,
                        'placeholder' => null,
                        'helpText' => null,
                        'params' => null,
                        'dependsOn' => null,
                    ];
                    continue;
                }

                $key = $section['id'] . '.' . $setting['id'];
                $currentValue = $valuesMap[$key] ?? null;
                $defaultValue = $defaults[$key] ?? ($setting['default'] ?? null);

                // Resolve format early for color fields (needed for value conversion)
                $colorFormat = null;
                if ($type === 'color') {
                    $colorFormat = $this->colorFormatResolver->resolve(
                        $setting['format'] ?? null,
                        $setting['default'] ?? null
                    );
                }

                $field = [
                    'code' => $setting['id'],
                    'label' => $setting['label'],
                    'type' => strtoupper($setting['type']),
                    'description' => $setting['description'] ?? null,
                    'value' => $colorFormat !== null 
                        ? $this->colorFormatter->formatColorValue($currentValue, $colorFormat)
                        : $currentValue,
                    'default' => $this->encodeValue($defaultValue),
                    'isModified' => $currentValue !== null && $currentValue !== $defaultValue,
                    'property' => $setting['property'] ?? $setting['css_var'] ?? null,
                    'selector' => $setting['selector'] ?? null,
                    'required' => $setting['required'] ?? false,
                    'validation' => $this->formatValidation($setting),
                    'placeholder' => $setting['placeholder'] ?? null,
                    'helpText' => $setting['help_text'] ?? null,
                    'params' => $this->formatParams($setting),
                    'dependsOn' => $this->formatDependency($setting)
                ];

                // Add color-specific fields only when relevant (avoid null)
                if ($colorFormat !== null) {
                    if (isset($setting['palette'])) {
                        $field['palette'] = $setting['palette'];
                    }
                    
                    // Use the already-resolved format
                    $field['format'] = $colorFormat;
                }

                $fields[] = $field;
            }

            $result[] = [
                'code' => $section['id'],
                'label' => $section['name'],
                'icon' => $section['icon'] ?? null,
                'description' => $section['description'] ?? null,
                'fields' => $fields,
                'order' => $section['order'] ?? $order++
            ];
        }

        return $result;
    }

    /**
     * Format validation rules
     */
    protected function formatValidation(array $setting): ?array
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

    /**
     * Format field parameters
     */
    protected function formatParams(array $setting): ?array
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

            $stylesheets = [];
            foreach ($setting['options'] as $option) {
                if (!empty($option['url'])) {
                    $stylesheets[] = ['value' => $option['value'], 'url' => $option['url']];
                }
            }
            if (!empty($stylesheets)) {
                $params['fontStylesheets'] = $stylesheets;
            }
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

    /**
     * Format select/radio options
     */
    protected function formatOptions(array $options): array
    {
        $result = [];
        foreach ($options as $option) {
            $result[] = [
                'label' => $option['label'],
                'value' => $option['value'],
                'icon' => $option['icon'] ?? null,
                'preview' => $option['preview'] ?? null
            ];
        }
        return $result;
    }

    /**
     * Format field dependency
     */
    protected function formatDependency(array $setting): ?array
    {
        if (!isset($setting['dependsOn'])) {
            return null;
        }

        $dep = $setting['dependsOn'];

        return [
            'fieldCode' => $dep['field'],
            'value' => $dep['value'],
            'operator' => strtoupper($dep['operator'] ?? 'EQUALS')
        ];
    }

    /**
     * Format presets
     */
    protected function formatPresets(array $presets): array
    {
        $result = [];
        foreach ($presets as $preset) {
            $result[] = [
                'id' => $preset['id'],
                'name' => $preset['name'],
                'description' => $preset['description'] ?? null,
                'preview' => $preset['preview'] ?? null,
                'settings' => $this->formatPresetSettings($preset['settings'] ?? [])
            ];
        }
        return $result;
    }

    /**
     * Format preset settings
     */
    protected function formatPresetSettings(array $settings): array
    {
        $result = [];
        foreach ($settings as $key => $value) {
            if (strpos($key, '.') !== false) {
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

    /**
     * Encode value to string
     */
    protected function encodeValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        return is_string($value) ? $value : $this->serializer->serialize($value);
    }

    /**
     * Format palettes for GraphQL response
     *
     * @param int $themeId
     * @param array $valuesMap - Map of 'section.setting' => value (for usage count)
     * @return array
     */
    protected function formatPalettes(int $themeId, array $valuesMap = []): array
    {
        return $this->paletteProvider->getPalettes($themeId, $valuesMap);
    }
}
