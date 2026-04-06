<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel\Toolbar;

use Magento\Backend\App\Area\FrontNameResolver;
use Magento\Framework\UrlInterface;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarUrlProvider;

/**
 * Unit tests for ToolbarUrlProvider
 *
 * Covers: getAdminUrl(), getGraphqlEndpoint()
 */
class ToolbarUrlProviderTest extends TestCase
{
    private UrlInterface $urlBuilder;
    private StoreManagerInterface $storeManager;
    private ToolbarUrlProvider $provider;

    protected function setUp(): void
    {
        $this->urlBuilder   = $this->createMock(UrlInterface::class);
        $this->storeManager = $this->createMock(StoreManagerInterface::class);

        $this->provider = new ToolbarUrlProvider(
            $this->urlBuilder,
            $this->storeManager,
            $this->createMock(FrontNameResolver::class)
        );
    }

    // =========================================================================
    // getAdminUrl()
    // =========================================================================

    /** @test */
    public function testGetAdminUrlReturnsFullDashboardUrl(): void
    {
        $this->urlBuilder->method('getUrl')
            ->with('admin/dashboard/index', ['_nosid' => true])
            ->willReturn('https://example.com/admin/dashboard/index/');

        $this->assertSame(
            'https://example.com/admin/dashboard/index/',
            $this->provider->getAdminUrl()
        );
    }

    /** @test */
    public function testGetAdminUrlFallsBackToAdminRouteOnException(): void
    {
        $this->urlBuilder->method('getUrl')
            ->willReturnCallback(function (string $route, ?array $params = null) {
                if ($route === 'admin/dashboard/index') {
                    throw new \Exception('Route not found');
                }
                return 'https://example.com/admin/';
            });

        $this->assertSame('https://example.com/admin/', $this->provider->getAdminUrl());
    }

    // =========================================================================
    // getGraphqlEndpoint()
    // =========================================================================

    /** @test */
    public function testGetGraphqlEndpointAppendsGraphqlToBaseUrl(): void
    {
        // Store model: getBaseUrl() is a real method → onlyMethods()
        $storeMock = $this->getMockBuilder(\Magento\Store\Model\Store::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getBaseUrl'])
            ->getMock();
        $storeMock->method('getBaseUrl')
            ->with(UrlInterface::URL_TYPE_WEB)
            ->willReturn('https://example.com/');
        $this->storeManager->method('getStore')->willReturn($storeMock);

        $this->assertSame('https://example.com/graphql', $this->provider->getGraphqlEndpoint());
    }

    /** @test */
    public function testGetGraphqlEndpointWorksWithTrailingSlashStripped(): void
    {
        $storeMock = $this->getMockBuilder(\Magento\Store\Model\Store::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getBaseUrl'])
            ->getMock();
        $storeMock->method('getBaseUrl')->willReturn('https://example.com/store/');
        $this->storeManager->method('getStore')->willReturn($storeMock);

        $this->assertSame('https://example.com/store/graphql', $this->provider->getGraphqlEndpoint());
    }

    /** @test */
    public function testGetGraphqlEndpointReturnsFallbackOnException(): void
    {
        $this->storeManager->method('getStore')
            ->willThrowException(new \Exception('Store not found'));

        $this->assertSame('/graphql', $this->provider->getGraphqlEndpoint());
    }
}
