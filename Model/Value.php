<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Model\AbstractModel;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

class Value extends AbstractModel implements ValueInterface
{
    /**
     * @inheritdoc
     */
    protected function _construct()
    {
        $this->_init(\Swissup\BreezeThemeEditor\Model\ResourceModel\Value::class);
    }

    /**
     * @inheritdoc
     */
    public function getValueId(): ?int
    {
        $id = $this->getData(self::VALUE_ID);
        return $id ? (int)$id : null;
    }

    /**
     * @inheritdoc
     */
    public function setValueId(int $valueId): self
    {
        return $this->setData(self::VALUE_ID, $valueId);
    }

    /**
     * @inheritdoc
     */
    public function getThemeId(): int
    {
        return (int)$this->getData(self::THEME_ID);
    }

    /**
     * @inheritdoc
     */
    public function setThemeId(int $themeId): self
    {
        return $this->setData(self::THEME_ID, $themeId);
    }

    /**
     * @inheritdoc
     */
    public function getScope(): string
    {
        return (string)($this->getData(self::SCOPE) ?: self::SCOPE_STORES);
    }

    /**
     * @inheritdoc
     */
    public function setScope(string $scope): self
    {
        return $this->setData(self::SCOPE, $scope);
    }

    /**
     * @inheritdoc
     */
    public function getStoreId(): int
    {
        return (int)$this->getData(self::STORE_ID);
    }

    /**
     * @inheritdoc
     */
    public function setStoreId(int $storeId): self
    {
        return $this->setData(self::STORE_ID, $storeId);
    }

    /**
     * @inheritdoc
     */
    public function getStatusId(): int
    {
        return (int)$this->getData(self::STATUS_ID);
    }

    /**
     * @inheritdoc
     */
    public function setStatusId(int $statusId): self
    {
        return $this->setData(self::STATUS_ID, $statusId);
    }

    /**
     * @inheritdoc
     */
    public function getUserId(): ?int
    {
        $userId = $this->getData(self::USER_ID);
        return $userId !== null ? (int)$userId : null;
    }

    /**
     * @inheritdoc
     */
    public function setUserId(? int $userId): self
    {
        return $this->setData(self::USER_ID, $userId);
    }

    /**
     * @inheritdoc
     */
    public function getSectionCode(): string
    {
        return (string)$this->getData(self::SECTION_CODE);
    }

    /**
     * @inheritdoc
     */
    public function setSectionCode(string $sectionCode): self
    {
        return $this->setData(self::SECTION_CODE, $sectionCode);
    }

    /**
     * @inheritdoc
     */
    public function getSettingCode(): string
    {
        return (string)$this->getData(self::SETTING_CODE);
    }

    /**
     * @inheritdoc
     */
    public function setSettingCode(string $settingCode): self
    {
        return $this->setData(self::SETTING_CODE, $settingCode);
    }

    /**
     * @inheritdoc
     */
    public function getValue(): ? string
    {
        return $this->getData(self::VALUE);
    }

    /**
     * @inheritdoc
     */
    public function setValue(?string $value): self
    {
        return $this->setData(self::VALUE, $value);
    }

    /**
     * @inheritdoc
     */
    public function getCreatedAt(): ?string
    {
        return $this->getData(self::CREATED_AT);
    }

    /**
     * @inheritdoc
     */
    public function setCreatedAt(string $createdAt): self
    {
        return $this->setData(self::CREATED_AT, $createdAt);
    }

    /**
     * @inheritdoc
     */
    public function getUpdatedAt(): ?string
    {
        return $this->getData(self::UPDATED_AT);
    }

    /**
     * @inheritdoc
     */
    public function setUpdatedAt(string $updatedAt): self
    {
        return $this->setData(self::UPDATED_AT, $updatedAt);
    }
}
