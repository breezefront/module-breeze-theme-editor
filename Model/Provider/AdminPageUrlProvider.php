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
     * Override buildUrl to use frontend URL builder instead of admin URL builder.
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
