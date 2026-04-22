<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel\Toolbar;

use Magento\Backend\App\Area\FrontNameResolver;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\Url\DecoderInterface;
use Magento\Framework\Url\EncoderInterface;
use Magento\Framework\UrlInterface;
use Magento\Store\Model\StoreManagerInterface;

/**
 * Provides URL data for the admin toolbar.
 *
 * Responsibilities:
 * - Build the admin dashboard URL (respects custom backend frontName)
 * - Build the frontend GraphQL endpoint URL
 * - Build the iframe preview URL (editor frame)
 * - Derive the current page action name from the iframe URL parameter
 * - Check jstest mode
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
     * @var RequestInterface
     */
    private $request;

    /**
     * @var DecoderInterface
     */
    private $urlDecoder;

    /**
     * @var EncoderInterface
     */
    private $urlEncoder;

    /**
     * @param UrlInterface $urlBuilder
     * @param StoreManagerInterface $storeManager
     * @param FrontNameResolver $frontNameResolver
     * @param RequestInterface $request
     * @param DecoderInterface $urlDecoder
     * @param EncoderInterface $urlEncoder
     */
    public function __construct(
        UrlInterface $urlBuilder,
        StoreManagerInterface $storeManager,
        FrontNameResolver $frontNameResolver,
        RequestInterface $request,
        DecoderInterface $urlDecoder,
        EncoderInterface $urlEncoder
    ) {
        $this->urlBuilder        = $urlBuilder;
        $this->storeManager      = $storeManager;
        $this->frontNameResolver = $frontNameResolver;
        $this->request           = $request;
        $this->urlDecoder        = $urlDecoder;
        $this->urlEncoder        = $urlEncoder;
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

    /**
     * Build the iframe preview URL for the editor page.
     *
     * The 'url' path param is encoded with Magento's uenc scheme
     * (EncoderInterface: strtr(base64_encode(), '+/=', '-_~')) so that
     * characters like '/' survive through Cloudflare and any proxy that
     * decodes %2F before reaching origin.
     *
     * @param int $storeId
     * @return string
     */
    public function getIframeUrl(int $storeId): string
    {
        $requestedUrl = $this->request->getParam('url', '/');
        $params       = ['store' => $storeId, 'url' => $this->urlEncoder->encode($requestedUrl)];
        if ($this->isJstestMode()) {
            $params['jstest'] = 1;
        }
        return $this->urlBuilder->getUrl('breeze_editor/editor/iframe', $params);
    }

    /**
     * Check if jstest mode is enabled.
     *
     * @return bool
     */
    public function isJstestMode(): bool
    {
        return (bool) $this->request->getParam('jstest', false);
    }

    /**
     * Derive the current page action name from the iframe URL parameter.
     *
     * This is an approximation based on URL patterns. For precise detection,
     * use postMessage from the iframe.
     *
     * @return string Action name (e.g. 'cms_index_index')
     */
    public function getCurrentPageId(): string
    {
        $rawUrl = $this->request->getParam('url', '');
        $url    = $rawUrl ? $this->urlDecoder->decode($rawUrl) : '/';

        if (empty($url) || $url === '/') {
            return 'cms_index_index';
        }
        if (strpos($url, '/checkout/cart') !== false) {
            return 'checkout_cart_index';
        }
        if (strpos($url, '/checkout') !== false) {
            return 'checkout_index_index';
        }
        if (strpos($url, '/customer/account/login') !== false) {
            return 'customer_account_login';
        }
        if (strpos($url, '/customer/account') !== false) {
            return 'customer_account_index';
        }
        if (strpos($url, '/catalogsearch/result') !== false) {
            return 'catalogsearch_result_index';
        }
        if (strpos($url, '.html') !== false) {
            return 'catalog_category_view';
        }

        return 'cms_page_view';
    }
}
