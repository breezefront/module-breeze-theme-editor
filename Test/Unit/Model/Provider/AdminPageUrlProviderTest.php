<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider;

use Magento\Catalog\Model\CategoryFactory;
use Magento\Catalog\Model\ProductFactory;
use Magento\CatalogUrlRewrite\Model\CategoryUrlRewriteGenerator;
use Magento\CatalogUrlRewrite\Model\ProductUrlRewriteGenerator;
use Magento\Cms\Model\PageFactory;
use Magento\Framework\Url as FrontendUrlBuilder;
use Magento\Framework\UrlInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\UrlRewrite\Model\UrlFinderInterface;
use Magento\UrlRewrite\Service\V1\Data\UrlRewrite;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Provider\AdminPageUrlProvider;

/**
 * Unit tests for AdminPageUrlProvider
 *
 * Covers:
 * - getCategoryUrl() cascading fallback strategy (children_count → level → any active)
 * - getCategoryUrl() urlFinder lookup for correct frontend URL
 * - getCategoryUrl() hard fallback when all attempts fail
 */
class AdminPageUrlProviderTest extends TestCase
{
    private UrlInterface|MockObject $urlBuilder;
    private CategoryFactory|MockObject $categoryFactory;
    private ProductFactory|MockObject $productFactory;
    private PageFactory|MockObject $pageFactory;
    private StoreManagerInterface|MockObject $storeManager;
    private FrontendUrlBuilder|MockObject $frontendUrlBuilder;
    private UrlFinderInterface|MockObject $urlFinder;
    private AdminPageUrlProvider $provider;

    protected function setUp(): void
    {
        $this->urlBuilder         = $this->createMock(UrlInterface::class);
        $this->categoryFactory    = $this->createMock(CategoryFactory::class);
        $this->productFactory     = $this->createMock(ProductFactory::class);
        $this->pageFactory        = $this->createMock(PageFactory::class);
        $this->storeManager       = $this->createMock(StoreManagerInterface::class);
        $this->frontendUrlBuilder = $this->getMockBuilder(FrontendUrlBuilder::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['setScope', 'getDirectUrl', 'getUrl'])
            ->getMock();
        $this->urlFinder          = $this->createMock(UrlFinderInterface::class);

        $storeMock = $this->createMock(\Magento\Store\Model\Store::class);
        $storeMock->method('getId')->willReturn(1);
        $this->storeManager->method('getStore')->willReturn($storeMock);

        $this->provider = new AdminPageUrlProvider(
            $this->urlBuilder,
            $this->categoryFactory,
            $this->productFactory,
            $this->pageFactory,
            $this->storeManager,
            $this->frontendUrlBuilder,
            $this->urlFinder
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Build a fluent category collection stub that returns $firstItem.
     */
    private function makeCategoryCollectionMock(MockObject $firstItem): MockObject
    {
        $collection = $this->getMockBuilder(\Magento\Catalog\Model\ResourceModel\Category\Collection::class)
            ->disableOriginalConstructor()
            ->onlyMethods([
                'setStoreId',
                'addAttributeToSelect',
                'addAttributeToFilter',
                'setOrder',
                'setPageSize',
                'getFirstItem',
            ])
            ->getMock();

        $collection->method('setStoreId')->willReturnSelf();
        $collection->method('addAttributeToSelect')->willReturnSelf();
        $collection->method('addAttributeToFilter')->willReturnSelf();
        $collection->method('setOrder')->willReturnSelf();
        $collection->method('setPageSize')->willReturnSelf();
        $collection->method('getFirstItem')->willReturn($firstItem);

        return $collection;
    }

    /**
     * Build a URL rewrite stub with a given request_path.
     */
    private function makeRewriteMock(string $requestPath): MockObject
    {
        $rewrite = $this->createMock(UrlRewrite::class);
        $rewrite->method('getRequestPath')->willReturn($requestPath);
        return $rewrite;
    }

    // =========================================================================
    // getCategoryUrl()
    // =========================================================================

    /**
     * Level 1 (ideal): first attempt (children_count > 0) returns a category
     * and urlFinder finds a rewrite → returns the frontend URL.
     *
     * @test
     */
    public function testGetCategoryUrlUsesUrlRewriteOnFirstAttempt(): void
    {
        $category = $this->createMock(\Magento\Catalog\Model\Category::class);
        $category->method('getId')->willReturn(5);

        $categoryModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $categoryModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($category)
        );
        $this->categoryFactory->method('create')->willReturn($categoryModel);

        $this->urlFinder->method('findOneByData')->willReturn(
            $this->makeRewriteMock('headphones.html')
        );

        $this->frontendUrlBuilder->method('setScope')->with(1);
        $this->frontendUrlBuilder->method('getDirectUrl')
            ->with('headphones.html')
            ->willReturn('https://example.com/headphones.html');

        $this->assertSame('https://example.com/headphones.html', $this->provider->getCategoryUrl());
    }

    /**
     * Level 2 fallback: first attempt (children_count > 0) returns empty,
     * second attempt (level > 1) returns a leaf category with a valid rewrite.
     *
     * @test
     */
    public function testGetCategoryUrlFallsBackToLeafCategory(): void
    {
        $empty = $this->createMock(\Magento\Catalog\Model\Category::class);
        $empty->method('getId')->willReturn(null);

        $leaf = $this->createMock(\Magento\Catalog\Model\Category::class);
        $leaf->method('getId')->willReturn(7);

        $emptyModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $emptyModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($empty)
        );

        $leafModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $leafModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($leaf)
        );

