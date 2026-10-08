<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\View\Helper;

use Magento\Framework\App\DeploymentConfig;
use Magento\Framework\App\Response\Http as HttpResponse;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Store\Model\Store;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\PreviewToken;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\View\Helper\BreezeThemeEditor;

class BreezeThemeEditorTest extends TestCase
{
    private StoreManagerInterface $storeManager;
    private ThemeResolver $themeResolver;
    private ScopeFactory $scopeFactory;
    private ValueInheritanceResolver $valueInheritanceResolver;
    private ConfigProvider $configProvider;
    private StatusProvider $statusProvider;
    private PreviewToken $previewToken;
    private HttpResponse $response;
    private BreezeThemeEditor $helper;

    protected function setUp(): void
    {
        $this->storeManager             = $this->createMock(StoreManagerInterface::class);
        $this->themeResolver            = $this->createMock(ThemeResolver::class);
        $this->scopeFactory             = $this->createMock(ScopeFactory::class);
        $this->valueInheritanceResolver = $this->createMock(ValueInheritanceResolver::class);
        $this->configProvider           = $this->createMock(ConfigProvider::class);
        $this->statusProvider           = $this->createMock(StatusProvider::class);

        $deploymentConfig = $this->createMock(DeploymentConfig::class);
        $deploymentConfig->method('get')->with('crypt/key')->willReturn('test-crypt-key');
        $this->previewToken = new PreviewToken($deploymentConfig);
        $this->response     = $this->createMock(HttpResponse::class);

        $this->helper = new BreezeThemeEditor(
            $this->storeManager,
            $this->themeResolver,
            $this->scopeFactory,
            $this->valueInheritanceResolver,
            $this->configProvider,
            $this->statusProvider,
            $this->previewToken,
            $this->response
        );
    }

