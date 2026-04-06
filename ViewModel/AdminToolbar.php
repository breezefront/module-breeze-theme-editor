<?php

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Framework\Url\DecoderInterface;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarAuthProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarPermissionsProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarScopeProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarThemeProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarUrlProvider;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * ViewModel for Theme Editor admin toolbar
 *
 * Thin orchestrator that composes five focused helper ViewModels:
 * - ToolbarScopeProvider    — scope/store resolution
 * - ToolbarAuthProvider     — authentication and user identity
 * - ToolbarPermissionsProvider — ACL permission checks
 * - ToolbarUrlProvider      — admin + GraphQL URLs
 * - ToolbarThemeProvider    — frontend theme ID resolution
 *
 * All public methods are kept to preserve backward compatibility with
 * templates and any code that may call them directly.
 */
class AdminToolbar implements ArgumentInterface
{
    /**
     * @var \Magento\Framework\App\RequestInterface
     */
    private $request;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider
     */
    private $pageUrlProvider;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider
     */
    private $storeDataProvider;

    /**
     * @var ToolbarScopeProvider
     */
    private $scopeProvider;

    /**
     * @var ToolbarAuthProvider
     */
    private $authProvider;

    /**
     * @var ToolbarPermissionsProvider
     */
    private $permissionsProvider;

    /**
     * @var ToolbarUrlProvider
     */
    private $urlProvider;

    /**
     * @var ToolbarThemeProvider
     */
    private $themeProvider;

    /**
     * @var DecoderInterface
     */
    private $urlDecoder;

    /**
     * @param \Magento\Framework\App\RequestInterface $request
     * @param \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider $pageUrlProvider
     * @param \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider $storeDataProvider
     * @param ToolbarScopeProvider $scopeProvider
     * @param ToolbarAuthProvider $authProvider
     * @param ToolbarPermissionsProvider $permissionsProvider
     * @param ToolbarUrlProvider $urlProvider
     * @param ToolbarThemeProvider $themeProvider
     * @param DecoderInterface $urlDecoder
     */
    public function __construct(
        \Magento\Framework\App\RequestInterface $request,
        \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider $pageUrlProvider,
        \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider $storeDataProvider,
        ToolbarScopeProvider $scopeProvider,
        ToolbarAuthProvider $authProvider,
        ToolbarPermissionsProvider $permissionsProvider,
        ToolbarUrlProvider $urlProvider,
        ToolbarThemeProvider $themeProvider,
        DecoderInterface $urlDecoder
    ) {
        $this->request             = $request;
        $this->pageUrlProvider     = $pageUrlProvider;
        $this->storeDataProvider   = $storeDataProvider;
        $this->scopeProvider       = $scopeProvider;
        $this->authProvider        = $authProvider;
        $this->permissionsProvider = $permissionsProvider;
        $this->urlProvider         = $urlProvider;
        $this->themeProvider       = $themeProvider;
        $this->urlDecoder          = $urlDecoder;
    }

    // =========================================================================
    // Auth delegation — ToolbarAuthProvider
    // =========================================================================

    /**
     * Admin area doesn't require AccessToken validation —
     * just check if the admin user is authenticated.
     *
     * @return bool
     */
    public function canShow()
    {
        return $this->authProvider->canShow();
    }

    /**
     * Get admin username.
     *
     * @return string
     */
    public function getAdminUsername()
    {
        return $this->authProvider->getAdminUsername();
    }

    /**
     * Get admin user ID.
     *
     * @return int|null
     */
    public function getUserId()
    {
        return $this->authProvider->getUserId();
    }

    /**
     * Get Magento admin integration token for GraphQL authentication.
     *
     * @return string|null
     */
    public function getToken(): ?string
    {
        return $this->authProvider->getToken();
    }

    // =========================================================================
    // Permissions delegation — ToolbarPermissionsProvider
    // =========================================================================

    /**
     * Check if user has permission to edit theme.
     *
     * @return bool
     */
    public function canEdit(): bool
    {
        return $this->permissionsProvider->canEdit();
    }

