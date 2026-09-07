<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use Magento\Framework\App\CacheInterface;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Serialize\SerializerInterface;
use Magento\Framework\View\DesignInterface;
use Magento\Store\Api\Data\GroupInterface;
use Magento\Store\Api\Data\StoreInterface;
use Magento\Store\Api\Data\WebsiteInterface;
use Magento\Store\Model\ScopeInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Theme\Model\ResourceModel\Theme\Collection as ThemeCollection;
use Magento\Theme\Model\ResourceModel\Theme\CollectionFactory as ThemeCollectionFactory;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Model\Data\Scope;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Test\Unit\Model\Utility\Stub\ThemeStub;

class ThemeResolverTest extends TestCase
{
    private ThemeResolver $resolver;
    private ScopeConfigInterface|MockObject $scopeConfig;
    private ThemeCollectionFactory|MockObject $themeCollectionFactory;
    private CacheInterface|MockObject $cache;
    private SerializerInterface|MockObject $serializer;
    private StoreManagerInterface|MockObject $storeManager;
    private LoggerInterface|MockObject $logger;

    protected function setUp(): void
    {
        $this->scopeConfig            = $this->createMock(ScopeConfigInterface::class);
        $this->themeCollectionFactory = $this->createMock(ThemeCollectionFactory::class);
        $this->cache                  = $this->createMock(CacheInterface::class);
        $this->serializer             = $this->createMock(SerializerInterface::class);
        $this->storeManager           = $this->createMock(StoreManagerInterface::class);
        $this->logger                 = $this->createMock(LoggerInterface::class);

        $this->resolver = new ThemeResolver(
            $this->scopeConfig,
            $this->themeCollectionFactory,
            $this->cache,
            $this->serializer,
            $this->storeManager,
            $this->logger
        );
    }

    // =========================================================================
    // getThemeIdByStoreId
    // =========================================================================

    public function testReturnsThemeIdForStore(): void
    {
        $this->scopeConfig->method('getValue')
            ->with(DesignInterface::XML_PATH_THEME_ID, ScopeInterface::SCOPE_STORE, 1)
            ->willReturn('5');

        $result = $this->resolver->getThemeIdByStoreId(1);

        $this->assertSame(5, $result);
    }

    public function testThrowsExceptionWhenThemeNotConfigured(): void
    {
        $this->scopeConfig->method('getValue')->willReturn(null);

        $this->expectException(LocalizedException::class);
        $this->resolver->getThemeIdByStoreId(99);
    }

    // =========================================================================
    // getThemeHierarchy — uses cache
    // =========================================================================

    public function testReturnsHierarchyFromCache(): void
    {
        $cached = [['theme_id' => 5, 'theme_code' => 'Magento/blank']];
        $this->cache->method('load')->willReturn('serialized');
        $this->serializer->method('unserialize')->willReturn($cached);

        $result = $this->resolver->getThemeHierarchy(5);

        $this->assertSame($cached, $result);
    }

    public function testBuildsHierarchyFromDbWhenCacheMisses(): void
    {
        $this->cache->method('load')->willReturn(false);
        $this->cache->expects($this->once())->method('save');
        $this->serializer->method('serialize')->willReturn('[]');

        $themeMock = $this->createMock(ThemeStub::class);
        $themeMock->method('getId')->willReturn(5);
        $themeMock->method('getCode')->willReturn('Vendor/theme');
        $themeMock->method('getThemeTitle')->willReturn('My Theme');
        $themeMock->method('getThemePath')->willReturn('vendor/theme');
        $themeMock->method('getParentId')->willReturn(null);

        $collection = $this->getMockBuilder(ThemeCollection::class)
            ->disableOriginalConstructor()
            ->getMock();
        $collection->method('getItemById')->willReturn($themeMock);

        $this->themeCollectionFactory->method('create')->willReturn($collection);

        $result = $this->resolver->getThemeHierarchy(5);

        $this->assertCount(1, $result);
        $this->assertSame(5, $result[0]['theme_id']);
    }

    // =========================================================================
    // getThemeInfo
    // =========================================================================

