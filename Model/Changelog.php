<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Model\AbstractModel;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogInterface;

class Changelog extends AbstractModel implements ChangelogInterface
{
    protected function _construct()
    {
        $this->_init(\Swissup\BreezeThemeEditor\Model\ResourceModel\Changelog::class);
    }

    public function getChangeId(): int
    {
        return (int)$this->getData(self::CHANGE_ID);
    }

    public function setChangeId(int $changeId): ChangelogInterface
    {
        return $this->setData(self::CHANGE_ID, $changeId);
    }

    public function getPublicationId(): int
    {
        return (int)$this->getData(self::PUBLICATION_ID);
    }

    public function setPublicationId(int $publicationId): ChangelogInterface
    {
        return $this->setData(self::PUBLICATION_ID, $publicationId);
    }

    public function getSectionCode(): string
    {
        return (string)$this->getData(self::SECTION_CODE);
    }

    public function setSectionCode(string $sectionCode): ChangelogInterface
    {
        return $this->setData(self::SECTION_CODE, $sectionCode);
    }

    public function getSettingCode(): string
    {
        return (string)$this->getData(self::SETTING_CODE);
    }

    public function setSettingCode(string $settingCode): ChangelogInterface
    {
        return $this->setData(self::SETTING_CODE, $settingCode);
    }

    public function getOldValue(): ?string
    {
        return $this->getData(self::OLD_VALUE);
    }

    public function setOldValue(?string $oldValue): ChangelogInterface
    {
        return $this->setData(self::OLD_VALUE, $oldValue);
    }

    public function getNewValue(): ? string
    {
        return $this->getData(self::NEW_VALUE);
    }

    public function setNewValue(?string $newValue): ChangelogInterface
    {
        return $this->setData(self::NEW_VALUE, $newValue);
    }
}
