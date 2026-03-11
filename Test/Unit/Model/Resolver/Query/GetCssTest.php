<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use PHPUnit\Framework\TestCase;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Api\SearchCriteriaBuilderFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\GetCss;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogInterface;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogSearchResultsInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;

/**
 * Unit tests for GetCss GraphQL resolver
 * 
 * Tests PUBLICATION status validation fix and CSS generation logic
 * 
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Query\GetCss
 */
class GetCssTest extends TestCase
{
    private GetCss $getCss;
    private CssGenerator $cssGeneratorMock;
    private StatusProvider $statusProviderMock;
    private ThemeResolver $themeResolverMock;
    private UserResolver $userResolverMock;
    private ValueService $valueServiceMock;
    private ConfigProvider $configProviderMock;
    private ChangelogRepositoryInterface $changelogRepositoryMock;
    private SearchCriteriaBuilderFactory $searchCriteriaBuilderFactoryMock;
    private ScopeFactory $scopeFactory;
    private ScopeInterface $scopeMock;
    
    private Field $fieldMock;
    private $contextMock;
    private ResolveInfo $infoMock;
    
    protected function setUp(): void
    {
        // Create all mocks
        $this->cssGeneratorMock = $this->createMock(CssGenerator::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        $this->userResolverMock = $this->createMock(UserResolver::class);
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->changelogRepositoryMock = $this->createMock(ChangelogRepositoryInterface::class);
        $this->searchCriteriaBuilderFactoryMock = $this->createMock(SearchCriteriaBuilderFactory::class);
        $this->scopeFactory = $this->createMock(ScopeFactory::class);
        $this->scopeMock    = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );
        
        // Create GraphQL mocks
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = new \stdClass();
        $this->infoMock = $this->createMock(ResolveInfo::class);
        
        // Instantiate GetCss resolver
        $this->getCss = new GetCss(
            $this->cssGeneratorMock,
            $this->statusProviderMock,
            $this->themeResolverMock,
            $this->userResolverMock,
            $this->valueServiceMock,
            $this->configProviderMock,
            $this->changelogRepositoryMock,
            $this->searchCriteriaBuilderFactoryMock,
            $this->scopeFactory
        );
    }
    
    /**
     * Test 1: Should throw exception when PUBLICATION status without publicationId
     * This is the main test for our bug fix
     */
    public function testThrowsExceptionWhenPublicationStatusWithoutPublicationId(): void
    {
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'status' => 'PUBLICATION'
            // publicationId is missing
        ];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->expectException(GraphQlInputException::class);
        $this->expectExceptionMessage('publicationId is required when status is PUBLICATION');
        
