<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api;

use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;

/**
 * Value CRUD interface.
 * @api
 */
interface ValueRepositoryInterface
{
    /**
     * Create new value instance
     *
     * @return ValueInterface
     */
    public function create(): ValueInterface;

    /**
     * Save value.
     *
     * @param ValueInterface $value
     * @return ValueInterface
     * @throws CouldNotSaveException
     */
    public function save(ValueInterface $value): ValueInterface;

    /**
     * Save multiple values at once (batch operation)
     *
     * @param ValueInterface[] $values
     * @return int Number of saved values
     * @throws CouldNotSaveException
     */
    public function saveMultiple(array $values): int;

    /**
     * Load value by ID (without exception if not found)
     *
     * @param int $valueId
     * @return ValueInterface
     */
    public function get(int $valueId): ValueInterface;

    /**
     * Get value by ID.
     *
     * @param int $valueId
     * @return ValueInterface
     * @throws NoSuchEntityException
     */
    public function getById(int $valueId): ValueInterface;

    /**
     * Retrieve values matching specified criteria.
     *
     * @param SearchCriteriaInterface $searchCriteria
     * @return \Swissup\BreezeThemeEditor\Api\Data\ValueSearchResultsInterface
     * @throws LocalizedException
     */
    public function getList(SearchCriteriaInterface $searchCriteria);

    /**
     * Delete value.
     *
     * @param ValueInterface $value
     * @return bool true on success
     * @throws CouldNotDeleteException
     */
    public function delete(ValueInterface $value): bool;

    /**
     * Delete value by ID.
     *
     * @param int $valueId
     * @return bool true on success
     * @throws NoSuchEntityException
     * @throws CouldNotDeleteException
     */
    public function deleteById(int $valueId): bool;
}
