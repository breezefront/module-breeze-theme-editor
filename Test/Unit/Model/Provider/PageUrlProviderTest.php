<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider;

use Magento\Catalog\Model\CategoryFactory;
use Magento\Catalog\Model\ProductFactory;
use Magento\Cms\Model\PageFactory;
use Magento\Framework\UrlInterface;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Provider\PageUrlProvider;

/**
 * Unit tests for PageUrlProvider
 *
 * Covers: getCategoryUrl() and getProductUrl() URL-rewrite fixes (commit 9f8c7d9).
 * Verifies that $category->getUrl() and $product->getUrlModel()->getUrl($product)
 * are used instead of internal catalog/category/view and catalog/product/view routes.
 */
class PageUrlProviderTest extends TestCase
{
    private UrlInterface|MockObject $urlBuilder;
    private CategoryFactory|MockObject $categoryFactory;
    private ProductFactory|MockObject $productFactory;
    private PageFactory|MockObject $pageFactory;
    private StoreManagerInterface|MockObject $storeManager;
    private PageUrlProvider $provider;

    protected function setUp(): void
    {
        $this->urlBuilder      = $this->createMock(UrlInterface::class);
        $this->categoryFactory = $this->createMock(CategoryFactory::class);
        $this->productFactory  = $this->createMock(ProductFactory::class);
        $this->pageFactory     = $this->createMock(PageFactory::class);
        $this->storeManager    = $this->createMock(StoreManagerInterface::class);

        $storeMock = $this->createMock(\Magento\Store\Model\Store::class);
        $storeMock->method('getId')->willReturn(1);
        $this->storeManager->method('getStore')->willReturn($storeMock);

        $this->provider = new PageUrlProvider(
            $this->urlBuilder,
            $this->categoryFactory,
            $this->productFactory,
            $this->pageFactory,
            $this->storeManager
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Build a fluent collection stub that returns $firstItem from getFirstItem().
     * All chained methods (setStoreId, addAttributeToSelect, addAttributeToFilter,
     * setOrder, setPageSize) return $this so the chain works.
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
     * Build a fluent product collection stub.
     */
    private function makeProductCollectionMock(MockObject $firstItem): MockObject
    {
        $collection = $this->getMockBuilder(\Magento\Catalog\Model\ResourceModel\Product\Collection::class)
            ->disableOriginalConstructor()
            ->onlyMethods([
                'setStoreId',
                'addAttributeToSelect',
                'addAttributeToFilter',
                'setPageSize',
                'getFirstItem',
            ])
            ->getMock();

        $collection->method('setStoreId')->willReturnSelf();
        $collection->method('addAttributeToSelect')->willReturnSelf();
        $collection->method('addAttributeToFilter')->willReturnSelf();
        $collection->method('setPageSize')->willReturnSelf();
        $collection->method('getFirstItem')->willReturn($firstItem);

        return $collection;
    }

    // =========================================================================
    // getCategoryUrl()
    // =========================================================================

    /** @test */
    public function testGetCategoryUrlUsesCategoryGetUrl(): void
    {
        $category = $this->createMock(\Magento\Catalog\Model\Category::class);
        $category->method('getId')->willReturn(5);
        $category->method('getUrl')->willReturn('https://example.com/headphones.html');

        $categoryModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $categoryModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($category)
        );
        $this->categoryFactory->method('create')->willReturn($categoryModel);

        $this->assertSame('https://example.com/headphones.html', $this->provider->getCategoryUrl());
    }

    /** @test */
    public function testGetCategoryUrlFallsBackWhenNoCategoryFound(): void
    {
        // Category with no ID → fallback
        $category = $this->createMock(\Magento\Catalog\Model\Category::class);
        $category->method('getId')->willReturn(null);

        $categoryModel = $this->createMock(\Magento\Catalog\Model\Category::class);
        $categoryModel->method('getCollection')->willReturn(
            $this->makeCategoryCollectionMock($category)
        );
        $this->categoryFactory->method('create')->willReturn($categoryModel);

        $this->urlBuilder->method('getUrl')
            ->with('catalog/category/view', ['id' => 2])
            ->willReturn('https://example.com/catalog/category/view/id/2/');

        $this->assertSame(
            'https://example.com/catalog/category/view/id/2/',
            $this->provider->getCategoryUrl()
        );
    }

    // =========================================================================
    // getProductUrl()
    // =========================================================================

    /** @test */
    public function testGetProductUrlUsesUrlModel(): void
    {
        $product = $this->createMock(\Magento\Catalog\Model\Product::class);
        $product->method('getId')->willReturn(10);

        $urlModel = $this->createMock(\Magento\Catalog\Model\Product\Url::class);
        $urlModel->method('getUrl')->with($product)->willReturn('https://example.com/widget.html');

        $product->method('getUrlModel')->willReturn($urlModel);

        $productModel = $this->createMock(\Magento\Catalog\Model\Product::class);
        $productModel->method('getCollection')->willReturn(
            $this->makeProductCollectionMock($product)
        );
        $this->productFactory->method('create')->willReturn($productModel);

        $this->assertSame('https://example.com/widget.html', $this->provider->getProductUrl());
    }

    /** @test */
    public function testGetProductUrlFallsBackWhenNoProductFound(): void
    {
        $product = $this->createMock(\Magento\Catalog\Model\Product::class);
        $product->method('getId')->willReturn(null);

        $productModel = $this->createMock(\Magento\Catalog\Model\Product::class);
        $productModel->method('getCollection')->willReturn(
            $this->makeProductCollectionMock($product)
        );
        $this->productFactory->method('create')->willReturn($productModel);

        $this->urlBuilder->method('getUrl')
            ->with('catalog/product/view', ['id' => 1])
            ->willReturn('https://example.com/catalog/product/view/id/1/');

        $this->assertSame(
            'https://example.com/catalog/product/view/id/1/',
            $this->provider->getProductUrl()
        );
    }
}
