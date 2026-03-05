<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Api\SortOrder;
use Magento\Framework\Api\SortOrderBuilder;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;
use Swissup\BreezeThemeEditor\Api\Data\PublicationSearchResultsInterface;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Publications;
use Swissup\BreezeThemeEditor\Model\Utility\AdminUserLoader;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class PublicationsTest extends TestCase
{
    private Publications $resolver;
    private PublicationRepositoryInterface|MockObject $publicationRepository;
    private UserResolver|MockObject $userResolver;
    private ThemeResolver|MockObject $themeResolver;
    private SearchCriteriaBuilder|MockObject $searchCriteriaBuilder;
    private SortOrderBuilder|MockObject $sortOrderBuilder;
    private AdminUserLoader|MockObject $adminUserLoader;
    private Field|MockObject $field;
    private ContextInterface|MockObject $context;
    private ResolveInfo|MockObject $resolveInfo;

    protected function setUp(): void
    {
        $this->publicationRepository = $this->createMock(PublicationRepositoryInterface::class);
        $this->userResolver          = $this->createMock(UserResolver::class);
        $this->themeResolver         = $this->createMock(ThemeResolver::class);
        $this->adminUserLoader       = $this->createMock(AdminUserLoader::class);
        $this->field                 = $this->createMock(Field::class);
        $this->context               = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->resolveInfo           = $this->createMock(ResolveInfo::class);

        // SortOrder mock
        $sortOrder = $this->createMock(SortOrder::class);
        $this->sortOrderBuilder = $this->getMockBuilder(SortOrderBuilder::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->sortOrderBuilder->method('setField')->willReturnSelf();
        $this->sortOrderBuilder->method('setDirection')->willReturnSelf();
        $this->sortOrderBuilder->method('create')->willReturn($sortOrder);

        // SearchCriteriaBuilder fluent chain
        $criteria = $this->createMock(SearchCriteriaInterface::class);
        $this->searchCriteriaBuilder = $this->getMockBuilder(SearchCriteriaBuilder::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->searchCriteriaBuilder->method('addFilter')->willReturnSelf();
        $this->searchCriteriaBuilder->method('addSortOrder')->willReturnSelf();
        $this->searchCriteriaBuilder->method('setPageSize')->willReturnSelf();
        $this->searchCriteriaBuilder->method('setCurrentPage')->willReturnSelf();
        $this->searchCriteriaBuilder->method('create')->willReturn($criteria);

        $this->resolver = new Publications(
            $this->publicationRepository,
            $this->userResolver,
            $this->themeResolver,
            $this->searchCriteriaBuilder,
            $this->sortOrderBuilder,
            $this->adminUserLoader
        );
    }

    private function makeSearchResults(array $items, int $total = 0): PublicationSearchResultsInterface|MockObject
    {
        $results = $this->createMock(PublicationSearchResultsInterface::class);
        $results->method('getItems')->willReturn($items);
        $results->method('getTotalCount')->willReturn($total ?: count($items));
        return $results;
    }

    public function testReturnsEmptyItemsWhenNoPublications(): void
    {
        $this->publicationRepository->method('getList')->willReturn($this->makeSearchResults([]));
        $this->adminUserLoader->method('getMultipleUsersData')->willReturn([]);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 1, 'themeId' => 5]
        );

        $this->assertSame([], $result['items']);
        $this->assertSame(0, $result['total_count']);
    }

    public function testMapsPublicationsToResponseItems(): void
    {
        $pub = $this->createMock(PublicationInterface::class);
        $pub->method('getPublicationId')->willReturn(1);
        $pub->method('getThemeId')->willReturn(5);
        $pub->method('getStoreId')->willReturn(1);
        $pub->method('getTitle')->willReturn('v1');
        $pub->method('getDescription')->willReturn(null);
        $pub->method('getPublishedAt')->willReturn('2024-01-01');
        $pub->method('getPublishedBy')->willReturn(3);
        $pub->method('getIsRollback')->willReturn(false);
        $pub->method('getRollbackFrom')->willReturn(null);
        $pub->method('getChangesCount')->willReturn(5);

        $this->publicationRepository->method('getList')->willReturn($this->makeSearchResults([$pub]));
        $this->adminUserLoader->method('getMultipleUsersData')->willReturn([
            3 => ['fullname' => 'Test Admin', 'email' => 't@t.com'],
        ]);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 1, 'themeId' => 5]
        );

        $this->assertCount(1, $result['items']);
        $this->assertSame(1, $result['items'][0]['publicationId']);
        $this->assertSame('Test Admin', $result['items'][0]['publishedByName']);
    }

    public function testResolvesThemeIdFromStoreIdWhenNotProvided(): void
    {
        $this->themeResolver
            ->expects($this->once())
            ->method('getThemeIdByStoreId')
            ->with(2)
            ->willReturn(10);
        $this->publicationRepository->method('getList')->willReturn($this->makeSearchResults([]));
        $this->adminUserLoader->method('getMultipleUsersData')->willReturn([]);

        $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 2]
        );
    }

    public function testPageInfoIsCorrect(): void
    {
        $this->publicationRepository->method('getList')->willReturn($this->makeSearchResults([], 50));
        $this->adminUserLoader->method('getMultipleUsersData')->willReturn([]);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 1, 'themeId' => 5, 'pageSize' => 10, 'currentPage' => 2]
        );

        $this->assertSame(10, $result['page_info']['page_size']);
        $this->assertSame(2, $result['page_info']['current_page']);
        $this->assertSame(5, $result['page_info']['total_pages']);
    }

    public function testResponseStructureIsComplete(): void
    {
        $this->publicationRepository->method('getList')->willReturn($this->makeSearchResults([]));
        $this->adminUserLoader->method('getMultipleUsersData')->willReturn([]);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 1, 'themeId' => 5]
        );

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('total_count', $result);
        $this->assertArrayHasKey('page_info', $result);
    }
}
