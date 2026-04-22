<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Formatter;

use PHPUnit\Framework\TestCase;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorPipeline;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;

/**
 * Functional integration tests for color format conversion in SectionFormatter.
 *
 * Tests the integration between:
 * - SectionFormatter::mergeSectionsWithValues()
 * - ColorFormatter::formatColorValue()
 * - ColorFormatResolver::resolve()
 * - ColorConverter (HEX <-> RGB conversion)
 *
 * Uses REAL ColorPipeline objects (not mocks) to test end-to-end color conversion.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter
 * @covers \Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter
 */
class SectionFormatterColorTest extends TestCase
{
    private SectionFormatter $formatter;
    private ConfigProvider $configProviderMock;

    protected function setUp(): void
    {
        $colorConverter      = new ColorConverter();
        $colorPipeline       = new ColorPipeline(
            new ColorFormatResolver($colorConverter),
            new ColorFormatter($colorConverter)
        );

        $serializer = $this->createMock(SerializerInterface::class);
        $serializer->method('serialize')->willReturnCallback(fn($v) => json_encode($v));

        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([]);

        $this->formatter = new SectionFormatter($this->configProviderMock, $colorPipeline, $serializer);
    }

    /**
     * Helper: build a single-color-field sections array and merge with given values.
     */
    private function mergeColorField(?string $value, string $format, string $default): array
    {
        $this->configProviderMock
            ->method('getAllDefaults')
            ->willReturn(['colors.test_color' => $default]);

        $sections = [
            [
                'id'       => 'colors',
                'name'     => 'Colors',
                'settings' => [
                    [
                        'id'      => 'test_color',
                        'label'   => 'Test Color',
                        'type'    => 'color',
                        'format'  => $format,
                        'default' => $default,
                    ],
                ],
            ],
        ];

        $valuesMap = $value !== null ? ['colors.test_color' => $value] : [];

        $result = $this->formatter->mergeSectionsWithValues($sections, $valuesMap, 1);
        return $result[0]['fields'][0];
    }

    public function testConvertsBlackHexToRgb(): void
    {
        // Need fresh mock without previous getAllDefaults stub
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(
            new ColorFormatResolver($colorConverter),
            new ColorFormatter($colorConverter)
        );
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer->method('serialize')->willReturnCallback(fn($v) => json_encode($v));

        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn(['colors.test_color' => '#111827']);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([]);

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);

        $sections  = [[
            'id' => 'colors', 'name' => 'Colors',
            'settings' => [[
                'id' => 'test_color', 'label' => 'Test Color',
                'type' => 'color', 'format' => 'rgb', 'default' => '#111827',
            ]],
        ]];
        $field = $formatter->mergeSectionsWithValues($sections, ['colors.test_color' => '#000000'], 1)[0]['fields'][0];

        $this->assertEquals('0, 0, 0', $field['value']);
        $this->assertEquals('rgb', $field['format']);
    }

    public function testConvertsWhiteHexToRgb(): void
    {
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(new ColorFormatResolver($colorConverter), new ColorFormatter($colorConverter));
        $serializer = $this->createMock(SerializerInterface::class);
        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn(['colors.test_color' => '#000000']);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([]);

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);
        $sections  = [[
            'id' => 'colors', 'name' => 'Colors',
            'settings' => [['id' => 'test_color', 'label' => 'Test Color', 'type' => 'color', 'format' => 'rgb', 'default' => '#000000']],
        ]];
        $field = $formatter->mergeSectionsWithValues($sections, ['colors.test_color' => '#ffffff'], 1)[0]['fields'][0];

        $this->assertEquals('255, 255, 255', $field['value']);
        $this->assertEquals('rgb', $field['format']);
    }

    public function testPreservesHexWhenFormatIsHex(): void
    {
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(new ColorFormatResolver($colorConverter), new ColorFormatter($colorConverter));
        $serializer = $this->createMock(SerializerInterface::class);
        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn(['colors.test_color' => '#000000']);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([]);

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);
        $sections  = [[
            'id' => 'colors', 'name' => 'Colors',
            'settings' => [['id' => 'test_color', 'label' => 'Test Color', 'type' => 'color', 'format' => 'hex', 'default' => '#000000']],
        ]];
        $field = $formatter->mergeSectionsWithValues($sections, ['colors.test_color' => '#ff5733'], 1)[0]['fields'][0];

        $this->assertEquals('#ff5733', $field['value']);
        $this->assertEquals('hex', $field['format']);
    }

    public function testPreservesPaletteReferences(): void
    {
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(new ColorFormatResolver($colorConverter), new ColorFormatter($colorConverter));
        $serializer = $this->createMock(SerializerInterface::class);
        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn(['colors.test_color' => '#000000']);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([]);

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);
        $sections  = [[
            'id' => 'colors', 'name' => 'Colors',
            'settings' => [['id' => 'test_color', 'label' => 'Test Color', 'type' => 'color', 'format' => 'rgb', 'default' => '#000000']],
        ]];
        $field = $formatter->mergeSectionsWithValues($sections, ['colors.test_color' => '--color-primary'], 1)[0]['fields'][0];

        $this->assertEquals('--color-primary', $field['value'], 'Palette references should NEVER be converted');
    }

    public function testHandlesNullValues(): void
    {
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(new ColorFormatResolver($colorConverter), new ColorFormatter($colorConverter));
        $serializer = $this->createMock(SerializerInterface::class);
        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn(['colors.test_color' => '#000000']);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([]);

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);
        $sections  = [[
            'id' => 'colors', 'name' => 'Colors',
            'settings' => [['id' => 'test_color', 'label' => 'Test Color', 'type' => 'color', 'format' => 'rgb', 'default' => '#000000']],
        ]];
        $field = $formatter->mergeSectionsWithValues($sections, [], 1)[0]['fields'][0];

        $this->assertNull($field['value'], 'Null values should remain null');
    }
}
