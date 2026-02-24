<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\View\Result\PageFactory;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Psr\Log\LoggerInterface;

abstract class AbstractEditor extends Action
{
    /**
     * Authorization level of a basic admin session
     *
     * @see _isAllowed()
     */
    const ADMIN_RESOURCE = 'Swissup_BreezeThemeEditor::editor';

    /**
     * @var PageFactory
     */
    protected $resultPageFactory;

    /**
     * @var StoreManagerInterface
     */
    protected $storeManager;

    /**
     * @var ScopeConfigInterface
     */
    protected $scopeConfig;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Session\BackendSession
     */
    private $backendSession;

    /**
     * @var LoggerInterface
     */
    protected $logger;

    /**
     * @param Context $context
     * @param PageFactory $resultPageFactory
     * @param StoreManagerInterface $storeManager
     * @param ScopeConfigInterface $scopeConfig
     * @param \Swissup\BreezeThemeEditor\Model\Session\BackendSession $backendSession
     * @param LoggerInterface $logger
     */
    public function __construct(
        Context $context,
        PageFactory $resultPageFactory,
        StoreManagerInterface $storeManager,
        ScopeConfigInterface $scopeConfig,
        \Swissup\BreezeThemeEditor\Model\Session\BackendSession $backendSession,
        LoggerInterface $logger
    ) {
        parent::__construct($context);
        $this->resultPageFactory = $resultPageFactory;
        $this->storeManager = $storeManager;
        $this->scopeConfig = $scopeConfig;
        $this->backendSession = $backendSession;
        $this->logger = $logger;
    }

    /**
     * Check if user has permission to access editor
     *
     * @return bool
     */
    protected function _isAllowed()
    {
        return $this->_authorization->isAllowed(self::ADMIN_RESOURCE);
    }

    /**
     * Get current store ID from request, cookie, or default
     *
     * Priority:
     * 1. URL parameter ?store=X (highest)
     * 2. Cookie 'bte_last_store_id' (last used store)
     * 3. Default store view (fallback)
     *
     * @return int
     */
    protected function getStoreId()
    {
        // Priority 1: Check URL parameter ?store=X
        $storeId = (int) $this->getRequest()->getParam('store', 0);
        
        if ($storeId > 0) {
            try {
                $store = $this->storeManager->getStore($storeId);
                // Valid store found - save to cookie for next time
                $this->backendSession->setStoreId($storeId);
                $this->logger->info(sprintf('[BTE Controller] Using store from URL: %d (%s)', $storeId, $store->getCode()));
                return $storeId;
            } catch (\Exception $e) {
                $this->logger->warning(sprintf('[BTE Controller] Store %d from URL not found: %s', $storeId, $e->getMessage()));
                // Continue to next priority
            }
        }
        
        // Priority 2: Check cookie (last used store)
        $lastStoreId = $this->backendSession->getStoreId();
        if ($lastStoreId) {
            try {
                $store = $this->storeManager->getStore($lastStoreId);
                $this->logger->info(sprintf('[BTE Controller] Using store from cookie: %d (%s)', $lastStoreId, $store->getCode()));
                return $lastStoreId;
            } catch (\Exception $e) {
                $this->logger->warning(sprintf('[BTE Controller] Store %d from cookie not found: %s', $lastStoreId, $e->getMessage()));
                // Continue to fallback
            }
        }
        
        // Priority 3: Use default store view
        $defaultStore = $this->storeManager->getDefaultStoreView();
        $defaultStoreId = $defaultStore->getId();
        $this->logger->info(sprintf('[BTE Controller] Using default store: %d (%s)', $defaultStoreId, $defaultStore->getCode()));
        return $defaultStoreId;
    }

    /**
     * Get current theme ID from request or store config
     *
     * @return int
     */
    protected function getThemeId()
    {
        $themeId = (int) $this->getRequest()->getParam('theme', 0);
        
        if ($themeId) {
            return $themeId;
        }
        
        // Get theme from store config
        $storeId = $this->getStoreId();
        return (int) $this->scopeConfig->getValue(
            'design/theme/theme_id',
            \Magento\Store\Model\ScopeInterface::SCOPE_STORE,
            $storeId
        );
    }

    /**
     * Check if jstest mode is enabled
     *
     * @return bool
     */
    protected function isJstestMode()
    {
        return (bool) $this->getRequest()->getParam('jstest', false);
    }
}
