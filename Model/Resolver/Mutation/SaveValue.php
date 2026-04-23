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
        ?array $value = null,
        ?array $args = null
    ) {
        $input = $args['input'];

        // Use base method to unpack standard parameters
        $params = $this->prepareBaseParams($input, $context);

        $sectionCode = $input['sectionCode'];
        $fieldCode = $input['fieldCode'];
        $newValue = $input['value'];

        // Modern approach: create model and call save()
        /** @var ValueInterface $valueModel */
        $valueModel = $this->valueRepository->create();
        $valueModel->setThemeId($params['themeId']);
        $valueModel->setScope($params['scope']->getType());
        $valueModel->setStoreId($params['scope']->getScopeId());
        $valueModel->setStatusId($params['statusId']);
        $valueModel->setSectionCode($sectionCode);
        $valueModel->setSettingCode($fieldCode); // important: model Value uses SettingCode, not fieldCode
        $valueModel->setValue($newValue);
        $valueModel->setUserId($this->getDraftUserIdForSave($params));

        $this->valueRepository->save($valueModel);

        // Get default for isModified check
        $defaults = $this->configProvider->getAllDefaults($params['themeId']);
        $defaultValue = $defaults[$sectionCode . '.' . $fieldCode] ?? null;

        $valueItem = [
            'sectionCode' => $sectionCode,
            'fieldCode'   => $fieldCode,
            'value'       => $newValue,
            'isModified'  => $newValue !== $defaultValue,
            'updatedAt'   => date('Y-m-d H:i:s')
        ];

        return [
            'success' => true,
            'message' => __('Value saved successfully'),
            'value'   => $valueItem,
            'values'  => [$valueItem]
        ];
    }
}
