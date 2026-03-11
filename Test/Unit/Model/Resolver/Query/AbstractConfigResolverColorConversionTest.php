<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use PHPUnit\Framework\TestCase;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Config;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;

/**
 * Functional integration tests for color format conversion in AbstractConfigResolver
 * 
 * Tests the integration between:
 * - AbstractConfigResolver::mergeSectionsWithValues()
 * - ColorFormatter::formatColorValue()
 * - ColorFormatResolver::resolve()
 * - ColorConverter (HEX ↔ RGB conversion)
 * 
 * Unlike unit tests, these use REAL formatter/converter objects (not mocks)
 * to test end-to-end color conversion from DB values to GraphQL responses.
 * 
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Query\AbstractConfigResolver
 * @covers \Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter
 */
class AbstractConfigResolverColorConversionTest extends TestCase
{
    private Config $config;

    // Real objects (no mocks)
    private ColorConverter $colorConverter;
    private ColorFormatter $colorFormatter;
    private ColorFormatResolver $colorFormatResolver;

    // Mocked dependencies
    private SerializerInterface $serializerMock;
    private ConfigProvider $configProviderMock;
    private PaletteProvider $paletteProviderMock;
    private FontPaletteProvider $fontPaletteProviderMock;
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
        // Create REAL color utilities (no mocks)
        $this->colorConverter = new ColorConverter();
        $this->colorFormatter = new ColorFormatter($this->colorConverter);
        $this->colorFormatResolver = new ColorFormatResolver($this->colorConverter);

        // Mock external dependencies
        $this->serializerMock = $this->createMock(SerializerInterface::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->paletteProviderMock = $this->createMock(PaletteProvider::class);
        $this->fontPaletteProviderMock = $this->createMock(FontPaletteProvider::class);
        $this->valueInheritanceResolverMock = $this->createMock(ValueInheritanceResolver::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->compareProviderMock = $this->createMock(CompareProvider::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        $this->userResolverMock = $this->createMock(UserResolver::class);
        $this->scopeFactory = $this->createMock(ScopeFactory::class);
        $this->scopeMock    = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );

        // Create GraphQL mocks
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2);
        $this->infoMock = $this->createMock(ResolveInfo::class);

        // Setup serializer
        $this->serializerMock->method('serialize')->willReturnCallback(function($value) {
            return json_encode($value);
        });

        // Instantiate Config resolver with REAL color utilities
        $this->config = new Config(
            $this->serializerMock,
            $this->configProviderMock,
            $this->paletteProviderMock,
            $this->fontPaletteProviderMock,
            $this->colorFormatResolver,  // REAL
            $this->colorFormatter,        // REAL
            $this->valueInheritanceResolverMock,
            $this->statusProviderMock,
            $this->compareProviderMock,
            $this->themeResolverMock,
            $this->userResolverMock,
            $this->scopeFactory
        );
    }

    /**
     * Test: Converts black HEX (#000000) to RGB (0, 0, 0)
     */
    public function testConvertsBlackHexToRgb(): void
    {
        $this->setupMocksForColorTest('#000000', 'rgb', '#111827');

        $result = $this->executeResolver();
        $field = $result['sections'][0]['fields'][0];

        $this->assertEquals('0, 0, 0', $field['value'], 
            'Black HEX #000000 should convert to RGB "0, 0, 0"');
        $this->assertEquals('rgb', $field['format']);
    }

    /**
     * Test: Converts white HEX (#ffffff) to RGB (255, 255, 255)
     */
    public function testConvertsWhiteHexToRgb(): void
    {
        $this->setupMocksForColorTest('#ffffff', 'rgb', '#000000');

        $result = $this->executeResolver();
        $field = $result['sections'][0]['fields'][0];

        $this->assertEquals('255, 255, 255', $field['value'], 
            'White HEX #ffffff should convert to RGB "255, 255, 255"');
        $this->assertEquals('rgb', $field['format']);
    }

