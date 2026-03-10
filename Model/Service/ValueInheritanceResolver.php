<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
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

    // ========================================================================
    // SCOPE CHAIN
    // ========================================================================

    /**
     * Build the scope lookup chain for a given scope/scopeId.
     *
     * For reading we walk from the most-specific scope toward default:
     *   stores/3   → [['default',0], ['websites',W], ['stores',3]]
     *   websites/1 → [['default',0], ['websites',1]]
     *   default/0  → [['default',0]]
     *
     * We return them in ascending specificity order so that later entries
     * (more specific) can override earlier ones during merge.
     *
     * @return array<array{scope:string, scopeId:int}>
     */
    public function buildScopeChain(string $scope, int $scopeId, int $websiteId = 0): array
    {
        // If scope is 'default', or no website context is known, use a single-entry chain.
        // Full scope chain (default → websites → stores) requires a valid websiteId.
        if ($scope === ValueInterface::SCOPE_DEFAULT || $websiteId === 0) {
            return [['scope' => $scope, 'scopeId' => $scopeId]];
        }

        $chain = [
            ['scope' => ValueInterface::SCOPE_DEFAULT, 'scopeId' => 0],
        ];

        if ($scope === ValueInterface::SCOPE_WEBSITES) {
            $chain[] = ['scope' => ValueInterface::SCOPE_WEBSITES, 'scopeId' => $scopeId];
        } elseif ($scope === ValueInterface::SCOPE_STORES) {
            $chain[] = ['scope' => ValueInterface::SCOPE_WEBSITES, 'scopeId' => $websiteId];
            $chain[] = ['scope' => ValueInterface::SCOPE_STORES, 'scopeId' => $scopeId];
        }

        return $chain;
    }

    // ========================================================================
    // QUERY OPERATIONS (scope-aware)
    // ========================================================================

    /**
     * Отримати всі values з inheritance (theme hierarchy) та scope chain.
     *
     * @param int      $themeId
     * @param string   $scope     Requested scope ('default'|'websites'|'stores')
     * @param int      $scopeId   Requested scope ID
     * @param int      $statusId
     * @param int|null $userId
     * @param int      $websiteId Website ID (needed to build websites leg when scope=stores)
     */
    public function resolveAllValues(
        int $themeId,
        string $scope,
        int $scopeId,
        int $statusId,
        ?int $userId = null,
        int $websiteId = 0
    ): array {
        $scopeChain = $this->buildScopeChain($scope, $scopeId, $websiteId);

        if (!$this->shouldInheritParent($themeId)) {
            return $this->resolveAllValuesByScopeChain($themeId, $scopeChain, $statusId, $userId);
        }

        $hierarchy = $this->themeResolver->getThemeHierarchy($themeId);
        $mergedValues = [];

        // Merge values від прабабусі до дитини
        foreach (array_reverse($hierarchy) as $themeInfo) {
            $values = $this->resolveAllValuesByScopeChain(
                $themeInfo['theme_id'],
                $scopeChain,
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
     * base and draft rows are overlaid on top.
     */
    public function resolveAllValuesWithFallback(
        int $themeId,
        string $scope,
        int $scopeId,
        int $statusId,
        int $fallbackStatusId,
        ?int $userId = null,
        int $websiteId = 0
    ): array {
        // Load fallback (published) values as the base layer
        $baseValues = $this->resolveAllValues($themeId, $scope, $scopeId, $fallbackStatusId, null, $websiteId);

        // Load primary (draft) values as the override layer
        $overrideValues = $this->resolveAllValues($themeId, $scope, $scopeId, $statusId, $userId, $websiteId);

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
        string $scope,
        int $scopeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?int $userId = null,
        int $websiteId = 0
    ): array {
        $scopeChain = $this->buildScopeChain($scope, $scopeId, $websiteId);

        $hierarchy = $this->shouldInheritParent($themeId)
            ? $this->themeResolver->getThemeHierarchy($themeId)
            : [['theme_id' => $themeId]];

        // Шукаємо value в кожній темі (від child до parent), від найспецифічнішого scope до default
        foreach ($hierarchy as $themeIndex => $themeInfo) {
            foreach (array_reverse($scopeChain) as $scopeEntry) {
                $value = $this->valueService->getSingleValue(
                    $themeInfo['theme_id'],
                    $scopeEntry['scope'],
                    $scopeEntry['scopeId'],
                    $statusId,
                    $sectionCode,
                    $fieldCode,
                    $userId
                );

                if ($value !== null) {
                    return [
                        'value' => $value,
                        'isInherited' => $themeIndex > 0,
                        'inheritedFrom' => $themeIndex > 0 ? $themeInfo : null,
                        'inheritanceLevel' => $themeIndex
                    ];
                }
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
        string $scope,
        int $scopeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?int $userId = null,
        int $websiteId = 0
    ): bool {
        $result = $this->resolveSingleValue(
            $themeId,
            $scope,
            $scopeId,
            $statusId,
            $sectionCode,
            $fieldCode,
            $userId,
            $websiteId
        );

        return $result['isInherited'];
    }

    /**
     * Check whether this theme should inherit config and values from parent themes.
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
        string $scope,
        int $scopeId,
        int $statusId,
        string $sectionCode,
        string $fieldCode,
        ?int $userId = null,
        int $websiteId = 0
    ): ?array {
        $result = $this->resolveSingleValue(
            $themeId,
            $scope,
            $scopeId,
            $statusId,
            $sectionCode,
            $fieldCode,
            $userId,
            $websiteId
        );

        return $result['inheritedFrom'];
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Merge values across a scope chain for a single theme.
     * Less-specific scopes are loaded first, more-specific ones override them.
     */
    private function resolveAllValuesByScopeChain(
        int $themeId,
        array $scopeChain,
        int $statusId,
        ?int $userId
    ): array {
        $mergedMap = [];

        foreach ($scopeChain as $scopeEntry) {
            $values = $this->valueService->getValuesByTheme(
                $themeId,
                $scopeEntry['scope'],
                $scopeEntry['scopeId'],
                $statusId,
                $userId
            );

            foreach ($values as $value) {
                $key = $value['section_code'] . '.' . $value['setting_code'];
                $mergedMap[$key] = $value;
            }
        }

        return array_values($mergedMap);
    }
}
