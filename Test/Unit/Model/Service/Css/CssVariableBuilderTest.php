<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service\Css;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssValueFormatter;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;

/**
 * @covers \Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder
 */
class CssVariableBuilderTest extends TestCase
{
    private CssVariableBuilder $builder;

    protected function setUp(): void
    {
        $this->builder = new CssVariableBuilder(
            new CssValueFormatter(
                new ColorFormatResolver(new ColorConverter())
            )
        );
    }

    // -----------------------------------------------------------------------
    // buildFieldMap
    // -----------------------------------------------------------------------

    public function testBuildFieldMapFlattensSettingsWithDefaultSelector(): void
    {
        $sections = [
            [
                'id' => 'globals',
                'settings' => [
                    ['id' => 'text_color', 'property' => '--text-color'],
                ],
            ],
        ];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertArrayHasKey('globals.text_color', $map);
        $this->assertSame(':root', $map['globals.text_color']['_selector']);
    }

    public function testBuildFieldMapUsesSectionSelector(): void
    {
        $sections = [
            [
                'id'       => 'layout',
                'selector' => '.container',
                'settings' => [
                    ['id' => 'max_width', 'property' => '--max-width'],
                ],
            ],
        ];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertSame('.container', $map['layout.max_width']['_selector']);
    }

    public function testBuildFieldMapSettingLevelSelectorOverridesSectionSelector(): void
    {
        $sections = [
            [
                'id'       => 'layout',
                'selector' => '.container',
                'settings' => [
                    ['id' => 'bg', 'property' => '--bg', 'selector' => ':root'],
                ],
            ],
        ];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertSame(':root', $map['layout.bg']['_selector']);
    }

    public function testBuildFieldMapArraySelectorJoinedWithComma(): void
    {
        $sections = [
            [
                'id'       => 'layout',
                'selector' => ['.foo', '.bar'],
                'settings' => [
                    ['id' => 'gap', 'property' => '--gap'],
                ],
            ],
        ];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertSame('.foo, .bar', $map['layout.gap']['_selector']);
    }

    public function testBuildFieldMapMultipleSectionsAndSettings(): void
    {
        $sections = [
            [
                'id'       => 'a',
                'settings' => [
                    ['id' => 'x', 'property' => '--x'],
                    ['id' => 'y', 'property' => '--y'],
                ],
            ],
            [
                'id'       => 'b',
                'settings' => [
                    ['id' => 'z', 'property' => '--z'],
                ],
            ],
        ];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertCount(3, $map);
        $this->assertArrayHasKey('a.x', $map);
        $this->assertArrayHasKey('a.y', $map);
        $this->assertArrayHasKey('b.z', $map);
    }

    // -----------------------------------------------------------------------
    // buildSelectorBlocks
    // -----------------------------------------------------------------------

