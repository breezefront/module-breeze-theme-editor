<?php

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Backend\Model\Auth\Session as AuthSession;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\View\DesignInterface;
use Magento\Framework\App\RequestInterface;

/**
 * Admin-specific ViewModel for Theme Editor toolbar
 * 
 * Provides admin context data without token-based authentication
 */
class AdminToolbar implements ArgumentInterface
{
    /**
     * @var AuthSession
     */
    private $authSession;

    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var DesignInterface
     */
    private $design;

    /**
     * @var RequestInterface
     */
    private $request;

    /**
     * @param AuthSession $authSession
     * @param StoreManagerInterface $storeManager
     * @param DesignInterface $design
     * @param RequestInterface $request
     */
    public function __construct(
        AuthSession $authSession,
        StoreManagerInterface $storeManager,
        DesignInterface $design,
        RequestInterface $request
    ) {
        $this->authSession = $authSession;
        $this->storeManager = $storeManager;
        $this->design = $design;
        $this->request = $request;
    }

    /**
     * Get current admin user name
     *
     * @return string
     */
    public function getCurrentUser()
    {
        $user = $this->authSession->getUser();
        return $user ? $user->getUsername() : 'Admin';
    }

    /**
     * Get current store ID from request
     *
     * @return int
     */
    public function getStoreId()
    {
        $storeId = $this->request->getParam('store');
        if ($storeId !== null) {
            return (int)$storeId;
        }

        try {
            return (int)$this->storeManager->getStore()->getId();
        } catch (\Exception $e) {
            return 1; // Default store
        }
    }

