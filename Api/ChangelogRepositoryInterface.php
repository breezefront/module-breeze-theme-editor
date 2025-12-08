<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api;

use Swissup\BreezeThemeEditor\Api\Data\ChangelogInterface;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogSearchResultsInterface;
use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;

interface ChangelogRepositoryInterface
{
    /**
     * Create new changelog instance
     *
     * @return ChangelogInterface
     */
    public function create(): ChangelogInterface;

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
     * Get changelog by ID
     *
     * @param int $changeId
     * @return ChangelogInterface
     * @throws NoSuchEntityException
     */
    public function get(int $changeId): ChangelogInterface;

    /**
     * Get changelog by ID (throws if not found)
     *
     * @param int $changeId
     * @return ChangelogInterface
     * @throws NoSuchEntityException
     */
    public function getById(int $changeId): ChangelogInterface;

    /**
     * Retrieve changelogs matching specified criteria.
     *
     * @param SearchCriteriaInterface $searchCriteria
     * @return ChangelogSearchResultsInterface
     */
    public function getList(SearchCriteriaInterface $searchCriteria): ChangelogSearchResultsInterface;

    /**
     * Delete changelog item
     *
     * @param ChangelogInterface $changelog
     * @return bool
     * @throws CouldNotDeleteException
     */
    public function delete(ChangelogInterface $changelog): bool;

    /**
     * Delete changelog item by ID
     *
     * @param int $changeId
     * @return bool
     * @throws NoSuchEntityException
     * @throws CouldNotDeleteException
     */
    public function deleteById(int $changeId): bool;
}
