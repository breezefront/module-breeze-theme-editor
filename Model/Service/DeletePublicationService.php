<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SortOrderBuilder;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Exception\NoSuchEntityException;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;

/**
 * Service for deleting historical publication records.
 *
 * Guards against deleting the most recent (currently active) publication
 * for a given theme/store, since that would remove the audit trail of what
 * is currently live.
 *
 * DB cascade rules handle the rest automatically:
 *   - FK_CHANGELOG_PUBLICATION (CASCADE DELETE) removes all changelog rows.
 *   - FK_PUBLICATION_ROLLBACK  (SET NULL)        nulls `rollback_from` on any
 *     later publication that referenced this one as its rollback source.
 */
class DeletePublicationService
{
    public function __construct(
        private PublicationRepositoryInterface $publicationRepository,
        private SearchCriteriaBuilder $searchCriteriaBuilder,
        private SortOrderBuilder $sortOrderBuilder
    ) {}

    /**
     * Delete a publication by ID.
     *
     * @throws NoSuchEntityException   When the publication does not exist.
     * @throws LocalizedException      When trying to delete the active publication.
     */
    public function delete(int $publicationId): void
    {
        // Throws NoSuchEntityException when not found — let the caller handle it.
        $publication = $this->publicationRepository->getById($publicationId);

        // Determine the most recent publication for this theme+store.
        $sortOrder = $this->sortOrderBuilder
            ->setField('publication_id')
            ->setDescendingDirection()
            ->create();

        $searchCriteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $publication->getThemeId())
            ->addFilter('store_id', $publication->getStoreId())
            ->setSortOrders([$sortOrder])
            ->setPageSize(1)
            ->setCurrentPage(1)
            ->create();

        $results = $this->publicationRepository->getList($searchCriteria);

        if ($results->getTotalCount() > 0) {
            $items = $results->getItems();
            $mostRecent = reset($items);

            if ((int)$mostRecent->getPublicationId() === $publicationId) {
                throw new LocalizedException(
                    __('The currently active publication cannot be deleted.')
                );
            }
        }

        $this->publicationRepository->delete($publication);
    }
}
