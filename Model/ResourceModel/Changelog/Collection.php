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

    /**
     * Filter by publication
     */
    public function addPublicationFilter(int $publicationId): self
    {
        $this->addFieldToFilter(ChangelogInterface::PUBLICATION_ID, $publicationId);
        return $this;
    }

    /**
     * Filter by section
     */
    public function addSectionFilter(string $sectionCode): self
    {
        $this->addFieldToFilter(ChangelogInterface::SECTION_CODE, $sectionCode);
        return $this;
    }

    /**
     * Filter by setting
     */
    public function addSettingFilter(string $sectionCode, string $settingCode): self
    {
        $this->addFieldToFilter(ChangelogInterface::SECTION_CODE, $sectionCode);
        $this->addFieldToFilter(ChangelogInterface::SETTING_CODE, $settingCode);
        return $this;
    }
}
