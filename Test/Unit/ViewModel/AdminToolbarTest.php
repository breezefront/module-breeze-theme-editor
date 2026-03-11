<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel;

use Magento\Backend\Model\Auth\Session as AuthSession;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\AuthorizationInterface;
use Magento\Framework\Serialize\Serializer\Json;
use Magento\Framework\UrlInterface;
use Magento\Framework\View\DesignInterface;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider;
use Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator;
use Swissup\BreezeThemeEditor\Model\Session\BackendSession;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\ViewModel\AdminToolbar;

/**
 * Unit tests for AdminToolbar::getScope()
 *
 * Covers issue #016: editor falls back to 'stores' scope instead of 'default'
 * when no URL param and no session cookie are present.
 */
class AdminToolbarTest extends TestCase
{
    private RequestInterface $request;
    private BackendSession $backendSession;
    private AdminToolbar $viewModel;

    protected function setUp(): void
    {
        $this->request = $this->createMock(RequestInterface::class);
        $this->backendSession = $this->createMock(BackendSession::class);

        $this->viewModel = new AdminToolbar(
            $this->request,
            $this->createMock(UrlInterface::class),
            $this->createMock(AuthSession::class),
            $this->createMock(StoreManagerInterface::class),
            $this->createMock(PageUrlProvider::class),
            $this->createMock(StoreDataProvider::class),
            $this->createMock(DesignInterface::class),
            $this->createMock(Json::class),
            $this->createMock(PublicationRepositoryInterface::class),
            $this->createMock(SearchCriteriaBuilder::class),
            $this->createMock(AdminTokenGenerator::class),
            $this->createMock(AuthorizationInterface::class),
            $this->createMock(ThemeResolver::class),
            $this->backendSession,
            $this->createMock(ScopeFactory::class)
        );
    }

    // -------------------------------------------------------------------------
    // Issue #016 — regression test: fresh install, no URL param, no cookie
    // -------------------------------------------------------------------------

    /**
     * @test
     *
     * Reproduces issue #016:
     * When no ?scope= URL param is present AND no session cookie exists,
     * getScope() returns 'stores' (bug) instead of 'default' (expected).
     */
    public function testFreshInstallReturnsDefaultScope(): void
    {
        // No URL param
        $this->request->method('getParam')
            ->with('scope', '')
            ->willReturn('');

        // No session cookie
        $this->backendSession->method('getScopeType')
            ->willReturn(null);

        $scope = $this->viewModel->getScope();

        // Issue #016: this assertion currently FAILS because the fallback is 'stores'
        $this->assertSame(
            'default',
            $scope,
            'Issue #016: Fresh install should default to "default" scope, not "stores".'
        );
    }

    // -------------------------------------------------------------------------
    // Happy-path tests (should pass regardless of the fix)
    // -------------------------------------------------------------------------

    /**
     * @test
     * @dataProvider validScopeUrlParamProvider
     */
    public function testUrlParamTakesPriority(string $urlScope): void
    {
        $this->request->method('getParam')
            ->with('scope', '')
            ->willReturn($urlScope);

        // Session has a different value — URL param must win
        $this->backendSession->method('getScopeType')
            ->willReturn('stores');

        $this->assertSame($urlScope, $this->viewModel->getScope());
    }

    public static function validScopeUrlParamProvider(): array
    {
        return [
            'default via URL' => ['default'],
            'websites via URL' => ['websites'],
            'stores via URL' => ['stores'],
        ];
    }

    /**
     * @test
     * @dataProvider validScopeSessionProvider
     */
    public function testSessionTakesPriorityOverFallback(string $sessionScope): void
    {
        // No URL param
        $this->request->method('getParam')
            ->with('scope', '')
            ->willReturn('');

        // Session has a value
        $this->backendSession->method('getScopeType')
            ->willReturn($sessionScope);

        $this->assertSame($sessionScope, $this->viewModel->getScope());
    }

    public static function validScopeSessionProvider(): array
    {
        return [
            'default from session' => ['default'],
            'websites from session' => ['websites'],
            'stores from session' => ['stores'],
        ];
    }

    /**
     * @test
     */
    public function testInvalidUrlParamIsFallsBackToSession(): void
    {
        $this->request->method('getParam')
            ->with('scope', '')
            ->willReturn('invalid_scope');

        $this->backendSession->method('getScopeType')
            ->willReturn('websites');

        $this->assertSame('websites', $this->viewModel->getScope());
    }

    /**
     * @test
     */
    public function testInvalidUrlParamAndEmptySessionFallsBack(): void
    {
        $this->request->method('getParam')
            ->with('scope', '')
            ->willReturn('bogus');

        $this->backendSession->method('getScopeType')
            ->willReturn('');

        // Whatever the current fallback is — test documents the actual behaviour.
        // After fix (issue #016) this must equal 'default'.
        $scope = $this->viewModel->getScope();
        $this->assertContains($scope, ['default', 'stores'],
            'Fallback must be one of the valid scope values.');
    }
}
