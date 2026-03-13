<?php

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Framework\Serialize\Serializer\Json;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\View\DesignInterface;
use Magento\Backend\Model\Auth\Session as AuthSession;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SortOrder;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;

/**
 * ViewModel for Theme Editor admin toolbar
 *
 * Provides all data required by the adminhtml toolbar template:
 * - Admin authentication and user info
 * - Store hierarchy (via StoreDataProvider)
 * - Page types (via PageUrlProvider)
 * - Publications list (via PublicationRepository)
 * - ACL permission checks
 * - Admin integration token (via AdminTokenGenerator)
 */
class AdminToolbar implements ArgumentInterface
{
    /**
     * @var \Magento\Framework\App\RequestInterface
     */
    private $request;

    /**
     * @var \Magento\Framework\UrlInterface
     */
    private $urlBuilder;

    /**
     * @var AuthSession
     */
    private $authSession;

    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider
     */
    private $pageUrlProvider;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider
     */
    private $storeDataProvider;

    /**
     * @var DesignInterface
     */
    private $design;

    /**
     * @var Json
     */
    private $jsonSerializer;

    /**
     * @var PublicationRepositoryInterface
     */
    private $publicationRepository;

    /**
     * @var SearchCriteriaBuilder
     */
    private $searchCriteriaBuilder;

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
     * @var \Swissup\BreezeThemeEditor\Model\Session\BackendSession
     */
    private $backendSession;

    /**
     * @var ScopeFactory
     */
    private $scopeFactory;

    /**
     * @param \Magento\Framework\App\RequestInterface $request
     * @param \Magento\Framework\UrlInterface $urlBuilder
     * @param AuthSession $authSession
     * @param StoreManagerInterface $storeManager
     * @param \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider $pageUrlProvider
     * @param \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider $storeDataProvider
     * @param DesignInterface $design
     * @param Json $jsonSerializer
     * @param PublicationRepositoryInterface $publicationRepository
     * @param SearchCriteriaBuilder $searchCriteriaBuilder
     * @param \Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator $tokenGenerator
     * @param \Magento\Framework\AuthorizationInterface $authorization
     * @param \Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver $themeResolver
     * @param \Swissup\BreezeThemeEditor\Model\Session\BackendSession $backendSession
     * @param ScopeFactory $scopeFactory
     */
    public function __construct(
        \Magento\Framework\App\RequestInterface $request,
        \Magento\Framework\UrlInterface $urlBuilder,
        AuthSession $authSession,
        StoreManagerInterface $storeManager,
        \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider $pageUrlProvider,
        \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider $storeDataProvider,
        DesignInterface $design,
        Json $jsonSerializer,
        PublicationRepositoryInterface $publicationRepository,
        SearchCriteriaBuilder $searchCriteriaBuilder,
        \Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator $tokenGenerator,
        \Magento\Framework\AuthorizationInterface $authorization,
        \Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver $themeResolver,
        \Swissup\BreezeThemeEditor\Model\Session\BackendSession $backendSession,
        ScopeFactory $scopeFactory
    ) {
        $this->request = $request;
        $this->urlBuilder = $urlBuilder;
        $this->authSession = $authSession;
        $this->storeManager = $storeManager;
        $this->pageUrlProvider = $pageUrlProvider;
        $this->storeDataProvider = $storeDataProvider;
        $this->design = $design;
        $this->jsonSerializer = $jsonSerializer;
        $this->publicationRepository = $publicationRepository;
        $this->searchCriteriaBuilder = $searchCriteriaBuilder;
        $this->tokenGenerator = $tokenGenerator;
        $this->authorization = $authorization;
        $this->themeResolver = $themeResolver;
        $this->backendSession = $backendSession;
        $this->scopeFactory = $scopeFactory;
    }

    /**
     * Admin area doesn't require AccessToken validation —
     * just check if the admin user is authenticated.
     *
     * @return bool
     */
    public function canShow()
    {
        return $this->authSession->isLoggedIn();
    }

