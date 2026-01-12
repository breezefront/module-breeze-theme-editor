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
        // Always use hierarchical view for better UX
        return 'hierarchical';
    }

    /**
     * Get stores organized by website and group hierarchy
     * 
     * Structure:
     * [
     *   [
     *     'type' => 'website',
     *     'id' => 1,
     *     'name' => 'Main Website',
     *     'code' => 'base',
     *     'groups' => [
     *       [
     *         'type' => 'group',
     *         'id' => 1,
     *         'name' => 'Main Website Store',
     *         'stores' => [
     *           ['type' => 'store', 'id' => 1, 'name' => 'Default', 'url' => '...', 'active' => true],
     *           ...
     *         ]
     *       ]
     *     ]
     *   ]
     * ]
     *
     * @return array
     */
    public function getHierarchicalStores()
    {
        $result = [];
        $currentStoreId = $this->storeManager->getStore()->getId();
        
        // Get all websites except admin
        $websites = $this->storeManager->getWebsites(false, false);
        
        foreach ($websites as $website) {
            $websiteData = [
                'type' => 'website',
                'id' => (int)$website->getId(),
                'code' => $website->getCode(),
                'name' => $website->getName(),
                'groups' => []
            ];
            
            // Get all groups for this website
            foreach ($website->getGroups() as $group) {
                $groupData = [
                    'type' => 'group',
                    'id' => (int)$group->getId(),
                    'name' => $group->getName(),
                    'stores' => []
                ];
                
                // Get all stores for this group
                foreach ($group->getStores() as $store) {
                    if (!$store->isActive()) {
                        continue;
                    }
                    
                    $groupData['stores'][] = [
                        'type' => 'store',
                        'id' => (int)$store->getId(),
                        'code' => $store->getCode(),
                        'name' => $store->getName(),
                        'url' => $this->getStoreUrl($store),
                        'active' => (int)$store->getId() === (int)$currentStoreId
                    ];
                }
                
                // Sort stores by name
                usort($groupData['stores'], function ($a, $b) {
                    return strcmp($a['name'], $b['name']);
                });
                
                // Only add groups with active stores
                if (!empty($groupData['stores'])) {
                    $websiteData['groups'][] = $groupData;
                }
            }
            
            // Only add websites with groups that have stores
            if (!empty($websiteData['groups'])) {
                $result[] = $websiteData;
            }
        }
        
        return $result;
    }

    /**
     * Get path to active store (website_id, group_id, store_id)
     * Used to auto-expand tree to active store
     *
     * @return array
     */
    public function getActiveStorePath()
    {
        try {
            $store = $this->storeManager->getStore();
            return [
                'website_id' => (int)$store->getWebsiteId(),
                'group_id' => (int)$store->getGroupId(),
                'store_id' => (int)$store->getId()
            ];
        } catch (\Exception $e) {
            return [
                'website_id' => 0,
                'group_id' => 0,
                'store_id' => 0
            ];
        }
    }
}
