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
     * @param PublicationRepositoryInterface $publicationRepository
     * @param SearchCriteriaBuilder $searchCriteriaBuilder
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
        PublicationRepositoryInterface $publicationRepository,
        SearchCriteriaBuilder $searchCriteriaBuilder
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
            $jsonSerializer
        );
        
        // Store references that we need in this class
        $this->publicationRepository = $publicationRepository;
        $this->searchCriteriaBuilder = $searchCriteriaBuilder;
        $this->authSession = $authSession;
        $this->request = $request;
        $this->storeManager = $storeManager;
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
     * Get list of publications from database (real data via Repository)
     * 
     * Fetches last 10 publications for current theme+store combination
     *
     * @return array
     */
    public function getPublications()
    {
        try {
            $searchCriteria = $this->searchCriteriaBuilder
                ->addFilter('theme_id', $this->getThemeId())
                ->addFilter('store_id', $this->getStoreId())
                ->addSortOrder(
                    $this->searchCriteriaBuilder->create()->getSortOrders()[0] ?? 
                    $this->createSortOrder('published_at', SortOrder::SORT_DESC)
                )
                ->setPageSize(10)
                ->create();
            
            // Add sort order manually if not working through builder
            $searchCriteria->setSortOrders([
                $this->createSortOrder('published_at', SortOrder::SORT_DESC)
            ]);
            
            $result = $this->publicationRepository->getList($searchCriteria);
            
            $publications = [];
            foreach ($result->getItems() as $publication) {
                $publications[] = [
                    'id' => (int)$publication->getPublicationId(),
                    'title' => $publication->getTitle(),
                    'date' => $publication->getPublishedAt(),
                    'status' => 'PUBLISHED'
                ];
            }
            
            return $publications;
            
        } catch (\Exception $e) {
            // Return empty array on error (e.g., table doesn't exist yet)
            return [];
        }
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
     */
    public function getCurrentPublicationStatus()
    {
        // Will be implemented in Phase 2 when we integrate with GraphQL
        return 'DRAFT';
    }

    /**
     * Get count of draft changes
     * 
     * @return int
     * @todo Phase 2: Implement draft changes counter from GraphQL
     */
    public function getDraftChangesCount()
    {
        // Will be implemented in Phase 2 when we integrate with GraphQL
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
     */
    public function canEdit()
    {
        // Will use ACL in Phase 2
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
     * Get toolbar configuration for JavaScript initialization
     * 
     * Uses inherited methods from parent Toolbar:
     * - getStoreId(), getThemeId() - store/theme info
     * - getAdminUsername(), getAdminUrl() - admin user info
     * - getGraphqlEndpoint() - GraphQL URL
     * - getScopeSelectorData() - store hierarchy (via StoreDataProvider)
     * - getPageSelectorData() - page types (via PageUrlProvider)
     *
     * @return array
     */
    public function getToolbarConfig()
    {
        return [
            // ===== Inherited from parent Toolbar =====
            'storeId' => $this->getStoreId(),
            'themeId' => $this->getThemeId(),
            'username' => $this->getAdminUsername(),
            'adminUrl' => $this->getAdminUrl(),
            'graphqlEndpoint' => $this->getGraphqlEndpoint(),
            'iframeSelector' => '#bte-iframe',
            
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
                        ['id' => 'theme', 'label' => 'Theme', 'icon' => 'palette'],
                        ['id' => 'layout', 'label' => 'Layout', 'icon' => 'view_quilt'],
                        ['id' => 'css', 'label' => 'CSS', 'icon' => 'code']
                    ]
                ]
            ],
            
            // ===== Store hierarchy (inherited via StoreDataProvider) =====
            'storeHierarchy' => $this->getScopeSelectorData(),
            'currentStoreId' => $this->getStoreId(),
            
            // ===== Page types (inherited via PageUrlProvider) =====
            // Transform: 'title' → 'label' for widget compatibility
            'pageTypes' => array_map(function($page) {
                return [
                    'id' => $page['id'],
                    'label' => $page['title'], // Frontend uses 'title', widget expects 'label'
                    'url' => $page['url'],
                    'active' => $page['active'] ?? false
                ];
            }, $this->getPageSelectorData()),
            
            'currentPageId' => $this->getCurrentPageId(),
            'iframeBaseUrl' => $this->storeManager->getStore($this->getStoreId())->getBaseUrl(),
            
            // ===== Publications (real data from DB via PublicationRepository) =====
            'publications' => $this->getPublications(),
            'currentPublicationId' => $this->getCurrentPublicationId(),
            'currentStatus' => $this->getCurrentPublicationStatus(),
            'changesCount' => $this->getDraftChangesCount()
        ];
    }
}
