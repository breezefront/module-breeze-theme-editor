<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api;

use Swissup\BreezeThemeEditor\Api\Data\StatusInterface;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;

interface StatusRepositoryInterface
{
    /**
     * Get status by ID
     *
     * @param int $statusId
     * @return StatusInterface
     * @throws NoSuchEntityException
     */
    public function getById(int $statusId): StatusInterface;

    /**
     * Get status by code
     *
     * @param string $code
     * @return StatusInterface
     * @throws NoSuchEntityException
     */
    public function getByCode(string $code): StatusInterface;

    /**
     * Get all statuses
     *
     * @return StatusInterface[]
     */
    public function getList(): array;

    /**
     * Save status
     *
     * @param StatusInterface $status
     * @return StatusInterface
     * @throws CouldNotSaveException
     */
    public function save(StatusInterface $status): StatusInterface;

    /**
     * Delete status
     *
     * @param StatusInterface $status
     * @return bool
     * @throws CouldNotDeleteException
     */
    public function delete(StatusInterface $status): bool;
}
