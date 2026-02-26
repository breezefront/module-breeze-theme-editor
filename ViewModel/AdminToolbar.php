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
        \Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver $themeResolver
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
     * Get current store ID
     *
     * @return int
     */
    public function getStoreId()
    {
        try {
            return (int)$this->storeManager->getStore()->getId();
        } catch (\Exception $e) {
            return 1;
        }
    }

    /**
     * Get frontend theme ID for the current store
     *
     * Uses ThemeResolver to return the store's frontend theme instead of the
     * backend theme that DesignInterface would return in adminhtml area.
     *
     * @return int
     */
    public function getThemeId()
    {
        try {
            return $this->themeResolver->getThemeIdByStoreId($this->getStoreId());
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
     * Get list of publications from database
     *
     * NOTE: Publications are now loaded via GraphQL in the frontend
     * (publication-selector.js). This method is kept for backward compatibility.
     *
     * @deprecated Use GraphQL query 'getPublications' instead
     * @return array
     */
    public function getPublications()
    {
        return [];
    }

    /**
     * Get current publication status
     *
     * @return string One of: DRAFT, PUBLISHED, SCHEDULED
     * @todo Phase 2: Implement via GraphQL
     */
    public function getCurrentPublicationStatus()
    {
        return 'DRAFT';
    }

    /**
     * Get count of draft changes
     *
     * @return int
     * @todo Phase 2: Implement via GraphQL
     */
    public function getDraftChangesCount()
    {
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
     * @todo Phase 2: Use ACL resource 'Swissup_BreezeThemeEditor::edit'
     */
    public function canEdit()
    {
        return $this->authSession->isLoggedIn();
    }

    /**
     * Check if user has permission to publish theme
     *
     * @return bool
     * @todo Phase 2: Use ACL resource 'Swissup_BreezeThemeEditor::publish'
     */
    public function canPublish()
    {
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
     * Get user permissions for ACL checks
     *
     * @return array
     */
    public function getPermissions()
    {
        return [
            'canView'     => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_view'),
            'canEdit'     => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit'),
            'canPublish'  => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish'),
            'canRollback' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_rollback'),
        ];
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
            'storeId'          => $this->getStoreId(),
            'storeCode'        => $this->storeManager->getStore($this->getStoreId())->getCode(),
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
                'statusIndicator' => [
                    'currentStatus'     => $this->getCurrentPublicationStatus(),
                    'draftChangesCount' => $this->getDraftChangesCount(),
                ],
                'deviceSwitcher' => [
                    'devices' => ['desktop', 'tablet', 'mobile'],
                    'default' => 'desktop',
                ],
                'navigation' => [
                    'items' => [
                        [
                            'id'       => 'theme-editor',
                            'label'    => 'Theme Settings',
                            'icon'     => '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.45997 1.87738L8.44664 0.890715C8.57046 0.766847 8.71747 0.668586 8.87927 0.601546C9.04107 0.534506 9.2145 0.5 9.38964 0.5C9.56478 0.5 9.73821 0.534506 9.90001 0.601546C10.0618 0.668586 10.2088 0.766847 10.3326 0.890715L11.2753 1.83338C11.5253 2.08342 11.6657 2.4225 11.6657 2.77605C11.6657 3.1296 11.5253 3.46868 11.2753 3.71872L10.2886 4.70538M7.45997 1.87738L1.04931 8.28738C0.82796 8.50873 0.69155 8.8009 0.663972 9.11272L0.502638 10.9394C0.493974 11.0365 0.506712 11.1343 0.539956 11.226C0.5732 11.3176 0.62614 11.4009 0.695045 11.4698C0.76395 11.5388 0.847143 11.5918 0.938761 11.6251C1.03038 11.6585 1.12819 11.6713 1.22531 11.6627L3.05197 11.5014C3.36426 11.4741 3.65695 11.3377 3.87864 11.116L10.2886 4.70538M7.45997 1.87738L10.2886 4.70538" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
            'publications'          => $this->getPublications(),
            'currentPublicationId'  => $this->getCurrentPublicationId(),
            'currentStatus'         => $this->getCurrentPublicationStatus(),
            'changesCount'          => $this->getDraftChangesCount(),
        ];
    }
}
