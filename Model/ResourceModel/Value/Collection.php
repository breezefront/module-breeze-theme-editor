<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\ResourceModel\Value;

use Magento\Framework\Model\ResourceModel\Db\Collection\AbstractCollection;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Model\Value;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Value as ValueResource;

class Collection extends AbstractCollection
{
    protected $_idFieldName = ValueInterface::VALUE_ID;

    protected function _construct()
    {
        $this->_init(Value::class, ValueResource::class);
    }
}