    public function testThrowsExceptionWhenThemeNotFound(): void
    {
        $collection = $this->getMockBuilder(ThemeCollection::class)
            ->disableOriginalConstructor()
            ->getMock();
        $collection->method('getItemById')->willReturn(null);
        $this->themeCollectionFactory->method('create')->willReturn($collection);

        $this->expectException(LocalizedException::class);
        $this->resolver->getThemeInfo(999);
    }

    public function testReturnsThemeInfoWhenFound(): void
    {
        $themeMock = $this->createMock(ThemeStub::class);
        $themeMock->method('getId')->willReturn(5);
        $themeMock->method('getCode')->willReturn('Vendor/theme');
        $themeMock->method('getThemeTitle')->willReturn('My Theme');
        $themeMock->method('getThemePath')->willReturn('vendor/theme');
        $themeMock->method('getParentId')->willReturn(null);

        $collection = $this->getMockBuilder(ThemeCollection::class)
            ->disableOriginalConstructor()
            ->getMock();
        $collection->method('getItemById')->willReturn($themeMock);
        $this->themeCollectionFactory->method('create')->willReturn($collection);

        $result = $this->resolver->getThemeInfo(5);

        $this->assertSame(5, $result['theme_id']);
        $this->assertSame('Vendor/theme', $result['theme_code']);
        $this->assertNull($result['parent_id']);
    }

    // =========================================================================
    // hasParentTheme / getParentThemeId
    // =========================================================================

    // =========================================================================
    // getThemeIdByScope — tests N–Q
    // =========================================================================

    /**
     * Test N: getThemeIdByScope for default scope reads from default config (no scope args).
     */
    public function testGetThemeIdByScopeForDefaultScope(): void
    {
        $this->scopeConfig->expects($this->once())
            ->method('getValue')
            ->with(DesignInterface::XML_PATH_THEME_ID)
            ->willReturn('5');

        $result = $this->resolver->getThemeIdByScope(new Scope('default', 0));

        $this->assertSame(5, $result);
    }

    /**
     * Test O: getThemeIdByScope for websites/1 reads from website scope.
     */
    public function testGetThemeIdByScopeForWebsiteScope(): void
    {
        $this->scopeConfig->expects($this->once())
            ->method('getValue')
            ->with(DesignInterface::XML_PATH_THEME_ID, ScopeInterface::SCOPE_WEBSITE, 1)
            ->willReturn('7');

        $result = $this->resolver->getThemeIdByScope(new Scope('websites', 1));

        $this->assertSame(7, $result);
    }

    /**
     * Test P: getThemeIdByScope for stores/3 reads from store scope.
     */
    public function testGetThemeIdByScopeForStoreScope(): void
    {
        $this->scopeConfig->expects($this->once())
            ->method('getValue')
            ->with(DesignInterface::XML_PATH_THEME_ID, ScopeInterface::SCOPE_STORE, 3)
            ->willReturn('9');

        $result = $this->resolver->getThemeIdByScope(new Scope('stores', 3));

        $this->assertSame(9, $result);
    }

    /**
     * Test Q: getThemeIdByScope throws LocalizedException when scopeConfig returns null.
     */
    public function testGetThemeIdByScopeThrowsWhenThemeNotConfigured(): void
    {
        $this->scopeConfig->method('getValue')->willReturn(null);

        $this->expectException(LocalizedException::class);
        $this->resolver->getThemeIdByScope(new Scope('stores', 99));
    }

    // =========================================================================
    // getThemeIdByScope — store-view fallback when the scope itself has no theme
    // =========================================================================

    /**
     * Default scope has no design/theme/theme_id row (theme assigned per store
     * view only). The theme comes from the store view the editor previews for
     * that scope — the default website's default store — and not from whichever
     * store view happens to come first.
     */
    public function testGetThemeIdByScopeForDefaultScopeUsesPreviewedStoreTheme(): void
    {
        $this->stubStoreThemes([1 => '9', 2 => '5']);
        $this->stubStores([
            $this->createStore(1),
            $this->createStore(2),
        ]);
        $this->stubDefaultStore(websiteId: 1, groupId: 1, storeId: 2);

        $this->assertSame(5, $this->resolver->getThemeIdByScope(new Scope('default', 0)));
    }

