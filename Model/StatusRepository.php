<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Swissup\BreezeThemeEditor\Api\Data\StatusInterface;
use Swissup\BreezeThemeEditor\Api\StatusRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\StatusFactory;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Status as StatusResource;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Status\CollectionFactory;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;
use Magento\Framework\Exception\NoSuchEntityException;

class StatusRepository implements StatusRepositoryInterface
{
    private array $instancesById = [];
    private array $instancesByCode = [];

    public function __construct(
        private StatusFactory $statusFactory,
        private StatusResource $statusResource,
        private CollectionFactory $collectionFactory
    ) {}

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
        $this->instancesByCode[$status->getCode()] = $status;

        return $status;
    }

    public function getByCode(string $code): StatusInterface
    {
        if (isset($this->instancesByCode[$code])) {
            return $this->instancesByCode[$code];
        }

        $status = $this->statusFactory->create();
        $this->statusResource->loadByCode($status, $code);

        if (!$status->getStatusId()) {
            throw new NoSuchEntityException(
                __('Status with code "%1" does not exist.', $code)
            );
        }

        $this->instancesByCode[$code] = $status;
        $this->instancesById[$status->getStatusId()] = $status;

        return $status;
    }

    public function getList(): array
    {
        $collection = $this->collectionFactory->create();
        $collection->addSortOrderSort();

        return $collection->getItems();
    }

    public function save(StatusInterface $status): StatusInterface
    {
        try {
            $this->statusResource->save($status);

            // Clear cache
            unset($this->instancesById[$status->getStatusId()]);
            unset($this->instancesByCode[$status->getCode()]);

        } catch (\Exception $e) {
            throw new CouldNotSaveException(
                __('Could not save status: %1', $e->getMessage())
            );
        }

        return $status;
    }

    public function delete(StatusInterface $status): bool
    {
        try {
            $statusId = $status->getStatusId();
            $code = $status->getCode();

            $this->statusResource->delete($status);

            // Clear cache
            unset($this->instancesById[$statusId]);
            unset($this->instancesByCode[$code]);

            return true;
        } catch (\Exception $e) {
            throw new CouldNotDeleteException(
                __('Could not delete status: %1', $e->getMessage())
            );
        }
    }
}
