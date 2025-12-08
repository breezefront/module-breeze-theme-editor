<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

class DiscardDraft implements ResolverInterface
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
        $userId = $this->userResolver->getCurrentUserId();

        $draftStatusId = $this->statusProvider->getStatusId('DRAFT');

        // Видалити draft значення через ValueService
        $discardedCount = $this->valueService->deleteValues(
            $themeId,
            $storeId,
            $draftStatusId,
            $userId,
            $sectionCodes
        );

        return [
            'success' => true,
            'message' => __('Draft changes discarded successfully'),
            'discardedCount' => $discardedCount
        ];
    }
}
