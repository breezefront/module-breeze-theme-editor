<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\ResourceModel\Status;

use Magento\Framework\Model\ResourceModel\Db\Collection\AbstractCollection;
use Swissup\BreezeThemeEditor\Api\Data\StatusInterface;
use Swissup\BreezeThemeEditor\Model\Status;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Status as StatusResource;

class Collection extends AbstractCollection
{
    protected $_idFieldName = StatusInterface::STATUS_ID;

    protected function _construct()
    {
        $this->_init(Status::class, StatusResource::class);
    }

    /**
     * Add order by sort_order
     */
    public function addSortOrderSort(): self
    {
        return $this->setOrder(StatusInterface::SORT_ORDER, 'ASC');
    }

    /**
     * Filter by code
     */
    public function addCodeFilter(string $code): self
    {
        $this->addFieldToFilter(StatusInterface::CODE, $code);
        return $this;
    }
}
