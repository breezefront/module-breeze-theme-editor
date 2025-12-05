<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\App\ResourceConnection;
use Magento\Framework\DB\Adapter\AdapterInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class ValueRepository
{
    public function __construct(
        private ResourceConnection $resource,
        private StatusProvider $statusProvider,
        private ThemeResolver $themeResolver,
        private ConfigProvider $configProvider
    ) {}

    /**
     * ✅ Отримати значення з fallback до батьківських тем
     */
    public function getValueWithInheritance(
        int $themeId,
        int $storeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?   int $userId = null
    ): array {
        $hierarchy = $this->themeResolver->getThemeHierarchy($themeId);

        // Шукаємо value в кожній темі (від child до parent)
        foreach ($hierarchy as $index => $themeInfo) {
            $value = $this->getValueFromTheme(
                $themeInfo['theme_id'],
                $storeId,
                $statusId,
                $sectionCode,
                $fieldCode,
                $userId
            );

            if ($value !== null) {
                return [
                    'value' => $value,
                    'isInherited' => $index > 0,
                    'inheritedFrom' => $index > 0 ? $themeInfo : null,
                    'inheritanceLevel' => $index
                ];
            }
        }

        // Fallback до default з config
        $default = $this->configProvider->getFieldDefault($themeId, $sectionCode, $fieldCode);

        return [
            'value' => $default,
            'isInherited' => false,
            'inheritedFrom' => null,
            'inheritanceLevel' => -1
        ];
    }

    /**
     * ✅ Отримати value тільки з конкретної теми (без inheritance)
     */
    private function getValueFromTheme(
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
            ->where(ValueInterface::THEME_ID .  ' = ? ', $themeId)
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
     * ✅ Отримати всі values з inheritance для теми
     */
    public function getAllValuesWithInheritance(
        int $themeId,
        int $storeId,
        int $statusId,
        ?   int $userId = null
    ): array {
        $hierarchy = $this->themeResolver->getThemeHierarchy($themeId);
        $mergedValues = [];

        // Merge values від прабабусі до дитини
        foreach (array_reverse($hierarchy) as $themeInfo) {
            $values = $this->getValuesByStatusFromTheme(
                $themeInfo['theme_id'],
                $storeId,
                $statusId,
                $userId
            );

            foreach ($values as $value) {
                $key = $value[ValueInterface::SECTION_CODE] . '.' . $value[ValueInterface::SETTING_CODE];
                $mergedValues[$key] = $value;
            }
        }

        return array_values($mergedValues);
    }

    /**
     * ✅ Отримати values тільки з конкретної теми
     */
    private function getValuesByStatusFromTheme(
        int $themeId,
        int $storeId,
        int $statusId,
        ?  int $userId = null
    ): array {
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

        if ($userId !== null) {
            $select->where(ValueInterface::USER_ID . ' = ?', $userId);
        }

        return $connection->fetchAll($select);
    }

    /**
     * Отримати published значення
     */
    public function getPublishedValues(int $themeId, int $storeId): array
    {
        $statusId = $this->statusProvider->getStatusId('PUBLISHED');
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
    private function getValuesByStatus(int $themeId, int $storeId, int $statusId, ?  int $userId = null): array
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
            ->where(ValueInterface::SECTION_CODE . ' = ?', $sectionCode)
            ->where(ValueInterface::SETTING_CODE . ' = ? ', $fieldCode)
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
        ?  int $fromUserId,
        int $toThemeId,
        int $toStoreId,
        int $toStatusId,
        int $toUserId,
        ?  array $sectionCodes = null
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
            $select->where(ValueInterface::USER_ID . ' = ?', $fromUserId);
        }

        if ($sectionCodes) {
            $select->where(ValueInterface::SECTION_CODE .  ' IN (?)', $sectionCodes);
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
            ->where(ValueInterface::THEME_ID . ' = ?', $themeId)
            ->where(ValueInterface::STORE_ID . ' = ?', $storeId)
            ->where(ValueInterface::STATUS_ID . ' = ?', $statusId)
            ->where(ValueInterface::USER_ID . ' = ? ', $userId);

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
            ValueInterface::THEME_ID . ' = ?' => $themeId,
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
            ValueInterface::USER_ID .  ' = ?' => $userId,
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
