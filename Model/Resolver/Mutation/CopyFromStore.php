<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;

class CopyFromStore extends AbstractSaveMutation
{
    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $input = $args['input'];

        $fromStoreId = (int)$input['fromStoreId'];
        $toStoreId = (int)$input['toStoreId'];
        $sectionCodes = $input['sectionCodes'] ?? null;
        $overwriteExisting = $input['overwriteExisting'] ?? true;

        if ($fromStoreId === $toStoreId) {
            throw new GraphQlInputException(
                __('Cannot copy from the same store')
            );
        }

        // Використати базовий метод для target store
        $params = $this->prepareBaseParams([
            'storeId' => $toStoreId,
            'themeId' => $input['themeId'] ?? null,
            'status' => $input['status'] ??  'DRAFT'
        ]);

        // Визначити themeId для source store
        $fromThemeId = $this->themeResolver->getThemeIdByStoreId($fromStoreId);

        // Копіювати published values з source store через ValueService
        $fromStatusId = $this->statusProvider->getStatusId('PUBLISHED');

        $copiedCount = $this->valueService->copyValues(
            $fromThemeId,
            $fromStoreId,
            $fromStatusId,
            null, // Published values не мають userId
            $params['themeId'],
            $toStoreId,
            $params['statusId'],
            $params['statusCode'] === 'DRAFT' ? $params['userId'] : 0,
            $sectionCodes
        );

        // Отримати скопійовані values через ValueService
        $values = $this->valueService->getValuesByTheme(
            $params['themeId'],
            $toStoreId,
            $params['statusId'],
            $params['statusCode'] === 'DRAFT' ? $params['userId'] : null
        );

        $copiedValues = [];
        foreach ($values as $val) {
            if ($sectionCodes && !in_array($val['section_code'], $sectionCodes)) {
                continue;
            }

            $copiedValues[] = [
                'sectionCode' => $val['section_code'],
                'fieldCode' => $val['setting_code'],
                'value' => $val['value'],
                'isModified' => true,
                'updatedAt' => $val['updated_at']
            ];
        }

        return [
            'success' => true,
            'message' => __('Successfully copied settings from store %1 to store %2', $fromStoreId, $toStoreId),
            'values' => $copiedValues,
            'copiedCount' => $copiedCount
        ];
    }
}
