<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use Magento\Framework\App\CacheInterface;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Serialize\SerializerInterface;
use Magento\Framework\View\DesignInterface;
use Magento\Store\Model\ScopeInterface;
use Magento\Theme\Model\ResourceModel\Theme\Collection as ThemeCollection;
use Magento\Theme\Model\ResourceModel\Theme\CollectionFactory as ThemeCollectionFactory;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Data\Scope;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

class ThemeResolverTest extends TestCase
{
    private ThemeResolver $resolver;
    private ScopeConfigInterface|MockObject $scopeConfig;
    private ThemeCollectionFactory|MockObject $themeCollectionFactory;
    private CacheInterface|MockObject $cache;
    private SerializerInterface|MockObject $serializer;

    protected function setUp(): void
    {
        $this->scopeConfig            = $this->createMock(ScopeConfigInterface::class);
        $this->themeCollectionFactory = $this->createMock(ThemeCollectionFactory::class);
        $this->cache                  = $this->createMock(CacheInterface::class);
        $this->serializer             = $this->createMock(SerializerInterface::class);

        $this->resolver = new ThemeResolver(
            $this->scopeConfig,
            $this->themeCollectionFactory,
            $this->cache,
            $this->serializer
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

        $themeMock = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['getId', 'getCode', 'getThemeTitle', 'getThemePath', 'getParentId'])
            ->getMock();
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
        $themeMock = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['getId', 'getCode', 'getThemeTitle', 'getThemePath', 'getParentId'])
            ->getMock();
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
    // hasParentTheme / getParentThemeId
    // =========================================================================

    public function testHasParentThemeReturnsTrueWhenParentExists(): void
    {
        $themeMock = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['getId', 'getParentId'])
            ->getMock();
        $themeMock->method('getId')->willReturn(5);
        $themeMock->method('getParentId')->willReturn(3);

        $collection = $this->getMockBuilder(ThemeCollection::class)
            ->disableOriginalConstructor()
            ->getMock();
        $collection->method('getItemById')->willReturn($themeMock);
        $this->themeCollectionFactory->method('create')->willReturn($collection);

        $this->assertTrue($this->resolver->hasParentTheme(5));
    }
}
