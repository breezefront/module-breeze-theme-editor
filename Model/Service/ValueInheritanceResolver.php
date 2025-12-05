<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class ValueInheritanceResolver
{
    public function __construct(
        private ValueRepository $valueRepository,
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
        ?    int $userId = null
    ): array {
        $hierarchy = $this->themeResolver->getThemeHierarchy($themeId);
        $mergedValues = [];

        // Merge values від прабабусі до дитини
        foreach (array_reverse($hierarchy) as $themeInfo) {
            $values = $this->valueRepository->getValuesByTheme(
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
     * Отримати одне значення з inheritance
     */
    public function resolveSingleValue(
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
            $value = $this->valueRepository->getSingleValue(
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
        ?  int $userId = null
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
     * Отримати theme з якої inherited значення
     */
    public function getInheritedFromTheme(
        int $themeId,
        int $storeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?  int $userId = null
    ): ?  array {
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
