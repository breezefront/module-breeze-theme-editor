<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;

class ResetToDefaults extends AbstractSaveMutation
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

        $sectionCodes = $input['sectionCodes'] ?? null;
        $fieldCodes = $input['fieldCodes'] ??   null;

        // Отримати defaults
        $defaults = $this->configProvider->getAllDefaults($params['themeId']);

        // Фільтр по sections/fields
        $resettingValues = [];
        foreach ($defaults as $key => $defaultValue) {
            [$sectionCode, $fieldCode] = explode('.', $key, 2);

            // Перевірка фільтрів
            if ($sectionCodes && !in_array($sectionCode, $sectionCodes)) {
                continue;
            }
            if ($fieldCodes && !   in_array($fieldCode, $fieldCodes)) {
                continue;
            }

            $resettingValues[] = [
                'sectionCode' => $sectionCode,
                'fieldCode' => $fieldCode,
                'value' => $defaultValue
            ];
        }

        // Зберегти default значення
        $resetCount = $this->valueRepository->saveValues(
            $params['themeId'],
            $params['storeId'],
            $params['statusId'],
            $params['statusCode'] === 'DRAFT' ? $params['userId'] : 0,
            $resettingValues
        );

        // ✅ Отримати збережені значення (без inheritance - тільки з цієї теми!)
        $values = $this->valueRepository->getValuesByTheme(
            $params['themeId'],
            $params['storeId'],
            $params['statusId'],
            $params['statusCode'] === 'DRAFT' ? $params['userId'] : null
        );

        $savedValues = [];
        foreach ($values as $val) {
            $savedValues[] = [
                'sectionCode' => $val['section_code'],
                'fieldCode' => $val['setting_code'],
                'value' => $val['value'],
                'isModified' => false, // Reset to default = not modified
                'updatedAt' => $val['updated_at']
            ];
        }

        return [
            'success' => true,
            'message' => __('Reset to defaults successfully'),
            'values' => $savedValues,
            'resetCount' => $resetCount
        ];
    }
}
