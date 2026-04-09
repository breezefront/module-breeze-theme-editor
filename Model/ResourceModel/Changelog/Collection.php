<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\ResourceModel\Changelog;

use Magento\Framework\Model\ResourceModel\Db\Collection\AbstractCollection;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogInterface;
use Swissup\BreezeThemeEditor\Model\Changelog;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Changelog as ChangelogResource;

class Collection extends AbstractCollection
{
    protected $_idFieldName = ChangelogInterface::CHANGE_ID;

    protected function _construct()
    {
        $this->_init(Changelog::class, ChangelogResource::class);
    }
}
