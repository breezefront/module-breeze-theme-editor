<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel;

use Magento\Framework\App\RequestInterface;
use PHPUnit\Framework\Attributes\DataProvider;
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
 *
 * getIframeUrl(), isJstestMode(), getCurrentPageId() are tested directly
 * in ToolbarUrlProviderTest — AdminToolbar only delegates to ToolbarUrlProvider.
 */
class AdminToolbarTest extends TestCase
{
    private RequestInterface $request;
    private BackendSession $backendSession;
    private ToolbarAuthProvider $authProvider;
    private PageUrlProvider $pageUrlProvider;
    private StoreDataProvider $storeDataProvider;
    private AdminToolbar $viewModel;

    protected function setUp(): void
    {
        $this->request        = $this->createMock(\Magento\Framework\App\Request\Http::class);
        $this->backendSession = $this->createMock(BackendSession::class);

        $defaultStore = $this->createMock(\Magento\Store\Api\Data\StoreInterface::class);
        $defaultStore->method('getId')->willReturn(0);
        $defaultStore->method('getCode')->willReturn('admin');

        $storeManager = $this->createMock(\Magento\Store\Model\StoreManagerInterface::class);
        $storeManager->method('getStore')->willReturn($defaultStore);

        $this->authProvider = $this->createMock(ToolbarAuthProvider::class);
        $this->pageUrlProvider = $this->createMock(PageUrlProvider::class);
        $this->storeDataProvider = $this->createMock(StoreDataProvider::class);

        $scopeProvider = new ToolbarScopeProvider(
            $this->backendSession,
            $storeManager,
            $this->request
        );

        $this->viewModel = new AdminToolbar(
            $this->request,
            $this->pageUrlProvider,
            $this->storeDataProvider,
            $scopeProvider,
            $this->authProvider,
            $this->createMock(ToolbarPermissionsProvider::class),
            $this->createMock(ToolbarUrlProvider::class),
            $this->createMock(ToolbarThemeProvider::class)
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
    #[DataProvider('validScopeSessionProvider')]
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
    // getToolbarConfig() — auth header passed to JS
    // -------------------------------------------------------------------------

    /**
     * @test
     *
     * The JS client sends the Bearer token in the header named here, so a
     * custom value configured for Basic Auth sites must reach the frontend.
     */
    public function testToolbarConfigCarriesTheConfiguredAuthHeader(): void
    {
        $this->authProvider->method('getAuthHeaderName')->willReturn('X-Bte-Authorization');
        $this->pageUrlProvider->method('getAvailablePages')->willReturn([]);
        $this->storeDataProvider->method('getSwitchMode')->willReturn('flat');
        $this->storeDataProvider->method('getAvailableStores')->willReturn([]);

        $config = $this->viewModel->getToolbarConfig();

        $this->assertArrayHasKey('authHeader', $config);
        $this->assertSame('X-Bte-Authorization', $config['authHeader']);
    }
}
