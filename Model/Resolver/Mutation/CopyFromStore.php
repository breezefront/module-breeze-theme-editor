<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\StatusCode;

class CopyFromStore extends AbstractSaveMutation
{
    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        $input = $args['input'];

        $fromScopeVO = $this->scopeFactory->fromInput($input['from'] ?? []);
        $toScopeVO   = $this->scopeFactory->fromInput($input['to']   ?? []);
        $sectionCodes = $input['sectionCodes'] ?? null;

        if ($fromScopeVO->getType() === $toScopeVO->getType() &&
            $fromScopeVO->getScopeId() === $toScopeVO->getScopeId()
        ) {
            throw new GraphQlInputException(
                __('Cannot copy from the same scope/scopeId')
            );
        }

        // Use base method for target scope
        $params = $this->prepareBaseParams([
            'scope'   => $input['to'],
            'status'  => $input['status'] ?? StatusCode::DRAFT
        ], $context);

        // Determine themeId for source scope
        $fromThemeId = $this->themeResolver->getThemeIdByScope($fromScopeVO);

        // Copy published values from source scope via ValueService
        $fromStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);

        $copiedCount = $this->valueService->copyValues(
            $fromThemeId,
            $fromScopeVO,
            $fromStatusId,
            null, // Published values have no userId
            $params['themeId'],
            $params['scope'],
            $params['statusId'],
            $this->getDraftUserIdForSave($params),
            $sectionCodes
        );

        // Retrieve copied values via ValueService
        $values = $this->valueService->getValuesByTheme(
            $params['themeId'],
            $params['scope'],
            $params['statusId'],
            $this->getDraftUserId($params)
        );

        // Filter by sections if needed
        if ($sectionCodes) {
            $values = array_filter($values, function ($val) use ($sectionCodes) {
                return in_array($val['section_code'], $sectionCodes);
            });
        }

        return [
            'success' => true,
            'message' => __('Successfully copied settings from %1/%2 to %3/%4', $fromScopeVO->getType(), $fromScopeVO->getScopeId(), $toScopeVO->getType(), $toScopeVO->getScopeId()),
            'values' => $this->valuesToGraphQl(array_values($values), true),
            'copiedCount' => $copiedCount
        ];
    }
}