    /**
     * Get admin username
     *
     * @return string
     */
    public function getAdminUsername()
    {
        $user = $this->authSession->getUser();
        return $user ? $user->getUsername() : __('Admin');
    }

    /**
     * Get admin dashboard URL
     *
     * Respects custom backend frontName from app/etc/env.php.
     *
     * @return string
     */
    public function getAdminUrl()
    {
        try {
            return $this->urlBuilder->getUrl('admin/dashboard/index', ['_nosid' => true]);
        } catch (\Exception $e) {
            return $this->urlBuilder->getUrl('admin');
        }
    }

    /**
     * Get current scope ('default'|'websites'|'stores')
     *
     * Priority:
     * 1. BackendSession last used scope (cookie)
     * 2. Fallback: 'default'
     *
     * @return string
     */
    public function getScope(): string
    {
        $valid = ['default', 'websites', 'stores'];

        $lastScope = (string)$this->backendSession->getScopeType();
        if (in_array($lastScope, $valid, true)) {
            return $lastScope;
        }

        return 'default';
    }

    /**
     * Get current scope ID.
     *
     * For scope='default'  → 0
     * For scope='websites' → website_id from session
     * For scope='stores'   → store_view_id from session
     *
     * @return int
     */
    public function getScopeId(): int
    {
        $scope = $this->getScope();

        if ($scope === 'default') {
            return 0;
        }

        // Priority 1: session (cookie)
        $lastScopeId = (int)$this->backendSession->getScopeId();
        if ($lastScopeId > 0) {
            return $lastScopeId;
        }

        // Fallback — current store
        if ($scope === 'stores') {
            try {
                return (int)$this->storeManager->getStore()->getId();
            } catch (\Exception $e) {
                return 1;
            }
        }

        // websites fallback — current website
        try {
            return (int)$this->storeManager->getWebsite()->getId();
        } catch (\Exception $e) {
            return 1;
        }
    }

    /**
     * Get current store ID (legacy helper, kept for iframe preview URL).
     * Uses session/URL priority chain.
     *
     * @return int
     */
    public function getStoreId()
    {
        // Priority 1: URL parameter ?store=X
        $storeId = (int) $this->request->getParam('store', 0);
        if ($storeId > 0) {
            try {
                return (int) $this->storeManager->getStore($storeId)->getId();
            } catch (\Exception $e) {
                // store not found, fall through
            }
        }

        // Priority 2: cookie 'bte_last_store_id' (written by JS scope-selector)
        $lastStoreId = $this->backendSession->getStoreId();
        if ($lastStoreId) {
            try {
                return (int) $this->storeManager->getStore($lastStoreId)->getId();
            } catch (\Exception $e) {
                // store not found, fall through
            }
        }

        // Priority 3: fallback
        try {
            return (int) $this->storeManager->getStore()->getId();
        } catch (\Exception $e) {
            return 1;
        }
    }

    /**
     * Get frontend theme ID for the current scope.
     *
     * Uses ThemeResolver::getThemeIdByScope() so that Default and Website
     * scopes are resolved correctly instead of always reading from store scope.
     *
     * @return int
     */
    public function getThemeId()
    {
        try {
            $scope = $this->scopeFactory->create($this->getScope(), $this->getScopeId());
            return $this->themeResolver->getThemeIdByScope($scope);
        } catch (\Exception $e) {
            try {
                return (int)$this->design->getDesignTheme()->getId();
            } catch (\Exception $e2) {
                return 0;
            }
        }
    }

    /**
     * Get scope selector data (flat list, groups, or hierarchical tree)
     *
     * @return array
     */
    public function getScopeSelectorData()
    {
        $mode = $this->storeDataProvider->getSwitchMode();

        if ($mode === 'hierarchical') {
            return $this->storeDataProvider->getHierarchicalStores();
        }

        if ($mode === 'groups') {
            return $this->storeDataProvider->getAvailableGroups();
        }

        return $this->storeDataProvider->getAvailableStores();
    }

