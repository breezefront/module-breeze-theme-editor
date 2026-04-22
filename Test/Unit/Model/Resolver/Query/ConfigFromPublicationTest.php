<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use Magento\Framework\Api\SearchCriteriaBuilderFactory;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogSearchResultsInterface;
use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter;
use Swissup\BreezeThemeEditor\Model\Formatter\PresetFormatter;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\ConfigFromPublication;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

class ConfigFromPublicationTest extends TestCase
{
    private ConfigFromPublication $resolver;
    private SectionFormatter|MockObject $sectionFormatter;
    private PresetFormatter|MockObject $presetFormatter;
    private ConfigProvider|MockObject $configProvider;
    private PaletteProvider|MockObject $paletteProvider;
    private FontPaletteProvider|MockObject $fontPaletteProvider;
    private ThemeResolver|MockObject $themeResolver;
    private PublicationRepositoryInterface|MockObject $publicationRepository;
    private ChangelogRepositoryInterface|MockObject $changelogRepository;
    private SearchCriteriaBuilderFactory|MockObject $searchCriteriaBuilderFactory;
    private ScopeFactory|MockObject $scopeFactory;
    private Field|MockObject $field;
    private ContextInterface|MockObject $context;
    private ResolveInfo|MockObject $resolveInfo;

    protected function setUp(): void
    {
        $this->sectionFormatter              = $this->createMock(SectionFormatter::class);
        $this->presetFormatter               = $this->createMock(PresetFormatter::class);
        $this->configProvider                = $this->createMock(ConfigProvider::class);
        $this->paletteProvider               = $this->createMock(PaletteProvider::class);
        $this->fontPaletteProvider           = $this->createMock(FontPaletteProvider::class);
        $this->themeResolver                 = $this->createMock(ThemeResolver::class);
        $this->publicationRepository         = $this->createMock(PublicationRepositoryInterface::class);
        $this->changelogRepository           = $this->createMock(ChangelogRepositoryInterface::class);
        $this->field                         = $this->createMock(Field::class);
        $this->context                       = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->resolveInfo                   = $this->createMock(ResolveInfo::class);

        // SearchCriteriaBuilderFactory → SearchCriteriaBuilder → SearchCriteria
        $criteria = $this->createMock(SearchCriteriaInterface::class);
        $builder  = $this->getMockBuilder(SearchCriteriaBuilder::class)
            ->disableOriginalConstructor()
            ->getMock();
        $builder->method('addFilter')->willReturnSelf();
        $builder->method('create')->willReturn($criteria);

        $this->searchCriteriaBuilderFactory = $this->getMockBuilder(SearchCriteriaBuilderFactory::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->searchCriteriaBuilderFactory->method('create')->willReturn($builder);

        // Default: changelog returns empty list
        $emptyResults = $this->createMock(ChangelogSearchResultsInterface::class);
        $emptyResults->method('getItems')->willReturn([]);
        $this->changelogRepository->method('getList')->willReturn($emptyResults);

        $this->scopeFactory = $this->createMock(ScopeFactory::class);

        // Default SectionFormatter/PresetFormatter behavior
        $this->sectionFormatter->method('mergeSectionsWithValues')->willReturn([]);
        $this->sectionFormatter->method('mergeFontPaletteRolesAsFields')->willReturn(null);
        $this->presetFormatter->method('formatPresets')->willReturn([]);

        $this->resolver = new ConfigFromPublication(
            $this->sectionFormatter,
            $this->presetFormatter,
            $this->paletteProvider,
            $this->fontPaletteProvider,
            $this->configProvider,
            $this->themeResolver,
            $this->publicationRepository,
            $this->changelogRepository,
            $this->searchCriteriaBuilderFactory,
            $this->scopeFactory
        );
    }

    public function testThrowsExceptionWhenPublicationIdMissing(): void
    {
        $this->expectException(GraphQlInputException::class);

        $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 1, 'themeId' => 5] // no publicationId
        );
    }

    public function testThrowsExceptionWhenPublicationNotFound(): void
    {
        $this->publicationRepository
            ->method('getById')
            ->willThrowException(new \Exception('Not found'));

        $this->expectException(GraphQlInputException::class);

        $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 1, 'themeId' => 5, 'publicationId' => 99]
        );
    }

    public function testResolvesThemeIdFromStoreIdWhenNotProvided(): void
    {
        $pub = $this->createMock(PublicationInterface::class);
        $pub->method('getPublishedAt')->willReturn('2024-01-01');
        $pub->method('getScope')->willReturn('stores');
        $pub->method('getStoreId')->willReturn(3);
        $this->publicationRepository->method('getById')->willReturn($pub);

        $scopeMock = $this->createMock(ScopeInterface::class);
        $this->scopeFactory
            ->expects($this->once())
            ->method('create')
            ->with('stores', 3)
            ->willReturn($scopeMock);

        $this->themeResolver
            ->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($scopeMock)
            ->willReturn(10);

        $this->configProvider->method('getConfigurationWithInheritance')->willReturn(['sections' => [], 'version' => '1.0', 'presets' => []]);
        $this->configProvider->method('getMetadata')->willReturn([]);
        $this->paletteProvider->method('getPalettes')->willReturn([]);
        $this->fontPaletteProvider->method('getFontPalettes')->willReturn([]);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 3, 'publicationId' => 1] // no themeId
        );

        $this->assertIsArray($result);
        $this->assertArrayHasKey('sections', $result);
    }
}
