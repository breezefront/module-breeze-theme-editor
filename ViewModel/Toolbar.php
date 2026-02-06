<?php

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Framework\Serialize\Serializer\Json;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\View\DesignInterface;
use Magento\Framework\App\State;

class Toolbar implements ArgumentInterface
{
    /**
     * @var \Swissup\BreezeThemeEditor\Helper\Data
     */
    private $helper;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Data\AccessToken
     */
    private $accessToken;

    /**
     * @var \Magento\Framework\App\RequestInterface
     */
    private $request;

    /**
     * @var \Magento\Framework\UrlInterface
     */
    private $urlBuilder;

    /**
     * @var \Magento\Backend\Model\Auth\Session
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
     * @var Json
     */
    private $jsonSerializer;

    /**
     * @var DesignInterface
     */
    private $design;

    /**
     * @var State
     */
    private $state;

    /**
     * @param \Swissup\BreezeThemeEditor\Helper\Data $helper
     * @param \Swissup\BreezeThemeEditor\Model\Data\AccessToken $accessToken
     * @param \Magento\Framework\App\RequestInterface $request
     * @param \Magento\Framework\UrlInterface $urlBuilder
     * @param \Magento\Backend\Model\Auth\Session $authSession
     * @param StoreManagerInterface $storeManager
     * @param \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider $pageUrlProvider
     * @param \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider $storeDataProvider
     * @param DesignInterface $design
     * @param Json $jsonSerializer
     * @param State $state
     */
    public function __construct(
        \Swissup\BreezeThemeEditor\Helper\Data $helper,
        \Swissup\BreezeThemeEditor\Model\Data\AccessToken $accessToken,
        \Magento\Framework\App\RequestInterface $request,
        \Magento\Framework\UrlInterface $urlBuilder,
        \Magento\Backend\Model\Auth\Session $authSession,
        StoreManagerInterface $storeManager,
        \Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider $pageUrlProvider,
        \Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider $storeDataProvider,
        DesignInterface $design,
        Json $jsonSerializer,
        State $state
    ) {
        $this->helper = $helper;
        $this->accessToken = $accessToken;
        $this->request = $request;
        $this->urlBuilder = $urlBuilder;
        $this->authSession = $authSession;
        $this->storeManager = $storeManager;
        $this->pageUrlProvider = $pageUrlProvider;
        $this->storeDataProvider = $storeDataProvider;
        $this->design = $design;
        $this->jsonSerializer = $jsonSerializer;
        $this->state = $state;
    }

