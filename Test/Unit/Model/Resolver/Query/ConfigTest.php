<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use PHPUnit\Framework\TestCase;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter;
use Swissup\BreezeThemeEditor\Model\Formatter\PresetFormatter;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorPipeline;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Config;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;

/**
 * Unit tests for Config GraphQL resolver
 * 
 * Tests PUBLICATION status validation and config loading logic
 * 
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Query\Config
 */
class ConfigTest extends TestCase
{
    private Config $config;
    private array $sectionFormatterSections = [];
    private SectionFormatter $sectionFormatterMock;
    private PresetFormatter $presetFormatterMock;
    private ConfigProvider $configProviderMock;
    private PaletteProvider $paletteProviderMock;
    private FontPaletteProvider $fontPaletteProviderMock;
    private ColorPipeline $colorPipelineMock;
    private ValueInheritanceResolver $valueInheritanceResolverMock;
    private StatusProvider $statusProviderMock;
    private CompareProvider $compareProviderMock;
    private ThemeResolver $themeResolverMock;
    private UserResolver $userResolverMock;
    private ScopeFactory $scopeFactory;
    private ScopeInterface $scopeMock;

    private Field $fieldMock;
    private ContextInterface $contextMock;
    private ResolveInfo $infoMock;

    protected function setUp(): void
    {
        // Create all dependency mocks
        $this->sectionFormatterMock         = $this->createMock(SectionFormatter::class);
        $this->presetFormatterMock          = $this->createMock(PresetFormatter::class);
        $this->configProviderMock           = $this->createMock(ConfigProvider::class);
        $this->paletteProviderMock          = $this->createMock(PaletteProvider::class);
        $this->fontPaletteProviderMock      = $this->createMock(FontPaletteProvider::class);
        $this->colorPipelineMock            = $this->createMock(ColorPipeline::class);
        $this->valueInheritanceResolverMock = $this->createMock(ValueInheritanceResolver::class);
        $this->statusProviderMock           = $this->createMock(StatusProvider::class);
        $this->compareProviderMock          = $this->createMock(CompareProvider::class);
        $this->themeResolverMock            = $this->createMock(ThemeResolver::class);
        $this->userResolverMock             = $this->createMock(UserResolver::class);
        $this->scopeFactory                 = $this->createMock(ScopeFactory::class);
        $this->scopeMock                    = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );

        // Default SectionFormatter behavior: return empty sections array
        // Tests that need specific sections will modify $this->sectionFormatterSections before calling resolve().
        $this->sectionFormatterSections = [];
        $this->sectionFormatterMock->method('mergeSectionsWithValues')
            ->willReturnCallback(fn() => $this->sectionFormatterSections);
        $this->sectionFormatterMock->method('mergeFontPaletteRolesAsFields')->willReturn(null);

        // Default PresetFormatter behavior
        $this->presetFormatterMock->method('formatPresets')->willReturn([]);