    // -------------------------------------------------------------------------
    // get() — happy path: value exists in DB
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testGetReturnsValueFromDb(): void
    {
        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')
            ->with(StatusCode::PUBLISHED)
            ->willReturn(2);

        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => 'fullwidth', 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => 0]);

        $this->assertSame('fullwidth', $this->helper->get('hero/layout'));
    }

    // -------------------------------------------------------------------------
    // get() — fallback to default from settings.json
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testGetReturnsDefaultWhenNotInDb(): void
    {
        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')->willReturn(2);

        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => 'contained', 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => -1]);

        $this->assertSame('contained', $this->helper->get('hero/layout'));
    }

    // -------------------------------------------------------------------------
    // get() — null when not in DB and no default
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testGetReturnsNullWhenNeitherDbNorDefault(): void
    {
        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')->willReturn(2);

        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => null, 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => -1]);

        $this->assertNull($this->helper->get('hero/layout'));
    }

    // -------------------------------------------------------------------------
    // is() — true when value matches
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testIsReturnsTrueWhenValueMatches(): void
    {
        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')->willReturn(2);

        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => 'fullwidth', 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => 0]);

        $this->assertTrue($this->helper->is('hero/layout', 'fullwidth'));
    }

    // -------------------------------------------------------------------------
    // is() — false when value does not match
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testIsReturnsFalseWhenValueDoesNotMatch(): void
    {
        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')->willReturn(2);

        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => 'contained', 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => 0]);

        $this->assertFalse($this->helper->is('hero/layout', 'fullwidth'));
    }

    // -------------------------------------------------------------------------
    // get() — in-memory cache: resolver called only once per path
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testGetUsesInMemoryCacheOnSecondCall(): void
    {
        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')->willReturn(2);

        $this->valueInheritanceResolver->expects($this->once())
            ->method('resolveSingleValue')
            ->willReturn(['value' => 'sticky', 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => 0]);

        $this->helper->get('header/style');
        $result = $this->helper->get('header/style'); // second call — must hit cache

        $this->assertSame('sticky', $result);
    }

    // -------------------------------------------------------------------------
    // get() — invalid path (no slash) returns null, no DB call
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testGetReturnsNullForPathWithoutSlash(): void
    {
        $this->valueInheritanceResolver->expects($this->never())->method('resolveSingleValue');

        $this->assertNull($this->helper->get('noslash'));
    }

    // -------------------------------------------------------------------------
    // get() — exception during resolve returns null, does not propagate
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testGetReturnsNullWhenExceptionThrown(): void
    {
        $store = $this->createMock(Store::class);
        $store->method('getId')->willReturn(1);
        $this->storeManager->method('getStore')->willReturn($store);

        $this->themeResolver->method('getThemeIdByStoreId')
            ->willThrowException(new \RuntimeException('Theme not found'));

        $this->assertNull($this->helper->get('hero/layout'));
    }

    // -------------------------------------------------------------------------
    // get() — bte_php_preview cookie override (PHP live preview)
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testGetReturnsCookieOverrideWithoutDbCall(): void
    {
        $this->signIn();
        $_COOKIE['bte_php_preview'] = urlencode(json_encode(['php_test/toggle_flag' => 'true']));

        // DB must NOT be called — cookie takes priority
        $this->valueInheritanceResolver->expects($this->never())->method('resolveSingleValue');

        $result = $this->helper->get('php_test/toggle_flag');

        $this->assertSame('true', $result);

        unset($_COOKIE['bte_php_preview'], $_COOKIE[PreviewToken::COOKIE_NAME]);
    }

    /**
     * @test
     */
    public function testCookieOverrideIsCachedOnSecondCall(): void
    {
        $this->signIn();
        $_COOKIE['bte_php_preview'] = urlencode(json_encode(['php_test/select_layout' => 'list']));

        $this->valueInheritanceResolver->expects($this->never())->method('resolveSingleValue');

        $this->helper->get('php_test/select_layout'); // warms cache
        $result = $this->helper->get('php_test/select_layout'); // must hit in-memory cache

        $this->assertSame('list', $result);

        unset($_COOKIE['bte_php_preview'], $_COOKIE[PreviewToken::COOKIE_NAME]);
    }

    /**
     * @test
     */
    public function testMalformedCookieFallsBackToDb(): void
    {
        $this->signIn();
        $_COOKIE['bte_php_preview'] = 'not-valid-json!!!';

        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')->willReturn(2);
        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => 'grid', 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => 0]);

        $result = $this->helper->get('php_test/select_layout');

        $this->assertSame('grid', $result);

        unset($_COOKIE['bte_php_preview'], $_COOKIE[PreviewToken::COOKIE_NAME]);
    }

    /**
     * @test
     */
    public function testCookiePathNotInOverrideFallsBackToDb(): void
    {
        // Cookie exists but does not contain the requested path
        $this->signIn();
        $_COOKIE['bte_php_preview'] = urlencode(json_encode(['php_test/other_field' => 'foo']));

        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')->willReturn(2);
        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => 'hello', 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => 0]);

        $result = $this->helper->get('php_test/text_value');

        $this->assertSame('hello', $result);

        unset($_COOKIE['bte_php_preview'], $_COOKIE[PreviewToken::COOKIE_NAME]);
    }

    /**
     * @test
     */
    public function testCookieOverrideKeepsTheResponseOutOfTheCache(): void
    {
        $this->signIn();
        $_COOKIE['bte_php_preview'] = urlencode(json_encode(['php_test/toggle_flag' => 'true']));

        $this->response->expects($this->once())->method('setNoCacheHeaders');

        $this->helper->get('php_test/toggle_flag');

        unset($_COOKIE['bte_php_preview'], $_COOKIE[PreviewToken::COOKIE_NAME]);
    }

    public static function untrustedTokenProvider(): array
    {
        return [
            'no token cookie' => [null],
            'garbage'         => ['garbage'],
            'forged signature' => [(time() + 3600) . '.1.' . str_repeat('a', 64)],
            'expired'         => ['1.1.' . str_repeat('a', 64)],
        ];
    }

    /**
     * A visitor must not be able to override published values (and poison the full page cache).
     *
     * @test
     */
    #[DataProvider('untrustedTokenProvider')]
    public function testCookieOverrideIgnoredWithoutValidToken(?string $token): void
    {
        $_COOKIE['bte_php_preview'] = urlencode(json_encode(['php_test/text_value' => '<img src=x onerror=alert(1)>']));
        if ($token !== null) {
            $_COOKIE[PreviewToken::COOKIE_NAME] = $token;
        }

        $this->setupStore(1, 42);
        $this->statusProvider->method('getStatusId')->willReturn(2);
        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => 'hello', 'isInherited' => false, 'inheritedFrom' => null, 'inheritanceLevel' => 0]);
        $this->response->expects($this->never())->method('setNoCacheHeaders');

        $this->assertSame('hello', $this->helper->get('php_test/text_value'));

        unset($_COOKIE['bte_php_preview'], $_COOKIE[PreviewToken::COOKIE_NAME]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function signIn(): void
    {
        $_COOKIE[PreviewToken::COOKIE_NAME] = $this->previewToken->generate(1);
    }

    private function setupStore(int $storeId, int $themeId): void
    {
        $store = $this->createMock(Store::class);
        $store->method('getId')->willReturn($storeId);
        $this->storeManager->method('getStore')->willReturn($store);

        $this->themeResolver->method('getThemeIdByStoreId')
            ->with($storeId)
            ->willReturn($themeId);

        $scope = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')
            ->with('stores', $storeId)
            ->willReturn($scope);
    }
}
