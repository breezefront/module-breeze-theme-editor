<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;

class SaveValues extends AbstractSaveMutation
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

        $values = $input['values'];

        // Зберегти всі значення (batch)
        $savedCount = $this->valueRepository->saveValues(
            $params['themeId'],
            $params['storeId'],
            $params['statusId'],
            $params['userId'],
            $values
        );

        // Отримати defaults для isModified
        $defaults = $this->configProvider->getAllDefaults($params['themeId']);

        $result = [];
        foreach ($values as $val) {
            $key = $val['sectionCode'] . '.' . $val['fieldCode'];
            $defaultValue = $defaults[$key] ??  null;

            $result[] = [
                'sectionCode' => $val['sectionCode'],
                'fieldCode' => $val['fieldCode'],
                'value' => $val['value'],
                'isModified' => $val['value'] !== $defaultValue,
                'updatedAt' => date('Y-m-d H:i:s')
            ];
        }

        return [
            'success' => true,
            'message' => __('%1 values saved successfully', $savedCount),
            'values' => $result,
            'validation_errors' => []
        ];
    }
}
