<?php

namespace Swissup\BreezeThemeEditor\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\Stdlib\Cookie\CookieMetadataFactory;
use Magento\Framework\Stdlib\CookieManagerInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Store\Model\ScopeInterface;
use Psr\Log\LoggerInterface;

/**
 * Set theme preview and store cookies when entering frontend from admin editor
 * 
 * This ensures that the iframe displays the correct theme and store when:
 * - User refreshes the page (F5)
 * - Navigating between pages (page selector)
 * - Switching store views (scope selector)
 * - Clicking links within the iframe
 * 
 * Magento uses:
 * - 'preview_theme' cookie to override the store's default theme
 * - 'store' cookie to determine which store view to display
 * 
 * Theme ID is read from store configuration (design/theme/theme_id)
 * instead of being passed as URL parameter.
 */
class SetThemePreviewCookie implements ObserverInterface
{
    /**
     * Cookie name for theme preview (Magento standard)
     */
    const COOKIE_NAME = 'preview_theme';
    
    /**
     * Cookie name for store (Magento standard)
     */
    const STORE_COOKIE_NAME = 'store';

    /**
     * @var CookieManagerInterface
     */
    private $cookieManager;

    /**
     * @var CookieMetadataFactory
     */
    private $cookieMetadataFactory;
    
    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var ScopeConfigInterface
     */
    private $scopeConfig;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @param CookieManagerInterface $cookieManager
     * @param CookieMetadataFactory $cookieMetadataFactory
     * @param StoreManagerInterface $storeManager
     * @param ScopeConfigInterface $scopeConfig
     * @param LoggerInterface $logger
     */
    public function __construct(
        CookieManagerInterface $cookieManager,
        CookieMetadataFactory $cookieMetadataFactory,
        StoreManagerInterface $storeManager,
        ScopeConfigInterface $scopeConfig,
        LoggerInterface $logger
    ) {
        $this->cookieManager = $cookieManager;
        $this->cookieMetadataFactory = $cookieMetadataFactory;
        $this->storeManager = $storeManager;
        $this->scopeConfig = $scopeConfig;
        $this->logger = $logger;
    }

    /**
     * Set theme preview and store cookies when frontend request is made
     *
     * Listens to 'controller_action_predispatch' event to set cookies
     * before page renders. Theme ID is read from store config.
     *
     * @param Observer $observer
     * @return void
     */
    public function execute(Observer $observer)
    {
        /** @var RequestInterface $request */
        $request = $observer->getEvent()->getRequest();
        
        // Only process if ___store parameter is present (from admin editor iframe)
        $storeParam = $request->getParam('___store');
        
        if (!$storeParam) {
            return;
        }
        
        try {
            // Get store by code
            $store = $this->storeManager->getStore($storeParam);
            $storeId = $store->getId();
            $storeCode = $store->getCode();
            
            // Get theme ID from store config
            $themeId = $this->scopeConfig->getValue(
                'design/theme/theme_id',
                ScopeInterface::SCOPE_STORE,
                $storeId
            );
            
            // Create cookie metadata
            $metadata = $this->cookieMetadataFactory->createPublicCookieMetadata()
                ->setPath('/')
                ->setHttpOnly(false) // Allow JavaScript to read
                ->setSameSite('Lax'); // Lax for same-site requests
            
            // Set store cookie
            $this->cookieManager->setPublicCookie(
                self::STORE_COOKIE_NAME,
                $storeCode,
                $metadata
            );
            
            // Set theme preview cookie (from store config)
            if ($themeId) {
                $this->cookieManager->setPublicCookie(
                    self::COOKIE_NAME,
                    (string)$themeId,
                    $metadata
                );
            }
            
            $this->logger->info(sprintf(
                '[BTE Observer] Set cookies: store=%s (id=%d), theme=%d',
                $storeCode,
                $storeId,
                $themeId
            ));
            
        } catch (\Exception $e) {
            $this->logger->error('[BTE Observer] Failed to set cookies: ' . $e->getMessage());
        }
    }
}