        $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
    }
    
    /**
     * Test 2: Should generate CSS for PUBLISHED status
     */
    public function testGeneratesCssForPublishedStatus(): void
    {
        $expectedCss = ":root {\n    --color-primary: #1979c3;\n}\n";
        
        $this->cssGeneratorMock->expects($this->once())
            ->method('generate')
            ->with(1, $this->isInstanceOf(ScopeInterface::class), 'PUBLISHED')
            ->willReturn($expectedCss);
        
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 1,
            'status' => 'PUBLISHED'
        ];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        
        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertArrayHasKey('css', $result);
        $this->assertArrayHasKey('status', $result);
        $this->assertArrayHasKey('hasContent', $result);
        $this->assertEquals($expectedCss, $result['css']);
        $this->assertEquals('PUBLISHED', $result['status']);
        $this->assertTrue($result['hasContent']);
    }
    
    /**
     * Test 3: Should generate CSS for DRAFT status
     */
    public function testGeneratesCssForDraftStatus(): void
    {
        $expectedCss = ":root {\n    --color-secondary: #ff5733;\n}\n";
        
        $this->cssGeneratorMock->expects($this->once())
            ->method('generate')
            ->with(1, $this->isInstanceOf(ScopeInterface::class), 'DRAFT')
            ->willReturn($expectedCss);
        
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 1,
            'status' => 'DRAFT'
        ];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        
        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertEquals($expectedCss, $result['css']);
        $this->assertEquals('DRAFT', $result['status']);
        $this->assertTrue($result['hasContent']);
    }
    
    /**
     * Test 4: Should generate CSS for PUBLICATION status with publicationId
     */
    public function testGeneratesCssForPublicationStatusWithPublicationId(): void
    {
        $expectedCss = ":root {\n    --color-tertiary: #33ff57;\n}\n";
        
        // Mock changelog data
        $changelogMock = $this->createMock(ChangelogInterface::class);
        $changelogMock->method('getSectionCode')->willReturn('buttons');
        $changelogMock->method('getSettingCode')->willReturn('primary_bg');
        $changelogMock->method('getOldValue')->willReturn('#ffffff');
        $changelogMock->method('getNewValue')->willReturn('#33ff57');
        
        // Mock search results
        $searchResultMock = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResultMock->method('getItems')->willReturn([$changelogMock]);
        
        // Mock search criteria chain
        $searchCriteriaMock = $this->createMock(SearchCriteriaInterface::class);
        $searchCriteriaBuilderMock = $this->createMock(SearchCriteriaBuilder::class);
        $searchCriteriaBuilderMock->method('addFilter')->willReturnSelf();
        $searchCriteriaBuilderMock->method('create')->willReturn($searchCriteriaMock);
        
        $this->searchCriteriaBuilderFactoryMock->method('create')
            ->willReturn($searchCriteriaBuilderMock);
        
        $this->changelogRepositoryMock->expects($this->once())
            ->method('getList')
            ->with($searchCriteriaMock)
            ->willReturn($searchResultMock);
        
        $this->cssGeneratorMock->expects($this->once())
            ->method('generateFromValuesMap')
            ->with(1, ['buttons.primary_bg' => '#33ff57'])
            ->willReturn($expectedCss);
        
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 1,
            'status' => 'PUBLICATION',
            'publicationId' => 123
        ];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        
        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertEquals($expectedCss, $result['css']);
        $this->assertEquals('PUBLICATION', $result['status']);
        $this->assertTrue($result['hasContent']);
    }
    
    /**
     * Test 5: Should default to PUBLISHED when status not provided
     */
    public function testDefaultsToPublishedWhenStatusNotProvided(): void
    {
        $expectedCss = ":root {\n    --color-default: #cccccc;\n}\n";
        
        $this->cssGeneratorMock->expects($this->once())
            ->method('generate')
            ->with(1, $this->isInstanceOf(ScopeInterface::class), 'PUBLISHED')
            ->willReturn($expectedCss);
        
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 1
            // status is not provided
        ];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        
        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertEquals('PUBLISHED', $result['status']);
    }
    
    /**
     * Test 6: Should auto-detect themeId via getThemeIdByScope when not provided
     */
    public function testAutoDetectsThemeIdWhenNotProvided(): void
    {
        $expectedCss = ":root {\n    --color-auto: #aaaaaa;\n}\n";
        
        $this->themeResolverMock->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(5);
        
        $this->cssGeneratorMock->expects($this->once())
            ->method('generate')
            ->with(5, $this->isInstanceOf(ScopeInterface::class), 'PUBLISHED')
            ->willReturn($expectedCss);
        
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'status' => 'PUBLISHED'
            // themeId is not provided
        ];
        
        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertEquals($expectedCss, $result['css']);
    }
    
    /**
     * Test 7: Should return hasContent=true for valid CSS
     */
    public function testHasRealCssContentReturnsTrueForValidCss(): void
    {
        $validCss = ":root {\n    --color-brand-primary: #1979c3;\n    --button-bg: #ff5733;\n}\n";
        
        $this->cssGeneratorMock->method('generate')
            ->willReturn($validCss);
        
        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 1, 'status' => 'PUBLISHED'];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);

        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertTrue($result['hasContent'], 'Should return hasContent=true for CSS with variables');
    }
    
    /**
     * Test 8: Should return hasContent=false for empty CSS
     */
    public function testHasRealCssContentReturnsFalseForEmptyCss(): void
    {
        $emptyCss = ":root {\n}\n";
        
        $this->cssGeneratorMock->method('generate')
            ->willReturn($emptyCss);
        
        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 1, 'status' => 'PUBLISHED'];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        
        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertFalse($result['hasContent'], 'Should return hasContent=false for empty CSS');
    }
    
    /**
     * Test 9: Should handle exception in generateCssFromPublication gracefully
     */
    public function testGeneratesCssFromPublicationHandlesException(): void
    {
        // Mock search criteria to throw exception
        $searchCriteriaBuilderMock = $this->createMock(SearchCriteriaBuilder::class);
        $searchCriteriaBuilderMock->method('addFilter')->willReturnSelf();
        $searchCriteriaBuilderMock->method('create')
            ->willThrowException(new \Exception('Database connection error'));
        
        $this->searchCriteriaBuilderFactoryMock->method('create')
            ->willReturn($searchCriteriaBuilderMock);
        
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 1,
            'status' => 'PUBLICATION',
            'publicationId' => 123
        ];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);

        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        // Should return error comment instead of throwing exception
        $this->assertStringContainsString('Error generating CSS from publication', $result['css']);
        $this->assertStringContainsString('Database connection error', $result['css']);
        $this->assertFalse($result['hasContent']);
    }
    
    /**
     * Test 10: Should return empty CSS when publication changelog is empty
     */
    public function testGeneratesCssFromPublicationWithEmptyChangelog(): void
    {
        // Mock empty search results
        $searchResultMock = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResultMock->method('getItems')->willReturn([]); // Empty changelog
        
        // Mock search criteria chain
        $searchCriteriaMock = $this->createMock(SearchCriteriaInterface::class);
        $searchCriteriaBuilderMock = $this->createMock(SearchCriteriaBuilder::class);
        $searchCriteriaBuilderMock->method('addFilter')->willReturnSelf();
        $searchCriteriaBuilderMock->method('create')->willReturn($searchCriteriaMock);
        
        $this->searchCriteriaBuilderFactoryMock->method('create')
            ->willReturn($searchCriteriaBuilderMock);
        
        $this->changelogRepositoryMock->method('getList')
            ->willReturn($searchResultMock);
        
        // generateFromValuesMap should NOT be called
        $this->cssGeneratorMock->expects($this->never())
            ->method('generateFromValuesMap');
        
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 1,
            'status' => 'PUBLICATION',
            'publicationId' => 123
        ];
        
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);

        $result = $this->getCss->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertEquals(":root {\n}\n", $result['css']);
        $this->assertFalse($result['hasContent']);
    }
}
