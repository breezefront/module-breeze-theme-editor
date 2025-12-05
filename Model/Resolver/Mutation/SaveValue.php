<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;

class SaveValue extends AbstractSaveMutation
{
    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $input = $args['input'];

        // ✅ Використати базовий метод
        $params = $this->prepareBaseParams($input);

        $sectionCode = $input['sectionCode'];
        $fieldCode = $input['fieldCode'];
        $newValue = $input['value'];

        // Зберегти значення
        $this->valueRepository->saveValue(
            $params['themeId'],
            $params['storeId'],
            $params['statusId'],
            $params['userId'],
            $sectionCode,
            $fieldCode,
            $newValue
        );

        // Отримати default для isModified
        $defaults = $this->configProvider->getAllDefaults($params['themeId']);
        $defaultValue = $defaults[$sectionCode .  '.' . $fieldCode] ?? null;

        return [
            'success' => true,
            'message' => __('Value saved successfully'),
            'value' => [
                'sectionCode' => $sectionCode,
                'fieldCode' => $fieldCode,
                'value' => $newValue,
                'isModified' => $newValue !== $defaultValue,
                'updatedAt' => date('Y-m-d H:i:s')
            ]
        ];
    }
}
