<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\View\DesignInterface;
use Magento\Theme\Model\ResourceModel\Theme\Collection as ThemeCollection;
use Magento\Theme\Model\ResourceModel\Theme\CollectionFactory as ThemeCollectionFactory;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Store\Model\ScopeInterface;
use Magento\Framework\App\CacheInterface;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface as BreezeThemeScopeInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

class ThemeResolver
{
    public function __construct(
        private ScopeConfigInterface $scopeConfig,
        private ThemeCollectionFactory $themeCollectionFactory,
        private CacheInterface $cache,
        private SerializerInterface $serializer
    ) {}

    /**
     * Get theme by store ID
     */
    public function getThemeIdByStoreId(int $storeId): int
    {
        // ✅ Читаємо безпосередньо з config
        $themeId = $this->scopeConfig->getValue(
            DesignInterface::XML_PATH_THEME_ID,
            ScopeInterface::SCOPE_STORE,
            $storeId
        );

        if (!$themeId) {
            throw new LocalizedException(__('Unable to determine theme for store %1', $storeId));
        }

        return (int)$themeId;
    }

    /**
     * Get theme ID for a given scope.
     *
     * type='default'  → reads from default scope (scopeId ignored)
     * type='websites' → reads from website scope
     * type='stores'   → reads from store scope
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
            throw new LocalizedException(
                __('Unable to determine theme for scope %1 / scopeId %2', $type, $scopeId)
            );
        }

        return (int)$themeId;
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

        /** @var ThemeCollection $collection */
        $collection = $this->themeCollectionFactory->create();
        $theme = $collection->getItemById($themeId);

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
     */
    public function getThemeInfo(int $themeId): array
    {
        $collection = $this->themeCollectionFactory->create();
        $theme = $collection->getItemById($themeId);

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
     */
    public function hasParentTheme(int $themeId): bool
    {
        $collection = $this->themeCollectionFactory->create();
        $theme = $collection->getItemById($themeId);

        return $theme && $theme->getParentId();
    }

    /**
     * Get direct parent theme ID
     */
    public function getParentThemeId(int $themeId): ? int
    {
        $collection = $this->themeCollectionFactory->create();
        $theme = $collection->getItemById($themeId);

        return $theme && $theme->getParentId() ? (int)$theme->getParentId() : null;
    }
}
