<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel;

use Magento\Framework\App\RequestInterface;
use Magento\Framework\Url\DecoderInterface;
use Magento\Framework\Url\EncoderInterface;
use Magento\Framework\UrlInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider;
use Swissup\BreezeThemeEditor\Model\Session\BackendSession;
use Swissup\BreezeThemeEditor\ViewModel\AdminToolbar;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarAuthProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarPermissionsProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarScopeProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarThemeProvider;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarUrlProvider;

/**
 * Unit tests for AdminToolbar delegation to helper ViewModels.
 *
 * getScope() and getScopeId() are tested here via AdminToolbar (which
 * delegates to ToolbarScopeProvider). Deeper tests for each provider
 * live in Test/Unit/ViewModel/Toolbar/.
 *
 * Scope state is persisted via cookies (BackendSession) only.
 * URL parameters ?scope= and ?scopeId= are intentionally NOT supported
 * to avoid conflicts with Magento's own admin URL parameters.
 */
class AdminToolbarTest extends TestCase
{
    private RequestInterface $request;
    private BackendSession $backendSession;
    private EncoderInterface $urlEncoder;
    private UrlInterface $urlBuilder;
    private AdminToolbar $viewModel;

    protected function setUp(): void
    {
        $this->request        = $this->createMock(RequestInterface::class);
        $this->backendSession = $this->createMock(BackendSession::class);
        $this->urlEncoder     = $this->createMock(EncoderInterface::class);
        $this->urlBuilder     = $this->createMock(UrlInterface::class);

        $defaultStore = $this->createMock(\Magento\Store\Api\Data\StoreInterface::class);
        $defaultStore->method('getId')->willReturn(0);

        $storeManager = $this->createMock(\Magento\Store\Model\StoreManagerInterface::class);
        $storeManager->method('getStore')->willReturn($defaultStore);

        $scopeProvider = new ToolbarScopeProvider(
            $this->backendSession,
            $storeManager,
            $this->request
        );

        $this->viewModel = new AdminToolbar(
            $this->request,
            $this->createMock(PageUrlProvider::class),
            $this->createMock(StoreDataProvider::class),
            $scopeProvider,
            $this->createMock(ToolbarAuthProvider::class),
            $this->createMock(ToolbarPermissionsProvider::class),
            $this->createMock(ToolbarUrlProvider::class),
            $this->createMock(ToolbarThemeProvider::class),
            $this->createMock(DecoderInterface::class),
            $this->urlEncoder,
            $this->urlBuilder
        );
    }

    // -------------------------------------------------------------------------
    // getScope() — no cookie (fresh install / first visit)
    // -------------------------------------------------------------------------

    /**
     * @test
     *
     * Regression test for issue #016:
     * When no session cookie exists, getScope() must return 'default'.
     */
    public function testFreshInstallReturnsDefaultScope(): void
    {
        $this->backendSession->method('getScopeType')
            ->willReturn(null);

        $this->assertSame(
            'default',
            $this->viewModel->getScope(),
            'Fresh install should default to "default" scope.'
        );
    }

    // -------------------------------------------------------------------------
    // getScope() — session cookie present
    // -------------------------------------------------------------------------

    /**
     * @test
     * @dataProvider validScopeSessionProvider
     */
    public function testSessionValueIsReturned(string $sessionScope): void
    {
        $this->backendSession->method('getScopeType')
            ->willReturn($sessionScope);

        $this->assertSame($sessionScope, $this->viewModel->getScope());
    }

    public static function validScopeSessionProvider(): array
    {
        return [
            'default from session'  => ['default'],
            'websites from session' => ['websites'],
            'stores from session'   => ['stores'],
        ];
    }

    // -------------------------------------------------------------------------
    // getScope() — invalid / empty cookie falls back to 'default'
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testEmptySessionFallsBackToDefault(): void
    {
        $this->backendSession->method('getScopeType')
            ->willReturn('');

        $this->assertSame('default', $this->viewModel->getScope());
    }

    /**
     * @test
     */
    public function testInvalidSessionValueFallsBackToDefault(): void
    {
        $this->backendSession->method('getScopeType')
            ->willReturn('bogus_scope');

        $this->assertSame('default', $this->viewModel->getScope());
    }

    // -------------------------------------------------------------------------
    // getIframeUrl()
    // -------------------------------------------------------------------------

    /**
     * @test
     */
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
            ->with('breeze_editor/editor/iframe', ['store' => 0, 'url' => 'Lw~~'])
            ->willReturn('https://example.com/admin/breeze_editor/editor/iframe/store/0/url/Lw~~/');

        $result = $this->viewModel->getIframeUrl();

        $this->assertSame(
            'https://example.com/admin/breeze_editor/editor/iframe/store/0/url/Lw~~/',
            $result
        );
    }

    /**
     * @test
     */
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

        $this->assertStringContainsString($encoded, $this->viewModel->getIframeUrl());
    }

    /**
     * @test
     */
    public function testIframeUrlAddsJstestParamWhenEnabled(): void
    {
        $this->request->method('getParam')
            ->willReturnMap([['url', '/', '/'], ['jstest', false, '1']]);

        $this->urlEncoder->method('encode')->willReturn('Lw~~');

        $this->urlBuilder->expects($this->once())
            ->method('getUrl')
            ->with('breeze_editor/editor/iframe', ['store' => 0, 'url' => 'Lw~~', 'jstest' => 1])
            ->willReturn('https://example.com/admin/breeze_editor/editor/iframe/store/0/url/Lw~~/jstest/1/');

        $this->viewModel->getIframeUrl();
    }

    /**
     * @test
     */
    public function testIframeUrlOmitsJstestParamWhenDisabled(): void
    {
        $this->request->method('getParam')
            ->willReturnMap([['url', '/', '/'], ['jstest', false, false]]);

        $this->urlEncoder->method('encode')->willReturn('Lw~~');

        $this->urlBuilder->expects($this->once())
            ->method('getUrl')
            ->with('breeze_editor/editor/iframe', ['store' => 0, 'url' => 'Lw~~'])
            ->willReturn('https://example.com/admin/breeze_editor/editor/iframe/store/0/url/Lw~~/');

        $this->viewModel->getIframeUrl();
    }
}