    /**
     * Test: Converts colorful HEX (#FF5733) to RGB (255, 87, 51)
     */
    public function testConvertsColorfulHexToRgb(): void
    {
        $this->setupMocksForColorTest('#FF5733', 'rgb', '#000000');

        $result = $this->executeResolver();
        $field = $result['sections'][0]['fields'][0];

        $this->assertEquals('255, 87, 51', $field['value'], 
            'HEX #FF5733 should convert to RGB "255, 87, 51"');
    }

    /**
     * Test: Preserves HEX format when format="hex"
     */
    public function testPreservesHexWhenFormatIsHex(): void
    {
        $this->setupMocksForColorTest('#ff5733', 'hex', '#000000');

        $result = $this->executeResolver();
        $field = $result['sections'][0]['fields'][0];

        $this->assertEquals('#ff5733', $field['value'], 
            'HEX value should be preserved when format="hex"');
        $this->assertEquals('hex', $field['format']);
    }

    /**
     * Test: Preserves palette references unchanged
     */
    public function testPreservesPaletteReferences(): void
    {
        $this->setupMocksForColorTest('--color-primary', 'rgb', '#000000');

        $result = $this->executeResolver();
        $field = $result['sections'][0]['fields'][0];

        $this->assertEquals('--color-primary', $field['value'], 
            'Palette references should NEVER be converted');
    }

    /**
     * Test: Preserves CSS var() wrappers unchanged
     */
    public function testPreservesCssVarWrappers(): void
    {
        $this->setupMocksForColorTest('var(--custom-color)', 'rgb', '#000000');

        $result = $this->executeResolver();
        $field = $result['sections'][0]['fields'][0];

        $this->assertEquals('var(--custom-color)', $field['value'], 
            'CSS var() wrappers should NEVER be converted');
    }

    /**
     * Test: Handles null values correctly
     */
    public function testHandlesNullValues(): void
    {
        $this->setupMocksForColorTest(null, 'rgb', '#000000');

        $result = $this->executeResolver();
        $field = $result['sections'][0]['fields'][0];

        $this->assertNull($field['value'], 
            'Null values should remain null');
    }

    /**
     * Test: Converts short HEX (#FFF) to RGB
     */
    public function testConvertsShortHexToRgb(): void
    {
        $this->setupMocksForColorTest('#FFF', 'rgb', '#000');

        $result = $this->executeResolver();
        $field = $result['sections'][0]['fields'][0];

        $this->assertEquals('255, 255, 255', $field['value'], 
            'Short HEX #FFF should convert to RGB "255, 255, 255"');
    }

    /**
     * Helper: Setup mocks for color field testing
     */
    private function setupMocksForColorTest(?string $value, string $format, string $default): void
    {
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')
            ->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        $mockConfig = [
            'version' => '1.0',
            'sections' => [
                [
                    'id' => 'colors',
                    'name' => 'Colors',
                    'settings' => [
                        [
                            'id' => 'test_color',
                            'label' => 'Test Color',
                            'type' => 'color',
                            'format' => $format,
                            'default' => $default
                        ]
                    ]
                ]
            ],
            'presets' => []
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($mockConfig);

        $mockValues = $value !== null ? [
            [
                'section_code' => 'colors',
                'setting_code' => 'test_color',
                'value' => $value,
                'updated_at' => '2026-02-20'
            ]
        ] : [];

        $this->valueInheritanceResolverMock->method('resolveAllValues')
            ->willReturn($mockValues);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')
            ->willReturn($mockValues);

        $this->configProviderMock->method('getAllDefaults')
            ->willReturn(['colors.test_color' => $default]);
        $this->configProviderMock->method('getMetadata')
            ->willReturn(['themeId' => 1]);
        $this->compareProviderMock->method('compare')
            ->willReturn(['hasChanges' => false, 'changesCount' => 0]);
        $this->paletteProviderMock->method('getPalettes')
            ->willReturn([]);
    }

    /**
     * Helper: Execute resolver
     */
    private function executeResolver(): array
    {
        return $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            ['storeId' => 1, 'status' => 'DRAFT']
        );
    }
}
