<?php

namespace Swissup\BreezeThemeEditor\Model\Provider;

class PageUrlProvider
{
    /**
     * @var \Magento\Framework\UrlInterface
     */
    protected $urlBuilder;

    /**
     * @var \Magento\Catalog\Model\CategoryFactory
     */
    protected $categoryFactory;

    /**
     * @var \Magento\Catalog\Model\ProductFactory
     */
    protected $productFactory;

    /**
     * @var \Magento\Cms\Model\PageFactory
     */
    protected $pageFactory;

    /**
     * @var \Magento\Store\Model\StoreManagerInterface
     */
    protected $storeManager;

    /**
     * @param \Magento\Framework\UrlInterface $urlBuilder
     * @param \Magento\Catalog\Model\CategoryFactory $categoryFactory
     * @param \Magento\Catalog\Model\ProductFactory $productFactory
     * @param \Magento\Cms\Model\PageFactory $pageFactory
     * @param \Magento\Store\Model\StoreManagerInterface $storeManager
     */
    public function __construct(
        \Magento\Framework\UrlInterface $urlBuilder,
        \Magento\Catalog\Model\CategoryFactory $categoryFactory,
        \Magento\Catalog\Model\ProductFactory $productFactory,
        \Magento\Cms\Model\PageFactory $pageFactory,
        \Magento\Store\Model\StoreManagerInterface $storeManager
    ) {
        $this->urlBuilder = $urlBuilder;
        $this->categoryFactory = $categoryFactory;
        $this->productFactory = $productFactory;
        $this->pageFactory = $pageFactory;
        $this->storeManager = $storeManager;
    }

    /**
     * Get available page types with URLs
     *
     * @return array
     */
    public function getAvailablePages()
    {
        return [
            'cms_index_index' => [
                'title' => __('Home Page'),
                'url' => $this->getHomeUrl()
            ],
            'catalog_category_view' => [
                'title' => __('Category Page'),
                'url' => $this->getCategoryUrl()
            ],
            'catalog_product_view' => [
                'title' => __('Product Page'),
                'url' => $this->getProductUrl()
            ],
            'checkout_cart_index' => [
                'title' => __('Shopping Cart'),
                'url' => $this->getCartUrl()
            ],
            'checkout_index_index' => [
                'title' => __('Checkout'),
                'url' => $this->getCheckoutUrl()
            ],
            'customer_account_index' => [
                'title' => __('My Account'),
                'url' => $this->getAccountUrl()
            ],
            'cms_page_view' => [
                'title' => __('CMS Page'),
                'url' => $this->getCmsPageUrl()
            ]
        ];
    }

    /**
     * Build a URL for a given route and params.
     *
     * Subclasses may override this to generate frontend URLs from admin context.
     *
     * @param string $route
     * @param array  $params
     * @return string
     */
    protected function buildUrl($route = '', $params = [])
    {
        return $this->urlBuilder->getUrl($route, $params);
    }

    /**
     * Get home page URL
     *
     * @return string
     */
    public function getHomeUrl()
    {
        return $this->buildUrl('');
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
                return $this->buildUrl('catalog/category/view', ['id' => $category->getId()]);
            }
        } catch (\Exception $e) {
            // Silent fail
        }

        return $this->buildUrl('catalog/category/view', ['id' => 2]);
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
                return $this->buildUrl('catalog/product/view', ['id' => $product->getId()]);
            }
        } catch (\Exception $e) {
            // Silent fail
        }

        return $this->buildUrl('catalog/product/view', ['id' => 1]);
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
                return $this->buildUrl($page->getIdentifier());
            }
        } catch (\Exception $e) {
            // Silent fail
        }

        return $this->buildUrl('about-us');
    }

    /**
     * Get shopping cart URL
     *
     * @return string
     */
    public function getCartUrl()
    {
        return $this->buildUrl('checkout/cart');
    }

    /**
     * Get checkout URL
     *
     * @return string
     */
    public function getCheckoutUrl()
    {
        return $this->buildUrl('checkout');
    }

    /**
     * Get customer account URL
     *
     * @return string
     */
    public function getAccountUrl()
    {
        return $this->buildUrl('customer/account');
    }
}
