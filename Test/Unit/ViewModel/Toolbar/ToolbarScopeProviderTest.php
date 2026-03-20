<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel\Toolbar;

use Magento\Framework\App\RequestInterface;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Session\BackendSession;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarScopeProvider;

/**
 * Unit tests for ToolbarScopeProvider
 *
 * Covers: getScope(), getScopeId(), getStoreId(), getStoreCode()
 */
class ToolbarScopeProviderTest extends TestCase
{
    private BackendSession $backendSession;
    private StoreManagerInterface $storeManager;
    private RequestInterface $request;
    private ToolbarScopeProvider $provider;

    protected function setUp(): void
    {
        $this->backendSession = $this->createMock(BackendSession::class);
        $this->storeManager   = $this->createMock(StoreManagerInterface::class);
        $this->request        = $this->createMock(RequestInterface::class);

        $this->provider = new ToolbarScopeProvider(
            $this->backendSession,
            $this->storeManager,
            $this->request
        );
    }

    // =========================================================================
    // getScope()
    // =========================================================================

    /** @test */
    public function testGetScopeReturnsFallbackWhenSessionIsNull(): void
    {
        $this->backendSession->method('getScopeType')->willReturn(null);
        $this->assertSame('default', $this->provider->getScope());
    }

    /** @test */
    public function testGetScopeReturnsFallbackWhenSessionIsEmpty(): void
    {
        $this->backendSession->method('getScopeType')->willReturn('');
        $this->assertSame('default', $this->provider->getScope());
    }

    /** @test */
    public function testGetScopeReturnsFallbackWhenSessionIsInvalid(): void
    {
        $this->backendSession->method('getScopeType')->willReturn('bogus');
        $this->assertSame('default', $this->provider->getScope());
    }

    /**
     * @test
     * @dataProvider validScopeProvider
     */
    public function testGetScopeReturnsValidSessionValue(string $scope): void
    {
        $this->backendSession->method('getScopeType')->willReturn($scope);
        $this->assertSame($scope, $this->provider->getScope());
    }

    public static function validScopeProvider(): array
    {
        return [
            'default'  => ['default'],
            'websites' => ['websites'],
            'stores'   => ['stores'],
        ];
    }

    // =========================================================================
    // getScopeId()
    // =========================================================================

    /** @test */
    public function testGetScopeIdReturnsZeroForDefaultScope(): void
    {
        $this->backendSession->method('getScopeType')->willReturn('default');
        $this->assertSame(0, $this->provider->getScopeId());
    }

    /** @test */
    public function testGetScopeIdReturnsSessionValueForStoresScope(): void
    {
        $this->backendSession->method('getScopeType')->willReturn('stores');
        $this->backendSession->method('getScopeId')->willReturn(5);

        $this->assertSame(5, $this->provider->getScopeId());
    }

    /** @test */
    public function testGetScopeIdReturnsSessionValueForWebsitesScope(): void
    {
        $this->backendSession->method('getScopeType')->willReturn('websites');
        $this->backendSession->method('getScopeId')->willReturn(2);

        $this->assertSame(2, $this->provider->getScopeId());
    }

    /** @test */
    public function testGetScopeIdFallsBackToCurrentStoreWhenSessionMissing(): void
    {
        $this->backendSession->method('getScopeType')->willReturn('stores');
        $this->backendSession->method('getScopeId')->willReturn(null);

        $storeMock = $this->createMock(\Magento\Store\Api\Data\StoreInterface::class);
        $storeMock->method('getId')->willReturn(3);
        $this->storeManager->method('getStore')->willReturn($storeMock);

        $this->assertSame(3, $this->provider->getScopeId());
    }

    /** @test */
    public function testGetScopeIdFallsBackToCurrentWebsiteWhenSessionMissing(): void
    {
        $this->backendSession->method('getScopeType')->willReturn('websites');
        $this->backendSession->method('getScopeId')->willReturn(null);

        $websiteMock = $this->createMock(\Magento\Store\Api\Data\WebsiteInterface::class);
        $websiteMock->method('getId')->willReturn(1);
        $this->storeManager->method('getWebsite')->willReturn($websiteMock);

        $this->assertSame(1, $this->provider->getScopeId());
    }

    // =========================================================================
    // getStoreId()
    // =========================================================================

    /** @test */
    public function testGetStoreIdReadsFromUrlParam(): void
    {
        $this->request->method('getParam')->willReturnMap([
            ['store', 0, 7],
        ]);

        $storeMock = $this->createMock(\Magento\Store\Api\Data\StoreInterface::class);
        $storeMock->method('getId')->willReturn(7);
        $this->storeManager->method('getStore')->with(7)->willReturn($storeMock);

        $this->assertSame(7, $this->provider->getStoreId());
    }

    /** @test */
    public function testGetStoreIdFallsBackToSessionCookie(): void
    {
        $this->request->method('getParam')->willReturnMap([
            ['store', 0, 0],
        ]);
        $this->backendSession->method('getStoreId')->willReturn(4);

        $storeMock = $this->createMock(\Magento\Store\Api\Data\StoreInterface::class);
        $storeMock->method('getId')->willReturn(4);
        $this->storeManager->method('getStore')->with(4)->willReturn($storeMock);

        $this->assertSame(4, $this->provider->getStoreId());
    }

    /** @test */
    public function testGetStoreIdFallsBackToCurrentStoreAsFinalFallback(): void
    {
        $this->request->method('getParam')->willReturnMap([
            ['store', 0, 0],
        ]);
        $this->backendSession->method('getStoreId')->willReturn(null);

        $storeMock = $this->createMock(\Magento\Store\Api\Data\StoreInterface::class);
        $storeMock->method('getId')->willReturn(1);
        $this->storeManager->method('getStore')->with(null)->willReturn($storeMock);

        // no param, no cookie — falls through to getStore() with no arg
        $storeMock2 = $this->createMock(\Magento\Store\Api\Data\StoreInterface::class);
        $storeMock2->method('getId')->willReturn(1);

        // Re-create provider so the stub map works cleanly
        $storeManager = $this->createMock(StoreManagerInterface::class);
        $storeManager->method('getStore')->willReturn($storeMock2);

        $provider = new ToolbarScopeProvider(
            $this->backendSession,
            $storeManager,
            $this->request
        );

        $this->assertSame(1, $provider->getStoreId());
    }

    // =========================================================================
    // getStoreCode()
    // =========================================================================

    /** @test */
    public function testGetStoreCodeReturnsStoreCode(): void
    {
        $this->request->method('getParam')->willReturn(0);
        $this->backendSession->method('getStoreId')->willReturn(null);

        $storeMock = $this->createMock(\Magento\Store\Api\Data\StoreInterface::class);
        $storeMock->method('getId')->willReturn(1);
        $storeMock->method('getCode')->willReturn('default');

        $storeManager = $this->createMock(StoreManagerInterface::class);
        $storeManager->method('getStore')->willReturn($storeMock);

        $provider = new ToolbarScopeProvider(
            $this->backendSession,
            $storeManager,
            $this->request
        );

        $this->assertSame('default', $provider->getStoreCode());
    }

    /** @test */
    public function testGetStoreCodeReturnsFallbackOnException(): void
    {
        $this->request->method('getParam')->willReturn(0);
        $this->backendSession->method('getStoreId')->willReturn(null);

        $storeManager = $this->createMock(StoreManagerInterface::class);
        $storeManager->method('getStore')->willThrowException(new \Exception('Store not found'));

        $provider = new ToolbarScopeProvider(
            $this->backendSession,
            $storeManager,
            $this->request
        );

        $this->assertSame('default', $provider->getStoreCode());
    }
}
