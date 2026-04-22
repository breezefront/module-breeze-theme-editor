<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

class SaveValues extends AbstractSaveMutation
{
    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        $input = $args['input'];

        // Парсимо стандартні параметри
        $params = $this->prepareBaseParams($input, $context);
        $values = $input['values'];

        // Формуємо масив ValueInterface моделей
        $valueModels = [];
        foreach ($values as $val) {
            /** @var ValueInterface $valueModel */
            $valueModel = $this->valueRepository->create();
            $valueModel->setThemeId($params['themeId']);
            $valueModel->setScope($params['scope']->getType());
            $valueModel->setStoreId($params['scope']->getScopeId());
            $valueModel->setStatusId($params['statusId']);
            $valueModel->setSectionCode($val['sectionCode']);
            $valueModel->setSettingCode($val['fieldCode']); // NOTICE: у ValueInterface поле скоріш за все називається SettingCode, а не fieldCode
            $valueModel->setValue($val['value']);
            $valueModel->setUserId($this->getDraftUserIdForSave($params));
            $valueModels[] = $valueModel;
        }

        // Зберігаємо всі значення (batch, сучасний API)
        $savedCount = $this->valueRepository->saveMultiple($valueModels);

        // Визначаємо змінені значення (isModified)
        $defaults = $this->configProvider->getAllDefaults($params['themeId']);
        $result = [];
        foreach ($values as $val) {
            $key = $val['sectionCode'] . '.' . $val['fieldCode'];
            $defaultValue = $defaults[$key] ?? null;

            $result[] = [
                'sectionCode' => $val['sectionCode'],
                'fieldCode' => $val['fieldCode'],
                'value'      => $val['value'],
                'isModified' => $val['value'] !== $defaultValue,
                'updatedAt'  => date('Y-m-d H:i:s')
            ];
        }

        return [
            'success' => true,
            'message' => __('%1 values saved successfully', $savedCount),
            'values'  => $result,
            'validation_errors' => []
        ];
    }
}