    /**
     * Check if toolbar should be displayed
     *
     * @return bool
     */
    public function canShow()
    {
//        return true; // For development

        if (!$this->helper->isEnabled()) {
            return false;
        }

        return $this->accessToken->validateRequest($this->request);
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
     * Get admin URL
     *
     * @return string
     */
    public function getAdminUrl()
    {
        return $this->urlBuilder->getUrl('admin');
    }

    /**
     * Get scope selector data
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
     * Get scope selector data as JSON
     *
     * @return string
     */
    public function getScopesJsonData()
    {
        return $this->jsonSerializer->serialize($this->getScopeSelectorData());
    }

    /**
     * Check if scope selector should use hierarchical mode
     *
     * @return bool
     */
    public function isHierarchicalMode()
    {
        return $this->storeDataProvider->getSwitchMode() === 'hierarchical';
    }

    /**
     * Get active store path for hierarchical navigation
     *
     * @return array
     */
    public function getActiveStorePath()
    {
        return $this->storeDataProvider->getActiveStorePath();
    }

    /**
     * Get active store path as JSON
     *
     * @return string
     */
    public function getActiveStorePathJson()
    {
        return $this->jsonSerializer->serialize($this->getActiveStorePath());
    }

    /**
     * Get current scope name
     *
     * @return string
     */
    public function getCurrentScope()
    {
        try {
            $store = $this->storeManager->getStore();
            return $store->getName() ?: __('All Store Views');
        } catch (\Exception $e) {
            return __('All Store Views');
        }
    }

    /**
     * Has multiple stores/scopes
     *
     * @return bool
     */
    public function hasMultipleScopes()
    {
        return $this->storeDataProvider->hasMultipleStores();
    }

    /**
     * Get page selector data with URLs
     *
     * @return array
     */
    public function getPageSelectorData()
    {
        $currentFullActionName = $this->request->getFullActionName();
        $pages = $this->pageUrlProvider->getAvailablePages();
        $token = $this->getAccessToken();

        $result = [];
        foreach ($pages as $actionName => $data) {
            $url = $data['url'];
            
            // Add access token to URL for navigation persistence (frontend only)
            if ($token && $this->shouldAddToken()) {
                $separator = strpos($url, '?') !== false ? '&' : '?';
                $url .= $separator . $this->accessToken->getParamName() . '=' . urlencode($token);
            }
            
            $result[] = [
                'id' => $actionName,
                'title' => (string)$data['title'],
                'url' => $url,
                'active' => $actionName === $currentFullActionName
            ];
        }

        return $result;
    }

    /**
     * Get page selector data as JSON
     *
     * @return string
     */
    public function getPagesJsonData()
    {
        return $this->jsonSerializer->serialize($this->getPageSelectorData());
    }

    /**
     * Get current page name
     *
     * @return string
     */
    public function getCurrentPageName()
    {
        $currentFullActionName = $this->request->getFullActionName();
        $pages = $this->pageUrlProvider->getAvailablePages();

        return isset($pages[$currentFullActionName])
            ? (string)$pages[$currentFullActionName]['title']
            : __('Current Page');
    }

    /**
     * Get current page URL
     *
     * @return string
     */
    public function getCurrentUrl()
    {
        return $this->urlBuilder->getCurrentUrl();
    }

    /**
     * Get exit URL (remove token from URL)
     *
     * @return string
     */
    public function getExitUrl()
    {
        $url = $this->getCurrentUrl();
        $tokenParam = $this->accessToken->getParamName();

        return preg_replace('/[?&]' . preg_quote($tokenParam, '/') . '=[^&]*/', '', $url);
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
            return 1; // Default store
        }
    }

    /**
     * Get current store code
     *
     * @return string
     */
    public function getStoreCode()
    {
        try {
            return $this->storeManager->getStore()->getCode();
        } catch (\Exception $e) {
            return 'default';
        }
    }

    /**
     * Get current theme ID
     *
     * @return int
     */
    public function getThemeId()
    {
        try {
            return (int)$this->design->getDesignTheme()->getId();
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get current theme name
     *
     * @return string
     */
    public function getThemeName()
    {
        try {
            return $this->design->getDesignTheme()->getThemeTitle();
        } catch (\Exception $e) {
            return 'Default';
        }
    }

    /**
     * Get current website ID
     *
     * @return int
     */
    public function getWebsiteId()
    {
        try {
            return (int)$this->storeManager->getStore()->getWebsiteId();
        } catch (\Exception $e) {
            return 1;
        }
    }

    /**
     * Get base currency code
     *
     * @return string
     */
    public function getBaseCurrency()
    {
        try {
            return $this->storeManager->getStore()->getBaseCurrencyCode();
        } catch (\Exception $e) {
            return 'USD';
        }
    }

    /**
     * Get store locale
     *
     * @return string
     */
    public function getLocale()
    {
        try {
            return $this->design->getLocale();
        } catch (\Exception $e) {
            return 'en_US';
        }
    }

    /**
     * Get GraphQL endpoint URL
     *
     * @return string
     */
    public function getGraphqlEndpoint()
    {
        return $this->urlBuilder->getUrl('graphql');
    }

    /**
     * Get access token for GraphQL requests
     *
     * @return string|null
     */
    public function getAccessToken()
    {
        return $this->accessToken->getToken();
    }

    /**
     * Check if access token should be added to URLs
     * 
     * In admin area, token is not needed because admin is already authenticated.
     * In frontend area, token is needed to persist toolbar access.
     *
     * @return bool
     */
    protected function shouldAddToken()
    {
        try {
            return $this->state->getAreaCode() !== \Magento\Framework\App\Area::AREA_ADMINHTML;
        } catch (\Exception $e) {
            // If we can't determine area, assume frontend (safer to add token)
            return true;
        }
    }
}
