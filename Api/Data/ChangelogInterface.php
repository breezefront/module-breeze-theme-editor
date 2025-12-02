<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

interface ChangelogInterface
{
    public const CHANGE_ID = 'change_id';
    public const PUBLICATION_ID = 'publication_id';
    public const SECTION_CODE = 'section_code';
    public const SETTING_CODE = 'setting_code';
    public const OLD_VALUE = 'old_value';
    public const NEW_VALUE = 'new_value';

    /**
     * @return int
     */
    public function getChangeId(): int;

    /**
     * @param int $changeId
     * @return $this
     */
    public function setChangeId(int $changeId): self;

    /**
     * @return int
     */
    public function getPublicationId(): int;

    /**
     * @param int $publicationId
     * @return $this
     */
    public function setPublicationId(int $publicationId): self;

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
    public function getOldValue(): ?string;

    /**
     * @param string|null $oldValue
     * @return $this
     */
    public function setOldValue(?string $oldValue): self;

    /**
     * @return string|null
     */
    public function getNewValue(): ?string;

    /**
     * @param string|null $newValue
     * @return $this
     */
    public function setNewValue(?string $newValue): self;
}
