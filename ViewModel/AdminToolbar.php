<?php

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\Serialize\Serializer\Json;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\View\DesignInterface;
use Magento\Backend\Model\Auth\Session as AuthSession;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SortOrder;

/**
 * Admin-specific ViewModel for Theme Editor toolbar
 * 
 * Extends frontend Toolbar to reuse:
 * - StoreDataProvider for store hierarchy
 * - PageUrlProvider for page types
 * - Store/Theme/User data methods
 * 
 * Adds admin-specific functionality:
 * - Real publications from database via PublicationRepository
 * - Admin authentication (no AccessToken needed)
 * - ACL checks for edit/publish permissions
 */
class AdminToolbar extends Toolbar
{
    /**
     * @var PublicationRepositoryInterface
     */
    private $publicationRepository;

    /**
     * @var SearchCriteriaBuilder
     */
    private $searchCriteriaBuilder;

    /**
     * @var AuthSession
     */
    private $authSession;

    /**
     * @var \Magento\Framework\App\RequestInterface
     */
    private $request;

    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var \Magento\Framework\UrlInterface
     */
    private $urlBuilder;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator
     */
    private $tokenGenerator;

    /**
     * @var \Magento\Framework\AuthorizationInterface
     */
    private $authorization;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver
     */
    private $themeResolver;

    /**
     * @param \Swissup\BreezeThemeEditor\Helper\Data $helper
     * @param \Swissup\BreezeThemeEditor\Model\Data\AccessToken $accessToken
     * @param \Magento\Framework\App\RequestInterface $request
     * @param \Magento\Framework\UrlInterface $urlBuilder
     * @param AuthSession $authSession
     * @param StoreManagerInterface $storeManager
     * @param \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider $pageUrlProvider
     * @param \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider $storeDataProvider
     * @param DesignInterface $design
     * @param Json $jsonSerializer
     * @param \Magento\Framework\App\State $state
     * @param PublicationRepositoryInterface $publicationRepository
     * @param SearchCriteriaBuilder $searchCriteriaBuilder
     * @param \Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator $tokenGenerator
     * @param \Magento\Framework\AuthorizationInterface $authorization
     * @param \Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver $themeResolver
     */
    public function __construct(
        \Swissup\BreezeThemeEditor\Helper\Data $helper,
        \Swissup\BreezeThemeEditor\Model\Data\AccessToken $accessToken,
        \Magento\Framework\App\RequestInterface $request,
        \Magento\Framework\UrlInterface $urlBuilder,
        AuthSession $authSession,
        StoreManagerInterface $storeManager,
        \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider $pageUrlProvider,
        \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider $storeDataProvider,
        DesignInterface $design,
        Json $jsonSerializer,
        \Magento\Framework\App\State $state,
        PublicationRepositoryInterface $publicationRepository,
        SearchCriteriaBuilder $searchCriteriaBuilder,
        \Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator $tokenGenerator,
        \Magento\Framework\AuthorizationInterface $authorization,
        \Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver $themeResolver
    ) {
        parent::__construct(
            $helper,
            $accessToken,
            $request,
            $urlBuilder,
            $authSession,
            $storeManager,
            $pageUrlProvider,
            $storeDataProvider,
            $design,
            $jsonSerializer,
            $state
        );
        
        // Store references that we need in this class
        $this->publicationRepository = $publicationRepository;
        $this->searchCriteriaBuilder = $searchCriteriaBuilder;
        $this->authSession = $authSession;
        $this->request = $request;
        $this->storeManager = $storeManager;
        $this->urlBuilder = $urlBuilder;
        $this->tokenGenerator = $tokenGenerator;
        $this->authorization = $authorization;
        $this->themeResolver = $themeResolver;
    }

    /**
     * Admin area doesn't require AccessToken validation
     * Just check if admin user is logged in
     *
     * @return bool
     */
    public function canShow()
    {
        return $this->authSession->isLoggedIn();
    }

