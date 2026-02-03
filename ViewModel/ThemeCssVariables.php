<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Store\Model\StoreManagerInterface;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Data\AccessToken;
use Swissup\BreezeThemeEditor\Helper\Data as HelperData;

class ThemeCssVariables implements ArgumentInterface
{
    public function __construct(
        private CssGenerator $cssGenerator,
        private ThemeResolver $themeResolver,
        private StoreManagerInterface $storeManager,
        private AccessToken $accessToken,
        private RequestInterface $request,
        private HelperData $helper
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

            return $this->cssGenerator->generate($themeId, $storeId, 'PUBLISHED');
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
            return !empty($css) && $css !== ":root {\n}\n";
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get generated CSS for DRAFT status
     * Only generates if toolbar session is active (user has access token)
     *
     * @return string
     */
    public function getInlineCssContentDraft(): string
    {
        try {
            // Check if toolbar is active (user has access token)
            if (!$this->canGenerateDraftCss()) {
                return '';
            }

            $storeId = (int) $this->storeManager->getStore()->getId();
            $themeId = $this->themeResolver->getThemeIdByStoreId($storeId);

            return $this->cssGenerator->generate($themeId, $storeId, 'DRAFT');
        } catch (\Exception $e) {
            return "/* Breeze Theme Editor: Error generating draft CSS - {$e->getMessage()} */";
        }
    }

    /**
     * Check if draft CSS should be generated
     * Only for users with active toolbar session
     *
     * @return bool
     */
    private function canGenerateDraftCss(): bool
    {
        // Same logic as Toolbar::canShow()
        if (!$this->helper->isEnabled()) {
            return false;
        }

        return $this->accessToken->validateRequest($this->request);
    }

    /**
     * Check if user has valid access token (is admin with toolbar)
     * 
     * @return bool
     */
    public function hasAccessToken(): bool
    {
        return $this->accessToken->validateRequest($this->request);
    }

    /**
     * Check if currently running in test mode
     * Test mode is activated by ?jstest=true or ?jstest=1 URL parameter
     * 
     * @return bool
     */
    public function isTestMode(): bool
    {
        $jstest = $this->request->getParam('jstest');
        return $jstest === 'true' || $jstest === '1';
    }

    /**
     * Check if CSS has real content (contains CSS variables)
     *
     * @param string $css
     * @return bool
     */
    public function hasRealCssContent(string $css): bool
    {
        return !empty($css)
            && $css !== ":root {\n}\n"
            && str_contains($css, '--'); // Contains CSS variables
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
