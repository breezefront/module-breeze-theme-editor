<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\StatusProvider;
use Swissup\BreezeThemeEditor\Model\UserResolver;
use Swissup\BreezeThemeEditor\Model\ThemeResolver;

class DiscardDraft implements ResolverInterface
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
        $storeId = (int)$args['storeId'];
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $sectionCodes = $args['sectionCodes'] ??  null;
        $userId = $this->userResolver->getCurrentUserId();

        $draftStatusId = $this->statusProvider->getStatusId('DRAFT');

        // Видалити draft значення
        if ($sectionCodes) {
            // Видалити тільки певні секції
            $discardedCount = $this->valueRepository->deleteValuesBySections(
                $themeId,
                $storeId,
                $draftStatusId,
                $userId,
                $sectionCodes
            );
        } else {
            // Видалити всі draft
            $discardedCount = $this->valueRepository->deleteValues(
                $themeId,
                $storeId,
                $draftStatusId,
                $userId
            );
        }

        return [
            'success' => true,
            'message' => __('Draft changes discarded successfully'),
            'discardedCount' => $discardedCount
        ];
    }
}