    /**
     * Get Magento admin integration token for GraphQL authentication
     * 
     * Returns cached token if still valid, or generates new one.
     * Token is valid for 4 hours and cached in Backend Session.
     *
     * @return string|null
     */
    public function getToken(): ?string
    {
        try {
            return $this->tokenGenerator->generateForCurrentAdmin();
        } catch (\Exception $e) {
            // Don't use logger here as it's not injected
            // Error will be logged by AdminTokenGenerator already
            return null;
        }
    }

    /**
     * Override parent getThemeId() to return frontend theme ID instead of backend theme
     * 
     * Parent method uses DesignInterface which returns backend theme (ID=2) in admin area.
     * We need the actual frontend theme assigned to the store for publications/values.
     *
     * @return int Theme ID from store configuration
     */
    public function getThemeId()
    {
        try {
            $storeId = $this->getStoreId();
            return $this->themeResolver->getThemeIdByStoreId($storeId);
        } catch (\Exception $e) {
            // Fallback to parent method if ThemeResolver fails
            return parent::getThemeId();
        }
    }

    /**
     * Get list of publications from database (real data via Repository)
     * 
     * NOTE: Publications are now loaded via GraphQL in frontend (publication-selector.js).
     * This method is kept for backward compatibility but returns empty array.
     * 
     * @deprecated Use GraphQL query 'getPublications' instead
     * @return array Empty array - publications loaded via GraphQL
     */
    public function getPublications()
    {
        // Publications are loaded dynamically via GraphQL
        // See: view/adminhtml/web/js/graphql/queries/get-publications.js
        return [];
    }

    /**
     * Create sort order object
     *
     * @param string $field
     * @param string $direction
     * @return SortOrder
     */
    private function createSortOrder($field, $direction)
    {
        $sortOrder = new SortOrder();
        $sortOrder->setField($field);
        $sortOrder->setDirection($direction);
        return $sortOrder;
    }

    /**
     * Get current publication status
     *
     * @return string One of: DRAFT, PUBLISHED, SCHEDULED
     * @todo Phase 2: Implement draft status detection from GraphQL
     *              Currently returns hardcoded 'DRAFT' - needs real-time status check
     */
    public function getCurrentPublicationStatus()
    {
        // STUB: Will be implemented in Phase 2 when we integrate with GraphQL
        // Real implementation should check if current theme values differ from latest publication
        return 'DRAFT';
    }

    /**
     * Get count of draft changes
     * 
     * @return int
     * @todo Phase 2: Implement draft changes counter from GraphQL
     *              Currently returns 0 - needs to count actual modified values
     */
    public function getDraftChangesCount()
    {
        // STUB: Will be implemented in Phase 2 when we integrate with GraphQL
        // Real implementation should compare current values vs latest publication
        return 0;
    }

    /**
     * Get current publication ID (latest published for theme+store)
     *
     * @return int|null
     */
    public function getCurrentPublicationId()
    {
        $publications = $this->getPublications();
        return !empty($publications) ? $publications[0]['id'] : null;
    }

    /**
     * Check if jstest mode is enabled
     *
     * @return bool
     */
    public function isJstestMode()
    {
        return (bool) $this->request->getParam('jstest', false);
    }

    /**
     * Get current page ID from iframe URL parameter
     * 
     * Note: This is approximate detection based on URL patterns.
     * Cannot accurately distinguish between product/category pages.
     * 
     * For precise detection in future, use postMessage from iframe.
     *
     * @return string Action name (e.g., 'cms_index_index')
     */
    public function getCurrentPageId()
    {
        $url = $this->request->getParam('url', '/');
        
        // Simple URL → action name mapping (fallback)
        if (empty($url) || $url === '/') {
            return 'cms_index_index';
        }
        
        // Checkout pages
        if (strpos($url, '/checkout/cart') !== false) {
            return 'checkout_cart_index';
        }
        
        if (strpos($url, '/checkout') !== false) {
            return 'checkout_index_index';
        }
        
        // Customer pages
        if (strpos($url, '/customer/account/login') !== false) {
            return 'customer_account_login';
        }
        
        if (strpos($url, '/customer/account') !== false) {
            return 'customer_account_index';
        }
        
        // Search
        if (strpos($url, '/catalogsearch/result') !== false) {
            return 'catalogsearch_result_index';
        }
        
        // Product/Category pages (.html) - cannot distinguish accurately
        if (strpos($url, '.html') !== false) {
            return 'catalog_category_view'; // Default to category
        }
        
        // CMS pages (anything else)
        return 'cms_page_view';
    }