    /**
     * Get page selector data
     *
     * Returns an array of page type entries with id/title/url/active keys.
     * No access tokens are appended — admin is already authenticated.
     *
     * @return array
     */
    public function getPageSelectorData()
    {
        $currentFullActionName = $this->request->getFullActionName();
        $pages = $this->pageUrlProvider->getAvailablePages();

        $result = [];
        foreach ($pages as $actionName => $data) {
            $result[] = [
                'id'     => $actionName,
                'title'  => (string)$data['title'],
                'url'    => $data['url'],
                'active' => $actionName === $currentFullActionName,
            ];
        }

        return $result;
    }

    /**
     * Get GraphQL endpoint URL (frontend endpoint, not admin-prefixed)
     *
     * @return string
     */
    public function getGraphqlEndpoint()
    {
        try {
            $baseUrl = $this->storeManager->getStore()->getBaseUrl(
                \Magento\Framework\UrlInterface::URL_TYPE_WEB
            );
            return rtrim($baseUrl, '/') . '/graphql';
        } catch (\Exception $e) {
            return '/graphql';
        }
    }

    /**
     * Get Magento admin integration token for GraphQL authentication
     *
     * Returns a cached token if still valid, or generates a new one.
     * Token is valid for 4 hours and cached in Backend Session.
     *
     * @return string|null
     */
    public function getToken(): ?string
    {
        try {
            return $this->tokenGenerator->generateForCurrentAdmin();
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get initial publications list for JS config bootstrap.
     * Returns empty array — real data is loaded via GraphQL immediately after page load.
     *
     * @return array
     */
    public function getInitialPublications(): array
    {
        return [];
    }

    /**
     * Get fallback publication status for initial JS config.
     * The real value is loaded via GraphQL immediately after page load.
     *
     * @return string
     */
    public function getInitialPublicationStatus(): string
    {
        return 'DRAFT';
    }

    /**
     * Get current publication ID (latest published for theme+store)
     *
     * @return int|null
     */
    public function getCurrentPublicationId()
    {
        $publications = $this->getInitialPublications();
        return !empty($publications) ? $publications[0]['id'] : null;
    }

    /**
     * Check if jstest mode is enabled
     *
     * @return bool
     */
    public function isJstestMode()
    {
        return (bool)$this->request->getParam('jstest', false);
    }

    /**
     * Derive the current page action name from the iframe URL parameter
     *
     * This is an approximation based on URL patterns. For precise detection,
     * use postMessage from the iframe.
     *
     * @return string Action name (e.g. 'cms_index_index')
     */
    public function getCurrentPageId()
    {
        $url = $this->request->getParam('url', '/');

        if (empty($url) || $url === '/') {
            return 'cms_index_index';
        }
        if (strpos($url, '/checkout/cart') !== false) {
            return 'checkout_cart_index';
        }
        if (strpos($url, '/checkout') !== false) {
            return 'checkout_index_index';
        }
        if (strpos($url, '/customer/account/login') !== false) {
            return 'customer_account_login';
        }
        if (strpos($url, '/customer/account') !== false) {
            return 'customer_account_index';
        }
        if (strpos($url, '/catalogsearch/result') !== false) {
            return 'catalogsearch_result_index';
        }
        if (strpos($url, '.html') !== false) {
            return 'catalog_category_view';
        }

        return 'cms_page_view';
    }

    /**
     * Check if user has permission to edit theme
     *
     * @return bool
     */
    public function canEdit(): bool
    {
        return $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit');
    }

    /**
     * Check if user has permission to publish theme
     *
     * @return bool
     */
    public function canPublish(): bool
    {
        return $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish');
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
     * Get user permissions for ACL checks
     *
     * @return array
     */
    public function getPermissions()
    {
        return [
            'canView'             => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_view'),
            'canEdit'             => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit'),
            'canPublish'          => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish'),
            'canRollback'         => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_rollback'),
            'canResetPublished'   => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_reset_published'),
        ];
    }

    /**
     * Get store code for the current preview store (used by JS link interceptor,
     * page-selector and StorageHelper). Falls back to 'default' on error.
     *
     * @return string
     */
    private function getStoreCode(): string
    {
        try {
            return $this->storeManager->getStore($this->getStoreId())->getCode();
        } catch (\Exception $e) {
            return 'default';
        }
    }

    /**
     * Get toolbar configuration array for JavaScript initialization
     *
     * @return array
     */
    public function getToolbarConfig()
    {
        return [
            // ===== Core parameters =====
            'scope'            => $this->getScope(),
            'scopeId'          => $this->getScopeId(),
            'storeId'          => $this->getStoreId(),
            'storeCode'        => $this->getStoreCode(),
            'token'            => $this->getToken(),
            'themeId'          => $this->getThemeId(),
            'jstest'           => $this->isJstestMode(),
            'username'         => $this->getAdminUsername(),
            'adminUrl'         => $this->getAdminUrl(),
            'graphqlEndpoint'  => $this->getGraphqlEndpoint(),
            'iframeSelector'   => '#bte-iframe',

            // ===== Permissions (ACL) =====
            'permissions'      => $this->getPermissions(),

            'exitUrl'          => $this->getAdminUrl(),

            // ===== Component configurations =====
            'components' => [
                'deviceSwitcher' => [
                    'devices' => ['desktop', 'tablet', 'mobile'],
                    'default' => 'desktop',
                ],
                'navigation' => [
                    'items' => [
                        [
                            'id'       => 'theme-editor',
                            'label'    => 'Theme Settings',
                            'icon'     => 'pencil-simple',
                            'active'   => false,
                            'disabled' => false,
                            'panelId'  => 'theme-editor-panel',
                        ],
                        [
                            'id'       => 'content-builder',
                            'label'    => 'Content Builder',
                            'icon'     => '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.16667 5.83333V0.5M0.5 5.83333H11.1667M10.7667 11.1667H0.9C0.793913 11.1667 0.692172 11.1245 0.617157 11.0495C0.542143 10.9745 0.5 10.8728 0.5 10.7667V0.9C0.5 0.793913 0.542143 0.692172 0.617157 0.617157C0.692172 0.542143 0.793913 0.5 0.9 0.5H10.7667C0.8728 0.5 10.9745 0.542143 11.0495 0.617157C11.1245 0.692172 11.1667 0.793913 11.1667 0.9V10.7667C11.1667 10.8728 11.1245 10.9745 11.0495 11.0495C10.9745 11.1245 10.8728 11.1667 10.7667 11.1667Z" stroke="currentColor"/></svg>',
                            'active'   => false,
                            'disabled' => true,
                            'panelId'  => 'content-builder-panel',
                            'badge'    => [
                                'type' => 'pro',
                                'text' => 'PRO',
                            ],
                        ],
                    ],
                ],
            ],

            // ===== Store hierarchy (via StoreDataProvider) =====
            'storeHierarchy' => $this->getScopeSelectorData(),

            // ===== Page types (via PageUrlProvider) =====
            // Transform 'title' → 'label' for widget compatibility
            'pageTypes' => array_map(function ($page) {
                return [
                    'id'     => $page['id'],
                    'label'  => $page['title'],
                    'url'    => $page['url'],
                    'active' => $page['active'] ?? false,
                ];
            }, $this->getPageSelectorData()),

            'currentPageId' => $this->getCurrentPageId(),

            // ===== Publications (loaded via GraphQL at runtime) =====
            'publications'          => $this->getInitialPublications(),
            'currentPublicationId'  => $this->getCurrentPublicationId(),
            'currentStatus'         => $this->getInitialPublicationStatus(),
        ];
    }
}
