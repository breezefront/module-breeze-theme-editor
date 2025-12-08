<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\Exception\LocalizedException;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValidationService;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;

/**
 * Value service with business logic
 * Replaces deprecated methods from ValueRepository
 */
class ValueService
{
    public function __construct(
        private ValueRepositoryInterface $valueRepository,
        private StatusProvider $statusProvider,
        private ValidationService $validationProvider,
        private SearchCriteriaBuilder $searchCriteriaBuilder
    ) {}

    // ========================================================================
    // SAVE OPERATIONS
    // ========================================================================

    /**
     * Зберегти значення
     */
    public function saveValues(
        int $themeId,
        int $storeId,
        string $statusCode,
        int $userId,
        array $values
    ): array {
        $statusId = $this->statusProvider->getStatusId($statusCode);
        $userIdForSave = ($statusCode === 'PUBLISHED') ?  0 : $userId;

        // Валідація значень
        $validationErrors = $this->validationProvider->validateValues($themeId, $values);
        if (! empty($validationErrors)) {
            throw new LocalizedException(
                __('Validation failed: %1', implode(', ', array_column($validationErrors, 'message')))
            );
        }

        // Формуємо масив ValueInterface
        $valueModels = [];
        foreach ($values as $val) {
            $model = $this->valueRepository->create();
            $model->setThemeId($themeId);
            $model->setStoreId($storeId);
            $model->setStatusId($statusId);
            $model->setSectionCode($val['sectionCode']);
            $model->setSettingCode($val['fieldCode']);
            $model->setValue($val['value']);
            $model->setUserId($userIdForSave);
            $valueModels[] = $model;
        }

        $this->valueRepository->saveMultiple($valueModels);

        return $this->formatValuesForOutput($values);
    }

    /**
     * Зберегти одне значення (для live preview)
     */
    public function saveValue(
        int $themeId,
        int $storeId,
        string $statusCode,
        int $userId,
        string $sectionCode,
        string $fieldCode,
        string $value
    ): array {
        $statusId = $this->statusProvider->getStatusId($statusCode);
        $userIdForSave = ($statusCode === 'PUBLISHED') ?  0 : $userId;

        // Валідація одного значення
        $validationError = $this->validationProvider->validateValue(
            $themeId,
            $sectionCode,
            $fieldCode,
            $value
        );

        if ($validationError) {
            throw new LocalizedException(__($validationError));
        }

        $model = $this->valueRepository->create();
        $model->setThemeId($themeId);
        $model->setStoreId($storeId);
        $model->setStatusId($statusId);
        $model->setSectionCode($sectionCode);
        $model->setSettingCode($fieldCode);
        $model->setValue($value);
        $model->setUserId($userIdForSave);

        $this->valueRepository->save($model);

        return [
            'sectionCode' => $sectionCode,
            'fieldCode' => $fieldCode,
            'value' => $value,
        ];
    }

    // ========================================================================
    // QUERY OPERATIONS (replaces deprecated ValueRepository methods)
    // ========================================================================

    /**
     * Get values by theme (without inheritance)
     * Replaces: ValueRepository::getValuesByTheme()
     */
    public function getValuesByTheme(
        int $themeId,
        int $storeId,
        int $statusId,
        ? int $userId = null
    ): array {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $themeId)
            ->addFilter('store_id', $storeId)
            ->addFilter('status_id', $statusId);

        if ($userId !== null) {
            $criteria->addFilter('user_id', $userId);
        }

        $searchResults = $this->valueRepository->getList($criteria->create());

        // Convert to legacy array format for backward compatibility
        $result = [];
        foreach ($searchResults->getItems() as $item) {
            $result[] = [
                'section_code' => $item->getSectionCode(),
                'setting_code' => $item->getSettingCode(),
                'value' => $item->getValue(),
                'updated_at' => $item->getUpdatedAt()
            ];
        }

