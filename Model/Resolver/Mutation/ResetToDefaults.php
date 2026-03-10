<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

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

        // Використати базовий метод
        $params = $this->prepareBaseParams($input, $context);

        $sectionCodes = $input['sectionCodes'] ?? null;
        $fieldCodes = $input['fieldCodes'] ?? null;

        // Отримати всі поточні значення default з config
        $defaults = $this->configProvider->getAllDefaults($params['themeId']);

        // Фільтр по секціям/полям та зібрати ValueInterface[]
        $valueModels = [];
        foreach ($defaults as $key => $defaultValue) {
            [$sectionCode, $fieldCode] = explode('.', $key, 2);

            if ($sectionCodes && !in_array($sectionCode, $sectionCodes)) {
                continue;
            }
            if ($fieldCodes && !in_array($fieldCode, $fieldCodes)) {
                continue;
            }

            /** @var ValueInterface $valueModel */
            $valueModel = $this->valueRepository->create();
            $valueModel->setThemeId($params['themeId']);
            $valueModel->setScope($params['scope']);
            $valueModel->setStoreId($params['scopeId']);
            $valueModel->setStatusId($params['statusId']);
            $valueModel->setSectionCode($sectionCode);
            $valueModel->setSettingCode($fieldCode);
            $valueModel->setValue($defaultValue);

            // Для published user_id = 0, для draft юзай поточного
            $valueModel->setUserId($params['statusCode'] === 'DRAFT' ? $params['userId'] : 0);

            $valueModels[] = $valueModel;
        }

        // Зберегти default-значення сучасним методом
        $resetCount = $this->valueRepository->saveMultiple($valueModels);

        // Отримати збережені значення через ValueService
        $values = $this->valueService->getValuesByTheme(
            $params['themeId'],
            $params['scope'],
            $params['scopeId'],
            $params['statusId'],
            $params['statusCode'] === 'DRAFT' ? $params['userId'] : null
        );

        $savedValues = [];
        foreach ($values as $val) {
            $savedValues[] = [
                'sectionCode' => $val['section_code'],
                'fieldCode' => $val['setting_code'],
                'value' => $val['value'],
                'isModified' => false, // Reset = not modified
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
