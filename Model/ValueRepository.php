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
use Magento\Framework\DB\Adapter\AdapterInterface;

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
     */
    public function save(ValueInterface $value): ValueInterface
    {
        try {
            $this->resource->save($value);
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
            $connection = $this->getConnection();
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

        if (! $value->getValueId()) {
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

    // ========================================================================
    // 🔻 DEPRECATED - Legacy methods for backward compatibility
    // ========================================================================

    /**
     * Get values by theme (without inheritance)
     *
     * @deprecated Use getList() with SearchCriteria instead
     * @see getList()
     */
    public function getValuesByTheme(
        int $themeId,
        int $storeId,
        int $statusId,
        ? int $userId = null
    ): array {
        $select = $this->buildValuesQuery($themeId, $storeId, $statusId, $userId);

        $select->order(ValueInterface::SECTION_CODE .  ' ASC')
               ->order(ValueInterface::SETTING_CODE . ' ASC');

        return $this->getConnection()->fetchAll($select);
    }

    /**
     * Get single value by field
     *
     * @deprecated Use getList() with SearchCriteria instead
     * @see getList()
     */
    public function getSingleValue(
        int $themeId,
        int $storeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?int $userId = null
    ): ? string {
        $connection = $this->getConnection();
        $table = $this->resource->getMainTable();

        $select = $connection->select()
            ->from($table, ['value'])
            ->where(ValueInterface::THEME_ID . ' = ? ', $themeId)
            ->where(ValueInterface::STORE_ID . ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID .  ' = ?', $statusId)
            ->where(ValueInterface::SECTION_CODE . ' = ? ', $sectionCode)
            ->where(ValueInterface::SETTING_CODE . ' = ?', $fieldCode);

        if ($userId !== null) {
            $select->where(ValueInterface::USER_ID . ' = ?', $userId);
        }

        $result = $connection->fetchOne($select);

        return $result ?: null;
    }

    /**
     * Copy values
     *
     * @deprecated Move to separate ValueCopyService
     */
    public function copyValues(
        int $fromThemeId,
        int $fromStoreId,
        int $fromStatusId,
        ?int $fromUserId,
        int $toThemeId,
        int $toStoreId,
        int $toStatusId,
        ?int $toUserId,
        ?array $sectionCodes = null
    ): int {
        // 1. Отримати legacy-значення (масив, не моделі)
        $values = $this->getValuesByTheme($fromThemeId, $fromStoreId, $fromStatusId, $fromUserId);

        if (empty($values)) {
            return 0;
        }

        // 2. Відфільтрувати, якщо секції потрібні
        if ($sectionCodes) {
            $values = array_filter($values, function ($val) use ($sectionCodes) {
                return in_array($val[ValueInterface::SECTION_CODE], $sectionCodes);
            });
        }

        // 3. Сформувати масив ValueInterface моделей для нового store/theme/status/user
        $models = [];
        foreach ($values as $val) {
            $model = $this->create(); // ValueInterface модель
            $model->setThemeId($toThemeId);
            $model->setStoreId($toStoreId);
            $model->setStatusId($toStatusId);
            $model->setUserId($toUserId);
            $model->setSectionCode($val[ValueInterface::SECTION_CODE]);
            $model->setSettingCode($val[ValueInterface::SETTING_CODE]);
            $model->setValue($val[ValueInterface::VALUE]);
            $models[] = $model;
        }

        // 4. Викликати сучасний saveMultiple
        return $this->saveMultiple($models);
    }

    /**
     * Get values count
     *
     * @deprecated Use getList()->getTotalCount() instead
     * @see getList()
     */
    public function getValuesCount(int $themeId, int $storeId, int $statusId, int $userId): int
    {
        $connection = $this->getConnection();
        $table = $this->resource->getMainTable();

        $select = $connection->select()
            ->from($table, ['COUNT(*)'])
            ->where(ValueInterface::THEME_ID .  ' = ?', $themeId)
            ->where(ValueInterface::STORE_ID . ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID . ' = ?', $statusId)
            ->where(ValueInterface::USER_ID . ' = ?', $userId);

        return (int)$connection->fetchOne($select);
    }

    /**
     * Delete values by criteria
     *
     * @deprecated Move to separate ValueManagementService
     */
    public function deleteValues(
        int $themeId,
        int $storeId,
        int $statusId,
        ? int $userId = null,
        ?array $sectionCodes = null
    ): int {
        $connection = $this->getConnection();
        $table = $this->resource->getMainTable();

        $where = [
            ValueInterface::THEME_ID .  ' = ?' => $themeId,
            ValueInterface::STORE_ID . ' = ?' => $storeId,
            ValueInterface::STATUS_ID . ' = ?' => $statusId
        ];

        if ($userId !== null) {
            $where[ValueInterface::USER_ID .  ' = ? '] = $userId;
        }

        if ($sectionCodes !== null) {
            $where[ValueInterface::SECTION_CODE .  ' IN (?)'] = $sectionCodes;
        }

        $deleted = $connection->delete($table, $where);

        return (int)$deleted;
    }

    /**
     * Build values query (DRY helper)
     *
     * @deprecated Internal helper method
     */
    private function buildValuesQuery(
        int $themeId,
        int $storeId,
        int $statusId,
        ?int $userId = null
    ): \Magento\Framework\DB\Select {
        $connection = $this->getConnection();
        $table = $this->resource->getMainTable();

        $select = $connection->select()
            ->from($table, [
                ValueInterface::SECTION_CODE,
                ValueInterface::SETTING_CODE,
                ValueInterface::VALUE,
                ValueInterface::UPDATED_AT
            ])
            ->where(ValueInterface::THEME_ID . ' = ?', $themeId)
            ->where(ValueInterface::STORE_ID . ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID . ' = ?', $statusId);

        if ($userId !== null) {
            $select->where(ValueInterface::USER_ID . ' = ?', $userId);
        }

        return $select;
    }

    /**
     * Get DB connection
     */
    private function getConnection(): AdapterInterface
    {
        return $this->resourceConnection->getConnection();
    }
}