        // attempt 1 → empty, attempt 2 → leaf
        $this->categoryFactory->expects($this->exactly(2))
            ->method('create')
            ->willReturnOnConsecutiveCalls($emptyModel, $leafModel);

        $this->urlFinder->method('findOneByData')->willReturn(
            $this->makeRewriteMock('speakers.html')
        );

        $this->frontendUrlBuilder->method('getDirectUrl')
            ->with('speakers.html')
            ->willReturn('https://example.com/speakers.html');

        $this->assertSame('https://example.com/speakers.html', $this->provider->getCategoryUrl());
    }

    /**
     * Level 3 fallback: first two attempts return empty,
     * third attempt (any active category) returns a result with a valid rewrite.
     *
     * @test
     */
    public function testGetCategoryUrlFallsBackToAnyActiveCategory(): void
    {
        $empty = $this->createMock(\Magento\Catalog\Model\Category::class);
        $empty->method('getId')->willReturn(null);

        $anyCategory = $this->createMock(\Magento\Catalog\Model\Category::class);
        $anyCategory->method('getId')->willReturn(3);

        $emptyModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $emptyModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($empty)
        );

        $anyModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $anyModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($anyCategory)
        );

        // attempt 1 → empty, attempt 2 → empty, attempt 3 → found
        $this->categoryFactory->expects($this->exactly(3))
            ->method('create')
            ->willReturnOnConsecutiveCalls($emptyModel, $emptyModel, $anyModel);

        $this->urlFinder->method('findOneByData')->willReturn(
            $this->makeRewriteMock('root-category.html')
        );

        $this->frontendUrlBuilder->method('getDirectUrl')
            ->with('root-category.html')
            ->willReturn('https://example.com/root-category.html');

        $this->assertSame('https://example.com/root-category.html', $this->provider->getCategoryUrl());
    }

    /**
     * Hard fallback: all three attempts return empty → falls back to buildUrl()
     * which uses frontendUrlBuilder (AdminPageUrlProvider overrides buildUrl).
     *
     * @test
     */
    public function testGetCategoryUrlHardFallbackWhenNoCategoryFound(): void
    {
        $empty = $this->createMock(\Magento\Catalog\Model\Category::class);
        $empty->method('getId')->willReturn(null);

        $emptyModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $emptyModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($empty)
        );

        // create() called 3 times, all return empty
        $this->categoryFactory->expects($this->exactly(3))
            ->method('create')
            ->willReturn($emptyModel);

        $storeMock = $this->createMock(\Magento\Store\Model\Store::class);
        $storeMock->method('getId')->willReturn(1);
        $storeMock->method('getBaseUrl')->willReturn('https://example.com/');
        $this->storeManager->method('getStore')->willReturn($storeMock);

        $this->frontendUrlBuilder->method('setScope');
        $this->frontendUrlBuilder->method('getUrl')
            ->willReturn('https://example.com/catalog/category/view/id/2/');

        $this->assertSame(
            'https://example.com/catalog/category/view/id/2/',
            $this->provider->getCategoryUrl()
        );
    }

    /**
     * Category found but no URL rewrite exists → falls back to buildUrl().
     *
     * @test
     */
    public function testGetCategoryUrlFallsBackWhenNoRewriteFound(): void
    {
        $category = $this->createMock(\Magento\Catalog\Model\Category::class);
        $category->method('getId')->willReturn(5);

        $categoryModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $categoryModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($category)
        );
        $this->categoryFactory->method('create')->willReturn($categoryModel);

        // urlFinder returns null → no rewrite found
        $this->urlFinder->method('findOneByData')->willReturn(null);

        $this->frontendUrlBuilder->method('setScope');
        $this->frontendUrlBuilder->method('getUrl')
            ->willReturn('https://example.com/catalog/category/view/id/2/');

        $this->assertSame(
            'https://example.com/catalog/category/view/id/2/',
            $this->provider->getCategoryUrl()
        );
    }
}
