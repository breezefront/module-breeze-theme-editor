<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Block;

use Magento\Framework\View\Element\Template;
use Swissup\BreezeThemeEditor\ViewModel\ThemeCssVariables as ThemeCssVariablesViewModel;

/**
 * Block for rendering theme CSS variables inline
 *
 * ViewModel is injected via layout XML arguments (not constructor)
 * This follows Magento 2.3+ best practices for ViewModel usage
 */
class ThemeCssVariables extends Template
{
    /**
     * @var string
     */
    protected $_template = 'Swissup_BreezeThemeEditor::inline-css-variables.phtml';

    /**
     * Get ViewModel instance (injected via layout XML)
     *
     * @return ThemeCssVariablesViewModel|null
     */
    public function getViewModel(): ?ThemeCssVariablesViewModel
    {
        return $this->getData('view_model');
    }

    /**
     * Get unique cache key
     *
     * @return array
     */
    public function getCacheKeyInfo(): array
    {
        $viewModel = $this->getViewModel();

        $cacheKey = [
            'BTE_THEME_CSS_VARIABLES',
            $this->_storeManager->getStore()->getId()
        ];

        if ($viewModel) {
            $cacheKey[] = $viewModel->getCacheKey();
        }

        return $cacheKey;
    }

    /**
     * Get cache tags for invalidation
     *
     * @return array
     */
    public function getCacheTags(): array
    {
        return array_merge(
            parent::getCacheTags() ?: [],
            ['bte_theme_variables']
        );
    }

    /**
     * Get cache lifetime (1 day)
     *
     * @return int
     */
    protected function getCacheLifetime(): int
    {
        return 86400;
    }
}
