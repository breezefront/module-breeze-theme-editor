<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

interface ValueInterface
{
    public const VALUE_ID = 'value_id';
    public const THEME_ID = 'theme_id';
    public const STORE_ID = 'store_id';
    public const STATUS_ID = 'status_id';
    public const USER_ID = 'user_id';
    public const SECTION_CODE = 'section_code';
    public const SETTING_CODE = 'setting_code';
    public const VALUE = 'value';
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = 'updated_at';

    /**
     * @return int|null
     */
    public function getValueId(): ?int;

    /**
     * @param int $valueId
     * @return $this
     */
    public function setValueId(int $valueId): self;

    /**
     * @return int
     */
    public function getThemeId(): int;

    /**
     * @param int $themeId
     * @return $this
     */
    public function setThemeId(int $themeId): self;

    /**
     * @return int
     */
    public function getStoreId(): int;

    /**
     * @param int $storeId
     * @return $this
     */
    public function setStoreId(int $storeId): self;

    /**
     * @return int
     */
    public function getStatusId(): int;

    /**
     * @param int $statusId
     * @return $this
     */
    public function setStatusId(int $statusId): self;

    /**
     * @return int|null
     */
    public function getUserId(): ?int;

    /**
     * @param int|null $userId
     * @return $this
     */
    public function setUserId(?int $userId): self;

    /**
     * @return string
     */
    public function getSectionCode(): string;

    /**
     * @param string $sectionCode
     * @return $this
     */
    public function setSectionCode(string $sectionCode): self;

    /**
     * @return string
     */
    public function getSettingCode(): string;

    /**
     * @param string $settingCode
     * @return $this
     */
    public function setSettingCode(string $settingCode): self;

    /**
     * @return string|null
     */
    public function getValue(): ?string;

    /**
     * @param string|null $value
     * @return $this
     */
    public function setValue(?string $value): self;

    /**
     * @return string|null
     */
    public function getCreatedAt(): ?string;

    /**
     * @param string $createdAt
     * @return $this
     */
    public function setCreatedAt(string $createdAt): self;

    /**
     * @return string|null
     */
    public function getUpdatedAt(): ?string;

    /**
     * @param string $updatedAt
     * @return $this
     */
    public function setUpdatedAt(string $updatedAt): self;
}
