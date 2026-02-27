<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;

/**
 * Discard draft changes
 * 
 * ACL: Inherits ::editor_edit from AbstractMutationResolver
 */
class DiscardDraft extends AbstractMutationResolver
{
    public function __construct(
        private ValueService $valueService,
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
        $storeId = (int)$args['storeId'];
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $sectionCodes = $args['sectionCodes'] ??  null;
        $fieldCodes   = $args['fieldCodes']   ?? null;
        $userId = $this->userResolver->getCurrentUserId($context);

        $draftStatusId = $this->statusProvider->getStatusId('DRAFT');

        // Видалити draft значення через ValueService
        $discardedCount = $this->valueService->deleteValues(
            $themeId,
            $storeId,
            $draftStatusId,
            $userId,
            $sectionCodes,
            $fieldCodes
        );

        return [
            'success' => true,
            'message' => __('Draft changes discarded successfully'),
            'discardedCount' => $discardedCount
        ];
    }
}
