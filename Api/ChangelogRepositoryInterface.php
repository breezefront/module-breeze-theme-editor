<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api;

use Swissup\BreezeThemeEditor\Api\Data\ChangelogInterface;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;

interface ChangelogRepositoryInterface
{
    /**
     * Get changelog by ID
     *
     * @param int $changeId
     * @return ChangelogInterface
     * @throws NoSuchEntityException
     */
    public function getById(int $changeId): ChangelogInterface;

    /**
     * Get changelog items by publication ID
     *
     * @param int $publicationId
     * @return ChangelogInterface[]
     */
    public function getByPublicationId(int $publicationId): array;

    /**
     * Save changelog item
     *
     * @param ChangelogInterface $changelog
     * @return ChangelogInterface
     * @throws CouldNotSaveException
     */
    public function save(ChangelogInterface $changelog): ChangelogInterface;

    /**
     * Save multiple changelog items
     *
     * @param ChangelogInterface[] $changelogs
     * @return int Number of saved items
     * @throws CouldNotSaveException
     */
    public function saveMultiple(array $changelogs): int;

    /**
     * Delete changelog item
     *
     * @param ChangelogInterface $changelog
     * @return bool
     * @throws CouldNotDeleteException
     */
    public function delete(ChangelogInterface $changelog): bool;

    /**
     * Delete all changelog items for publication
     *
     * @param int $publicationId
     * @return int Number of deleted items
     */
    public function deleteByPublicationId(int $publicationId): int;
}
