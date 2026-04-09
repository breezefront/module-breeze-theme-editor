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
}
