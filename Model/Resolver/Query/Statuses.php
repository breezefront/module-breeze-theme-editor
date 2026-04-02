<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Api\StatusRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * Get available statuses
 * 
 * ACL: Inherits ::editor_view from AbstractQueryResolver
 */
class Statuses extends AbstractQueryResolver
{
    public function __construct(
        private StatusRepositoryInterface $statusRepository,
        private SearchCriteriaBuilder $searchCriteriaBuilder
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        $criteria = $this->searchCriteriaBuilder->create();
        $searchResults = $this->statusRepository->getList($criteria);

        $result = [];
        foreach ($searchResults->getItems() as $status) {
            $result[] = [
                'code' => $status->getCode(),
                'label' => $status->getLabel(),
                'sortOrder' => (int) $status->getSortOrder()
            ];
        }

        return $result;
    }
}
