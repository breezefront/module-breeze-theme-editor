<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Api\StatusRepositoryInterface;

class Statuses implements ResolverInterface
{
    public function __construct(
        private StatusRepositoryInterface $statusRepository
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $statuses = $this->statusRepository->getList();

        $result = [];
        foreach ($statuses as $status) {
            $result[] = [
                'code' => $status->getCode(),
                'label' => $status->getLabel(),
                'sortOrder' => (int)$status->getSortOrder()
            ];
        }

        return $result;
    }
}
