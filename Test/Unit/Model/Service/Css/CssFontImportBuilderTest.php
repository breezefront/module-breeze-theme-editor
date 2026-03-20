<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service\Css;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssFontImportBuilder;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssValueFormatter;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;

/**
 * @covers \Swissup\BreezeThemeEditor\Model\Service\Css\CssFontImportBuilder
 */
class CssFontImportBuilderTest extends TestCase
{
    private CssFontImportBuilder $builder;

    protected function setUp(): void
    {
        $variableBuilder = new CssVariableBuilder(
            new CssValueFormatter(
                new ColorFormatResolver(new ColorConverter())
            )
        );
        $this->builder = new CssFontImportBuilder($variableBuilder);
    }

    private function makeFieldMap(array $overrides = []): array
    {
        return [
            'typography.heading_font' => array_merge([
                'type'      => 'font_picker',
                'default'   => 'Georgia',
                '_selector' => ':root',
                'options'   => [
                    ['value' => 'Roboto',  'url' => 'https://fonts.googleapis.com/css?family=Roboto'],
                    ['value' => 'Georgia', 'url' => ''],
                    ['value' => 'Lato',    'url' => 'https://fonts.googleapis.com/css?family=Lato'],
                ],
            ], $overrides),
        ];
    }

    // -----------------------------------------------------------------------
    // Basic URL collection
    // -----------------------------------------------------------------------

    public function testReturnsExternalUrlForMatchingFontValue(): void
    {
        $fieldMap = $this->makeFieldMap();

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'heading_font', 'value' => 'Roboto'],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap);

        $this->assertCount(1, $urls);
        $this->assertSame('https://fonts.googleapis.com/css?family=Roboto', $urls[0]);
    }

    public function testSkipsOptionWithEmptyUrl(): void
    {
        $fieldMap = $this->makeFieldMap();

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'heading_font', 'value' => 'Georgia'],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap);

        $this->assertEmpty($urls);
    }

    public function testSkipsNonHttpUrl(): void
    {
        $fieldMap = [
            'typography.font' => [
                'type'      => 'font_picker',
                'default'   => 'serif',
                '_selector' => ':root',
                'options'   => [
                    ['value' => 'MyFont', 'url' => '/static/fonts/my-font.css'],
                ],
            ],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'font', 'value' => 'MyFont'],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap);

        $this->assertEmpty($urls);
    }

    // -----------------------------------------------------------------------
    // Deduplication
    // -----------------------------------------------------------------------

    public function testDeduplicatesSameUrlFromTwoFields(): void
    {
        $sharedUrl = 'https://fonts.googleapis.com/css?family=Roboto';

        $fieldMap = [
            'typography.heading_font' => [
                'type'      => 'font_picker',
                'default'   => 'serif',
                '_selector' => ':root',
                'options'   => [['value' => 'Roboto', 'url' => $sharedUrl]],
            ],
            'typography.body_font' => [
                'type'      => 'font_picker',
                'default'   => 'serif',
                '_selector' => ':root',
                'options'   => [['value' => 'Roboto', 'url' => $sharedUrl]],
            ],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'heading_font', 'value' => 'Roboto'],
            ['section_code' => 'typography', 'setting_code' => 'body_font',    'value' => 'Roboto'],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap);

        $this->assertCount(1, $urls);
    }

    public function testPreservesOrderOfFirstAppearance(): void
    {
        $urlA = 'https://fonts.googleapis.com/css?family=Lato';
        $urlB = 'https://fonts.googleapis.com/css?family=Roboto';

        $fieldMap = [
            'typography.a' => [
                'type' => 'font_picker', 'default' => 'serif', '_selector' => ':root',
                'options' => [['value' => 'Lato', 'url' => $urlA]],
            ],
            'typography.b' => [
                'type' => 'font_picker', 'default' => 'serif', '_selector' => ':root',
                'options' => [['value' => 'Roboto', 'url' => $urlB]],
            ],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'a', 'value' => 'Lato'],
            ['section_code' => 'typography', 'setting_code' => 'b', 'value' => 'Roboto'],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap);

        $this->assertSame([$urlA, $urlB], $urls);
    }

    // -----------------------------------------------------------------------
    // Skip conditions
    // -----------------------------------------------------------------------

    public function testSkipsValueEqualToDefault(): void
    {
        $fieldMap = [
            'typography.font' => [
                'type'      => 'font_picker',
                'default'   => 'Roboto',
                '_selector' => ':root',
                'options'   => [
                    ['value' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css?family=Roboto'],
                ],
            ],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'font', 'value' => 'Roboto'],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap);

        $this->assertEmpty($urls);
    }

    public function testSkipsPaletteSectionValues(): void
    {
        $values = [
            ['section_code' => '_palette', 'setting_code' => '--color-brand-primary', 'value' => 'Roboto'],
        ];

        $urls = $this->builder->buildFontImports($values, [], []);

        $this->assertEmpty($urls);
    }

    public function testSkipsEmptyValue(): void
    {
        $fieldMap = $this->makeFieldMap();

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'heading_font', 'value' => ''],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap);

        $this->assertEmpty($urls);
    }

    public function testSkipsNonFontPickerFieldType(): void
    {
        $fieldMap = [
            'globals.color' => [
                'type'      => 'color',
                'default'   => '#000',
                '_selector' => ':root',
                'options'   => [
                    ['value' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css?family=Roboto'],
                ],
            ],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'color', 'value' => 'Roboto'],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap);

        $this->assertEmpty($urls);
    }

    public function testSkipsUnknownFieldKey(): void
    {
        $values = [
            ['section_code' => 'unknown', 'setting_code' => 'key', 'value' => 'Roboto'],
        ];

        $urls = $this->builder->buildFontImports($values, [], []);

        $this->assertEmpty($urls);
    }

    // -----------------------------------------------------------------------
    // font_palette config lookup
    // -----------------------------------------------------------------------

    public function testUsesFontPaletteOptionsFromConfig(): void
    {
        $paletteUrl = 'https://fonts.googleapis.com/css?family=Montserrat';

        $config = [
            'font_palettes' => [
                'primary' => [
                    'options' => [
                        ['value' => 'Montserrat', 'url' => $paletteUrl],
                    ],
                ],
            ],
        ];

        $fieldMap = [
            'typography.font' => [
                'type'         => 'font_picker',
                'default'      => 'Roboto',
                'font_palette' => 'primary',
                '_selector'    => ':root',
                // No 'options' key — must use config['font_palettes']['primary']['options']
            ],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'font', 'value' => 'Montserrat'],
        ];

        $urls = $this->builder->buildFontImports($values, $fieldMap, $config);

        $this->assertCount(1, $urls);
        $this->assertSame($paletteUrl, $urls[0]);
    }

    public function testEmptyResultWhenNoValues(): void
    {
        $urls = $this->builder->buildFontImports([], [], []);

        $this->assertSame([], $urls);
    }
}
