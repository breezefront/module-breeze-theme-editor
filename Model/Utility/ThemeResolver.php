<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Phrase;
use Magento\Framework\View\DesignInterface;
use Magento\Theme\Model\ResourceModel\Theme\CollectionFactory as ThemeCollectionFactory;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Store\Model\ScopeInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\App\CacheInterface;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface as BreezeThemeScopeInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

class ThemeResolver
{
    /** @var array<int, mixed> Per-request memoisation of loaded theme objects. */
    private array $themeCache = [];

    public function __construct(
        private ScopeConfigInterface $scopeConfig,
        private ThemeCollectionFactory $themeCollectionFactory,
        private CacheInterface $cache,
        private SerializerInterface $serializer,
        private StoreManagerInterface $storeManager
    ) {}

    /**
     * Get theme by store ID
     */
    public function getThemeIdByStoreId(int $storeId): int
    {
        // Read directly from config
        $themeId = $this->scopeConfig->getValue(
            DesignInterface::XML_PATH_THEME_ID,
            ScopeInterface::SCOPE_STORE,
            $storeId
        );

        if (!$themeId) {
            throw new LocalizedException(
                __(
                    'No theme is assigned to store view ID %1, nor to the Default Config scope. '
                    . 'Assign a theme in Content > Design > Configuration, then flush the configuration cache.',
                    $storeId
                )
            );
        }

        return (int)$themeId;
    }

    /**
     * Get theme ID for a given scope.
     *
     * type='default'  → reads from default scope (scopeId ignored)
     * type='websites' → reads from website scope
     * type='stores'   → reads from store scope
     *
     * Website and store scopes inherit the default-scope value through
     * ScopeConfig. The default scope has nothing above it, so when
     * design/theme/theme_id was never saved for Default Config — themes
     * assigned per store view only — the lookup comes back empty. In that
     * case the theme of the default store view is used, which is the theme
     * the editor previews for the Default scope anyway.
     */
    public function getThemeIdByScope(BreezeThemeScopeInterface $scope): int
    {
        $type    = $scope->getType();
        $scopeId = $scope->getScopeId();

        switch ($type) {
            case ValueInterface::SCOPE_DEFAULT:
                $themeId = $this->scopeConfig->getValue(
                    DesignInterface::XML_PATH_THEME_ID
                );
                break;

            case ValueInterface::SCOPE_WEBSITES:
                $themeId = $this->scopeConfig->getValue(
                    DesignInterface::XML_PATH_THEME_ID,
                    ScopeInterface::SCOPE_WEBSITE,
                    $scopeId
                );
                break;

            case ValueInterface::SCOPE_STORES:
            default:
                $themeId = $this->scopeConfig->getValue(
                    DesignInterface::XML_PATH_THEME_ID,
                    ScopeInterface::SCOPE_STORE,
                    $scopeId
                );
                break;
        }

        if (!$themeId) {
            $themeId = $this->getFallbackThemeId($type, $scopeId);
        }

        if (!$themeId) {
            throw new LocalizedException($this->getUnresolvedThemeMessage($type, $scopeId));
        }

        return (int)$themeId;
    }

    /**
     * Theme of a store view to use when the requested scope has no theme of its own.
     *
     * default  → default store view, then any other store view
     * websites → store views of that website
     * stores   → nothing to fall back to
     *
     * Returns null when no store view has a theme assigned either.
     */
    private function getFallbackThemeId(string $type, int $scopeId): ?int
    {
        try {
            switch ($type) {
                case ValueInterface::SCOPE_DEFAULT:
                    // Default store view first, then any other one.
                    $stores = array_merge(
                        array_filter([$this->storeManager->getDefaultStoreView()]),
                        $this->storeManager->getStores()
                    );
                    break;

                case ValueInterface::SCOPE_WEBSITES:
                    $stores = array_filter(
                        $this->storeManager->getStores(),
                        fn ($store) => (int)$store->getWebsiteId() === $scopeId
                    );
                    break;

                default:
                    return null;
            }
        } catch (\Exception $e) {
            // Broken or incomplete store setup — no fallback available.
            return null;
        }

        foreach ($stores as $store) {
            $themeId = $this->scopeConfig->getValue(
                DesignInterface::XML_PATH_THEME_ID,
                ScopeInterface::SCOPE_STORE,
                (int)$store->getId()
            );

            if ($themeId) {
                return (int)$themeId;
            }
        }

        return null;
    }

