<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel\Toolbar;

use Magento\Framework\View\DesignInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

/**
 * Provides frontend theme ID resolution for the admin toolbar.
 *
 * Responsibilities:
 * - Resolve the active theme ID for the current scope/scopeId
 * - Delegate scope resolution to ToolbarScopeProvider (no duplication)
 * - Fall back to DesignInterface if ThemeResolver fails
 */
class ToolbarThemeProvider
{
    /**
     * @var ThemeResolver
     */
    private $themeResolver;

    /**
     * @var ScopeFactory
     */
    private $scopeFactory;

    /**
     * @var DesignInterface
     */
    private $design;

    /**
     * @var ToolbarScopeProvider
     */
    private $scopeProvider;

    /**
     * @param ThemeResolver $themeResolver
     * @param ScopeFactory $scopeFactory
     * @param DesignInterface $design
     * @param ToolbarScopeProvider $scopeProvider
     */
    public function __construct(
        ThemeResolver $themeResolver,
        ScopeFactory $scopeFactory,
        DesignInterface $design,
        ToolbarScopeProvider $scopeProvider
    ) {
        $this->themeResolver = $themeResolver;
        $this->scopeFactory  = $scopeFactory;
        $this->design        = $design;
        $this->scopeProvider = $scopeProvider;
    }

    /**
     * Get frontend theme ID for the current scope.
     *
     * Uses ThemeResolver::getThemeIdByScope() so that Default and Website
     * scopes are resolved correctly instead of always reading from store scope.
     *
     * @return int
     */
    public function getThemeId(): int
    {
        try {
            $scope = $this->scopeFactory->create(
                $this->scopeProvider->getScope(),
                $this->scopeProvider->getScopeId()
            );
            return $this->themeResolver->getThemeIdByScope($scope);
        } catch (\Exception $e) {
            try {
                return (int)$this->design->getDesignTheme()->getId();
            } catch (\Exception $e2) {
                return 0;
            }
        }
    }
}
