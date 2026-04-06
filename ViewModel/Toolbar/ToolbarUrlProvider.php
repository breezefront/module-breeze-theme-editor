<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel\Toolbar;

use Magento\Backend\App\Area\FrontNameResolver;
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
     * @var FrontNameResolver
     */
    private $frontNameResolver;

    /**
     * @param UrlInterface $urlBuilder
     * @param StoreManagerInterface $storeManager
     * @param FrontNameResolver $frontNameResolver
     */
    public function __construct(
        UrlInterface $urlBuilder,
        StoreManagerInterface $storeManager,
        FrontNameResolver $frontNameResolver
    ) {
        $this->urlBuilder        = $urlBuilder;
        $this->storeManager      = $storeManager;
        $this->frontNameResolver = $frontNameResolver;
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
     * Get admin base path (e.g. '/admin/' or '/tryit2531/').
     *
     * Uses FrontNameResolver to read the admin frontName directly from
     * env.php (backend/frontName), which is exactly what Magento uses as
     * the first URL segment for all admin routes.
     *
     * Examples:
     *   standard install  → frontName='admin'      → '/admin/'
     *   subfolder install → frontName='tryit2531'  → '/tryit2531/'
     *
     * @return string  Path with leading and trailing slash.
     */
    public function getAdminBasePath(): string
    {
        try {
            return '/' . $this->frontNameResolver->getFrontName() . '/';
        } catch (\Exception $e) {
            return '/admin/';
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
