<?php

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Framework\Serialize\Serializer\Json;

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
     * @var \Magento\Store\Model\StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\PageUrlProvider
     */
    private $pageUrlProvider;

    /**
     * @var Json
     */
    private $jsonSerializer;

    /**
     * @param \Swissup\BreezeThemeEditor\Helper\Data $helper
     * @param \Swissup\BreezeThemeEditor\Model\Data\AccessToken $accessToken
     * @param \Magento\Framework\App\RequestInterface $request
     * @param \Magento\Framework\UrlInterface $urlBuilder
     * @param \Magento\Backend\Model\Auth\Session $authSession
     * @param \Magento\Store\Model\StoreManagerInterface $storeManager
     * @param \Swissup\BreezeThemeEditor\Model\PageUrlProvider $pageUrlProvider
     * @param Json $jsonSerializer
     */
    public function __construct(
        \Swissup\BreezeThemeEditor\Helper\Data $helper,
        \Swissup\BreezeThemeEditor\Model\Data\AccessToken $accessToken,
        \Magento\Framework\App\RequestInterface $request,
        \Magento\Framework\UrlInterface $urlBuilder,
        \Magento\Backend\Model\Auth\Session $authSession,
        \Magento\Store\Model\StoreManagerInterface $storeManager,
        \Swissup\BreezeThemeEditor\Model\PageUrlProvider $pageUrlProvider,
        Json $jsonSerializer
    ) {
        $this->helper = $helper;
        $this->accessToken = $accessToken;
        $this->request = $request;
        $this->urlBuilder = $urlBuilder;
        $this->authSession = $authSession;
        $this->storeManager = $storeManager;
        $this->pageUrlProvider = $pageUrlProvider;
        $this->jsonSerializer = $jsonSerializer;
    }

    /**
     * Check if toolbar should be displayed
     *
     * @return bool
     */
    public function canShow()
    {
        return true; // For development

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
     * Get page selector data with URLs
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
                'id' => $actionName,
                'title' => (string)$data['title'],
                'url' => $data['url'],
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
//        consoleLog($this->getPageSelectorData());
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
}