    /**
     * Check if user has permission to edit theme
     *
     * @return bool
     * @todo Phase 2: Use ACL resource 'Swissup_BreezeThemeEditor::edit'
     *              Currently checks only if user is logged in - needs proper ACL check
     */
    public function canEdit()
    {
        // STUB: Will use ACL in Phase 2
        // Real implementation: return $this->authorization->isAllowed('Swissup_BreezeThemeEditor::edit');
        return $this->authSession->isLoggedIn();
    }

    /**
     * Check if user has permission to publish theme
     *
     * @return bool
     * @todo Phase 2: Use ACL resource 'Swissup_BreezeThemeEditor::publish'
     *              Currently checks only if user is logged in - needs proper ACL check
     */
    public function canPublish()
    {
        // STUB: Will use ACL in Phase 2
        // Real implementation: return $this->authorization->isAllowed('Swissup_BreezeThemeEditor::publish');
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
     * Get admin URL
     * 
     * Uses UrlBuilder to generate correct admin URL
     * that respects custom backend frontName from app/etc/env.php
     * 
     * @return string
     */
    public function getAdminUrl()
    {
        try {
            // Generate admin dashboard URL using UrlBuilder
            // This automatically uses correct backend frontName from config
            return $this->urlBuilder->getUrl('admin/dashboard/index', ['_nosid' => true]);
        } catch (\Exception $e) {
            // Fallback to parent's implementation
            return parent::getAdminUrl();
        }
    }

    /**
     * Get GraphQL endpoint URL
     * 
     * Override parent to generate frontend GraphQL endpoint URL
     * (without admin prefix) for use from admin panel
     *
     * @return string
     */
    public function getGraphqlEndpoint()
    {
        try {
            $baseUrl = $this->storeManager->getStore()->getBaseUrl(
                \Magento\Framework\UrlInterface::URL_TYPE_WEB
            );
            
            // Return frontend GraphQL endpoint (without admin prefix)
            return rtrim($baseUrl, '/') . '/graphql';
        } catch (\Exception $e) {
            // Fallback to relative URL
            return '/graphql';
        }
    }

    /**
     * Get user permissions for ACL checks
     *
     * @return array
     */
    public function getPermissions()
    {
        return [
            'canView' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_view'),
            'canEdit' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit'),
            'canPublish' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish'),
            'canRollback' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_rollback'),
        ];
    }

    /**
     * Get toolbar configuration for JavaScript initialization
     * 
     * Uses inherited methods from parent Toolbar:
     * - getStoreId(), getThemeId() - store/theme info
     * - getAdminUsername() - admin user info
     * - getScopeSelectorData() - store hierarchy (via StoreDataProvider)
     * - getPageSelectorData() - page types (via PageUrlProvider)
     * 
     * Overrides parent methods:
     * - getAdminUrl() - generates correct admin dashboard URL
     * - getGraphqlEndpoint() - generates frontend GraphQL URL
     *
     * @return array
     */
    public function getToolbarConfig()
    {
        return [
            // ===== Core parameters =====
            'storeId' => $this->getStoreId(),
            'storeCode' => $this->storeManager->getStore($this->getStoreId())->getCode(),
            'token' => $this->getToken(),
            'themeId' => $this->getThemeId(),
            'jstest' => $this->isJstestMode(),
            'username' => $this->getAdminUsername(),
            'adminUrl' => $this->getAdminUrl(),
            'graphqlEndpoint' => $this->getGraphqlEndpoint(),
            'iframeSelector' => '#bte-iframe',
            
            // ===== Permissions (ACL) =====
            'permissions' => $this->getPermissions(),
            
            // Exit URL - returns user to admin dashboard
            'exitUrl' => $this->getAdminUrl(),
            
            // ===== Component configurations =====
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
                        [
                            'id' => 'theme-editor',
                            'label' => 'Theme Editor',
                            'icon' => '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.45997 1.87738L8.44664 0.890715C8.57046 0.766847 8.71747 0.668586 8.87927 0.601546C9.04107 0.534506 9.2145 0.5 9.38964 0.5C9.56478 0.5 9.73821 0.534506 9.90001 0.601546C10.0618 0.668586 10.2088 0.766847 10.3326 0.890715L11.2753 1.83338C11.5253 2.08342 11.6657 2.4225 11.6657 2.77605C11.6657 3.1296 11.5253 3.46868 11.2753 3.71872L10.2886 4.70538M7.45997 1.87738L1.04931 8.28738C0.82796 8.50873 0.69155 8.8009 0.663972 9.11272L0.502638 10.9394C0.493974 11.0365 0.506712 11.1343 0.539956 11.226C0.5732 11.3176 0.62614 11.4009 0.695045 11.4698C0.76395 11.5388 0.847143 11.5918 0.938761 11.6251C1.03038 11.6585 1.12819 11.6713 1.22531 11.6627L3.05197 11.5014C3.36426 11.4741 3.65695 11.3377 3.87864 11.116L10.2886 4.70538M7.45997 1.87738L10.2886 4.70538" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                            'active' => false,
                            'disabled' => false,
                            'panelId' => 'theme-editor-panel'
                        ],
                        [
                            'id' => 'content-builder',
                            'label' => 'Content Builder',
                            'icon' => '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.16667 5.83333V0.5M0.5 5.83333H11.1667M10.7667 11.1667H0.9C0.793913 11.1667 0.692172 11.1245 0.617157 11.0495C0.542143 10.9745 0.5 10.8728 0.5 10.7667V0.9C0.5 0.793913 0.542143 0.692172 0.617157 0.617157C0.692172 0.542143 0.793913 0.5 0.9 0.5H10.7667C0.8728 0.5 10.9745 0.542143 11.0495 0.617157C11.1245 0.692172 11.1667 0.793913 11.1667 0.9V10.7667C11.1667 10.8728 11.1245 10.9745 11.0495 11.0495C10.9745 11.1245 10.8728 11.1667 10.7667 11.1667Z" stroke="currentColor"/></svg>',
                            'active' => false,
                            'disabled' => true,
                            'panelId' => 'content-builder-panel',
                            'badge' => [
                                'type' => 'pro',
                                'text' => 'PRO'
                            ]
                        ]
                    ]
                ]
            ],
            
            // ===== Store hierarchy (inherited via StoreDataProvider) =====
            'storeHierarchy' => $this->getScopeSelectorData(),
            
            // ===== Page types (inherited via PageUrlProvider) =====
            // Transform: 'title' → 'label' for widget compatibility
            // URLs are absolute from PageUrlProvider
            'pageTypes' => array_map(function($page) {
                return [
                    'id' => $page['id'],
                    'label' => $page['title'], // Frontend uses 'title', widget expects 'label'
                    'url' => $page['url'],
                    'active' => $page['active'] ?? false
                ];
            }, $this->getPageSelectorData()),
            
            'currentPageId' => $this->getCurrentPageId(),
            
            // ===== Publications (real data from DB via PublicationRepository) =====
            'publications' => $this->getPublications(),
            'currentPublicationId' => $this->getCurrentPublicationId(),
            'currentStatus' => $this->getCurrentPublicationStatus(),
            'changesCount' => $this->getDraftChangesCount()
        ];
    }
}
