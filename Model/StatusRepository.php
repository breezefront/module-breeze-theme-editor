<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Swissup\BreezeThemeEditor\Api\Data\StatusInterface;
use Swissup\BreezeThemeEditor\Api\Data\StatusSearchResultsInterface;
use Swissup\BreezeThemeEditor\Api\StatusRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\StatusFactory;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Status as StatusResource;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Status\CollectionFactory;
use Magento\Framework\Api\SearchCriteriaInterface;
use Swissup\BreezeThemeEditor\Api\Data\StatusSearchResultsInterfaceFactory as SearchResultsInterfaceFactory;
use Magento\Framework\Api\SearchCriteria\CollectionProcessorInterface;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;
use Magento\Framework\Exception\NoSuchEntityException;

class StatusRepository implements StatusRepositoryInterface
{
    private array $instancesById = [];

    /**
     * @param \Swissup\BreezeThemeEditor\Model\StatusFactory $statusFactory
     * @param StatusResource $statusResource
     * @param CollectionFactory $collectionFactory
     * @param SearchResultsInterfaceFactory $searchResultsFactory
     * @param CollectionProcessorInterface $collectionProcessor
     */
    public function __construct(
        private StatusFactory $statusFactory,
        private StatusResource $statusResource,
        private CollectionFactory $collectionFactory,
        private SearchResultsInterfaceFactory $searchResultsFactory,
        private CollectionProcessorInterface $collectionProcessor
    ) {}

    /**
     * @return StatusInterface
     */
    public function create(): StatusInterface
    {
        return $this->statusFactory->create();
    }

    /**
     * @param StatusInterface $status
     * @return StatusInterface
     * @throws CouldNotSaveException
     */
    public function save(StatusInterface $status): StatusInterface
    {
        try {
            $this->statusResource->save($status);

            // Clear cache
            unset($this->instancesById[$status->getStatusId()]);
        } catch (\Exception $e) {
            throw new CouldNotSaveException(
                __('Could not save status: %1', $e->getMessage())
            );
        }
        return $status;
    }

    /**
     * @param int $id
     * @return StatusInterface
     */
    public function get(int $id): StatusInterface
    {
        $status = $this->statusFactory->create();
        $this->statusResource->load($status, $id);
        return $status;
    }

    /**
     * @param int $statusId
     * @return StatusInterface
     * @throws NoSuchEntityException
     */
    public function getById(int $statusId): StatusInterface
    {
        if (isset($this->instancesById[$statusId])) {
            return $this->instancesById[$statusId];
        }
        $status = $this->statusFactory->create();
        $this->statusResource->load($status, $statusId);
        if (!$status->getStatusId()) {
            throw new NoSuchEntityException(
                __('Status with id "%1" does not exist.', $statusId)
            );
        }
        $this->instancesById[$statusId] = $status;
        return $status;
    }

    /**
     * @return StatusSearchResultsInterface
     */
    public function getList(SearchCriteriaInterface $searchCriteria): StatusSearchResultsInterface
    {
        $collection = $this->collectionFactory->create();
        $this->collectionProcessor->process($searchCriteria, $collection);

        /** @var StatusSearchResultsInterface $searchResults */
        $searchResults = $this->searchResultsFactory->create();
        $searchResults->setSearchCriteria($searchCriteria);
        $searchResults->setItems($collection->getItems());
        $searchResults->setTotalCount($collection->getSize());
        return $searchResults;
    }

    /**
     * @param StatusInterface $status
     * @return bool
     * @throws CouldNotDeleteException
     */
    public function delete(StatusInterface $status): bool
    {
        try {
            $statusId = $status->getStatusId();
            $code = $status->getCode();
            $this->statusResource->delete($status);

            unset($this->instancesById[$statusId]);
            return true;
        } catch (\Exception $e) {
            throw new CouldNotDeleteException(
                __('Could not delete status: %1', $e->getMessage())
            );
        }
    }

    /**
     * @param int $statusId
     * @return bool
     * @throws CouldNotDeleteException
     * @throws NoSuchEntityException
     */
    public function deleteById(int $statusId): bool
    {
        return $this->delete($this->getById($statusId));
    }
}
