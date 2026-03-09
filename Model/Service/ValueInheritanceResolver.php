<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class ValueInheritanceResolver
{
    public function __construct(
        private ValueService $valueService,
        private ThemeResolver $themeResolver,
        private ConfigProvider $configProvider
    ) {}

    /**
     * Отримати всі values з inheritance
     */
    public function resolveAllValues(
        int $themeId,
        int $storeId,
        int $statusId,
        ? int $userId = null
    ): array {
        if (!$this->shouldInheritParent($themeId)) {
            return $this->valueService->getValuesByTheme($themeId, $storeId, $statusId, $userId);
        }

        $hierarchy = $this->themeResolver->getThemeHierarchy($themeId);
        $mergedValues = [];

        // Merge values від прабабусі до дитини
        foreach (array_reverse($hierarchy) as $themeInfo) {
            $values = $this->valueService->getValuesByTheme(
                $themeInfo['theme_id'],
                $storeId,
                $statusId,
                $userId
            );

            foreach ($values as $value) {
                $key = $value['section_code'] . '.' . $value['setting_code'];
                $mergedValues[$key] = $value;
            }
        }

        return array_values($mergedValues);
    }

    /**
     * Resolve all values for a status that falls back to a base status.
     *
     * Used when loading DRAFT values for display: published rows act as the
     * base and draft rows are overlaid on top.  Fields that have no draft row
     * will therefore show their published value instead of the theme default.
     *
     * Merge order (later entries win):
     *   1. fallback status rows (e.g. PUBLISHED) – the base layer
     *   2. primary status rows (e.g. DRAFT)       – the override layer
     *
     * @param int      $themeId
     * @param int      $storeId
     * @param int      $statusId         Primary status (DRAFT)
     * @param int      $fallbackStatusId Fallback status (PUBLISHED)
     * @param int|null $userId           User ID for the primary status rows
     * @return array
     */
    public function resolveAllValuesWithFallback(
        int $themeId,
        int $storeId,
        int $statusId,
        int $fallbackStatusId,
        ?int $userId = null
    ): array {
        // Load fallback (published) values as the base layer
        $baseValues = $this->resolveAllValues($themeId, $storeId, $fallbackStatusId, null);

        // Load primary (draft) values as the override layer
        $overrideValues = $this->resolveAllValues($themeId, $storeId, $statusId, $userId);

        // Build a map from the base layer, then overwrite with draft entries
        $mergedMap = [];
        foreach ($baseValues as $value) {
            $key = $value['section_code'] . '.' . $value['setting_code'];
            $mergedMap[$key] = $value;
        }
        foreach ($overrideValues as $value) {
            $key = $value['section_code'] . '.' . $value['setting_code'];
            $mergedMap[$key] = $value;
        }

        return array_values($mergedMap);
    }

    /**
     * Отримати одне значення з inheritance
     */
    public function resolveSingleValue(
        int $themeId,
        int $storeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ? int $userId = null
    ): array {
        $hierarchy = $this->shouldInheritParent($themeId)
            ? $this->themeResolver->getThemeHierarchy($themeId)
            : [['theme_id' => $themeId]];

        // Шукаємо value в кожній темі (від child до parent)
        foreach ($hierarchy as $index => $themeInfo) {
            $value = $this->valueService->getSingleValue(
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
     * Перевірити чи значення inherited
     */
    public function isValueInherited(
        int $themeId,
        int $storeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?int $userId = null
    ): bool {
        $result = $this->resolveSingleValue(
            $themeId,
            $storeId,
            $statusId,
            $sectionCode,
            $fieldCode,
            $userId
        );

        return $result['isInherited'];
    }

    /**
     * Check whether this theme should inherit config and values from parent themes.
     * Returns false only when the theme's settings.json explicitly sets inheritParent: false.
     * Defaults to true when the key is absent or when settings.json does not exist.
     */
    private function shouldInheritParent(int $themeId): bool
    {
        try {
            $config = $this->configProvider->getConfiguration($themeId);
            return ($config['inheritParent'] ?? true) !== false;
        } catch (\Exception $e) {
            return true;
        }
    }

    /**
     * Отримати theme з якої inherited значення
     */
    public function getInheritedFromTheme(
        int $themeId,
        int $storeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?int $userId = null
    ): ?array {
        $result = $this->resolveSingleValue(
            $themeId,
            $storeId,
            $statusId,
            $sectionCode,
            $fieldCode,
            $userId
        );

        return $result['inheritedFrom'];
    }
}
