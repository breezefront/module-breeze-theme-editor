<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Controller\Adminhtml\Editor;

use Magento\Backend\App\Action\Context;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\View\Result\PageFactory;
use Magento\Store\Model\Store;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor\AbstractEditor;
use Swissup\BreezeThemeEditor\Model\Session\BackendSession;

/**
 * Unit tests for AbstractEditor::getStoreId()
 *
 * Verifies that setCurrentStore() is called with the correct store code
 * in each priority branch (URL param → cookie → default store view),
 * so that downstream classes (AdminPageUrlProvider, StoreDataProvider, etc.)
 * receive the correct store context via getStore().
 */
class AbstractEditorTest extends TestCase
{
    private StoreManagerInterface|MockObject $storeManager;
    private RequestInterface|MockObject $request;
    private BackendSession|MockObject $backendSession;
    private LoggerInterface|MockObject $logger;

    /** @var AbstractEditor */
    private $controller;

    protected function setUp(): void
    {
        $this->storeManager   = $this->createMock(StoreManagerInterface::class);
        $this->request        = $this->createMock(RequestInterface::class);
        $this->backendSession = $this->createMock(BackendSession::class);
        $this->logger         = $this->createMock(LoggerInterface::class);

        $context = $this->createMock(Context::class);
        $context->method('getRequest')->willReturn($this->request);

        $resultPageFactory = $this->createMock(PageFactory::class);
        $scopeConfig       = $this->createMock(ScopeConfigInterface::class);

        // Concrete anonymous subclass — AbstractEditor is abstract
        $this->controller = new class(
            $context,
            $resultPageFactory,
            $this->storeManager,
            $scopeConfig,
            $this->backendSession,
            $this->logger
        ) extends AbstractEditor {
            public function execute()
            {
                return null;
            }

            /** Expose protected method for testing */
            public function getStoreIdPublic(): int
            {
                return $this->getStoreId();
            }
        };
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function makeStore(int $id, string $code): Store|MockObject
    {
        $store = $this->createMock(Store::class);
        $store->method('getId')->willReturn($id);
        $store->method('getCode')->willReturn($code);
        return $store;
    }

    // =========================================================================
    // Priority 1: URL parameter ?store=X
    // =========================================================================

    /** @test */
    public function testGetStoreIdFromUrlParamCallsSetCurrentStore(): void
    {
        $store = $this->makeStore(6, 'breezeenterprise');

        $this->request->method('getParam')
            ->with('store', 0)
            ->willReturn(6);

        $this->storeManager->method('getStore')
            ->with(6)
            ->willReturn($store);

        $this->storeManager->expects($this->once())
            ->method('setCurrentStore')
            ->with('breezeenterprise');

        $this->backendSession->expects($this->once())
            ->method('setStoreId')
            ->with(6);

        $result = $this->controller->getStoreIdPublic();

        $this->assertSame(6, $result);
    }

    // =========================================================================
    // Priority 2: cookie (BackendSession)
    // =========================================================================

    /** @test */
    public function testGetStoreIdFromCookieCallsSetCurrentStore(): void
    {
        $store = $this->makeStore(6, 'breezeenterprise');

        // No URL param
        $this->request->method('getParam')
            ->with('store', 0)
            ->willReturn(0);

        // Cookie has store ID
        $this->backendSession->method('getStoreId')->willReturn(6);

        $this->storeManager->method('getStore')
            ->with(6)
            ->willReturn($store);

        $this->storeManager->expects($this->once())
            ->method('setCurrentStore')
            ->with('breezeenterprise');

        $result = $this->controller->getStoreIdPublic();

        $this->assertSame(6, $result);
    }

    // =========================================================================
    // Priority 3: default store view fallback
    // =========================================================================

    /** @test */
    public function testGetStoreIdFromDefaultStoreViewCallsSetCurrentStore(): void
    {
        $defaultStore = $this->makeStore(6, 'breezeenterprise');

        // No URL param
        $this->request->method('getParam')
            ->with('store', 0)
            ->willReturn(0);

        // No cookie
        $this->backendSession->method('getStoreId')->willReturn(null);

        $this->storeManager->method('getDefaultStoreView')
            ->willReturn($defaultStore);

        $this->storeManager->expects($this->once())
            ->method('setCurrentStore')
            ->with('breezeenterprise');

        $result = $this->controller->getStoreIdPublic();

        $this->assertSame(6, $result);
    }

    // =========================================================================
    // setCurrentStore is always called — even on fallback
    // =========================================================================

    /** @test */
    public function testSetCurrentStoreIsCalledExactlyOncePerRequest(): void
    {
        $store = $this->makeStore(6, 'breezeenterprise');

        $this->request->method('getParam')
            ->with('store', 0)
            ->willReturn(6);

        $this->storeManager->method('getStore')
            ->with(6)
            ->willReturn($store);

        // Must be called exactly once — not zero times, not twice
        $this->storeManager->expects($this->exactly(1))
            ->method('setCurrentStore');

        $this->controller->getStoreIdPublic();
    }
}
