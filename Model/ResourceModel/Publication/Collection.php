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

    /**
     * Filter by theme and store
     */
    public function addThemeStoreFilter(int $themeId, int $storeId): self
    {
        $this->addFieldToFilter(PublicationInterface::THEME_ID, $themeId);
        $this->addFieldToFilter(PublicationInterface::STORE_ID, $storeId);
        return $this;
    }

    /**
     * Filter by title (search)
     */
    public function addTitleSearch(string $search): self
    {
        $this->addFieldToFilter(PublicationInterface::TITLE, ['like' => '%' . $search . '%']);
        return $this;
    }

    /**
     * Filter rollbacks only
     */
    public function addRollbackFilter(bool $isRollback = true): self
    {
        $this->addFieldToFilter(PublicationInterface::IS_ROLLBACK, $isRollback ?  1 : 0);
        return $this;
    }

    /**
     * Order by published date
     */
    public function addPublishedAtOrder(string $direction = 'DESC'): self
    {
        $this->setOrder(PublicationInterface::PUBLISHED_AT, $direction);
        return $this;
    }

    /**
     * Join with admin user table to get user info
     */
    public function joinAdminUser(): self
    {
        $this->getSelect()->joinLeft(
            ['admin' => $this->getTable('admin_user')],
            'main_table.' . PublicationInterface::PUBLISHED_BY . ' = admin.user_id', // ← ВИПРАВЛЕНО ТУТ
            [
                'published_by_username' => 'username',
                'published_by_email' => 'email',
                'published_by_firstname' => 'firstname',
                'published_by_lastname' => 'lastname'
            ]
        );
        return $this;
    }
}
