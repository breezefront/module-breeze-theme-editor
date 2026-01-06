<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Store\Model\StoreManagerInterface;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

class ThemeCssVariables implements ArgumentInterface
{
    public function __construct(
        private CssGenerator $cssGenerator,
        private ThemeResolver $themeResolver,
        private StoreManagerInterface $storeManager
    ) {}

    /**
     * Get generated CSS for current theme/store
     */
    public function getInlineCssContent(): string
    {
        try {
            $storeId = (int) $this->storeManager->getStore()->getId();
            $themeId = $this->themeResolver->getThemeIdByStoreId($storeId);

            return $this->cssGenerator->generate($themeId, $storeId, 'PUBLISHED');
        } catch (\Exception $e) {
            return "/* Breeze Theme Editor: Error generating CSS - {$e->getMessage()} */";
        }
    }

    /**
     * Check if CSS should be rendered
     */
    public function shouldRender(): bool
    {
        try {
            $css = $this->getInlineCssContent();
            return !empty($css) && $css !== ": root {\n}\n";
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