    /**
     * The previewed store view has no theme either — any other active store
     * view will do, but a disabled one must never be taken: its theme is not
     * rendered anywhere.
     */
    public function testGetThemeIdByScopeForDefaultScopeSkipsInactiveStoreViews(): void
    {
        $this->stubStoreThemes([2 => '24', 3 => '7']);
        $this->stubStores([
            $this->createStore(1),
            $this->createStore(2, isActive: false),
            $this->createStore(3),
        ]);
        $this->stubDefaultStore(websiteId: 1, groupId: 1, storeId: 1);

        $this->assertSame(7, $this->resolver->getThemeIdByScope(new Scope('default', 0)));
    }

    /**
     * The scope's default store view is switched off — the selector previews
     * the first active view instead, and so does the resolver.
     */
    public function testGetThemeIdByScopeSkipsInactiveDefaultStoreView(): void
    {
        $this->stubStoreThemes([1 => '24', 2 => '7']);
        $this->stubStores([
            $this->createStore(1, isActive: false),
            $this->createStore(2),
        ]);
        $this->stubDefaultStore(websiteId: 1, groupId: 1, storeId: 1);

        $this->assertSame(7, $this->resolver->getThemeIdByScope(new Scope('default', 0)));
    }

    /**
     * A website whose store views are all switched off has nothing to preview
     * and nothing to fall back to.
     */
    public function testGetThemeIdByScopeForWebsiteWithoutActiveStoresThrows(): void
    {
        $this->stubStoreThemes([4 => '20']);
        $this->stubStores([$this->createStore(4, websiteId: 2, isActive: false)]);
        $this->stubDefaultStore(websiteId: 2, groupId: 2, storeId: 4);

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage('No theme is assigned to website ID 2');
        $this->resolver->getThemeIdByScope(new Scope('websites', 2));
    }

    /**
     * Website scope inherits nothing (no default row) — the website's own
     * default store view provides the theme, and store views of other websites
     * are out of scope.
     */
    public function testGetThemeIdByScopeForWebsiteScopeUsesItsDefaultStoreTheme(): void
    {
        $this->stubStoreThemes([4 => '20', 5 => '7', 6 => '11']);
        $this->stubStores([
            $this->createStore(4, websiteId: 2),
            $this->createStore(5, websiteId: 2),
            $this->createStore(6, websiteId: 3),
        ]);
        $this->stubDefaultStore(websiteId: 2, groupId: 2, storeId: 5);

        $this->assertSame(7, $this->resolver->getThemeIdByScope(new Scope('websites', 2)));
    }

    /**
     * Nothing anywhere has a theme: the message must name the cause and the fix,
     * not just the scope that failed.
     */
    public function testGetThemeIdByScopeForDefaultScopeThrowsActionableMessage(): void
    {
        $this->scopeConfig->method('getValue')->willReturn(null);
        $this->stubStores([$this->createStore(1)]);
        $this->stubDefaultStore(websiteId: 1, groupId: 1, storeId: 1);

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage(
            'No theme is assigned to the Default Config scope, and no store view has one either. '
            . 'Assign a theme in Content > Design > Configuration, then flush the configuration cache.'
        );
        $this->resolver->getThemeIdByScope(new Scope('default', 0));
    }

    /**
     * Store scope has no fallback — it inherits the default scope already — and
     * its failure names the store view and the fix.
     */
    public function testGetThemeIdByScopeForStoreScopeThrowsActionableMessage(): void
    {
        $this->scopeConfig->method('getValue')->willReturn(null);
        $this->storeManager->expects($this->never())->method('getStores');

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage(
            'No theme is assigned to store view ID 99, nor to the Default Config scope. '
            . 'Assign a theme in Content > Design > Configuration, then flush the configuration cache.'
        );
        $this->resolver->getThemeIdByScope(new Scope('stores', 99));
    }

