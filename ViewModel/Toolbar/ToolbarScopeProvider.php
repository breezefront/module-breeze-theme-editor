<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel\Toolbar;

use Magento\Store\Model\StoreManagerInterface;
use Swissup\BreezeThemeEditor\Model\Session\BackendSession;

/**
 * Provides current scope/store resolution for the admin toolbar.
 *
 * Responsibilities:
 * - Determine the active scope type ('default'|'websites'|'stores') from session
 * - Determine the active scope ID from session, with store/website fallbacks
 * - Resolve the current preview store ID from URL param or session cookie
 * - Expose the store code for the preview store
 */
class ToolbarScopeProvider
{
    /**
     * @var BackendSession
     */
    private $backendSession;

    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var \Magento\Framework\App\RequestInterface
     */
    private $request;

    /**
     * @param BackendSession $backendSession
     * @param StoreManagerInterface $storeManager
     * @param \Magento\Framework\App\RequestInterface $request
     */
    public function __construct(
        BackendSession $backendSession,
        StoreManagerInterface $storeManager,
        \Magento\Framework\App\RequestInterface $request
    ) {
        $this->backendSession = $backendSession;
        $this->storeManager   = $storeManager;
        $this->request        = $request;
    }

    /**
     * Get current scope type ('default'|'websites'|'stores').
     *
     * Priority:
     * 1. BackendSession last-used scope (cookie)
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
     * For scope='websites' → website_id from session (or current website)
     * For scope='stores'   → store_view_id from session (or current store)
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
     * Get current store ID for iframe preview URL.
     *
     * Priority:
     * 1. URL parameter ?store=X
     * 2. BackendSession cookie 'bte_last_store_id' (written by JS scope-selector)
     * 3. Current default store
     *
     * @return int
     */
    public function getStoreId(): int
    {
        // Priority 1: URL parameter ?store=X
        $storeId = (int)$this->request->getParam('store', 0);
        if ($storeId > 0) {
            try {
                return (int)$this->storeManager->getStore($storeId)->getId();
            } catch (\Exception $e) {
                // store not found, fall through
            }
        }

        // Priority 2: cookie 'bte_last_store_id' (written by JS scope-selector)
        $lastStoreId = $this->backendSession->getStoreId();
        if ($lastStoreId) {
            try {
                return (int)$this->storeManager->getStore($lastStoreId)->getId();
            } catch (\Exception $e) {
                // store not found, fall through
            }
        }

        // Priority 3: fallback
        try {
            return (int)$this->storeManager->getStore()->getId();
        } catch (\Exception $e) {
            return 1;
        }
    }

    /**
     * Get store code for the current preview store.
     *
     * Used by JS link interceptor, page-selector and StorageHelper.
     * Falls back to 'default' on error.
     *
     * @return string
     */
    public function getStoreCode(): string
    {
        try {
            return $this->storeManager->getStore($this->getStoreId())->getCode();
        } catch (\Exception $e) {
            return 'default';
        }
    }
}