    public function testBuildSelectorBlocksBasicRootEntry(): void
    {
        $fieldMap = [
            'globals.text_color' => [
                'property'  => '--text-color',
                'type'      => 'text',
                'default'   => '#000',
                '_selector' => ':root',
            ],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'text_color', 'value' => 'red'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertArrayHasKey(':root', $blocks);
        $this->assertStringContainsString('--text-color: red', $blocks[':root'][0]);
    }

    public function testBuildSelectorBlocksSkipsPaletteSection(): void
    {
        $fieldMap = [
            '_palette.--color-brand-primary' => [
                'property'  => '--color-brand-primary',
                '_selector' => ':root',
            ],
        ];

        $values = [
            ['section_code' => '_palette', 'setting_code' => '--color-brand-primary', 'value' => '#fff'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testBuildSelectorBlocksSkipsNullValue(): void
    {
        $fieldMap = [
            'globals.size' => ['property' => '--size', '_selector' => ':root'],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'size', 'value' => null],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testBuildSelectorBlocksSkipsEmptyValue(): void
    {
        $fieldMap = [
            'globals.size' => ['property' => '--size', '_selector' => ':root'],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'size', 'value' => ''],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testBuildSelectorBlocksSkipsValueEqualToDefault(): void
    {
        $fieldMap = [
            'globals.size' => ['property' => '--size', 'default' => '16px', '_selector' => ':root'],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'size', 'value' => '16px'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testBuildSelectorBlocksSkipsFieldWithoutProperty(): void
    {
        $fieldMap = [
            'globals.orphan' => ['_selector' => ':root'],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'orphan', 'value' => 'something'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testBuildSelectorBlocksSupportsLegacyCssVar(): void
    {
        $fieldMap = [
            'buttons.bg' => [
                'css_var'   => '--btn-bg',
                'default'   => '#ccc',
                '_selector' => ':root',
            ],
        ];

        $values = [
            ['section_code' => 'buttons', 'setting_code' => 'bg', 'value' => '#fff'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertStringContainsString('--btn-bg:', $blocks[':root'][0]);
    }

    public function testBuildSelectorBlocksCustomSelector(): void
    {
        $fieldMap = [
            'layout.max_width' => [
                'property'  => '--max-width',
                'default'   => '1260px',
                '_selector' => '.container',
            ],
        ];

        $values = [
            ['section_code' => 'layout', 'setting_code' => 'max_width', 'value' => '1440px'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertArrayHasKey('.container', $blocks);
        $this->assertStringContainsString('--max-width: 1440px', $blocks['.container'][0]);
        $this->assertArrayNotHasKey(':root', $blocks);
    }

    public function testBuildSelectorBlocksImportantFlag(): void
    {
        $fieldMap = [
            'globals.size' => [
                'property'  => '--size',
                'default'   => '14px',
                'important' => true,
                '_selector' => ':root',
            ],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'size', 'value' => '16px'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertStringContainsString('!important', $blocks[':root'][0]);
    }

    public function testBuildSelectorBlocksColorCommentAdded(): void
    {
        $fieldMap = [
            'globals.bg' => [
                'property'  => '--bg',
                'type'      => 'color',
                'default'   => '#000',
                '_selector' => ':root',
            ],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'bg', 'value' => '#ffffff'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertStringContainsString('/* #ffffff */', $blocks[':root'][0]);
    }

    public function testBuildSelectorBlocksSkipsUnknownKey(): void
    {
        $fieldMap = [];

        $values = [
            ['section_code' => 'unknown', 'setting_code' => 'key', 'value' => 'x'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    // -----------------------------------------------------------------------
    // buildPaletteVarsToEmit
    // -----------------------------------------------------------------------

    public function testBuildPaletteVarsToEmitFromDbRows(): void
    {
        $values = [
            ['section_code' => '_palette', 'setting_code' => '--color-brand-primary', 'value' => '#1979c3'],
        ];

        $result = $this->builder->buildPaletteVarsToEmit($values, [], []);

        $this->assertArrayHasKey('--color-brand-primary', $result);
        $this->assertSame('#1979c3', $result['--color-brand-primary']);
    }

    public function testBuildPaletteVarsToEmitSkipsEmptyPaletteValue(): void
    {
        $values = [
            ['section_code' => '_palette', 'setting_code' => '--color-brand-primary', 'value' => ''],
        ];

        $result = $this->builder->buildPaletteVarsToEmit($values, [], []);

        $this->assertArrayNotHasKey('--color-brand-primary', $result);
    }

    public function testBuildPaletteVarsToEmitAddsConfigDefaultForReferencedVar(): void
    {
        $config = [
            'palettes' => [
                [
                    'groups' => [
                        [
                            'colors' => [
                                ['property' => '--color-brand-primary', 'default' => '#aabbcc'],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $fieldMap = [
            'buttons.bg' => ['type' => 'color', '_selector' => ':root'],
        ];

        $values = [
            ['section_code' => 'buttons', 'setting_code' => 'bg', 'value' => '--color-brand-primary'],
        ];

        $result = $this->builder->buildPaletteVarsToEmit($values, $config, $fieldMap);

        $this->assertArrayHasKey('--color-brand-primary', $result);
        $this->assertSame('#aabbcc', $result['--color-brand-primary']);
    }

    public function testBuildPaletteVarsToEmitDoesNotOverwriteDbValueWithDefault(): void
    {
        $config = [
            'palettes' => [
                [
                    'groups' => [
                        [
                            'colors' => [
                                ['property' => '--color-brand-primary', 'default' => '#aabbcc'],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $fieldMap = [
            'buttons.bg' => ['type' => 'color', '_selector' => ':root'],
        ];

        $values = [
            ['section_code' => '_palette', 'setting_code' => '--color-brand-primary', 'value' => '#1979c3'],
            ['section_code' => 'buttons',  'setting_code' => 'bg',                    'value' => '--color-brand-primary'],
        ];

        $result = $this->builder->buildPaletteVarsToEmit($values, $config, $fieldMap);

        // DB value must win over config default
        $this->assertSame('#1979c3', $result['--color-brand-primary']);
    }

    public function testBuildPaletteVarsToEmitIgnoresNonColorTypeForDefaultFallback(): void
    {
        $config = [
            'palettes' => [
                [
                    'groups' => [
                        [
                            'colors' => [
                                ['property' => '--primary-font', 'default' => 'Roboto'],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        // font_picker field referencing --primary-font must NOT cause a palette emission
        $fieldMap = [
            'typography.font' => ['type' => 'font_picker', '_selector' => ':root'],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'font', 'value' => '--primary-font'],
        ];

        $result = $this->builder->buildPaletteVarsToEmit($values, $config, $fieldMap);

        $this->assertArrayNotHasKey('--primary-font', $result);
    }

    // -----------------------------------------------------------------------
    // valuesAreEqual / normalizeValue
    // -----------------------------------------------------------------------

    public function testValuesAreEqualSameStrings(): void
    {
        $this->assertTrue($this->builder->valuesAreEqual('16px', '16px'));
    }

    public function testValuesAreEqualDifferentStrings(): void
    {
        $this->assertFalse($this->builder->valuesAreEqual('16px', '14px'));
    }

    public function testValuesAreEqualRgbWrapperIgnored(): void
    {
        $this->assertTrue($this->builder->valuesAreEqual('rgb(25, 121, 195)', '25, 121, 195'));
    }

    public function testValuesAreEqualRgbaWrapperIgnored(): void
    {
        $this->assertTrue($this->builder->valuesAreEqual('rgba(25, 121, 195, 0.5)', '25, 121, 195, 0.5'));
    }

    public function testValuesAreEqualBoolTrueEqualsOne(): void
    {
        $this->assertTrue($this->builder->valuesAreEqual(true, '1'));
    }

    public function testValuesAreEqualBoolFalseEqualsZero(): void
    {
        $this->assertTrue($this->builder->valuesAreEqual(false, '0'));
    }

    public function testValuesAreEqualNumericStringAndInt(): void
    {
        $this->assertTrue($this->builder->valuesAreEqual(42, '42'));
    }

    public function testNormalizeValueTrimsWhitespace(): void
    {
        $this->assertSame('hello', $this->builder->normalizeValue('  hello  '));
    }
}
