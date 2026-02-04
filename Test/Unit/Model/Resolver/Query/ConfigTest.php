<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use PHPUnit\Framework\TestCase;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Config;

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
    private SerializerInterface $serializerMock;
    private ConfigProvider $configProviderMock;
    private PaletteProvider $paletteProviderMock;
    private ColorFormatResolver $colorFormatResolverMock;
    private ValueInheritanceResolver $valueInheritanceResolverMock;
    private StatusProvider $statusProviderMock;
    private CompareProvider $compareProviderMock;
    private ThemeResolver $themeResolverMock;
    private UserResolver $userResolverMock;
    
    private Field $fieldMock;
    private $contextMock;
    private ResolveInfo $infoMock;
    
    protected function setUp(): void
    {
        // Create all dependency mocks
        $this->serializerMock = $this->createMock(SerializerInterface::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->paletteProviderMock = $this->createMock(PaletteProvider::class);
        $this->colorFormatResolverMock = $this->createMock(ColorFormatResolver::class);
        $this->valueInheritanceResolverMock = $this->createMock(ValueInheritanceResolver::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->compareProviderMock = $this->createMock(CompareProvider::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        $this->userResolverMock = $this->createMock(UserResolver::class);
        
        // Create GraphQL mocks
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = new \stdClass();
        $this->infoMock = $this->createMock(ResolveInfo::class);
        
        // Setup default serializer behavior (passthrough for simplicity)
        $this->serializerMock->method('serialize')->willReturnCallback(function($value) {
            return json_encode($value);
        });
        
        // Instantiate Config resolver
        $this->config = new Config(
            $this->serializerMock,
            $this->configProviderMock,
            $this->paletteProviderMock,
            $this->colorFormatResolverMock,
            $this->valueInheritanceResolverMock,
            $this->statusProviderMock,
            $this->compareProviderMock,
            $this->themeResolverMock,
            $this->userResolverMock
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
            'storeId' => 1,
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
     * EXPECTED: Config returned with draft values
     */
    public function testLoadsConfigForDraftStatus(): void
    {
        // Setup mocks
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('DRAFT')
            ->willReturn(1);
        
        $mockConfig = [
            'version' => '1.0',
            'sections' => [
                [
                    'id' => 'colors',
                    'name' => 'Colors',
                    'settings' => [
                        [
                            'id' => 'primary',
                            'label' => 'Primary Color',
                            'type' => 'color',
                            'default' => '#0000ff'
                        ]
                    ]
                ]
            ],
            'presets' => []
        ];
        
        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($mockConfig);
        
        $mockValues = [
            [
                'section_code' => 'colors',
                'setting_code' => 'primary',
                'value' => '#ff0000',
                'updated_at' => '2026-01-01'
            ]
        ];
        
        $this->valueInheritanceResolverMock->expects($this->once())
            ->method('resolveAllValues')
            ->with(1, 1, 1, 1) // themeId, storeId, statusId, userId
            ->willReturn($mockValues);
        
        $this->configProviderMock->method('getAllDefaults')->willReturn(['colors.primary' => '#0000ff']);
        $this->configProviderMock->method('getMetadata')->willReturn([
            'themeId' => 1,
            'themeName' => 'Test Theme'
        ]);
        
        $this->compareProviderMock->method('compare')->willReturn([
            'hasChanges' => true,
            'changesCount' => 3
        ]);
        
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);
        
        // Execute
        $args = ['storeId' => 1, 'status' => 'DRAFT'];
        $result = $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
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
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(2);
        
        $mockConfig = [
            'version' => '1.0',
            'sections' => [],
            'presets' => []
        ];
        
        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($mockConfig);
        
        $this->valueInheritanceResolverMock->expects($this->once())
            ->method('resolveAllValues')
            ->with(1, 1, 2, null) // userId = null for PUBLISHED
            ->willReturn([]);
        
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn([
            'themeId' => 1,
            'themeName' => 'Test Theme'
        ]);
        
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);
        
        // Execute
        $args = ['storeId' => 1, 'status' => 'PUBLISHED'];
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
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        
        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(2);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);
        
        $args = ['storeId' => 1]; // no status
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
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        
        $this->themeResolverMock->expects($this->once())
            ->method('getThemeIdByStoreId')
            ->with(1)
            ->willReturn(5);
        
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 5]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);
        
        $args = ['storeId' => 1, 'status' => 'PUBLISHED']; // no themeId
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
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
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
        
        $args = ['storeId' => 1, 'status' => 'DRAFT'];
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
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn(['version' => '1.0', 'sections' => [], 'presets' => []]);
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);
        
        // CompareProvider should NEVER be called for PUBLISHED
        $this->compareProviderMock->expects($this->never())
            ->method('compare');
        
        $args = ['storeId' => 1, 'status' => 'PUBLISHED'];
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
}
