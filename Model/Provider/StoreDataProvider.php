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
     * @var ThemeAvailabilityProvider
     */
    private $themeAvailability;

    /**
     * @param StoreManagerInterface     $storeManager
     * @param UrlInterface              $urlBuilder
     * @param ThemeAvailabilityProvider $themeAvailability
     */
    public function __construct(
        StoreManagerInterface     $storeManager,
        UrlInterface              $urlBuilder,
        ThemeAvailabilityProvider $themeAvailability
    ) {
        $this->storeManager      = $storeManager;
        $this->urlBuilder        = $urlBuilder;
        $this->themeAvailability = $themeAvailability;
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
            return $store->getCurrentUrl(false);
        } catch (\Exception $e) {
            return $store->getBaseUrl();
        }
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
     * Get stores organized by website and group hierarchy.
     * Includes a top-level "Default" entry and per-website entries.
     *
     * Structure:
     * [
     *   ['type'=>'default', 'scope'=>'default', 'scopeId'=>0,  'name'=>'All Store Views', 'defaultStoreId'=>1],
     *   [
     *     'type' => 'website',
     *     'scope' => 'websites',
     *     'scopeId' => 1,
     *     'id' => 1,
     *     'name' => 'Main Website',
     *     'code' => 'base',
     *     'defaultStoreId' => 1,
     *     'groups' => [
     *       [
     *         'type' => 'group',
     *         'id' => 1,
     *         'name' => 'Main Website Store',
     *         'stores' => [
     *           ['type'=>'store', 'scope'=>'stores', 'scopeId'=>1, 'id'=>1, 'name'=>'Default', 'url'=>'...', 'active'=>true],
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

        // Collect the first active store across all websites for Default preview
        $firstActiveStoreId = 0;

        $websiteEntries = [];
        foreach ($websites as $website) {
            $websiteFirstStoreId = 0;
            $websiteData = [
                'type'          => 'website',
                'scope'         => 'websites',
                'scopeId'       => (int)$website->getId(),
                'id'            => (int)$website->getId(),
                'code'          => $website->getCode(),
                'name'          => $website->getName(),
                'defaultStoreId' => 0,
                'hasSettings'   => $this->themeAvailability->hasSettings('websites', (int)$website->getId()),
                'groups'        => []
            ];

            // Get all groups for this website
            foreach ($website->getGroups() as $group) {
                $groupData = [
                    'type'   => 'group',
                    'id'     => (int)$group->getId(),
                    'name'   => $group->getName(),
                    'stores' => []
                ];

                // Get all stores for this group
                foreach ($group->getStores() as $store) {
                    if (!$store->isActive()) {
                        continue;
                    }

                    $storeId = (int)$store->getId();

                    if ($websiteFirstStoreId === 0) {
                        $websiteFirstStoreId = $storeId;
                    }
                    if ($firstActiveStoreId === 0) {
                        $firstActiveStoreId = $storeId;
                    }

                    $groupData['stores'][] = [
                        'type'        => 'store',
                        'scope'       => 'stores',
                        'scopeId'     => $storeId,
                        'id'          => $storeId,
                        'code'        => $store->getCode(),
                        'name'        => $store->getName(),
                        'url'         => $this->getStoreUrl($store),
                        'active'      => (int)$store->getId() === (int)$currentStoreId,
                        'hasSettings' => $this->themeAvailability->hasSettings('stores', $storeId),
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

            $websiteData['defaultStoreId'] = $this->getDefaultStoreId((int)$website->getId(), $websiteFirstStoreId);

            // Only add websites with groups that have stores
            if (!empty($websiteData['groups'])) {
                $websiteEntries[] = $websiteData;
            }
        }

        // Prepend "All Store Views" (Default scope) entry.
        // Use the default website → default group → default store as preview.
        $defaultWebsite = $this->storeManager->getWebsite(true);
        $defaultPreviewId = $this->getDefaultStoreId((int)$defaultWebsite->getId(), $firstActiveStoreId);

        $result[] = [
            'type'          => 'default',
            'scope'         => 'default',
            'scopeId'       => 0,
            'name'          => (string)__('All Store Views'),
            'defaultStoreId'=> $defaultPreviewId,
            'hasSettings'   => $this->themeAvailability->hasSettings('default', 0),
        ];

        foreach ($websiteEntries as $websiteData) {
            $result[] = $websiteData;
        }

        return $result;
    }

    /**
     * Get the default store view ID for a given website.
     * Resolves via website → default group → default store.
     * Falls back to $fallback if the default store is missing or inactive.
     *
     * @param int $websiteId
     * @param int $fallback
     * @return int
     */
    private function getDefaultStoreId(int $websiteId, int $fallback): int
    {
        try {
            $website = $this->storeManager->getWebsite($websiteId);
            $group   = $website ? $website->getDefaultGroup() : null;
            $store   = $group ? $group->getDefaultStore() : null;
            if ($store && $store->isActive()) {
                return (int)$store->getId();
            }
        } catch (\Exception $e) {
            // fall through to fallback
        }
        return $fallback;
    }

}
