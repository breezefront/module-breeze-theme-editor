<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\ResourceModel\Publication;

use Magento\Framework\Model\ResourceModel\Db\Collection\AbstractCollection;
use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;
use Swissup\BreezeThemeEditor\Model\Publication;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Publication as PublicationResource;

class Collection extends AbstractCollection
{
    protected $_idFieldName = PublicationInterface::PUBLICATION_ID;

    protected function _construct()
    {
        $this->_init(Publication::class, PublicationResource::class);
    }
}
