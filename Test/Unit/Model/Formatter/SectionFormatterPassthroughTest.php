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
 * Tests for the fontPalette field passthrough in SectionFormatter::mergeSectionsWithValues().
 *
 * Verifies that font_palette id from settings.json is correctly forwarded
 * to the GraphQL field as `fontPalette` for font_picker fields only.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter::mergeSectionsWithValues
 */
class SectionFormatterPassthroughTest extends TestCase
{
    private SectionFormatter $formatter;

    protected function setUp(): void
    {
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(
            new ColorFormatResolver($colorConverter),
            new ColorFormatter($colorConverter)
        );
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer->method('serialize')->willReturnCallback(fn($v) => json_encode($v));

        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn([]);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([]);

        $this->formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);
    }

    private function resolveFirstField(array $setting): array
    {
        $sections = [[
            'id'       => 'typography',
            'name'     => 'Typography',
            'settings' => [$setting],
        ]];

        $result = $this->formatter->mergeSectionsWithValues($sections, [], 1);
        return $result[0]['fields'][0];
    }

    /**
     * Test 1: font_picker with font_palette → fontPalette present in field output
     */
    public function testFontPickerWithFontPaletteGetsFontPaletteField(): void
    {
        $field = $this->resolveFirstField([
            'id'           => 'base_font',
            'label'        => 'Base Font',
            'type'         => 'font_picker',
            'default'      => 'Arial',
            'font_palette' => 'default',
        ]);

        $this->assertArrayHasKey('fontPalette', $field);
        $this->assertSame('default', $field['fontPalette']);
    }

    /**
     * Test 2: font_picker without font_palette → fontPalette absent
     */
    public function testFontPickerWithoutFontPaletteHasNoFontPaletteField(): void
    {
        $field = $this->resolveFirstField([
            'id'      => 'base_font',
            'label'   => 'Base Font',
            'type'    => 'font_picker',
            'default' => 'Arial',
        ]);

        $this->assertArrayNotHasKey('fontPalette', $field);
    }

    /**
     * Test 3: non-font_picker field with font_palette key → fontPalette absent
     */
    public function testNonFontPickerFieldWithFontPaletteKeyIsIgnored(): void
    {
        $field = $this->resolveFirstField([
            'id'           => 'heading_size',
            'label'        => 'Heading Size',
            'type'         => 'range',
            'default'      => '24',
            'min'          => 12,
            'max'          => 72,
            'font_palette' => 'default',
        ]);

        $this->assertArrayNotHasKey('fontPalette', $field);
    }

    /**
     * Test 4: font_palette id is passed through verbatim (non-default palette name)
     */
    public function testFontPaletteIdIsPassedThroughVerbatim(): void
    {
        $field = $this->resolveFirstField([
            'id'           => 'body_font',
            'label'        => 'Body Font',
            'type'         => 'font_picker',
            'default'      => 'Georgia',
            'font_palette' => 'brand_identity',
        ]);

        $this->assertSame('brand_identity', $field['fontPalette']);
    }
}
