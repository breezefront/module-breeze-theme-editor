<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

interface PublicationInterface
{
    public const PUBLICATION_ID = 'publication_id';
    public const THEME_ID = 'theme_id';
    public const STORE_ID = 'store_id';
    public const TITLE = 'title';
    public const DESCRIPTION = 'description';
    public const PUBLISHED_AT = 'published_at';
    public const PUBLISHED_BY = 'published_by';
    public const IS_ROLLBACK = 'is_rollback';
    public const ROLLBACK_FROM = 'rollback_from';
    public const CHANGES_COUNT = 'changes_count';

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
     * @return string
     */
    public function getTitle(): string;

    /**
     * @param string $title
     * @return $this
     */
    public function setTitle(string $title): self;

    /**
     * @return string|null
     */
    public function getDescription(): ?string;

    /**
     * @param string|null $description
     * @return $this
     */
    public function setDescription(?string $description): self;

    /**
     * @return string
     */
    public function getPublishedAt(): string;

    /**
     * @param string $publishedAt
     * @return $this
     */
    public function setPublishedAt(string $publishedAt): self;

    /**
     * @return int
     */
    public function getPublishedBy(): int;

    /**
     * @param int $publishedBy
     * @return $this
     */
    public function setPublishedBy(int $publishedBy): self;

    /**
     * @return bool
     */
    public function getIsRollback(): bool;

    /**
     * @param bool $isRollback
     * @return $this
     */
    public function setIsRollback(bool $isRollback): self;

    /**
     * @return int|null
     */
    public function getRollbackFrom(): ?int;

    /**
     * @param int|null $rollbackFrom
     * @return $this
     */
    public function setRollbackFrom(?int $rollbackFrom): self;

    /**
     * @return int
     */
    public function getChangesCount(): int;

    /**
     * @param int $changesCount
     * @return $this
     */
    public function setChangesCount(int $changesCount): self;
}
