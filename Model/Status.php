<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Model\AbstractModel;
use Swissup\BreezeThemeEditor\Api\Data\StatusInterface;

class Status extends AbstractModel implements StatusInterface
{
    protected function _construct()
    {
        $this->_init(\Swissup\BreezeThemeEditor\Model\ResourceModel\Status::class);
    }

    public function getStatusId(): int
    {
        return (int)$this->getData(self::STATUS_ID);
    }

    public function setStatusId(int $statusId): StatusInterface
    {
        return $this->setData(self::STATUS_ID, $statusId);
    }

    public function getCode(): string
    {
        return (string)$this->getData(self::CODE);
    }

    public function setCode(string $code): StatusInterface
    {
        return $this->setData(self::CODE, $code);
    }

    public function getLabel(): string
    {
        return (string)$this->getData(self::LABEL);
    }

    public function setLabel(string $label): StatusInterface
    {
        return $this->setData(self::LABEL, $label);
    }

    public function getSortOrder(): int
    {
        return (int)$this->getData(self::SORT_ORDER);
    }

    public function setSortOrder(int $sortOrder): StatusInterface
    {
        return $this->setData(self::SORT_ORDER, $sortOrder);
    }
}
