<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api;

use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;
use Swissup\BreezeThemeEditor\Api\Data\PublicationSearchResultsInterface;
use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;

interface PublicationRepositoryInterface
{
    /**
     * Create new publication instance
     */
    public function create(): PublicationInterface;

    /**
     * Save publication
     */
    public function save(PublicationInterface $publication): PublicationInterface;

    /**
     * Get publication by ID (without exception)
     */
    public function get(int $publicationId): PublicationInterface;

    /**
     * Get publication by ID (exception if not found)
     */
    public function getById(int $publicationId): PublicationInterface;

    /**
     * Get publications matching specified criteria.
     */
    public function getList(SearchCriteriaInterface $searchCriteria): PublicationSearchResultsInterface;

    /**
     * Delete publication
     */
    public function delete(PublicationInterface $publication): bool;

    /**
     * Delete publication by ID
     */
    public function deleteById(int $publicationId): bool;
}
