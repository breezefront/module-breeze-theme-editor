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
     * Get admin base path (e.g. '/admin/' or '/tryit2531/admin/').
     *
     * Extracts the URL path up to and including the admin frontName so that
     * the JS iframe-helper can detect admin URLs correctly regardless of
     * subfolder installs (where the path starts with a non-/admin/ prefix).
     *
     * Strategy: generate the URL for 'admin' route (no controller/action),
     * parse its path, and strip any trailing segments beyond the frontName.
     * The admin route URL looks like:
     *   /admin/                          (standard)
     *   /tryit2531/admin/                (subfolder)
     *   /tryit2531/myadmin/              (custom frontName + subfolder)
     *
     * @return string  Path with leading and trailing slash, e.g. '/tryit2531/admin/'
     */
    public function getAdminBasePath(): string
    {
        try {
            // getUrl('admin') gives us the bare admin frontName URL without
            // controller/action segments, e.g. https://site.com/tryit2531/admin/
            $adminUrl = $this->urlBuilder->getUrl('admin', ['_nosid' => true]);
            $path     = parse_url($adminUrl, PHP_URL_PATH);

            if (!$path) {
                return '/admin/';
            }

            // Ensure trailing slash
            return rtrim($path, '/') . '/';
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