    /**
     * A scope pointing at a website that no longer exists is an expected input,
     * not an infrastructure fault — no log entry, just the message.
     */
    public function testGetThemeIdByScopeForMissingWebsiteDoesNotLog(): void
    {
        $this->scopeConfig->method('getValue')->willReturn(null);
        $this->stubStores([$this->createStore(1)]);
        $this->storeManager->method('getWebsite')
            ->willThrowException(new NoSuchEntityException(__('No such entity.')));
        $this->logger->expects($this->never())->method('warning');

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage('No theme is assigned to website ID 7');
        $this->resolver->getThemeIdByScope(new Scope('websites', 7));
    }

    /**
     * An infrastructure failure must not be silently reported as a missing
     * theme assignment: the real cause is logged.
     */
    public function testGetThemeIdByScopeLogsStoreLookupFailure(): void
    {
        $this->scopeConfig->method('getValue')->willReturn(null);
        $this->stubDefaultStore(websiteId: 1, groupId: 1, storeId: 1);
        $this->storeManager->method('getStores')
            ->willThrowException(new \RuntimeException('SQLSTATE[HY000]: connection lost'));
        $this->logger->expects($this->once())
            ->method('warning')
            ->with($this->stringContains('connection lost'), $this->anything());

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage('Assign a theme in Content > Design > Configuration');
        $this->resolver->getThemeIdByScope(new Scope('default', 0));
    }

    // =========================================================================
    // hasParentTheme / getParentThemeId
    // =========================================================================

    public function testHasParentThemeReturnsTrueWhenParentExists(): void
    {
        $themeMock = $this->createMock(ThemeStub::class);
        $themeMock->method('getId')->willReturn(5);
        $themeMock->method('getParentId')->willReturn(3);

        $collection = $this->getMockBuilder(ThemeCollection::class)
            ->disableOriginalConstructor()
            ->getMock();
        $collection->method('getItemById')->willReturn($themeMock);
        $this->themeCollectionFactory->method('create')->willReturn($collection);

        $this->assertTrue($this->resolver->hasParentTheme(5));
    }

    /**
     * design/theme/theme_id is set for the listed store views only — every
     * other scope (default, website, other store views) reads back empty.
     *
     * @param array<int, string> $themeIdByStoreId
     */
    private function stubStoreThemes(array $themeIdByStoreId): void
    {
        $this->scopeConfig->method('getValue')
            ->willReturnCallback(
                function ($path, $scopeType = 'default', $scopeCode = null) use ($themeIdByStoreId) {
                    if ($path !== DesignInterface::XML_PATH_THEME_ID
                        || $scopeType !== ScopeInterface::SCOPE_STORE
                    ) {
                        return null;
                    }

                    return $themeIdByStoreId[(int)$scopeCode] ?? null;
                }
            );
    }

    /**
     * @param array<int, StoreInterface|MockObject> $stores
     */
    private function stubStores(array $stores): void
    {
        $this->storeManager->method('getStores')->willReturn($stores);
    }

    /**
     * The website's default group points at $storeId — the store view the
     * scope selector previews for that scope.
     */
    private function stubDefaultStore(int $websiteId, int $groupId, int $storeId): void
    {
        $website = $this->createMock(WebsiteInterface::class);
        $website->method('getId')->willReturn($websiteId);
        $website->method('getDefaultGroupId')->willReturn($groupId);
        $this->storeManager->method('getWebsite')->willReturn($website);

        $group = $this->createMock(GroupInterface::class);
        $group->method('getDefaultStoreId')->willReturn($storeId);
        $this->storeManager->method('getGroups')->willReturn([$groupId => $group]);
    }

    private function createStore(
        int $storeId,
        int $websiteId = 1,
        bool $isActive = true
    ): StoreInterface|MockObject {
        $store = $this->createMock(StoreInterface::class);
        $store->method('getId')->willReturn($storeId);
        $store->method('getWebsiteId')->willReturn($websiteId);
        $store->method('getIsActive')->willReturn($isActive);

        return $store;
    }
}
