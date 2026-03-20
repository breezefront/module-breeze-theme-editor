<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel\Toolbar;

use Magento\Framework\View\DesignInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface as BreezeScope;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarScopeProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarThemeProvider;

/**
 * Unit tests for ToolbarThemeProvider
 *
 * Covers: getThemeId() — normal path, fallback to DesignInterface, double-fallback to 0
 */
class ToolbarThemeProviderTest extends TestCase
{
    private ThemeResolver $themeResolver;
    private ScopeFactory $scopeFactory;
    private DesignInterface $design;
    private ToolbarScopeProvider $scopeProvider;
    private ToolbarThemeProvider $provider;

    protected function setUp(): void
    {
        $this->themeResolver = $this->createMock(ThemeResolver::class);
        $this->scopeFactory  = $this->createMock(ScopeFactory::class);
        $this->design        = $this->createMock(DesignInterface::class);
        $this->scopeProvider = $this->createMock(ToolbarScopeProvider::class);

        $this->provider = new ToolbarThemeProvider(
            $this->themeResolver,
            $this->scopeFactory,
            $this->design,
            $this->scopeProvider
        );
    }

    // =========================================================================
    // getThemeId() — happy path
    // =========================================================================

    /** @test */
    public function testGetThemeIdReturnsThemeIdFromResolver(): void
    {
        $this->scopeProvider->method('getScope')->willReturn('stores');
        $this->scopeProvider->method('getScopeId')->willReturn(1);

        $scopeMock = $this->createMock(BreezeScope::class);
        $this->scopeFactory->method('create')->with('stores', 1)->willReturn($scopeMock);
        $this->themeResolver->method('getThemeIdByScope')->with($scopeMock)->willReturn(12);

        $this->assertSame(12, $this->provider->getThemeId());
    }

    /** @test */
    public function testGetThemeIdUsesDefaultScopeAndZeroScopeId(): void
    {
        $this->scopeProvider->method('getScope')->willReturn('default');
        $this->scopeProvider->method('getScopeId')->willReturn(0);

        $scopeMock = $this->createMock(BreezeScope::class);
        $this->scopeFactory->method('create')->with('default', 0)->willReturn($scopeMock);
        $this->themeResolver->method('getThemeIdByScope')->with($scopeMock)->willReturn(5);

        $this->assertSame(5, $this->provider->getThemeId());
    }

    // =========================================================================
    // getThemeId() — first-level fallback (DesignInterface)
    // =========================================================================

    /** @test */
    public function testGetThemeIdFallsBackToDesignInterfaceWhenResolverThrows(): void
    {
        $this->scopeProvider->method('getScope')->willReturn('stores');
        $this->scopeProvider->method('getScopeId')->willReturn(1);

        $scopeMock = $this->createMock(BreezeScope::class);
        $this->scopeFactory->method('create')->willReturn($scopeMock);
        $this->themeResolver->method('getThemeIdByScope')
            ->willThrowException(new \Exception('Theme not found'));

        $themeMock = $this->createMock(\Magento\Framework\View\Design\ThemeInterface::class);
        $themeMock->method('getId')->willReturn(7);
        $this->design->method('getDesignTheme')->willReturn($themeMock);

        $this->assertSame(7, $this->provider->getThemeId());
    }

    // =========================================================================
    // getThemeId() — double fallback (returns 0)
    // =========================================================================

    /** @test */
    public function testGetThemeIdReturnsZeroWhenBothResolverAndDesignThrow(): void
    {
        $this->scopeProvider->method('getScope')->willReturn('stores');
        $this->scopeProvider->method('getScopeId')->willReturn(1);

        $scopeMock = $this->createMock(BreezeScope::class);
        $this->scopeFactory->method('create')->willReturn($scopeMock);
        $this->themeResolver->method('getThemeIdByScope')
            ->willThrowException(new \Exception('Theme not found'));
        $this->design->method('getDesignTheme')
            ->willThrowException(new \Exception('Design not ready'));

        $this->assertSame(0, $this->provider->getThemeId());
    }
}
