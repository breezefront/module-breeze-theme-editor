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
 * Tests for auto-generation of the _font_palette synthetic section.
 *
 * Covers:
 *   - SectionFormatter::mergeFontPaletteRolesAsFields()
 *   - Backward-compat guard in mergeSectionsWithValues()
 *   - collectFontPaletteProperties() (via guard)
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter
 */
class SectionFormatterFontPaletteTest extends TestCase
{
    /** Default font palettes for tests */
    private array $defaultFontPalettes = [
        [
            'id'      => 'default',
            'label'   => 'Default Font Palette',
            'options' => [
                ['value' => 'system-ui, sans-serif', 'label' => 'System UI', 'url' => null],
                ['value' => 'Arial, sans-serif',     'label' => 'Arial',     'url' => null],
            ],
            'fonts' => [
                ['id' => 'primary',   'label' => 'Primary',   'property' => '--primary-font',   'default' => 'system-ui, sans-serif'],
                ['id' => 'secondary', 'label' => 'Secondary', 'property' => '--secondary-font',  'default' => 'system-ui, sans-serif'],
            ],
        ],
    ];

    private function buildFormatter(array $fontPaletteConfig = []): SectionFormatter
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
        $configProvider->method('getConfigurationWithInheritance')->willReturn([
            'font_palettes' => $fontPaletteConfig,
        ]);

