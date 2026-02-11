<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

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

        // Використай базовий метод для розпакування стандартних параметрів
        $params = $this->prepareBaseParams($input, $context);

        $sectionCode = $input['sectionCode'];
        $fieldCode = $input['fieldCode'];
        $newValue = $input['value'];

        // Сучасний підхід: створення моделі та save()
        /** @var ValueInterface $valueModel */
        $valueModel = $this->valueRepository->create();
        $valueModel->setThemeId($params['themeId']);
        $valueModel->setStoreId($params['storeId']);
        $valueModel->setStatusId($params['statusId']);
        $valueModel->setSectionCode($sectionCode);
        $valueModel->setSettingCode($fieldCode); // важливо: якщо в моделі Value використовується SettingCode, не fieldCode
        $valueModel->setValue($newValue);
        if ($params['userId'] !== null) {
            $valueModel->setUserId($params['userId']);
        }

        $this->valueRepository->save($valueModel);

        // Отримуємо default для isModified
        $defaults = $this->configProvider->getAllDefaults($params['themeId']);
        $defaultValue = $defaults[$sectionCode . '.' . $fieldCode] ?? null;

        return [
            'success' => true,
            'message' => __('Value saved successfully'),
            'value' => [
                'sectionCode' => $sectionCode,
                'fieldCode'   => $fieldCode,
                'value'       => $newValue,
                'isModified'  => $newValue !== $defaultValue,
                'updatedAt'   => date('Y-m-d H:i:s')
            ]
        ];
    }
}
