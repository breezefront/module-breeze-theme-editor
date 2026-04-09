<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Store\Model\StoreManagerInterface;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Helper\Data as HelperData;
use Swissup\BreezeThemeEditor\Model\StatusCode;

class ThemeCssVariables implements ArgumentInterface
{
    public function __construct(
        private CssGenerator $cssGenerator,
        private ThemeResolver $themeResolver,
        private StoreManagerInterface $storeManager,
        private RequestInterface $request,
        private HelperData $helper,
        private ScopeFactory $scopeFactory
    ) {}

    /**
     * Get generated CSS for current theme/store
     * Only generates if Theme Editor is enabled
     */
    public function getInlineCssContent(): string
    {
        // Check if Theme Editor is enabled
        if (!$this->helper->isEnabled()) {
            return '';
        }

        try {
            $storeId = (int) $this->storeManager->getStore()->getId();
            $themeId = $this->themeResolver->getThemeIdByStoreId($storeId);

            $scope = $this->scopeFactory->create('stores', $storeId);
            return $this->cssGenerator->generate($themeId, $scope, StatusCode::PUBLISHED);
        } catch (\Exception $e) {
            return "/* Breeze Theme Editor: Error generating CSS - {$e->getMessage()} */";
        }
    }

    /**
     * Check if CSS should be rendered
     * Returns false if:
     * - Theme Editor is disabled
     * - No custom CSS values exist (empty :root {})
     * - Error occurred during generation
     */
    public function shouldRender(): bool
    {
        try {
            $css = $this->getInlineCssContent();
            return !empty($css) && $css !== CssGenerator::EMPTY_CSS_OUTPUT;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get cache key for CSS
     */
    public function getCacheKey(): string
    {
        try {
            $storeId = (int) $this->storeManager->getStore()->getId();
            $themeId = $this->themeResolver->getThemeIdByStoreId($storeId);

            return "bte_theme_css_variables_{$themeId}_{$storeId}";
        } catch (\Exception $e) {
            return 'bte_theme_css_variables_error';
        }
    }
}