    /**
     * Message naming both the missing configuration and the way to fix it.
     */
    private function getUnresolvedThemeMessage(string $type, int $scopeId): Phrase
    {
        switch ($type) {
            case ValueInterface::SCOPE_DEFAULT:
                return __(
                    'No theme is assigned to the Default Config scope, and no store view has one either. '
                    . 'Assign a theme in Content > Design > Configuration, then flush the configuration cache.'
                );

            case ValueInterface::SCOPE_WEBSITES:
                return __(
                    'No theme is assigned to website ID %1, to the Default Config scope, or to any of its '
                    . 'store views. Assign a theme in Content > Design > Configuration, then flush the '
                    . 'configuration cache.',
                    $scopeId
                );

            default:
                return __(
                    'No theme is assigned to store view ID %1, nor to the Default Config scope. '
                    . 'Assign a theme in Content > Design > Configuration, then flush the configuration cache.',
                    $scopeId
                );
        }
    }

    /**
     * Get full theme hierarchy from child to ancestors
     */
    public function getThemeHierarchy(int $themeId): array
    {
        $cacheKey = 'breeze_theme_editor_hierarchy_' . $themeId;

        if ($cached = $this->cache->load($cacheKey)) {
            return $this->serializer->unserialize($cached);
        }

        $hierarchy = $this->buildThemeHierarchy($themeId);

        $this->cache->save(
            $this->serializer->serialize($hierarchy),
            $cacheKey,
            ['breeze_theme_editor', 'theme'],
            86400
        );

        return $hierarchy;
    }

    /**
     * Build theme hierarchy recursively
     */
    private function buildThemeHierarchy(int $themeId, int $level = 0): array
    {
        $hierarchy = [];

        $theme = $this->loadTheme($themeId);

        if (!$theme) {
            return $hierarchy;
        }

        $hierarchy[] = [
            'theme_id' => (int)$theme->getId(),
            'theme_code' => $theme->getCode(),
            'theme_title' => $theme->getThemeTitle(),
            'theme_path' => $theme->getThemePath(),
            'parent_id' => $theme->getParentId() ?  (int)$theme->getParentId() : null,
            'level' => $level,
        ];

        // Recursively get parent themes by parent_id
        if ($parentId = $theme->getParentId()) {
            $parentHierarchy = $this->buildThemeHierarchy((int)$parentId, $level + 1);
            $hierarchy = array_merge($hierarchy, $parentHierarchy);
        }

        return $hierarchy;
    }

    /**
     * Get theme info by ID
     *
     * @internal Used by tests only; not part of the public API.
     */
    public function getThemeInfo(int $themeId): array
    {
        $theme = $this->loadTheme($themeId);

        if (!$theme) {
            throw new LocalizedException(__('Theme with ID %1 not found', $themeId));
        }

        return [
            'theme_id' => (int)$theme->getId(),
            'theme_code' => $theme->getCode(),
            'theme_title' => $theme->getThemeTitle(),
            'theme_path' => $theme->getThemePath(),
            'parent_id' => $theme->getParentId() ? (int)$theme->getParentId() : null,
        ];
    }

    /**
     * Check if theme has parent
     *
     * @internal Used by tests only; not part of the public API.
     */
    public function hasParentTheme(int $themeId): bool
    {
        $theme = $this->loadTheme($themeId);
        return $theme && $theme->getParentId();
    }

    /**
     * Get direct parent theme ID
     *
     * @internal Used by tests only; not part of the public API.
     */
    public function getParentThemeId(int $themeId): ?int
    {
        $theme = $this->loadTheme($themeId);
        return $theme && $theme->getParentId() ? (int)$theme->getParentId() : null;
    }

    /**
     * Load a theme object by ID with per-request memoisation.
     *
     * Returns null when no theme with the given ID exists.
     */
    private function loadTheme(int $themeId): mixed
    {
        if (!array_key_exists($themeId, $this->themeCache)) {
            $collection = $this->themeCollectionFactory->create();
            $this->themeCache[$themeId] = $collection->getItemById($themeId) ?: null;
        }
        return $this->themeCache[$themeId];
    }
}
