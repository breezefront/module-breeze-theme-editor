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
     * Save multiple publications (batch)
     */
    public function saveMultiple(array $publications): int;

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
     * Get latest publication for theme/store
     * @deprecated Use getList() with sort & page size 1 instead
     */
    public function getLatest(int $themeId, int $storeId): ?PublicationInterface;

    /**
     * Delete publication
     */
    public function delete(PublicationInterface $publication): bool;

    /**
     * Delete publication by ID
     */
    public function deleteById(int $publicationId): bool;

    /**
     * Legacy: get publications with custom filters/pagination
     * @deprecated Use getList() with SearchCriteria instead
     */
    public function getLegacyList(
        int $themeId,
        int $storeId,
        int $pageSize = 20,
        int $currentPage = 1,
        ?string $search = null
    ): array;
}
