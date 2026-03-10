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

        $fromScope   = $input['from']['type']    ?? 'stores';
        $fromScopeId = (int)($input['from']['scopeId'] ?? 0);
        $toScope     = $input['to']['type']      ?? 'stores';
        $toScopeId   = (int)($input['to']['scopeId']   ?? 0);
        $sectionCodes = $input['sectionCodes'] ?? null;

        if ($fromScope === $toScope && $fromScopeId === $toScopeId) {
            throw new GraphQlInputException(
                __('Cannot copy from the same scope/scopeId')
            );
        }

        // Використати базовий метод для target scope
        $params = $this->prepareBaseParams([
            'scope'   => ['type' => $toScope, 'scopeId' => $toScopeId],
            'status'  => $input['status'] ?? 'DRAFT'
        ], $context);

        // Визначити themeId для source scope
        $fromThemeId = $this->themeResolver->getThemeIdByScope($fromScope, $fromScopeId);

        // Копіювати published values з source scope через ValueService
        $fromStatusId = $this->statusProvider->getStatusId('PUBLISHED');

        $copiedCount = $this->valueService->copyValues(
            $fromThemeId,
            $fromScope,
            $fromScopeId,
            $fromStatusId,
            null, // Published values не мають userId
            $params['themeId'],
            $toScope,
            $toScopeId,
            $params['statusId'],
            $params['statusCode'] === 'DRAFT' ? $params['userId'] : 0,
            $sectionCodes
        );

        // Отримати скопійовані values через ValueService
        $values = $this->valueService->getValuesByTheme(
            $params['themeId'],
            $toScope,
            $toScopeId,
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
            'message' => __('Successfully copied settings from %1/%2 to %3/%4', $fromScope, $fromScopeId, $toScope, $toScopeId),
            'values' => $copiedValues,
            'copiedCount' => $copiedCount
        ];
    }
}
