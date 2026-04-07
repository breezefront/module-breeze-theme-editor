<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Provider;

use Magento\Catalog\Model\Product\Url as ProductUrlModel;
use Magento\CatalogUrlRewrite\Model\CategoryUrlRewriteGenerator;
use Magento\CatalogUrlRewrite\Model\ProductUrlRewriteGenerator;
use Magento\Framework\Url as FrontendUrlBuilder;
use Magento\UrlRewrite\Model\UrlFinderInterface;
use Magento\UrlRewrite\Service\V1\Data\UrlRewrite;

/**
 * Admin-specific PageUrlProvider
 *
 * Generates frontend store URLs even when called from admin context.
 *
 * Problem: in admin context $category->getUrl() and $product->getUrlModel()->getUrl()
 * both use the admin-scoped URL builder and produce admin URLs (e.g. /admin/catalog/…).
 * This class overrides getCategoryUrl() and getProductUrl() to look up the URL rewrite
 * request_path directly and build the frontend URL via FrontendUrlBuilder::getDirectUrl().
 */
class AdminPageUrlProvider extends PageUrlProvider
{
    /**
     * @var FrontendUrlBuilder
     */
    private $frontendUrlBuilder;

    /**
     * @var UrlFinderInterface
     */
    private $urlFinder;

    /**
     * @param \Magento\Framework\UrlInterface $urlBuilder
     * @param \Magento\Catalog\Model\CategoryFactory $categoryFactory
     * @param \Magento\Catalog\Model\ProductFactory $productFactory
     * @param \Magento\Cms\Model\PageFactory $pageFactory
     * @param \Magento\Store\Model\StoreManagerInterface $storeManager
     * @param FrontendUrlBuilder $frontendUrlBuilder
     * @param UrlFinderInterface $urlFinder
     */
    public function __construct(
        \Magento\Framework\UrlInterface $urlBuilder,
        \Magento\Catalog\Model\CategoryFactory $categoryFactory,
        \Magento\Catalog\Model\ProductFactory $productFactory,
        \Magento\Cms\Model\PageFactory $pageFactory,
        \Magento\Store\Model\StoreManagerInterface $storeManager,
        FrontendUrlBuilder $frontendUrlBuilder,
        UrlFinderInterface $urlFinder
    ) {
        parent::__construct(
            $urlBuilder,
            $categoryFactory,
            $productFactory,
            $pageFactory,
            $storeManager
        );

        $this->frontendUrlBuilder = $frontendUrlBuilder;
        $this->urlFinder          = $urlFinder;
    }

    /**
     * Override buildUrl to use frontend URL builder instead of admin URL builder.
     *
     * Used by getHomeUrl(), getCartUrl(), getCheckoutUrl(), getAccountUrl(),
     * getCmsPageUrl() fallback, getCategoryUrl() fallback, getProductUrl() fallback.
     *
     * @param string $route
     * @param array  $params
     * @return string
     */
    protected function buildUrl($route = '', $params = [])
    {
        return $this->getFrontendUrl($route, $params);
    }

    /**
     * Get category page URL using URL rewrite request_path.
     *
     * Overrides parent to avoid $category->getUrl() which uses the admin-scoped
     * URL builder and produces admin URLs in admin context.
     *
     * Uses the same cascading fallback strategy as the parent findCategory():
     *   1. Active category with level > 1 that has sub-categories (ideal)
     *   2. Any active category with level > 1 (covers leaf-only trees)
     *   3. Any active category at any level (last resort)
     *
     * @return string
     */
    public function getCategoryUrl()
    {
        try {
            $storeId = $this->storeManager->getStore()->getId();
            $category = $this->findCategory($storeId);

            if ($category && $category->getId()) {
                $rewrite = $this->urlFinder->findOneByData([
                    UrlRewrite::ENTITY_ID     => $category->getId(),
                    UrlRewrite::ENTITY_TYPE   => CategoryUrlRewriteGenerator::ENTITY_TYPE,
                    UrlRewrite::STORE_ID      => $storeId,
                    UrlRewrite::REDIRECT_TYPE => 0,
                ]);

                if ($rewrite) {
                    $this->frontendUrlBuilder->setScope($storeId);
                    return $this->frontendUrlBuilder->getDirectUrl($rewrite->getRequestPath());
                }
            }
        } catch (\Exception $e) {
            // Silent fail → fallback below
        }

        return $this->buildUrl('catalog/category/view', ['id' => 2]);
    }

    /**
     * Get product page URL using URL rewrite request_path.
     *
     * Overrides parent to avoid $product->getUrlModel()->getUrl() which uses the
     * admin-scoped URL builder and produces admin URLs in admin context.
     *
     * @return string
     */
    public function getProductUrl()
    {
        try {
            $storeId = $this->storeManager->getStore()->getId();

            $product = $this->productFactory->create()
                ->getCollection()
                ->setStoreId($storeId)
                ->addAttributeToSelect('url_key')
                ->addAttributeToFilter('status', \Magento\Catalog\Model\Product\Attribute\Source\Status::STATUS_ENABLED)
                ->addAttributeToFilter('visibility', [
                    'in' => [
                        \Magento\Catalog\Model\Product\Visibility::VISIBILITY_IN_CATALOG,
                        \Magento\Catalog\Model\Product\Visibility::VISIBILITY_IN_SEARCH,
                        \Magento\Catalog\Model\Product\Visibility::VISIBILITY_BOTH,
                    ]
                ])
                ->setPageSize(1)
                ->getFirstItem();

            if ($product->getId()) {
                $rewrite = $this->urlFinder->findOneByData([
                    UrlRewrite::ENTITY_ID   => $product->getId(),
                    UrlRewrite::ENTITY_TYPE => ProductUrlRewriteGenerator::ENTITY_TYPE,
                    UrlRewrite::STORE_ID    => $storeId,
                    UrlRewrite::REDIRECT_TYPE => 0,
                ]);

                if ($rewrite) {
                    $this->frontendUrlBuilder->setScope($storeId);
                    return $this->frontendUrlBuilder->getDirectUrl($rewrite->getRequestPath());
                }
            }
        } catch (\Exception $e) {
            // Silent fail → fallback below
        }

        return $this->buildUrl('catalog/product/view', ['id' => 1]);
    }

    /**
     * Get frontend URL using dedicated frontend URL builder.
     *
     * @param string $route
     * @param array  $params
     * @return string
     */
    protected function getFrontendUrl($route = '', $params = [])
    {
        try {
            $store = $this->storeManager->getStore();

            $params = array_merge($params, [
                '_scope'        => $store->getId(),
                '_type'         => \Magento\Framework\UrlInterface::URL_TYPE_WEB,
                '_nosid'        => true,
                '_scope_to_url' => true,
            ]);

            $this->frontendUrlBuilder->setScope($store->getId());

            return $this->frontendUrlBuilder->getUrl($route, $params);

        } catch (\Exception $e) {
            try {
                $baseUrl = $this->storeManager->getStore()->getBaseUrl(
                    \Magento\Framework\UrlInterface::URL_TYPE_WEB
                );
                $route       = ltrim($route, '/');
                $queryParams = array_filter($params, function ($key) {
                    return strpos($key, '_') !== 0;
                }, ARRAY_FILTER_USE_KEY);

                $query = $queryParams ? '?' . http_build_query($queryParams) : '';

                return rtrim($baseUrl, '/') . '/' . $route . $query;
            } catch (\Exception $e) {
                return '';
            }
        }
    }
}
