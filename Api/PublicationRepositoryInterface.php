<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api;

use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;

interface PublicationRepositoryInterface
{
    /**
     * Get publication by ID
     *
     * @param int $publicationId
     * @return PublicationInterface
     * @throws NoSuchEntityException
     */
    public function getById(int $publicationId): PublicationInterface;

    /**
     * Get publications list with pagination
     *
     * @param int $themeId
     * @param int $storeId
     * @param int $pageSize
     * @param int $currentPage
     * @param string|null $search
     * @return array ['items' => PublicationInterface[], 'total_count' => int]
     */
    public function getList(
        int $themeId,
        int $storeId,
        int $pageSize = 20,
        int $currentPage = 1,
        ?string $search = null
    ): array;

    /**
     * Get latest publication for theme/store
     *
     * @param int $themeId
     * @param int $storeId
     * @return PublicationInterface|null
     */
    public function getLatest(int $themeId, int $storeId): ?PublicationInterface;

    /**
     * Save publication
     *
     * @param PublicationInterface $publication
     * @return PublicationInterface
     * @throws CouldNotSaveException
     */
    public function save(PublicationInterface $publication): PublicationInterface;

    /**
     * Delete publication
     *
     * @param PublicationInterface $publication
     * @return bool
     * @throws CouldNotDeleteException
     */
    public function delete(PublicationInterface $publication): bool;
}
