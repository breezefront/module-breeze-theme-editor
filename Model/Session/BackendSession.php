<?php

namespace Swissup\BreezeThemeEditor\Model\Session;

use Magento\Framework\Stdlib\Cookie\CookieMetadataFactory;
use Magento\Framework\Stdlib\CookieManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Backend editor session management
 * 
 * Manages admin editor session state via cookies.
 * Stores last used store ID so user returns to same store on next visit.
 */
class BackendSession
{
    /**
     * Cookie name for storing last used store ID
     */
    const COOKIE_NAME = 'bte_last_store_id';
    
    /**
     * Cookie lifetime in seconds (24 hours)
     */
    const COOKIE_LIFETIME = 86400;

    /**
     * @var CookieManagerInterface
     */
    private $cookieManager;

    /**
     * @var CookieMetadataFactory
     */
    private $cookieMetadataFactory;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @param CookieManagerInterface $cookieManager
     * @param CookieMetadataFactory $cookieMetadataFactory
     * @param LoggerInterface $logger
     */
    public function __construct(
        CookieManagerInterface $cookieManager,
        CookieMetadataFactory $cookieMetadataFactory,
        LoggerInterface $logger
    ) {
        $this->cookieManager = $cookieManager;
        $this->cookieMetadataFactory = $cookieMetadataFactory;
        $this->logger = $logger;
    }

    /**
     * Save store ID to session cookie
     *
     * @param int $storeId
     * @return void
     */
    public function setStoreId($storeId)
    {
        try {
            $metadata = $this->cookieMetadataFactory->createPublicCookieMetadata()
                ->setPath('/')
                ->setDuration(self::COOKIE_LIFETIME)
                ->setHttpOnly(false)
                ->setSameSite('Lax');
            
            $this->cookieManager->setPublicCookie(
                self::COOKIE_NAME,
                (string)$storeId,
                $metadata
            );
            
            $this->logger->info(sprintf('[BTE BackendSession] Saved store ID: %d', $storeId));
        } catch (\Exception $e) {
            $this->logger->error(sprintf('[BTE BackendSession] Failed to save store ID: %s', $e->getMessage()));
        }
    }

    /**
     * Get store ID from session cookie
     *
     * @return int|null
     */
    public function getStoreId()
    {
        try {
            $storeId = $this->cookieManager->getCookie(self::COOKIE_NAME);
            if ($storeId !== null) {
                $storeId = (int)$storeId;
                $this->logger->info(sprintf('[BTE BackendSession] Retrieved store ID: %d', $storeId));
                return $storeId;
            }
        } catch (\Exception $e) {
            $this->logger->error(sprintf('[BTE BackendSession] Failed to get store ID: %s', $e->getMessage()));
        }
        
        return null;
    }
}
