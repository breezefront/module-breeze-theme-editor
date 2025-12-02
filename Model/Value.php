<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Model\AbstractModel;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

class Value extends AbstractModel implements ValueInterface
{
    protected function _construct()
    {
        $this->_init(\Swissup\BreezeThemeEditor\Model\ResourceModel\Value::class);
    }

    public function getValueId(): int
    {
        return (int)$this->getData(self::VALUE_ID);
    }

    public function setValueId(int $valueId): ValueInterface
    {
        return $this->setData(self::VALUE_ID, $valueId);
    }

    public function getThemeId(): int
    {
        return (int)$this->getData(self::THEME_ID);
    }

    public function setThemeId(int $themeId): ValueInterface
    {
        return $this->setData(self::THEME_ID, $themeId);
    }

    public function getStoreId(): int
    {
        return (int)$this->getData(self::STORE_ID);
    }

    public function setStoreId(int $storeId): ValueInterface
    {
        return $this->setData(self::STORE_ID, $storeId);
    }

    public function getStatusId(): int
    {
        return (int)$this->getData(self::STATUS_ID);
    }

    public function setStatusId(int $statusId): ValueInterface
    {
        return $this->setData(self::STATUS_ID, $statusId);
    }

    public function getUserId(): int
    {
        return (int)$this->getData(self::USER_ID);
    }

    public function setUserId(int $userId): ValueInterface
    {
        return $this->setData(self::USER_ID, $userId);
    }

    public function getSectionCode(): string
    {
        return (string)$this->getData(self::SECTION_CODE);
    }

    public function setSectionCode(string $sectionCode): ValueInterface
    {
        return $this->setData(self::SECTION_CODE, $sectionCode);
    }

    public function getSettingCode(): string
    {
        return (string)$this->getData(self::SETTING_CODE);
    }

    public function setSettingCode(string $settingCode): ValueInterface
    {
        return $this->setData(self::SETTING_CODE, $settingCode);
    }

    public function getValue(): ? string
    {
        return $this->getData(self::VALUE);
    }

    public function setValue(?string $value): ValueInterface
    {
        return $this->setData(self::VALUE, $value);
    }

    public function getCreatedAt(): string
    {
        return (string)$this->getData(self::CREATED_AT);
    }

    public function setCreatedAt(string $createdAt): ValueInterface
    {
        return $this->setData(self::CREATED_AT, $createdAt);
    }

    public function getUpdatedAt(): string
    {
        return (string)$this->getData(self::UPDATED_AT);
    }

    public function setUpdatedAt(string $updatedAt): ValueInterface
    {
        return $this->setData(self::UPDATED_AT, $updatedAt);
    }
}
