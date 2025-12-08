<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;
use Swissup\BreezeThemeEditor\Api\Data\PublicationSearchResultsInterface;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\PublicationFactory;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Publication as PublicationResource;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Publication\CollectionFactory;
use Magento\Framework\Api\SearchCriteriaInterface;
use Swissup\BreezeThemeEditor\Api\Data\PublicationSearchResultsInterfaceFactory as SearchResultsInterfaceFactory;
use Magento\Framework\Api\SearchCriteria\CollectionProcessorInterface;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;
use Magento\Framework\Exception\NoSuchEntityException;

class PublicationRepository implements PublicationRepositoryInterface
{
    private array $instances = [];

    public function __construct(
        private PublicationFactory $publicationFactory,
        private PublicationResource $publicationResource,
        private CollectionFactory $collectionFactory,
        private SearchResultsInterfaceFactory $searchResultsFactory,
        private CollectionProcessorInterface $collectionProcessor
    ) {}

    public function create(): PublicationInterface
    {
        return $this->publicationFactory->create();
    }

    public function save(PublicationInterface $publication): PublicationInterface
    {
        try {
            $this->publicationResource->save($publication);
            unset($this->instances[$publication->getPublicationId()]);
        } catch (\Exception $e) {
            throw new CouldNotSaveException(
                __('Could not save publication: %1', $e->getMessage())
            );
        }

        return $publication;
    }

    public function saveMultiple(array $publications): int
    {
        $count = 0;
        foreach ($publications as $publication) {
            $this->save($publication);
            $count++;
        }
        return $count;
    }

    public function get(int $publicationId): PublicationInterface
    {
        $publication = $this->publicationFactory->create();
        $this->publicationResource->load($publication, $publicationId);
        return $publication;
    }

    public function getById(int $publicationId): PublicationInterface
    {
        if (isset($this->instances[$publicationId])) {
            return $this->instances[$publicationId];
        }

        $publication = $this->publicationFactory->create();
        $this->publicationResource->load($publication, $publicationId);

        if (!$publication->getPublicationId()) {
            throw new NoSuchEntityException(
                __('Publication with id "%1" does not exist.', $publicationId)
            );
        }

        $this->instances[$publicationId] = $publication;

        return $publication;
    }

    public function getList(SearchCriteriaInterface $searchCriteria): PublicationSearchResultsInterface
    {
        $collection = $this->collectionFactory->create();
        $this->collectionProcessor->process($searchCriteria, $collection);

        /** @var PublicationSearchResultsInterface $searchResults */
        $searchResults = $this->searchResultsFactory->create();
        $searchResults->setSearchCriteria($searchCriteria);
        $searchResults->setItems($collection->getItems());
        $searchResults->setTotalCount($collection->getSize());
        return $searchResults;
    }

    public function delete(PublicationInterface $publication): bool
    {
        try {
            $publicationId = $publication->getPublicationId();
            $this->publicationResource->delete($publication);
            unset($this->instances[$publicationId]);

            return true;
        } catch (\Exception $e) {
            throw new CouldNotDeleteException(
                __('Could not delete publication: %1', $e->getMessage())
            );
        }
    }

    public function deleteById(int $publicationId): bool
    {
        return $this->delete($this->getById($publicationId));
    }
}