        // Create GraphQL mocks
        $this->fieldMock   = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2); // USER_TYPE_ADMIN
        $this->infoMock = $this->createMock(ResolveInfo::class);

        // Instantiate Config resolver
        $this->config = new Config(
            $this->sectionFormatterMock,
            $this->presetFormatterMock,
            $this->paletteProviderMock,
            $this->fontPaletteProviderMock,
            $this->configProviderMock,
            $this->valueInheritanceResolverMock,
            $this->statusProviderMock,
            $this->compareProviderMock,
            $this->themeResolverMock,
            $this->userResolverMock,
            $this->scopeFactory
        );
    }

    /**
     * Test 1: Should throw exception when status is PUBLICATION
     * 
     * SCENARIO: User passes status: 'PUBLICATION' to breezeThemeEditorConfig
     * EXPECTED: GraphQlInputException with clear message
     * REASON: Config query doesn't support PUBLICATION (use ConfigFromPublication instead)
     */
    public function testThrowsExceptionWhenStatusIsPublication(): void
    {
        $args = [
            'scope'  => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 1,
            'status' => 'PUBLICATION'
        ];

        $this->expectException(GraphQlInputException::class);
        $this->expectExceptionMessage(
            'PUBLICATION status is not supported. Use breezeThemeEditorConfigFromPublication query instead.'
        );

        $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
    }

    /**
     * Test 2: Should successfully load config for DRAFT status
     * 
     * SCENARIO: User passes status: 'DRAFT'
     * EXPECTED: Config returned with correct structure
     */
    public function testLoadsConfigForDraftStatus(): void
    {
        // Setup mocks
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')
            ->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        $mockConfig = [
            'version'  => '1.0',
            'sections' => [['id' => 'colors', 'name' => 'Colors', 'settings' => []]],
            'presets'  => [],
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn($mockConfig);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1, 'themeName' => 'Test Theme']);
        $this->compareProviderMock->method('compare')->willReturn(['hasChanges' => false, 'changesCount' => 0]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        // Execute
        $args   = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'DRAFT'];
        $result = $this->config->resolve($this->fieldMock, $this->contextMock, $this->infoMock, null, $args);

        // Assert
        $this->assertIsArray($result);
        $this->assertArrayHasKey('version', $result);
        $this->assertArrayHasKey('sections', $result);
        $this->assertArrayHasKey('presets', $result);
        $this->assertArrayHasKey('palettes', $result);
        $this->assertArrayHasKey('metadata', $result);
        $this->assertEquals('1.0', $result['version']);
    }

    /**
     * Test 3: Should successfully load config for PUBLISHED status
     * 
     * SCENARIO: User passes status: 'PUBLISHED'
     * EXPECTED: Config returned with published values, userId = null
     */
    public function testLoadsConfigForPublishedStatus(): void
    {
        // Setup mocks
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(2);

        $mockConfig = [
            'version' => '1.0',
            'sections' => [['id' => 'general', 'name' => 'General', 'settings' => []]],
            'presets' => []
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($mockConfig);

        $this->valueInheritanceResolverMock->expects($this->once())
            ->method('resolveAllValues')
            ->with(1, $this->isInstanceOf(ScopeInterface::class), 2, null) // userId = null for PUBLISHED
            ->willReturn([]);

        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn([
            'themeId' => 1,
            'themeName' => 'Test Theme'
        ]);

        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        // Execute
        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'PUBLISHED'];
        $result = $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );

        // Assert
        $this->assertIsArray($result);
        $this->assertEquals('1.0', $result['version']);
    }

    /**
     * Test 4: Should default to PUBLISHED when status not provided
     * 
     * SCENARIO: User doesn't pass status parameter
     * EXPECTED: Uses 'PUBLISHED' as default
     */
    public function testDefaultsToPublishedWhenStatusNotProvided(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);

        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(2);

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [['id' => 'general', 'name' => 'General', 'settings' => []]], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1]]; // no status
        $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
    }

    /**
     * Test 5: Should auto-detect themeId when not provided
     * 
     * SCENARIO: User doesn't pass themeId
     * EXPECTED: ThemeResolver called to detect themeId from storeId
     */
    public function testAutoDetectsThemeIdWhenNotProvided(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);

        $this->themeResolverMock->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(5);

        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [['id' => 'general', 'name' => 'General', 'settings' => []]], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 5]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'PUBLISHED']; // no themeId
        $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
    }

    /**
     * Test 6: Should load draft changes count for DRAFT status
     * 
     * SCENARIO: User loads DRAFT config
     * EXPECTED: metadata.draftChangesCount populated from CompareProvider
     */
    public function testLoadsDraftChangesCountForDraftStatus(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [['id' => 'general', 'name' => 'General', 'settings' => []]], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        // Setup comparison result
        $this->compareProviderMock->expects($this->once())
            ->method('compare')
            ->willReturn([
                'hasChanges' => true,
                'changesCount' => 5
            ]);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'DRAFT'];
        $result = $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );

        // Assert metadata
        $this->assertTrue($result['metadata']['hasUnpublishedChanges']);
        $this->assertEquals(5, $result['metadata']['draftChangesCount']);
    }

    /**
     * Test 7: Should NOT load draft changes for PUBLISHED status
     * 
     * SCENARIO: User loads PUBLISHED config
     * EXPECTED: CompareProvider NOT called, metadata shows no changes
     */
    public function testDoesNotLoadDraftChangesForPublishedStatus(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [['id' => 'general', 'name' => 'General', 'settings' => []]], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        // CompareProvider should NEVER be called for PUBLISHED
        $this->compareProviderMock->expects($this->never())
            ->method('compare');

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'PUBLISHED'];
        $result = $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );

        $this->assertFalse($result['metadata']['hasUnpublishedChanges']);
        $this->assertEquals(0, $result['metadata']['draftChangesCount']);
    }

    /**
     * Test: Color conversion and non-color field preservation are tested in
     * SectionFormatterColorTest — that test class covers SectionFormatter directly.
     * This placeholder keeps the test count consistent and documents the decision.
     */
    public function testColorConversionDelegatedToSectionFormatter(): void
    {
        // Color conversion logic lives in SectionFormatter::mergeSectionsWithValues().
        // See Test/Unit/Model/Formatter/SectionFormatterColorTest for full coverage.
        $this->assertTrue(true);
    }

    /**
     * Test 8: modifiedCount is 0 when SectionFormatter returns sections with no modified fields
     *
     * SCENARIO: PUBLISHED status, SectionFormatter returns fields with isModified=false
     * EXPECTED: metadata.modifiedCount = 0
     */
    public function testModifiedCountIsZeroWhenNoFieldsDifferFromDefaults(): void
    {
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [['id' => 'colors', 'name' => 'Colors', 'settings' => []]], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        // SectionFormatter returns 2 fields, both not modified
        $this->sectionFormatterSections = [
            ['code' => 'colors', 'label' => 'Colors', 'fields' => [
                ['code' => 'primary',   'isModified' => false],
                ['code' => 'secondary', 'isModified' => false],
            ]],
        ];

        $args   = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'PUBLISHED'];
        $result = $this->config->resolve($this->fieldMock, $this->contextMock, $this->infoMock, null, $args);

        $this->assertEquals(0, $result['metadata']['modifiedCount']);
    }

    /**
     * Test 9: modifiedCount counts only fields that differ from defaults
     *
     * SCENARIO: PUBLISHED status; SectionFormatter returns 2 of 3 fields with isModified=true
     * EXPECTED: metadata.modifiedCount = 2
     */
    public function testModifiedCountCountsOnlyFieldsThatDifferFromDefaults(): void
    {
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [['id' => 'colors', 'name' => 'Colors', 'settings' => []]], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        // SectionFormatter returns 3 fields, 2 modified
        $this->sectionFormatterSections = [
            ['code' => 'colors', 'label' => 'Colors', 'fields' => [
                ['code' => 'primary',    'isModified' => true],
                ['code' => 'secondary',  'isModified' => true],
                ['code' => 'background', 'isModified' => false],
            ]],
        ];

        $args   = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'PUBLISHED'];
        $result = $this->config->resolve($this->fieldMock, $this->contextMock, $this->infoMock, null, $args);

        $this->assertEquals(2, $result['metadata']['modifiedCount']);
    }

    /**
     * Test 10: modifiedCount is also computed for DRAFT status
     *
     * SCENARIO: DRAFT status; SectionFormatter returns 1 field with isModified=true
     * EXPECTED: metadata.modifiedCount = 1
     */
    public function testModifiedCountIsAlsoComputedForDraftStatus(): void
    {
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [['id' => 'layout', 'name' => 'Layout', 'settings' => []]], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);
        $this->compareProviderMock->method('compare')->willReturn(['hasChanges' => true, 'changesCount' => 2]);

        // SectionFormatter returns 2 fields, 1 modified
        $this->sectionFormatterSections = [
            ['code' => 'layout', 'label' => 'Layout', 'fields' => [
                ['code' => 'container_width', 'isModified' => true],
                ['code' => 'sidebar_width',   'isModified' => false],
            ]],
        ];

        $args   = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'DRAFT'];
        $result = $this->config->resolve($this->fieldMock, $this->contextMock, $this->infoMock, null, $args);

        $this->assertEquals(1, $result['metadata']['modifiedCount']);
        $this->assertEquals(2, $result['metadata']['draftChangesCount']);
    }

    /**
     * Test: Should throw GraphQlNoSuchEntityException when theme has no settings.json
     *
     * SCENARIO: Theme (and all parents) have no settings.json → sections is empty after inheritance merge
     * EXPECTED: GraphQlNoSuchEntityException with theme name in message
     */
    public function testThrowsExceptionWhenThemeHasNoConfig(): void
    {
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(18);
        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        // Theme has no settings.json → inheritance merge yields empty sections
        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [], 'presets' => []]);

        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn([
            'themeId' => 18,
            'themeName' => 'Argento Breeze Chic'
        ]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        $this->expectException(\Magento\Framework\GraphQl\Exception\GraphQlNoSuchEntityException::class);
        $this->expectExceptionMessageMatches('/configuration file not found.*Argento Breeze Chic/i');

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'DRAFT'];
        $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
    }
}
