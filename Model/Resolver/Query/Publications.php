<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SortOrder;
use Magento\Framework\Api\SortOrderBuilder;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\AdminUserLoader;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * Get publication history
 * 
 * ACL: Inherits ::editor_view from AbstractQueryResolver
 */
class Publications extends AbstractQueryResolver
{
    public function __construct(
        private PublicationRepositoryInterface $publicationRepository,
        private UserResolver $userResolver,
        private ThemeResolver $themeResolver,
        private SearchCriteriaBuilder $searchCriteriaBuilder,
        private SortOrderBuilder $sortOrderBuilder,
        private AdminUserLoader $adminUserLoader
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $scope = $args['scope']['type'] ?? 'stores';
        $scopeId = (int)($args['scope']['scopeId'] ?? 0);
        $themeId = isset($args['themeId'])
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($scopeId);

        $pageSize = $args['pageSize'] ?? 20;
        $currentPage = $args['currentPage'] ?? 1;
        $search = $args['search'] ?? null;

        // Формуємо SearchCriteria замість старого array getList!
        $this->searchCriteriaBuilder->addFilter('theme_id', $themeId);
        $this->searchCriteriaBuilder->addFilter('scope', $scope);
        $this->searchCriteriaBuilder->addFilter('store_id', $scopeId);

        if ($search) {
            $this->searchCriteriaBuilder->addFilter('title', "%$search%", 'like');
        }

        $sortOrder = $this->sortOrderBuilder
            ->setField('published_at')
            ->setDirection(SortOrder::SORT_DESC)
            ->create();

        $this->searchCriteriaBuilder->addSortOrder($sortOrder);

        $this->searchCriteriaBuilder->setPageSize($pageSize);
        $this->searchCriteriaBuilder->setCurrentPage($currentPage);

        $criteria = $this->searchCriteriaBuilder->create();

        $searchResults = $this->publicationRepository->getList($criteria);

        // Collect all user IDs for batch loading
        $userIds = [];
        foreach ($searchResults->getItems() as $publication) {
            $userIds[] = $publication->getPublishedBy();
        }
        
        // Load all user data in one query
        $usersData = $this->adminUserLoader->getMultipleUsersData(array_unique($userIds));

        $items = [];
        foreach ($searchResults->getItems() as $publication) {
            $publishedBy = $publication->getPublishedBy();
            $userData = $usersData[$publishedBy] ?? null;
            
            $items[] = [
                'publicationId' => $publication->getPublicationId(),
                'themeId' => $publication->getThemeId(),
                'scope' => $publication->getScope(),
                'scopeId' => $publication->getStoreId(),
                'title' => $publication->getTitle(),
                'description' => $publication->getDescription(),
                'publishedAt' => $publication->getPublishedAt(),
                'publishedBy' => $publishedBy,
                'publishedByName' => $userData['fullname'] ?? $userData['username'] ?? null,
                'publishedByEmail' => $userData['email'] ?? null,
                'isRollback' => (bool)$publication->getIsRollback(),
                'rollbackFrom' => $publication->getRollbackFrom(),
                'changesCount' => $publication->getChangesCount(),
                'changes' => null, // Не завантажувати тут (окремий query)
                'canRollback' => true
            ];
        }

        return [
            'items' => $items,
            'total_count' => $searchResults->getTotalCount(),
            'page_info' => [
                'page_size' => $pageSize,
                'current_page' => $currentPage,
                'total_pages' => (int)ceil($searchResults->getTotalCount() / $pageSize)
            ]
        ];
    }
}
