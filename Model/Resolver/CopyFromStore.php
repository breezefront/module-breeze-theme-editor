<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\StatusProvider;
use Swissup\BreezeThemeEditor\Model\UserResolver;
use Swissup\BreezeThemeEditor\Model\ThemeResolver;

class CopyFromStore implements ResolverInterface
{
    public function __construct(
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider,
        private UserResolver $userResolver,
        private ThemeResolver $themeResolver
    ) {}

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
        $statusCode = $input['status'] ?? 'DRAFT';
        $sectionCodes = $input['sectionCodes'] ?? null;
        $overwriteExisting = $input['overwriteExisting'] ?? true;

        if ($fromStoreId === $toStoreId) {
            throw new GraphQlInputException(
                __('Cannot copy from the same store')
            );
        }

        $userId = $this->userResolver->getCurrentUserId();
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // Визначити themeId для обох stores
        $fromThemeId = $this->themeResolver->getThemeIdByStoreId($fromStoreId);
        $toThemeId = $this->themeResolver->getThemeIdByStoreId($toStoreId);

        // Копіювати published values з source store
        $fromStatusId = $this->statusProvider->getStatusId('PUBLISHED');

        $copiedCount = $this->valueRepository->copyValues(
            $fromThemeId,
            $fromStoreId,
            $fromStatusId,
            null, // Published values не мають userId
            $toThemeId,
            $toStoreId,
            $statusId,
            $userId,
            $sectionCodes
        );

        // Отримати скопійовані values
        $copiedValues = [];
        if ($statusCode === 'DRAFT') {
            $values = $this->valueRepository->getDraftValues($toThemeId, $toStoreId, $userId);
        } else {
            $values = $this->valueRepository->getPublishedValues($toThemeId, $toStoreId);
        }

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