        return $result;
    }

    /**
     * Get single value by field
     * Replaces: ValueRepository::getSingleValue()
     */
    public function getSingleValue(
        int $themeId,
        int $storeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ? int $userId = null
    ): ? string {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $themeId)
            ->addFilter('store_id', $storeId)
            ->addFilter('status_id', $statusId)
            ->addFilter('section_code', $sectionCode)
            ->addFilter('setting_code', $fieldCode)
            ->setPageSize(1);

        if ($userId !== null) {
            $criteria->addFilter('user_id', $userId);
        }

        $searchResults = $this->valueRepository->getList($criteria->create());
        $items = $searchResults->getItems();

        if (empty($items)) {
            return null;
        }

        return reset($items)->getValue();
    }

    /**
     * Get values count
     * Replaces: ValueRepository::getValuesCount()
     */
    public function getValuesCount(
        int $themeId,
        int $storeId,
        int $statusId,
        ?int $userId = null
    ): int {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $themeId)
            ->addFilter('store_id', $storeId)
            ->addFilter('status_id', $statusId);

        if ($userId !== null) {
            $criteria->addFilter('user_id', $userId);
        }

        $searchResults = $this->valueRepository->getList($criteria->create());
        return $searchResults->getTotalCount();
    }

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    /**
     * Видалити draft
     * Replaces: ValueRepository::deleteValues()
     */
    public function discardDraft(
        int $themeId,
        int $storeId,
        int $userId,
        ? array $sectionCodes = null
    ): int {
        $statusId = $this->statusProvider->getStatusId('DRAFT');

        return $this->deleteValues(
            $themeId,
            $storeId,
            $statusId,
            $userId,
            $sectionCodes
        );
    }

    /**
     * Delete values by criteria
     * Replaces: ValueRepository::deleteValues()
     */
    public function deleteValues(
        int $themeId,
        int $storeId,
        int $statusId,
        ? int $userId = null,
        ?array $sectionCodes = null
    ): int {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $themeId)
            ->addFilter('store_id', $storeId)
            ->addFilter('status_id', $statusId);

        if ($userId !== null) {
            $criteria->addFilter('user_id', $userId);
        }

        if ($sectionCodes !== null) {
            $criteria->addFilter('section_code', $sectionCodes, 'in');
        }

        $searchResults = $this->valueRepository->getList($criteria->create());
        $values = $searchResults->getItems();

        $count = 0;
        foreach ($values as $value) {
            $this->valueRepository->delete($value);
            $count++;
        }

        return $count;
    }

    // ========================================================================
    // COPY OPERATIONS
    // ========================================================================

    /**
     * Копіювати з іншого store
     */
    public function copyFromStore(
        int $fromStoreId,
        int $toStoreId,
        int $themeId,
        string $statusCode,
        int $userId,
        ?array $sectionCodes = null
    ): int {
        $statusId = $this->statusProvider->getStatusId($statusCode);
        $userIdFrom = ($statusCode === 'PUBLISHED') ? 0 : $userId;
        $userIdTo = ($statusCode === 'PUBLISHED') ? 0 : $userId;

        return $this->copyValues(
            $themeId,
            $fromStoreId,
            $statusId,
            $userIdFrom,
            $themeId,
            $toStoreId,
            $statusId,
            $userIdTo,
            $sectionCodes
        );
    }

    /**
     * Copy values from one context to another
     * Replaces: ValueRepository::copyValues()
     */
    public function copyValues(
        int $fromThemeId,
        int $fromStoreId,
        int $fromStatusId,
        ? int $fromUserId,
        int $toThemeId,
        int $toStoreId,
        int $toStatusId,
        ?int $toUserId,
        ?array $sectionCodes = null
    ): int {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $fromThemeId)
            ->addFilter('store_id', $fromStoreId)
            ->addFilter('status_id', $fromStatusId);

        if ($fromUserId !== null) {
            $criteria->addFilter('user_id', $fromUserId);
        }

        if ($sectionCodes !== null) {
            $criteria->addFilter('section_code', $sectionCodes, 'in');
        }

        $searchResults = $this->valueRepository->getList($criteria->create());
        $values = $searchResults->getItems();

        if (empty($values)) {
            return 0;
        }

        $models = [];
        foreach ($values as $val) {
            $model = $this->valueRepository->create();
            $model->setThemeId($toThemeId);
            $model->setStoreId($toStoreId);
            $model->setStatusId($toStatusId);
            $model->setUserId($toUserId);
            $model->setSectionCode($val->getSectionCode());
            $model->setSettingCode($val->getSettingCode());
            $model->setValue($val->getValue());
            $models[] = $model;
        }

        return $this->valueRepository->saveMultiple($models);
    }

    // ========================================================================
    // OTHER OPERATIONS
    // ========================================================================

    /**
     * Скинути до default значень
     */
    public function resetToDefaults(
        int $themeId,
        int $storeId,
        string $statusCode,
        int $userId,
        ?array $sectionCodes = null,
        ?array $fieldCodes = null
    ): array {
        // TODO: implement with ConfigProvider
        return [];
    }

    /**
     * Форматувати значення для виводу
     */
    private function formatValuesForOutput(array $values): array
    {
        $result = [];
        foreach ($values as $val) {
            $result[] = [
                'sectionCode' => $val['sectionCode'],
                'fieldCode' => $val['fieldCode'],
                'value' => $val['value']
            ];
        }
        return $result;
    }
}
