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
        ?array $value = null,
        ?array $args = null
    ) {
        $input = $args['input'];

        // Use base method
        $params = $this->prepareBaseParams($input, $context);

        $sectionCodes = $input['sectionCodes'] ?? null;
        $fieldCodes = $input['fieldCodes'] ?? null;

        // Get all current default values from config
        $defaults = $this->configProvider->getAllDefaults($params['themeId']);

        // Filter by sections/fields and collect ValueInterface[]
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
            $valueModel->setScope($params['scope']->getType());
            $valueModel->setStoreId($params['scope']->getScopeId());
            $valueModel->setStatusId($params['statusId']);
            $valueModel->setSectionCode($sectionCode);
            $valueModel->setSettingCode($fieldCode);
            $valueModel->setValue($defaultValue);

            // For published user_id = 0, for draft use current user
            $valueModel->setUserId($this->getDraftUserIdForSave($params));

            $valueModels[] = $valueModel;
        }

        // Save default values using the modern method
        $resetCount = $this->valueRepository->saveMultiple($valueModels);

        // Retrieve saved values via ValueService
        $values = $this->valueService->getValuesByTheme(
            $params['themeId'],
            $params['scope'],
            $params['statusId'],
            $this->getDraftUserId($params)
        );

        return [
            'success' => true,
            'message' => __('Reset to defaults successfully'),
            'values' => $this->valuesToGraphQl($values, false),
            'resetCount' => $resetCount
        ];
    }
}
