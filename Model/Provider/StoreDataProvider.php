<?php

namespace Swissup\BreezeThemeEditor\Model\Provider;

use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\UrlInterface;

class StoreDataProvider
{
    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var UrlInterface
     */
    private $urlBuilder;

    /**
     * @param StoreManagerInterface $storeManager
     * @param UrlInterface $urlBuilder
     */
    public function __construct(
        StoreManagerInterface $storeManager,
        UrlInterface $urlBuilder
    ) {
        $this->storeManager = $storeManager;
        $this->urlBuilder = $urlBuilder;
    }

    /**
     * Get available stores for current website
     *
     * @return array
     */
    public function getAvailableStores()
    {
        $currentStoreId = $this->storeManager->getStore()->getId();
        $currentWebsite = $this->storeManager->getWebsite();
        $stores = [];

        foreach ($currentWebsite->getStores() as $store) {
            if (!$store->isActive()) {
                continue;
            }

            $stores[] = [
                'id' => $store->getId(),
                'code' => $store->getCode(),
                'name' => $store->getName(),
                'url' => $this->getStoreUrl($store),
                'active' => $store->getId() == $currentStoreId
            ];
        }

        // Sort by name
        usort($stores, function ($a, $b) {
            return strcmp($a['name'], $b['name']);
        });

        return $stores;
    }

    /**
     * Get available store groups (for multi-store setup)
     *
     * @return array
     */
    public function getAvailableGroups()
    {
        $currentGroupId = $this->storeManager->getStore()->getGroupId();
        $currentWebsite = $this->storeManager->getWebsite();
        $groups = [];

        foreach ($currentWebsite->getGroups() as $group) {
            $defaultStore = $group->getDefaultStore();

            if (!$defaultStore || !$defaultStore->isActive()) {
                continue;
            }

            $groups[] = [
                'id' => $group->getId(),
                'name' => $group->getName(),
                'url' => $this->getStoreUrl($defaultStore),
                'active' => $group->getId() == $currentGroupId
            ];
        }

        return $groups;
    }

    /**
     * Get store URL with current page context
     *
     * @param \Magento\Store\Model\Store $store
     * @return string
     */
    private function getStoreUrl($store)
    {
        try {
            // Get current URL on target store
            return $store->getCurrentUrl(false);
        } catch (\Exception $e) {
            // Fallback to base URL
            return $store->getBaseUrl();
        }
    }

    /**
     * Check if we have multiple stores
     *
     * @return bool
     */
    public function hasMultipleStores()
    {
        return count($this->getAvailableStores()) > 1;
    }

    /**
     * Get store switch mode (stores or groups)
     *
     * @return string
     */
    public function getSwitchMode()
    {
        $stores = $this->getAvailableStores();
        $groups = $this->getAvailableGroups();

        // If multiple groups, show groups
        if (count($groups) > 1) {
            return 'groups';
        }

        // Otherwise show stores
        return 'stores';
    }
}
