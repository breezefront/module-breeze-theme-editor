<?php

namespace Swissup\BreezeThemeEditor\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\Stdlib\Cookie\CookieMetadataFactory;
use Magento\Framework\Stdlib\CookieManagerInterface;
use Magento\Framework\App\RequestInterface;

/**
 * Set theme preview cookie when entering admin editor
 * 
 * This ensures that the iframe displays the correct theme when navigating
 * between pages or clicking links within the iframe.
 * 
 * Magento uses the 'preview_theme' cookie to override the store's default theme.
 */
class SetThemePreviewCookie implements ObserverInterface
{
    /**
     * Cookie name for theme preview (Magento standard)
     */
    const COOKIE_NAME = 'preview_theme';

    /**
     * @var CookieManagerInterface
     */
    private $cookieManager;

    /**
     * @var CookieMetadataFactory
     */
    private $cookieMetadataFactory;

    /**
     * @param CookieManagerInterface $cookieManager
     * @param CookieMetadataFactory $cookieMetadataFactory
     */
    public function __construct(
        CookieManagerInterface $cookieManager,
        CookieMetadataFactory $cookieMetadataFactory
    ) {
        $this->cookieManager = $cookieManager;
        $this->cookieMetadataFactory = $cookieMetadataFactory;
    }

    /**
     * Set theme preview cookie when admin editor is accessed
     *
     * @param Observer $observer
     * @return void
     */
    public function execute(Observer $observer)
    {
        /** @var RequestInterface $request */
        $request = $observer->getEvent()->getRequest();
        
        // Get theme ID from request
        $themeId = (int) $request->getParam('theme', 0);
        
        if (!$themeId) {
            // If no theme specified, don't set cookie (will use store default)
            return;
        }

        try {
            // Create cookie metadata
            $metadata = $this->cookieMetadataFactory->createPublicCookieMetadata()
                ->setPath('/')
                ->setHttpOnly(false) // Allow JavaScript to read
                ->setSameSite('Lax'); // Lax for same-site requests
            
            // Set the cookie
            $this->cookieManager->setPublicCookie(
                self::COOKIE_NAME,
                (string) $themeId,
                $metadata
            );
            
        } catch (\Exception $e) {
            // Silent fail - cookie is not critical, JS fallback exists
            // Log error in production if needed
        }
    }
}