    /**
     * Check if user has permission to publish theme.
     *
     * @return bool
     */
    public function canPublish(): bool
    {
        return $this->permissionsProvider->canPublish();
    }

    /**
     * Get user permissions for ACL checks.
     *
     * @return array
     */
    public function getPermissions()
    {
        return $this->permissionsProvider->getPermissions();
    }

    // =========================================================================
    // Scope delegation — ToolbarScopeProvider
    // =========================================================================

    /**
     * Get current scope ('default'|'websites'|'stores').
     *
     * @return string
     */
    public function getScope(): string
    {
        return $this->scopeProvider->getScope();
    }

    /**
     * Get current scope ID.
     *
     * @return int
     */
    public function getScopeId(): int
    {
        return $this->scopeProvider->getScopeId();
    }

    /**
     * Get current store ID (legacy helper, kept for iframe preview URL).
     *
     * @return int
     */
    public function getStoreId()
    {
        return $this->scopeProvider->getStoreId();
    }

    // =========================================================================
    // URL delegation — ToolbarUrlProvider
    // =========================================================================

    /**
     * Get admin dashboard URL.
     *
     * @return string
     */
    public function getAdminUrl()
    {
        return $this->urlProvider->getAdminUrl();
    }

    /**
     * Get admin base path for JS iframe-helper admin URL detection.
     *
     * @return string  e.g. '/admin/' or '/tryit2531/admin/'
     */
    public function getAdminBasePath(): string
    {
        return $this->urlProvider->getAdminBasePath();
    }

    /**
     * Get GraphQL endpoint URL (frontend endpoint, not admin-prefixed).
     *
     * @return string
     */
    public function getGraphqlEndpoint()
    {
        return $this->urlProvider->getGraphqlEndpoint();
    }

    // =========================================================================
    // Theme delegation — ToolbarThemeProvider
    // =========================================================================

    /**
     * Get frontend theme ID for the current scope.
     *
     * @return int
     */
    public function getThemeId()
    {
        return $this->themeProvider->getThemeId();
    }

    // =========================================================================
    // Orchestrator methods — remain in AdminToolbar
    // =========================================================================

    /**
     * Check if jstest mode is enabled.
     *
     * @return bool
     */
    public function isJstestMode()
    {
        return (bool)$this->request->getParam('jstest', false);
    }

    /**
     * Derive the current page action name from the iframe URL parameter.
     *
     * This is an approximation based on URL patterns. For precise detection,
     * use postMessage from the iframe.
     *
     * @return string Action name (e.g. 'cms_index_index')
     */
    public function getCurrentPageId()
    {
        $rawUrl = $this->request->getParam('url', '');
        $url    = $rawUrl ? $this->urlDecoder->decode($rawUrl) : '/';

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
     * Get scope selector data (flat list, groups, or hierarchical tree).
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
     * Get page selector data.
     *
     * Returns an array of page type entries with id/title/url/active keys.
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
     * Get toolbar configuration array for JavaScript initialization.
     *
     * @return array
     */
    public function getToolbarConfig()
    {
        return [
            // ===== Core parameters =====
            'scope'           => $this->getScope(),
            'scopeId'         => $this->getScopeId(),
            'storeId'         => $this->getStoreId(),
            'storeCode'       => $this->scopeProvider->getStoreCode(),
            'token'           => $this->getToken(),
            'themeId'         => $this->getThemeId(),
            'jstest'          => $this->isJstestMode(),
            'username'        => $this->getAdminUsername(),
            'adminUrl'        => $this->getAdminUrl(),
            'adminBasePath'   => $this->getAdminBasePath(),
            'graphqlEndpoint' => $this->getGraphqlEndpoint(),
            'iframeSelector'  => '#bte-iframe',

            // ===== Permissions (ACL) =====
            'permissions'     => $this->getPermissions(),

            'exitUrl'         => $this->getAdminUrl(),

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
            'publications'         => [],
            'currentPublicationId' => null,
            'currentStatus'        => StatusCode::DRAFT,
        ];
    }
}
