<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\App\ResourceConnection;
use Magento\Framework\DB\Adapter\AdapterInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

class ValueRepository
{
    public function __construct(
        private ResourceConnection $resource
    ) {}

    /**
     * ✅ Отримати всі values для конкретної теми (без inheritance)
     */
    public function getValuesByTheme(
        int $themeId,
        int $storeId,
        int $statusId,
        ?   int $userId = null
    ): array {
        $select = $this->buildValuesQuery($themeId, $storeId, $statusId, $userId);

        $select->order(ValueInterface::SECTION_CODE . ' ASC')
               ->order(ValueInterface::SETTING_CODE . ' ASC');

        return $this->getConnection()->fetchAll($select);
    }

    /**
     * ✅ Отримати одне значення для конкретної теми (без inheritance)
     */
    public function getSingleValue(
        int $themeId,
        int $storeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?   int $userId = null
    ): ?  string {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $select = $connection->select()
            ->from($table, ['value'])
            ->where(ValueInterface::THEME_ID .     ' = ?   ', $themeId)
            ->where(ValueInterface::STORE_ID .  ' = ?  ', $storeId)
            ->where(ValueInterface::STATUS_ID .     ' = ?', $statusId)
            ->where(ValueInterface::SECTION_CODE . ' = ?   ', $sectionCode)
            ->where(ValueInterface::SETTING_CODE . ' = ?', $fieldCode);

        if ($userId !== null) {
            $select->where(ValueInterface::USER_ID . ' = ?', $userId);
        }

        $result = $connection->fetchOne($select);

        return $result ?: null;
    }

    /**
     * Зберегти значення
     */
    public function saveValue(
        int $themeId,
        int $storeId,
        int $statusId,
        int $userId,
        string $sectionCode,
        string $fieldCode,
        string $value
    ): void {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $data = [
            ValueInterface::THEME_ID => $themeId,
            ValueInterface::STORE_ID => $storeId,
            ValueInterface::STATUS_ID => $statusId,
            ValueInterface::USER_ID => $userId,
            ValueInterface::SECTION_CODE => $sectionCode,
            ValueInterface::SETTING_CODE => $fieldCode,
            ValueInterface::VALUE => $value
        ];

        $connection->insertOnDuplicate(
            $table,
            $data,
            [ValueInterface::VALUE, ValueInterface::UPDATED_AT]
        );
    }

    /**
     * Зберегти багато значень (batch)
     */
    public function saveValues(
        int $themeId,
        int $storeId,
        int $statusId,
        int $userId,
        array $values
    ): int {
        if (empty($values)) {
            return 0;
        }

        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $data = [];
        foreach ($values as $value) {
            $data[] = [
                ValueInterface::THEME_ID => $themeId,
                ValueInterface::STORE_ID => $storeId,
                ValueInterface::STATUS_ID => $statusId,
                ValueInterface::USER_ID => $userId,
                ValueInterface::SECTION_CODE => $value['sectionCode'],
                ValueInterface::SETTING_CODE => $value['fieldCode'],
                ValueInterface::VALUE => $value['value']
            ];
        }

        $connection->insertOnDuplicate(
            $table,
            $data,
            [ValueInterface::VALUE, ValueInterface::UPDATED_AT]
        );

        return count($data);
    }

    /**
     * Копіювати значення
     */
    public function copyValues(
        int $fromThemeId,
        int $fromStoreId,
        int $fromStatusId,
        ?     int $fromUserId,
        int $toThemeId,
        int $toStoreId,
        int $toStatusId,
        int $toUserId,
        ?     array $sectionCodes = null
    ): int {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $select = $connection->select()
            ->from($table, [
                ValueInterface::SECTION_CODE,
                ValueInterface::SETTING_CODE,
                ValueInterface::VALUE
            ])
            ->where(ValueInterface::THEME_ID . ' = ?', $fromThemeId)
            ->where(ValueInterface::STORE_ID . ' = ?', $fromStoreId)
            ->where(ValueInterface::STATUS_ID . ' = ?', $fromStatusId);

        if ($fromUserId !== null && $fromUserId > 0) {
            $select->where(ValueInterface::USER_ID . ' = ? ', $fromUserId);
        }

        if ($sectionCodes) {
            $select->where(ValueInterface::SECTION_CODE .   ' IN (?)', $sectionCodes);
        }

        $values = $connection->fetchAll($select);

        if (empty($values)) {
            return 0;
        }

        $formatted = [];
        foreach ($values as $val) {
            $formatted[] = [
                'sectionCode' => $val[ValueInterface::SECTION_CODE],
                'fieldCode' => $val[ValueInterface::SETTING_CODE],
                'value' => $val[ValueInterface::VALUE]
            ];
        }

        return $this->saveValues($toThemeId, $toStoreId, $toStatusId, $toUserId, $formatted);
    }

    /**
     * Отримати кількість значень
     */
    public function getValuesCount(int $themeId, int $storeId, int $statusId, int $userId): int
    {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $select = $connection->select()
            ->from($table, ['COUNT(*)'])
            ->where(ValueInterface::THEME_ID .  ' = ?', $themeId)
            ->where(ValueInterface::STORE_ID . ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID . ' = ?', $statusId)
            ->where(ValueInterface::USER_ID .   ' = ?  ', $userId);

        return (int)$connection->fetchOne($select);
    }

    /**
     * Видалити значення
     */
    public function deleteValues(
        int $themeId,
        int $storeId,
        int $statusId,
        int $userId,
        ?  array $sectionCodes = null
    ): int {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $where = [
            ValueInterface::THEME_ID . ' = ?' => $themeId,
            ValueInterface::STORE_ID . ' = ?' => $storeId,
            ValueInterface::STATUS_ID .   ' = ?' => $statusId,
            ValueInterface::USER_ID .  ' = ?' => $userId
        ];

        if ($sectionCodes !== null) {
            $where[ValueInterface::SECTION_CODE .  ' IN (?)'] = $sectionCodes;
        }

        $deleted = $connection->delete($table, $where);

        return (int)$deleted;
    }

    /**
     * ✅ Побудувати базовий SELECT для values (DRY)
     */
    private function buildValuesQuery(
        int $themeId,
        int $storeId,
        int $statusId,
        ?    int $userId = null
    ): \Magento\Framework\DB\Select {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $select = $connection->select()
            ->from($table, [
                ValueInterface::SECTION_CODE,
                ValueInterface::SETTING_CODE,
                ValueInterface::VALUE,
                ValueInterface::UPDATED_AT
            ])
            ->where(ValueInterface::THEME_ID . ' = ?', $themeId)
            ->where(ValueInterface::STORE_ID .     ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID .  ' = ?   ', $statusId);

        if ($userId !== null) {
            $select->where(ValueInterface::USER_ID . ' = ?', $userId);
        }

        return $select;
    }

    /**
     * Отримати DB connection
     */
    private function getConnection(): AdapterInterface
    {
        return $this->resource->getConnection();
    }
}
