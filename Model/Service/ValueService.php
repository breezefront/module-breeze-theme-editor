<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;

/**
 * Value service with business logic
 * Replaces deprecated methods from ValueRepository
 */
class ValueService
{
    public function __construct(
        private ValueRepositoryInterface $valueRepository,
        private SearchCriteriaBuilder $searchCriteriaBuilder
    ) {}

    // ========================================================================
    // QUERY OPERATIONS
    // ========================================================================

    /**
     * Get values by theme (without inheritance)
     * Replaces: ValueRepository::getValuesByTheme()
     */
    public function getValuesByTheme(
        int $themeId,
        string $scope,
        int $scopeId,
        int $statusId,
        ?int $userId = null
    ): array {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $themeId)
            ->addFilter('scope', $scope)
            ->addFilter('store_id', $scopeId)
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
        string $scope,
        int $scopeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?int $userId = null
    ): ?string {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $themeId)
            ->addFilter('scope', $scope)
            ->addFilter('store_id', $scopeId)
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

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    /**
     * Delete values by criteria
     * Replaces: ValueRepository::deleteValues()
     *
     * @param int         $themeId
     * @param string      $scope
     * @param int         $scopeId
     * @param int         $statusId
     * @param int|null    $userId
     * @param array|null  $sectionCodes  Optional section filter
     * @param array|null  $fieldCodes    Optional field filter (setting_code). Only applied when $sectionCodes is set.
     */
    public function deleteValues(
        int $themeId,
        string $scope,
        int $scopeId,
        int $statusId,
        ?int $userId = null,
        ?array $sectionCodes = null,
        ?array $fieldCodes = null
    ): int {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $themeId)
            ->addFilter('scope', $scope)
            ->addFilter('store_id', $scopeId)
            ->addFilter('status_id', $statusId);

        if ($userId !== null) {
            $criteria->addFilter('user_id', $userId);
        }

        if ($sectionCodes !== null) {
            $criteria->addFilter('section_code', $sectionCodes, 'in');
        }

        if ($fieldCodes !== null) {
            $criteria->addFilter('setting_code', $fieldCodes, 'in');
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
     * Copy values from one context to another
     * Replaces: ValueRepository::copyValues()
     */
    public function copyValues(
        int $fromThemeId,
        string $fromScope,
        int $fromScopeId,
        int $fromStatusId,
        ?int $fromUserId,
        int $toThemeId,
        string $toScope,
        int $toScopeId,
        int $toStatusId,
        ?int $toUserId,
        ?array $sectionCodes = null
    ): int {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('theme_id', $fromThemeId)
            ->addFilter('scope', $fromScope)
            ->addFilter('store_id', $fromScopeId)
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
            $model->setScope($toScope);
            $model->setStoreId($toScopeId);
            $model->setStatusId($toStatusId);
            $model->setUserId($toUserId);
            $model->setSectionCode($val->getSectionCode());
            $model->setSettingCode($val->getSettingCode());
            $model->setValue($val->getValue());
            $models[] = $model;
        }

        return $this->valueRepository->saveMultiple($models);
    }
}
