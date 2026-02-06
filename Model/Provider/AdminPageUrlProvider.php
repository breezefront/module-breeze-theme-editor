<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Provider;

use Magento\Framework\Url as FrontendUrlBuilder;

/**
 * Admin-specific PageUrlProvider
 *
 * Generates frontend store URLs even when called from admin context.
 */
class AdminPageUrlProvider extends PageUrlProvider
{
    /**
     * @var FrontendUrlBuilder
     */
    private $frontendUrlBuilder;

    /**
     * @param \Magento\Framework\UrlInterface $urlBuilder
     * @param \Magento\Catalog\Model\CategoryFactory $categoryFactory
     * @param \Magento\Catalog\Model\ProductFactory $productFactory
     * @param \Magento\Cms\Model\PageFactory $pageFactory
     * @param \Magento\Store\Model\StoreManagerInterface $storeManager
     * @param FrontendUrlBuilder $frontendUrlBuilder
     */
    public function __construct(
        \Magento\Framework\UrlInterface $urlBuilder,
        \Magento\Catalog\Model\CategoryFactory $categoryFactory,
        \Magento\Catalog\Model\ProductFactory $productFactory,
        \Magento\Cms\Model\PageFactory $pageFactory,
        \Magento\Store\Model\StoreManagerInterface $storeManager,
        FrontendUrlBuilder $frontendUrlBuilder
    ) {
        parent::__construct(
            $urlBuilder,
            $categoryFactory,
            $productFactory,
            $pageFactory,
            $storeManager
        );

        $this->frontendUrlBuilder = $frontendUrlBuilder;
    }

    /**
     * Get home page URL
     *
     * @return string
     */
    public function getHomeUrl()
    {
        return $this->getFrontendUrl('');
    }

    /**
     * Get category page URL (first active category)
     *
     * @return string
     */
    public function getCategoryUrl()
    {
        try {
            $storeId = $this->storeManager->getStore()->getId();

            $category = $this->categoryFactory->create()
                ->getCollection()
                ->setStoreId($storeId)
                ->addAttributeToSelect('url_key')
                ->addAttributeToFilter('is_active', 1)
                ->addAttributeToFilter('level', ['gt' => 1])
                ->addAttributeToFilter('children_count', ['gt' => 0])
                ->setOrder('level', 'ASC')
                ->setPageSize(1)
                ->getFirstItem();

            if ($category->getId()) {
                return $this->getFrontendUrl('catalog/category/view', [
                    'id' => $category->getId()
                ]);
            }
        } catch (\Exception $e) {
            // Silent fail
        }

        return $this->getFrontendUrl('catalog/category/view', ['id' => 2]);
    }

    /**
     * Get product page URL (first active, visible product)
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
                        \Magento\Catalog\Model\Product\Visibility::VISIBILITY_BOTH
                    ]
                ])
                ->setPageSize(1)
                ->getFirstItem();

            if ($product->getId()) {
                return $this->getFrontendUrl('catalog/product/view', [
                    'id' => $product->getId()
                ]);
            }
        } catch (\Exception $e) {
            // Silent fail
        }

        return $this->getFrontendUrl('catalog/product/view', ['id' => 1]);
    }

    /**
     * Get CMS page URL (first active page, excluding home)
     *
     * @return string
     */
    public function getCmsPageUrl()
    {
        try {
            $storeId = $this->storeManager->getStore()->getId();

            $page = $this->pageFactory->create()
                ->getCollection()
                ->addStoreFilter($storeId)
                ->addFieldToFilter('is_active', 1)
                ->addFieldToFilter('identifier', ['nin' => ['home', 'no-route']])
                ->setPageSize(1)
                ->getFirstItem();

            if ($page->getId()) {
                return $this->getFrontendUrl($page->getIdentifier());
            }
        } catch (\Exception $e) {
            // Silent fail
        }

        return $this->getFrontendUrl('about-us');
    }

    /**
     * Get shopping cart URL
     *
     * @return string
     */
    public function getCartUrl()
    {
        return $this->getFrontendUrl('checkout/cart');
    }

    /**
     * Get checkout URL
     *
     * @return string
     */
    public function getCheckoutUrl()
    {
        return $this->getFrontendUrl('checkout');
    }

    /**
     * Get customer account URL
     *
     * @return string
     */
    public function getAccountUrl()
    {
        return $this->getFrontendUrl('customer/account');
    }

    /**
     * Get frontend URL using dedicated frontend URL builder
     *
     * This ensures we get frontend URLs even when called from admin context.
     *
     * @param string $route
     * @param array $params
     * @return string
     */
    protected function getFrontendUrl($route = '', $params = [])
    {
        try {
            $store = $this->storeManager->getStore();

            // Force frontend scope parameters
            $params = array_merge($params, [
                '_scope' => $store->getId(),
                '_type' => \Magento\Framework\UrlInterface::URL_TYPE_WEB,
                '_nosid' => true,
                '_scope_to_url' => true
            ]);

            // Set the frontend URL builder to use the correct store
            $this->frontendUrlBuilder->setScope($store->getId());

            // Build frontend URL
            return $this->frontendUrlBuilder->getUrl($route, $params);

        } catch (\Exception $e) {
            // Fallback to base URL construction
            try {
                $baseUrl = $this->storeManager->getStore()->getBaseUrl(
                    \Magento\Framework\UrlInterface::URL_TYPE_WEB
                );
                $route = ltrim($route, '/');

                // Build query string if params present
                $query = '';
                if (!empty($params)) {
                    $queryParams = array_filter($params, function($key) {
                        return strpos($key, '_') !== 0;
                    }, ARRAY_FILTER_USE_KEY);

                    if (!empty($queryParams)) {
                        $query = '?' . http_build_query($queryParams);
                    }
                }

                return rtrim($baseUrl, '/') . '/' . $route . $query;
            } catch (\Exception $e) {
                return '';
            }
        }
    }
}
