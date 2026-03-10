<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Api\SearchCriteria\CollectionProcessorInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueSearchResultsInterfaceFactory as SearchResultsInterfaceFactory;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;
use Magento\Framework\Exception\NoSuchEntityException;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueSearchResultsInterface;
use Swissup\BreezeThemeEditor\Model\ValueFactory;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Value as ValueResource;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Value\CollectionFactory;
use Magento\Framework\App\ResourceConnection;

class ValueRepository implements ValueRepositoryInterface
{
    public function __construct(
        private ValueFactory $valueFactory,
        private ValueResource $resource,
        private CollectionFactory $collectionFactory,
        private SearchResultsInterfaceFactory $searchResultsFactory,
        private CollectionProcessorInterface $collectionProcessor,
        private ResourceConnection $resourceConnection
    ) {}

    /**
     * @inheritdoc
     */
    public function create(): ValueInterface
    {
        return $this->valueFactory->create();
    }

    /**
     * @inheritdoc
     *
     * Uses INSERT ON DUPLICATE KEY UPDATE so that calling save() on an already-existing
     * row (identified by the UNQ_ALL composite unique key) updates it instead of throwing
     * a constraint violation.  This matches the behaviour of saveMultiple().
     */
    public function save(ValueInterface $value): ValueInterface
    {
        try {
            $connection = $this->resourceConnection->getConnection();
            $table      = $this->resource->getMainTable();

            $row = [
                ValueInterface::THEME_ID     => $value->getThemeId(),
                ValueInterface::SCOPE        => $value->getScope(),
                ValueInterface::STORE_ID     => $value->getStoreId(),
                ValueInterface::STATUS_ID    => $value->getStatusId(),
                ValueInterface::SECTION_CODE => $value->getSectionCode(),
                ValueInterface::SETTING_CODE => $value->getSettingCode(),
                ValueInterface::VALUE        => $value->getValue(),
            ];

            if ($value->getUserId() !== null) {
                $row[ValueInterface::USER_ID] = $value->getUserId();
            }

            $connection->insertOnDuplicate(
                $table,
                [$row],
                [ValueInterface::VALUE, ValueInterface::UPDATED_AT]
            );
        } catch (\Exception $exception) {
            throw new CouldNotSaveException(
                __('Could not save the value: %1', $exception->getMessage()),
                $exception
            );
        }
        return $value;
    }

    /**
     * @inheritdoc
     */
    public function saveMultiple(array $values): int
    {
        if (empty($values)) {
            return 0;
        }

        try {
            $connection = $this->resourceConnection->getConnection();
            $table = $this->resource->getMainTable();

            $data = [];
            foreach ($values as $value) {
                if (!$value instanceof ValueInterface) {
                    throw new CouldNotSaveException(
                        __('Invalid value instance provided')
                    );
                }

                $row = [
                    ValueInterface::THEME_ID => $value->getThemeId(),
                    ValueInterface::SCOPE => $value->getScope(),
                    ValueInterface::STORE_ID => $value->getStoreId(),
                    ValueInterface::STATUS_ID => $value->getStatusId(),
                    ValueInterface::SECTION_CODE => $value->getSectionCode(),
                    ValueInterface::SETTING_CODE => $value->getSettingCode(),
                    ValueInterface::VALUE => $value->getValue()
                ];

                // Add user_id only if not NULL
                if ($value->getUserId() !== null) {
                    $row[ValueInterface::USER_ID] = $value->getUserId();
                }

                $data[] = $row;
            }

            $connection->insertOnDuplicate(
                $table,
                $data,
                [ValueInterface::VALUE, ValueInterface::UPDATED_AT]
            );

            return count($data);
        } catch (\Exception $exception) {
            throw new CouldNotSaveException(
                __('Could not save values: %1', $exception->getMessage()),
                $exception
            );
        }
    }

    /**
     * @inheritdoc
     */
    public function get(int $valueId): ValueInterface
    {
        $value = $this->create();
        $this->resource->load($value, $valueId);
        return $value;
    }

    /**
     * @inheritdoc
     */
    public function getById(int $valueId): ValueInterface
    {
        $value = $this->create();
        $this->resource->load($value, $valueId);

        if (!$value->getValueId()) {
            throw new NoSuchEntityException(
                __('Value with id "%1" does not exist. ', $valueId)
            );
        }

        return $value;
    }

    /**
     * @inheritdoc
     */
    public function getList(SearchCriteriaInterface $searchCriteria): ValueSearchResultsInterface
    {
        $collection = $this->collectionFactory->create();
        $this->collectionProcessor->process($searchCriteria, $collection);

        /** @var ValueSearchResultsInterface $searchResults */
        $searchResults = $this->searchResultsFactory->create();
        $searchResults->setSearchCriteria($searchCriteria);
        $searchResults->setItems($collection->getItems());
        $searchResults->setTotalCount($collection->getSize());

        return $searchResults;
    }

    /**
     * @inheritdoc
     */
    public function delete(ValueInterface $value): bool
    {
        try {
            $this->resource->delete($value);
        } catch (\Exception $exception) {
            throw new CouldNotDeleteException(
                __('Could not delete the value: %1', $exception->getMessage()),
                $exception
            );
        }
        return true;
    }

    /**
     * @inheritdoc
     */
    public function deleteById(int $valueId): bool
    {
        return $this->delete($this->getById($valueId));
    }
}
