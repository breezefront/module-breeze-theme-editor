<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel\Toolbar;

use Magento\Backend\App\Area\FrontNameResolver;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\Url\DecoderInterface;
use Magento\Framework\Url\EncoderInterface;
use Magento\Framework\UrlInterface;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarUrlProvider;

/**
 * Unit tests for ToolbarUrlProvider
 *
 * Covers: getAdminUrl(), getAdminBasePath(), getGraphqlEndpoint(),
 *         getIframeUrl(), isJstestMode(), getCurrentPageId()
 */
class ToolbarUrlProviderTest extends TestCase
{
    private UrlInterface $urlBuilder;
    private StoreManagerInterface $storeManager;
    private FrontNameResolver $frontNameResolver;
    private RequestInterface $request;
    private DecoderInterface $urlDecoder;
    private EncoderInterface $urlEncoder;
    private ToolbarUrlProvider $provider;

    protected function setUp(): void
    {
        $this->urlBuilder        = $this->createMock(UrlInterface::class);
        $this->storeManager      = $this->createMock(StoreManagerInterface::class);
        $this->frontNameResolver = $this->createMock(FrontNameResolver::class);
        $this->request           = $this->createMock(RequestInterface::class);
        $this->urlDecoder        = $this->createMock(DecoderInterface::class);
        $this->urlEncoder        = $this->createMock(EncoderInterface::class);

        $this->provider = new ToolbarUrlProvider(
            $this->urlBuilder,
            $this->storeManager,
            $this->frontNameResolver,
            $this->request,
            $this->urlDecoder,
            $this->urlEncoder
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
    // getAdminBasePath()
    // =========================================================================

    /** @test */
    public function testGetAdminBasePathReturnsStandardAdminPath(): void
    {
        $this->frontNameResolver->method('getFrontName')->willReturn('admin');

        $this->assertSame('/admin/', $this->provider->getAdminBasePath());
    }

    /** @test */
    public function testGetAdminBasePathReturnsCustomFrontNameWithSlashes(): void
    {
        $this->frontNameResolver->method('getFrontName')->willReturn('tryit2531');

        $this->assertSame('/tryit2531/', $this->provider->getAdminBasePath());
    }

    /** @test */
    public function testGetAdminBasePathFallsBackToAdminOnException(): void
    {
        $this->frontNameResolver->method('getFrontName')
            ->willThrowException(new \Exception('Config not found'));

        $this->assertSame('/admin/', $this->provider->getAdminBasePath());
    }

    // =========================================================================
    // getGraphqlEndpoint()
    // =========================================================================

    /** @test */
    public function testGetGraphqlEndpointAppendsGraphqlToBaseUrl(): void
    {
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

    // =========================================================================
    // isJstestMode()
    // =========================================================================

    /** @test */
    public function testIsJstestModeReturnsTrueWhenParamSet(): void
    {
        $this->request->method('getParam')
            ->with('jstest', false)
            ->willReturn('1');

        $this->assertTrue($this->provider->isJstestMode());
    }

    /** @test */
    public function testIsJstestModeReturnsFalseWhenParamAbsent(): void
    {
        $this->request->method('getParam')
            ->with('jstest', false)
            ->willReturn(false);

        $this->assertFalse($this->provider->isJstestMode());
    }

    // =========================================================================
    // getIframeUrl()
    // =========================================================================

    /** @test */
    public function testIframeUrlUsesEncoderForDefaultUrl(): void
    {
        $this->request->method('getParam')
            ->willReturnMap([['url', '/', '/'], ['jstest', false, false]]);

        $this->urlEncoder->expects($this->once())
            ->method('encode')
            ->with('/')
            ->willReturn('Lw~~');

        $this->urlBuilder->expects($this->once())
            ->method('getUrl')
            ->with('breeze_editor/editor/iframe', ['store' => 1, 'url' => 'Lw~~'])
            ->willReturn('https://example.com/admin/breeze_editor/editor/iframe/store/1/url/Lw~~/');

        $result = $this->provider->getIframeUrl(1);

        $this->assertSame(
            'https://example.com/admin/breeze_editor/editor/iframe/store/1/url/Lw~~/',
            $result
        );
    }

    /** @test */
    public function testIframeUrlEncodesCustomPath(): void
    {
        $this->request->method('getParam')
            ->willReturnMap([['url', '/', '/catalog/category/view.html'], ['jstest', false, false]]);

        $encoded = strtr(base64_encode('/catalog/category/view.html'), '+/=', '-_~');

        $this->urlEncoder->method('encode')
            ->with('/catalog/category/view.html')
            ->willReturn($encoded);

        $this->urlBuilder->method('getUrl')
            ->with('breeze_editor/editor/iframe', ['store' => 0, 'url' => $encoded])
            ->willReturn('https://example.com/admin/breeze_editor/editor/iframe/store/0/url/' . $encoded . '/');

        $this->assertStringContainsString($encoded, $this->provider->getIframeUrl(0));
    }

    /** @test */
    public function testIframeUrlAddsJstestParamWhenEnabled(): void
    {
        $this->request->method('getParam')
            ->willReturnMap([['url', '/', '/'], ['jstest', false, '1']]);

        $this->urlEncoder->method('encode')->willReturn('Lw~~');

        $this->urlBuilder->expects($this->once())
            ->method('getUrl')
            ->with('breeze_editor/editor/iframe', ['store' => 0, 'url' => 'Lw~~', 'jstest' => 1])
            ->willReturn('https://example.com/admin/breeze_editor/editor/iframe/store/0/url/Lw~~/jstest/1/');

        $this->provider->getIframeUrl(0);
    }

    /** @test */
    public function testIframeUrlOmitsJstestParamWhenDisabled(): void
    {
        $this->request->method('getParam')
            ->willReturnMap([['url', '/', '/'], ['jstest', false, false]]);

        $this->urlEncoder->method('encode')->willReturn('Lw~~');

        $this->urlBuilder->expects($this->once())
            ->method('getUrl')
            ->with('breeze_editor/editor/iframe', ['store' => 0, 'url' => 'Lw~~'])
            ->willReturn('https://example.com/admin/breeze_editor/editor/iframe/store/0/url/Lw~~/');

        $this->provider->getIframeUrl(0);
    }

    // =========================================================================
    // getCurrentPageId()
    // =========================================================================

    /** @test */
    public function testCurrentPageIdReturnsHomepageForEmptyUrl(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('');

        $this->assertSame('cms_index_index', $this->provider->getCurrentPageId());
    }

    /** @test */
    public function testCurrentPageIdReturnsHomepageForRootSlash(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('encoded');
        $this->urlDecoder->method('decode')->with('encoded')->willReturn('/');

        $this->assertSame('cms_index_index', $this->provider->getCurrentPageId());
    }

    /** @test */
    public function testCurrentPageIdDetectsCartPage(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('encoded');
        $this->urlDecoder->method('decode')->willReturn('/checkout/cart');

        $this->assertSame('checkout_cart_index', $this->provider->getCurrentPageId());
    }

    /** @test */
    public function testCurrentPageIdDetectsCheckoutPage(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('encoded');
        $this->urlDecoder->method('decode')->willReturn('/checkout/index/index');

        $this->assertSame('checkout_index_index', $this->provider->getCurrentPageId());
    }

    /** @test */
    public function testCurrentPageIdDetectsLoginPage(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('encoded');
        $this->urlDecoder->method('decode')->willReturn('/customer/account/login');

        $this->assertSame('customer_account_login', $this->provider->getCurrentPageId());
    }

    /** @test */
    public function testCurrentPageIdDetectsCustomerAccountPage(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('encoded');
        $this->urlDecoder->method('decode')->willReturn('/customer/account/index');

        $this->assertSame('customer_account_index', $this->provider->getCurrentPageId());
    }

    /** @test */
    public function testCurrentPageIdDetectsSearchResultPage(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('encoded');
        $this->urlDecoder->method('decode')->willReturn('/catalogsearch/result/?q=test');

        $this->assertSame('catalogsearch_result_index', $this->provider->getCurrentPageId());
    }

    /** @test */
    public function testCurrentPageIdDetectsCategoryPage(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('encoded');
        $this->urlDecoder->method('decode')->willReturn('/men/tops.html');

        $this->assertSame('catalog_category_view', $this->provider->getCurrentPageId());
    }

    /** @test */
    public function testCurrentPageIdReturnsCmsPageViewAsFallback(): void
    {
        $this->request->method('getParam')->with('url', '')->willReturn('encoded');
        $this->urlDecoder->method('decode')->willReturn('/some/other/page');

        $this->assertSame('cms_page_view', $this->provider->getCurrentPageId());
    }
}