        return new SectionFormatter($configProvider, $colorPipeline, $serializer);
    }

    // -------------------------------------------------------------------------
    // Tests — mergeFontPaletteRolesAsFields()
    // -------------------------------------------------------------------------

    public function testFontPaletteSectionIsGenerated(): void
    {
        $formatter   = $this->buildFormatter();
        $fontSection = $formatter->mergeFontPaletteRolesAsFields($this->defaultFontPalettes, []);

        $this->assertNotNull($fontSection, '_font_palette section must be returned when palettes are defined');
        $this->assertSame('_font_palette', $fontSection['code']);
    }

    public function testFontPaletteSectionAbsentWhenNoPalettes(): void
    {
        $formatter   = $this->buildFormatter();
        $fontSection = $formatter->mergeFontPaletteRolesAsFields([], []);

        $this->assertNull($fontSection, '_font_palette section must be null when no font palettes defined');
    }

    public function testFontPaletteSectionFieldsHaveCorrectStructure(): void
    {
        $formatter   = $this->buildFormatter();
        $fontSection = $formatter->mergeFontPaletteRolesAsFields($this->defaultFontPalettes, []);

        $this->assertNotNull($fontSection);

        $fields = $fontSection['fields'];
        $this->assertCount(2, $fields);

        $primary = $fields[0];
        $this->assertSame('primary-font',          $primary['code']);
        $this->assertSame('FONT_PICKER',            $primary['type']);
        $this->assertSame('--primary-font',         $primary['property']);
        $this->assertSame('default',                $primary['fontPalette']);
        $this->assertSame('Primary',                $primary['label']);
        $this->assertSame('system-ui, sans-serif',  $primary['default']);
        $this->assertNull($primary['value'],        'value must be null when not saved');
        $this->assertFalse($primary['isModified'],  'isModified must be false when value is null');
    }

    public function testSavedValueAppearsInFontPaletteField(): void
    {
        $formatter   = $this->buildFormatter();
        $valuesMap   = ['_font_palette.primary-font' => 'Arial, sans-serif'];
        $fontSection = $formatter->mergeFontPaletteRolesAsFields($this->defaultFontPalettes, $valuesMap);

        $primary = array_values(array_filter(
            $fontSection['fields'],
            fn($f) => $f['code'] === 'primary-font'
        ))[0];

        $this->assertSame('Arial, sans-serif', $primary['value']);
        $this->assertTrue($primary['isModified'], 'isModified must be true when saved value differs from default');
    }

    public function testIsModifiedFalseWhenValueEqualsDefault(): void
    {
        $formatter   = $this->buildFormatter();
        $valuesMap   = ['_font_palette.primary-font' => 'system-ui, sans-serif'];
        $fontSection = $formatter->mergeFontPaletteRolesAsFields($this->defaultFontPalettes, $valuesMap);

        $primary = array_values(array_filter(
            $fontSection['fields'],
            fn($f) => $f['code'] === 'primary-font'
        ))[0];

        $this->assertFalse($primary['isModified'], 'isModified must be false when saved value equals default');
    }

    // -------------------------------------------------------------------------
    // Tests — backward-compat guard in mergeSectionsWithValues()
    // -------------------------------------------------------------------------

    public function testLegacyRoleEntriesInSectionsAreSkipped(): void
    {
        // Config reports '--primary-font' as an auto-generated property
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(new ColorFormatResolver($colorConverter), new ColorFormatter($colorConverter));
        $serializer     = $this->createMock(SerializerInterface::class);

        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn([]);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([
            'font_palettes' => [
                'default' => ['fonts' => [
                    ['id' => 'primary', 'label' => 'Primary', 'property' => '--primary-font', 'default' => 'system-ui'],
                ]],
            ],
        ]);

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);

        $sections = [[
            'id'       => 'typography',
            'name'     => 'Typography',
            'settings' => [
                // Legacy role entry — must be skipped
                ['id' => 'primary-font', 'label' => 'Primary Font', 'type' => 'font_picker',
                 'property' => '--primary-font', 'font_palette' => 'default', 'default' => 'system-ui, sans-serif'],
                // Non-role field — must remain
                ['id' => 'font-size', 'label' => 'Font Size', 'type' => 'range', 'default' => '16'],
            ],
        ]];

        $result     = $formatter->mergeSectionsWithValues($sections, [], 1);
        $fieldCodes = array_column($result[0]['fields'], 'code');

        $this->assertNotContains('primary-font', $fieldCodes, 'Legacy role entry must be skipped');
        $this->assertContains('font-size', $fieldCodes, 'Non-role fields must still be included');
    }

    public function testFontPickerWithoutPropertyIsNotSkipped(): void
    {
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(new ColorFormatResolver($colorConverter), new ColorFormatter($colorConverter));
        $serializer     = $this->createMock(SerializerInterface::class);

        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn([]);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([
            'font_palettes' => [
                'default' => ['fonts' => [
                    ['id' => 'primary', 'label' => 'Primary', 'property' => '--primary-font', 'default' => 'system-ui'],
                ]],
            ],
        ]);

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);

        $sections = [[
            'id'   => 'typography', 'name' => 'Typography',
            'settings' => [
                ['id' => 'custom-font', 'label' => 'Custom Font', 'type' => 'font_picker',
                 'font_palette' => 'default', 'default' => 'Arial, sans-serif'],
                // no 'property' key → must NOT be skipped
            ],
        ]];

        $result     = $formatter->mergeSectionsWithValues($sections, [], 1);
        $fieldCodes = array_column($result[0]['fields'], 'code');

        $this->assertContains('custom-font', $fieldCodes, 'font_picker without property must not be skipped');
    }

    public function testFontPickerWithUnrelatedPropertyIsNotSkipped(): void
    {
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(new ColorFormatResolver($colorConverter), new ColorFormatter($colorConverter));
        $serializer     = $this->createMock(SerializerInterface::class);

        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn([]);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([
            'font_palettes' => [
                'default' => ['fonts' => [
                    ['id' => 'primary', 'label' => 'Primary', 'property' => '--primary-font', 'default' => 'system-ui'],
                ]],
            ],
        ]);

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);

        $sections = [[
            'id'   => 'typography', 'name' => 'Typography',
            'settings' => [
                ['id' => 'base-font', 'label' => 'Base Font', 'type' => 'font_picker',
                 'property' => '--base-font', 'font_palette' => 'default', 'default' => 'Arial, sans-serif'],
                // --base-font is NOT in palette roles → must not be skipped
            ],
        ]];

        $result     = $formatter->mergeSectionsWithValues($sections, [], 1);
        $fieldCodes = array_column($result[0]['fields'], 'code');

        $this->assertContains('base-font', $fieldCodes, 'font_picker with unrelated property must not be skipped');
    }
}
