<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

class Publications implements ResolverInterface
{
    public function __construct(
        private PublicationRepositoryInterface $publicationRepository,
        private UserResolver $userResolver,
        private ThemeResolver $themeResolver,
        private SearchCriteriaBuilder $searchCriteriaBuilder // <-- додати DI!
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

        $pageSize = $args['pageSize'] ?? 20;
        $currentPage = $args['currentPage'] ?? 1;
        $search = $args['search'] ?? null;

        // Формуємо SearchCriteria замість старого array getList!
        $this->searchCriteriaBuilder->addFilter('theme_id', $themeId);
        $this->searchCriteriaBuilder->addFilter('store_id', $storeId);

        if ($search) {
            $this->searchCriteriaBuilder->addFilter('title', "%$search%", 'like');
        }

        $this->searchCriteriaBuilder->setPageSize($pageSize);
        $this->searchCriteriaBuilder->setCurrentPage($currentPage);

        $criteria = $this->searchCriteriaBuilder->create();

        $searchResults = $this->publicationRepository->getList($criteria);

        $items = [];
        foreach ($searchResults->getItems() as $publication) {
            $items[] = [
                'publicationId' => $publication->getPublicationId(),
                'themeId' => $publication->getThemeId(),
                'storeId' => $publication->getStoreId(),
                'title' => $publication->getTitle(),
                'description' => $publication->getDescription(),
                'publishedAt' => $publication->getPublishedAt(),
                'publishedBy' => $publication->getPublishedBy(),
                'publishedByName' => null, // TODO: отримати з admin_user
                'publishedByEmail' => null, // TODO: отримати з admin_user
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
