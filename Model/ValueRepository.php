<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\App\ResourceConnection;
use Magento\Framework\DB\Adapter\AdapterInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

class ValueRepository
{
    public function __construct(
        private ResourceConnection $resource,
        private StatusProvider $statusProvider
    ) {}

    /**
     * Отримати published значення
     */
    public function getPublishedValues(int $themeId, int $storeId): array
    {
        $statusId = $this->statusProvider->getStatusId('PUBLISHED');

        // Published не прив'язані до конкретного user_id
        return $this->getValuesByStatus($themeId, $storeId, $statusId, null);
    }

    /**
     * Отримати draft значення для користувача
     */
    public function getDraftValues(int $themeId, int $storeId, int $userId): array
    {
        $statusId = $this->statusProvider->getStatusId('DRAFT');

        return $this->getValuesByStatus($themeId, $storeId, $statusId, $userId);
    }

    /**
     * Отримати значення по статусу
     */
    private function getValuesByStatus(int $themeId, int $storeId, int $statusId, ? int $userId = null): array
    {
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
            ->where(ValueInterface::STORE_ID .  ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID . ' = ? ', $statusId);

        // Додати фільтр по userId тільки якщо переданий
        if ($userId !== null) {
            $select->where(ValueInterface::USER_ID . ' = ?', $userId);
        }

        $select->order(ValueInterface::SECTION_CODE . ' ASC')
               ->order(ValueInterface::SETTING_CODE . ' ASC');

        return $connection->fetchAll($select);
    }

    /**
     * Отримати конкретне значення
     */
    public function getValue(
        int $themeId,
        int $storeId,
        int $statusId,
        int $userId,
        string $sectionCode,
        string $fieldCode
    ): ?array {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $select = $connection->select()
            ->from($table)
            ->where(ValueInterface::THEME_ID . ' = ? ', $themeId)
            ->where(ValueInterface::STORE_ID . ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID .  ' = ?', $statusId)
            ->where(ValueInterface::USER_ID . ' = ?', $userId)
            ->where(ValueInterface::SECTION_CODE .  ' = ?', $sectionCode)
            ->where(ValueInterface::SETTING_CODE . ' = ?', $fieldCode)
            ->limit(1);

        $result = $connection->fetchRow($select);

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
        int $fromUserId,
        int $toThemeId,
        int $toStoreId,
        int $toStatusId,
        int $toUserId,
        ? array $sectionCodes = null
    ): int {
        $values = $this->getValuesByStatus($fromThemeId, $fromStoreId, $fromStatusId, $fromUserId);

        if ($sectionCodes) {
            $values = array_filter($values, function($val) use ($sectionCodes) {
                return in_array($val[ValueInterface::SECTION_CODE], $sectionCodes);
            });
        }

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
            ->where(ValueInterface::THEME_ID . ' = ?', $themeId)
            ->where(ValueInterface::STORE_ID . ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID . ' = ?', $statusId)
            ->where(ValueInterface::USER_ID .  ' = ?', $userId);

        return (int)$connection->fetchOne($select);
    }

    /**
     * Видалити значення
     */
    public function deleteValues(
        int $themeId,
        int $storeId,
        int $statusId,
        int $userId
    ): int {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $deleted = $connection->delete($table, [
            ValueInterface::THEME_ID .  ' = ?' => $themeId,
            ValueInterface::STORE_ID . ' = ?' => $storeId,
            ValueInterface::STATUS_ID . ' = ?' => $statusId,
            ValueInterface::USER_ID . ' = ?' => $userId
        ]);

        return (int)$deleted;
    }

    /**
     * Видалити значення по конкретних секціях
     */
    public function deleteValuesBySections(
        int $themeId,
        int $storeId,
        int $statusId,
        int $userId,
        array $sectionCodes
    ): int {
        $connection = $this->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_value');

        $deleted = $connection->delete($table, [
            ValueInterface::THEME_ID . ' = ?' => $themeId,
            ValueInterface::STORE_ID . ' = ?' => $storeId,
            ValueInterface::STATUS_ID . ' = ?' => $statusId,
            ValueInterface::USER_ID . ' = ?' => $userId,
            ValueInterface::SECTION_CODE . ' IN (?)' => $sectionCodes
        ]);

        return (int)$deleted;
    }

    /**
     * Отримати DB connection
     */
    private function getConnection(): AdapterInterface
    {
        return $this->resource->getConnection();
    }
}
