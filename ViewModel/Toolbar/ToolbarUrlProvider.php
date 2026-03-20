<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel\Toolbar;

use Magento\Framework\UrlInterface;
use Magento\Store\Model\StoreManagerInterface;

/**
 * Provides URL data for the admin toolbar.
 *
 * Responsibilities:
 * - Build the admin dashboard URL (respects custom backend frontName)
 * - Build the frontend GraphQL endpoint URL
 */
class ToolbarUrlProvider
{
    /**
     * @var UrlInterface
     */
    private $urlBuilder;

    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @param UrlInterface $urlBuilder
     * @param StoreManagerInterface $storeManager
     */
    public function __construct(
        UrlInterface $urlBuilder,
        StoreManagerInterface $storeManager
    ) {
        $this->urlBuilder   = $urlBuilder;
        $this->storeManager = $storeManager;
    }

    /**
     * Get admin dashboard URL.
     *
     * Respects custom backend frontName from app/etc/env.php.
     *
     * @return string
     */
    public function getAdminUrl(): string
    {
        try {
            return $this->urlBuilder->getUrl('admin/dashboard/index', ['_nosid' => true]);
        } catch (\Exception $e) {
            return $this->urlBuilder->getUrl('admin');
        }
    }

    /**
     * Get GraphQL endpoint URL (frontend endpoint, not admin-prefixed).
     *
     * @return string
     */
    public function getGraphqlEndpoint(): string
    {
        try {
            $baseUrl = $this->storeManager->getStore()->getBaseUrl(
                UrlInterface::URL_TYPE_WEB
            );
            return rtrim($baseUrl, '/') . '/graphql';
        } catch (\Exception $e) {
            return '/graphql';
        }
    }
}