    /**
     * Get current theme ID from request or store config
     *
     * @return int
     */
    public function getThemeId()
    {
        $themeId = $this->request->getParam('theme');
        if ($themeId !== null) {
            return (int)$themeId;
        }

        try {
            return (int)$this->design->getDesignTheme()->getId();
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get count of draft changes
     * 
     * @return int
     * @todo Implement after GraphQL integration
     */
    public function getDraftChangesCount()
    {
        // Will be implemented in Phase 2 when we integrate with GraphQL
        return 0;
    }

    /**
     * Get current publication status
     *
     * @return string One of: DRAFT, PUBLISHED, SCHEDULED
     * @todo Implement after GraphQL integration
     */
    public function getCurrentPublicationStatus()
    {
        // Will be implemented in Phase 2 when we integrate with GraphQL
        return 'DRAFT';
    }

    /**
     * Check if user has permission to edit
     *
     * @return bool
     */
    public function canEdit()
    {
        // Will use ACL in Phase 2
        return $this->authSession->isLoggedIn();
    }

    /**
     * Check if user has permission to publish
     *
     * @return bool
     */
    public function canPublish()
    {
        // Will use ACL in Phase 2
        return $this->authSession->isLoggedIn();
    }

    /**
     * Get admin user ID
     *
     * @return int|null
     */
    public function getUserId()
    {
        $user = $this->authSession->getUser();
        return $user ? (int)$user->getId() : null;
    }

    /**
     * Get admin user email
     *
     * @return string|null
     */
    public function getUserEmail()
    {
        $user = $this->authSession->getUser();
        return $user ? $user->getEmail() : null;
    }

    /**
     * Get list of publications for publication selector
     *
     * @return array
     * @todo Phase 2: Implement real GraphQL query to fetch publications
     */
    public function getPublications()
    {
        // Mock data for Phase 1B
        // In Phase 2, this will query GraphQL for real publication history
        return [
            [
                'id' => 8,
                'title' => '🟣 Purple Theme (Current)',
                'date' => '2026-01-15 15:29:00',
                'status' => 'PUBLISHED'
            ],
            [
                'id' => 7,
                'title' => '🔴 Red Theme',
                'date' => '2026-01-14 15:29:00',
                'status' => 'PUBLISHED'
            ],
            [
                'id' => 6,
                'title' => '🔵 Blue Theme',
                'date' => '2026-01-13 10:15:00',
                'status' => 'PUBLISHED'
            ],
            [
                'id' => 5,
                'title' => '🟢 Green Theme',
                'date' => '2026-01-12 14:20:00',
                'status' => 'PUBLISHED'
            ]
        ];
    }

    /**
     * Get store hierarchy for scope selector (Website → Store Group → Store View)
     *
     * @return array
     */
    public function getStoreHierarchy()
    {
        $hierarchy = [];

        try {
            foreach ($this->storeManager->getWebsites() as $website) {
                $websiteData = [
                    'id' => 'website_' . $website->getId(),
                    'name' => $website->getName(),
                    'code' => $website->getCode(),
                    'type' => 'website',
                    'groups' => []
                ];

                foreach ($website->getGroups() as $group) {
                    $groupData = [
                        'id' => 'group_' . $group->getId(),
                        'name' => $group->getName(),
                        'type' => 'group',
                        'stores' => []
                    ];

                    foreach ($group->getStores() as $store) {
                        $groupData['stores'][] = [
                            'id' => (int)$store->getId(),
                            'name' => $store->getName(),
                            'code' => $store->getCode(),
                            'type' => 'store',
                            'baseUrl' => $store->getBaseUrl()
                        ];
                    }

                    $websiteData['groups'][] = $groupData;
                }

                $hierarchy[] = $websiteData;
            }
        } catch (\Exception $e) {
            // Return empty array on error
            return [];
        }

        return $hierarchy;
    }

    /**
     * Get available page types for page selector
     *
     * @return array
     */
    public function getPageTypes()
    {
        // Common Magento page types
        // In Phase 2, this could be dynamically populated based on available routes
        return [
            [
                'id' => 'cms_index_index',
                'label' => 'Home Page',
                'url' => '/'
            ],
            [
                'id' => 'catalog_category_view',
                'label' => 'Category Page',
                'url' => '/gear.html'
            ],
            [
                'id' => 'catalog_product_view',
                'label' => 'Product Page',
                'url' => '/push-it-messenger-bag.html'
            ],
            [
                'id' => 'cms_page_view',
                'label' => 'CMS Page',
                'url' => '/about-us'
            ],
            [
                'id' => 'checkout_cart_index',
                'label' => 'Shopping Cart',
                'url' => '/checkout/cart'
            ],
            [
                'id' => 'customer_account_login',
                'label' => 'Customer Login',
                'url' => '/customer/account/login'
            ],
            [
                'id' => 'customer_account_index',
                'label' => 'Customer Account',
                'url' => '/customer/account'
            ],
            [
                'id' => 'catalogsearch_result_index',
                'label' => 'Search Results',
                'url' => '/catalogsearch/result?q=bag'
            ]
        ];
    }

    /**
     * Get current page ID (detected from iframe URL)
     *
     * @return string
     * @todo Phase 2: Implement URL parsing to detect actual page type
     */
    public function getCurrentPageId()
    {
        // For now, default to home page
        // In Phase 2, this will parse the iframe URL to determine the actual page type
        return 'cms_index_index';
    }

    /**
     * Get current publication ID
     *
     * @return int|null
     * @todo Phase 2: Implement real query
     */
    public function getCurrentPublicationId()
    {
        // Mock data - return the latest publication
        return 8;
    }

    /**
     * Get toolbar configuration as JSON
     *
     * @return array
     */
    public function getToolbarConfig()
    {
        return [
            'storeId' => $this->getStoreId(),
            'themeId' => $this->getThemeId(),
            'username' => $this->getCurrentUser(),
            'adminUrl' => '/admin',
            'graphqlEndpoint' => '/graphql',
            'iframeSelector' => '#bte-iframe',
            
            // Component configurations
            'components' => [
                'statusIndicator' => [
                    'currentStatus' => $this->getCurrentPublicationStatus(),
                    'draftChangesCount' => $this->getDraftChangesCount()
                ],
                'deviceSwitcher' => [
                    'devices' => ['desktop', 'tablet', 'mobile'],
                    'default' => 'desktop'
                ],
                'navigation' => [
                    'items' => [
                        ['id' => 'theme', 'label' => 'Theme', 'icon' => 'palette'],
                        ['id' => 'layout', 'label' => 'Layout', 'icon' => 'view_quilt'],
                        ['id' => 'css', 'label' => 'CSS', 'icon' => 'code']
                    ]
                ]
            ],
            
            // Data for new widgets
            'publications' => $this->getPublications(),
            'storeHierarchy' => $this->getStoreHierarchy(),
            'currentStoreId' => $this->getStoreId(),
            'pageTypes' => $this->getPageTypes(),
            'currentPageId' => $this->getCurrentPageId(),
            'currentPublicationId' => $this->getCurrentPublicationId(),
            'iframeBaseUrl' => $this->getIframeBaseUrl(),
            'currentStatus' => $this->getCurrentPublicationStatus(),
            'changesCount' => $this->getDraftChangesCount()
        ];
    }

    /**
     * Get iframe base URL for current store
     *
     * @return string
     */
    private function getIframeBaseUrl()
    {
        try {
            return $this->storeManager->getStore($this->getStoreId())->getBaseUrl();
        } catch (\Exception $e) {
            return '/';
        }
    }
}
