<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api;

use Swissup\BreezeThemeEditor\Api\Data\StatusInterface;
use Swissup\BreezeThemeEditor\Api\Data\StatusSearchResultsInterface;
use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;

interface StatusRepositoryInterface
{
    /**
     * Create new status instance
     */
    public function create(): StatusInterface;

    /**
     * Save status
     */
    public function save(StatusInterface $status): StatusInterface;

    /**
     * @throws NoSuchEntityException
     */
    public function get(int $id): StatusInterface;

    /**
     * @throws NoSuchEntityException
     */
    public function getById(int $statusId): StatusInterface;

    /**
     * @throws NoSuchEntityException
     */
    public function getByCode(string $code): StatusInterface;

    /**
     * @return StatusSearchResultsInterface
     */
    public function getList(SearchCriteriaInterface $searchCriteria): StatusSearchResultsInterface;

    /**
     * Delete status
     */
    public function delete(StatusInterface $status): bool;

    /**
     * Delete status by id
     * @throws NoSuchEntityException
     * @throws CouldNotDeleteException
     */
    public function deleteById(int $statusId): bool;
}
