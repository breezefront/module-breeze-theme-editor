<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\View\DesignInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Theme\Model\ResourceModel\Theme\CollectionFactory as ThemeCollectionFactory;

class ThemeResolver
{
    public function __construct(
        private DesignInterface $design,
        private StoreManagerInterface $storeManager,
        private ThemeCollectionFactory $themeCollectionFactory
    ) {}

    /**
     * Отримати ID активної теми для store
     */
    public function getThemeIdByStoreId(int $storeId): int
    {
        // Отримати theme path для store
        $currentStore = $this->storeManager->getStore()->getId();
        $this->storeManager->setCurrentStore($storeId);

        $themeId = $this->design->getConfigurationDesignTheme(DesignInterface::DEFAULT_AREA);

        // Відновити поточний store
        $this->storeManager->setCurrentStore($currentStore);

        if (!$themeId) {
            throw new LocalizedException(__('No theme configured for store %1', $storeId));
        }

        return (int)$themeId;
    }

    /**
     * Отримати theme по ID з валідацією
     */
    public function getThemeById(int $themeId)
    {
        $collection = $this->themeCollectionFactory->create();
        $theme = $collection->getItemById($themeId);

        if (!$theme || !$theme->getId()) {
            throw new LocalizedException(__('Theme %1 not found', $themeId));
        }

        return $theme;
    }
}
