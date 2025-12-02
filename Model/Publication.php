<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Model\AbstractModel;
use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;

class Publication extends AbstractModel implements PublicationInterface
{
    protected function _construct()
    {
        $this->_init(\Swissup\BreezeThemeEditor\Model\ResourceModel\Publication::class);
    }

    public function getPublicationId(): int
    {
        return (int)$this->getData(self::PUBLICATION_ID);
    }

    public function setPublicationId(int $publicationId): PublicationInterface
    {
        return $this->setData(self::PUBLICATION_ID, $publicationId);
    }

    public function getThemeId(): int
    {
        return (int)$this->getData(self::THEME_ID);
    }

    public function setThemeId(int $themeId): PublicationInterface
    {
        return $this->setData(self::THEME_ID, $themeId);
    }

    public function getStoreId(): int
    {
        return (int)$this->getData(self::STORE_ID);
    }

    public function setStoreId(int $storeId): PublicationInterface
    {
        return $this->setData(self::STORE_ID, $storeId);
    }

    public function getTitle(): string
    {
        return (string)$this->getData(self::TITLE);
    }

    public function setTitle(string $title): PublicationInterface
    {
        return $this->setData(self::TITLE, $title);
    }

    public function getDescription(): ?string
    {
        return $this->getData(self::DESCRIPTION);
    }

    public function setDescription(?string $description): PublicationInterface
    {
        return $this->setData(self::DESCRIPTION, $description);
    }

    public function getPublishedAt(): string
    {
        return (string)$this->getData(self::PUBLISHED_AT);
    }

    public function setPublishedAt(string $publishedAt): PublicationInterface
    {
        return $this->setData(self::PUBLISHED_AT, $publishedAt);
    }

    public function getPublishedBy(): int
    {
        return (int)$this->getData(self::PUBLISHED_BY);
    }

    public function setPublishedBy(int $publishedBy): PublicationInterface
    {
        return $this->setData(self::PUBLISHED_BY, $publishedBy);
    }

    public function getIsRollback(): bool
    {
        return (bool)$this->getData(self::IS_ROLLBACK);
    }

    public function setIsRollback(bool $isRollback): PublicationInterface
    {
        return $this->setData(self::IS_ROLLBACK, $isRollback);
    }

    public function getRollbackFrom(): ?int
    {
        $value = $this->getData(self::ROLLBACK_FROM);
        return $value ? (int)$value : null;
    }

    public function setRollbackFrom(?int $rollbackFrom): PublicationInterface
    {
        return $this->setData(self::ROLLBACK_FROM, $rollbackFrom);
    }

    public function getChangesCount(): int
    {
        return (int)$this->getData(self::CHANGES_COUNT);
    }

    public function setChangesCount(int $changesCount): PublicationInterface
    {
        return $this->setData(self::CHANGES_COUNT, $changesCount);
    }
}
