<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlNoSuchEntityException;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogInterface;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogSearchResultsInterface;
use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Publication;
use Swissup\BreezeThemeEditor\Model\Utility\AdminUserLoader;

class PublicationTest extends TestCase
{
    private Publication $resolver;
    private PublicationRepositoryInterface|MockObject $publicationRepository;
    private ChangelogRepositoryInterface|MockObject $changelogRepository;
    private ConfigProvider|MockObject $configProvider;
    private SearchCriteriaBuilder|MockObject $searchCriteriaBuilder;
    private AdminUserLoader|MockObject $adminUserLoader;
    private Field|MockObject $field;
    private ContextInterface|MockObject $context;
    private ResolveInfo|MockObject $resolveInfo;

    protected function setUp(): void
    {
        $this->publicationRepository = $this->createMock(PublicationRepositoryInterface::class);
        $this->changelogRepository   = $this->createMock(ChangelogRepositoryInterface::class);
        $this->configProvider        = $this->createMock(ConfigProvider::class);
        $this->adminUserLoader       = $this->createMock(AdminUserLoader::class);
        $this->field                 = $this->createMock(Field::class);
        $this->context               = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->resolveInfo           = $this->createMock(ResolveInfo::class);

        // SearchCriteriaBuilder returns itself on addFilter, then a criteria on create()
        $criteria = $this->createMock(SearchCriteriaInterface::class);
        $this->searchCriteriaBuilder = $this->getMockBuilder(SearchCriteriaBuilder::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->searchCriteriaBuilder->method('addFilter')->willReturnSelf();
        $this->searchCriteriaBuilder->method('create')->willReturn($criteria);

        $this->resolver = new Publication(
            $this->publicationRepository,
            $this->changelogRepository,
            $this->configProvider,
            $this->searchCriteriaBuilder,
            $this->adminUserLoader
        );
    }

    private function makePublication(): PublicationInterface|MockObject
    {
        $pub = $this->createMock(PublicationInterface::class);
        $pub->method('getPublicationId')->willReturn(10);
        $pub->method('getThemeId')->willReturn(5);
        $pub->method('getStoreId')->willReturn(1);
        $pub->method('getTitle')->willReturn('v1.0');
        $pub->method('getDescription')->willReturn(null);
        $pub->method('getPublishedAt')->willReturn('2024-01-01 12:00:00');
        $pub->method('getPublishedBy')->willReturn(2);
        $pub->method('getIsRollback')->willReturn(false);
        $pub->method('getRollbackFrom')->willReturn(null);
        $pub->method('getChangesCount')->willReturn(3);
        return $pub;
    }

    public function testThrowsExceptionWhenPublicationNotFound(): void
    {
        $this->publicationRepository
            ->method('getById')
            ->willThrowException(new \Exception('Not found'));

        $this->expectException(GraphQlNoSuchEntityException::class);

        $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['publicationId' => 999]
        );
    }

    public function testReturnsPublicationWithEmptyChangelog(): void
    {
        $this->publicationRepository->method('getById')->willReturn($this->makePublication());
        $this->configProvider->method('getConfigurationWithInheritance')->willReturn(['sections' => []]);
        $this->adminUserLoader->method('getUserData')->willReturn(['fullname' => 'Admin', 'email' => 'a@b.c']);

        $searchResults = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResults->method('getItems')->willReturn([]);
        $this->changelogRepository->method('getList')->willReturn($searchResults);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['publicationId' => 10]
        );

        $this->assertSame(10, $result['publicationId']);
        $this->assertSame([], $result['changes']);
        $this->assertSame('Admin', $result['publishedByName']);
    }

    public function testMapsChangelogItemsToChanges(): void
    {
        $this->publicationRepository->method('getById')->willReturn($this->makePublication());
        $this->configProvider->method('getConfigurationWithInheritance')->willReturn(['sections' => []]);
        $this->adminUserLoader->method('getUserData')->willReturn([]);

        $change = $this->createMock(ChangelogInterface::class);
        $change->method('getSectionCode')->willReturn('colors');
        $change->method('getSettingCode')->willReturn('primary');
        $change->method('getOldValue')->willReturn(null);
        $change->method('getNewValue')->willReturn('#fff');

        $searchResults = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResults->method('getItems')->willReturn([$change]);
        $this->changelogRepository->method('getList')->willReturn($searchResults);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['publicationId' => 10]
        );

        $this->assertCount(1, $result['changes']);
        $this->assertSame('ADDED', $result['changes'][0]['changeType']);
        $this->assertSame('colors', $result['changes'][0]['sectionCode']);
    }

    public function testResponseContainsAllRequiredKeys(): void
    {
        $this->publicationRepository->method('getById')->willReturn($this->makePublication());
        $this->configProvider->method('getConfigurationWithInheritance')->willReturn([]);
        $this->adminUserLoader->method('getUserData')->willReturn([]);

        $searchResults = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResults->method('getItems')->willReturn([]);
        $this->changelogRepository->method('getList')->willReturn($searchResults);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['publicationId' => 10]
        );

        foreach (['publicationId', 'themeId', 'scopeId', 'title', 'publishedAt', 'publishedBy', 'changesCount', 'changes', 'canRollback'] as $key) {
            $this->assertArrayHasKey($key, $result);
        }
    }
}
