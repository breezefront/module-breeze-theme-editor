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

    /**
     * Filter by theme and store
     */
    public function addThemeStoreFilter(int $themeId, int $storeId): self
    {
        $this->addFieldToFilter(ValueInterface::THEME_ID, $themeId);
        $this->addFieldToFilter(ValueInterface::STORE_ID, $storeId);
        return $this;
    }

    /**
     * Filter by status
     */
    public function addStatusFilter(int $statusId): self
    {
        $this->addFieldToFilter(ValueInterface::STATUS_ID, $statusId);
        return $this;
    }

    /**
     * Filter by user
     */
    public function addUserFilter(int $userId): self
    {
        $this->addFieldToFilter(ValueInterface::USER_ID, $userId);
        return $this;
    }

    /**
     * Filter by section codes
     */
    public function addSectionFilter(array $sectionCodes): self
    {
        $this->addFieldToFilter(ValueInterface::SECTION_CODE, ['in' => $sectionCodes]);
        return $this;
    }

    /**
     * Order by updated date
     */
    public function addUpdatedAtOrder(string $direction = 'DESC'): self
    {
        $this->setOrder(ValueInterface::UPDATED_AT, $direction);
        return $this;
    }
}
