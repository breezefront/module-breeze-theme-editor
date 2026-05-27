<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service\Css;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssValueFormatter;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\MediaQueryResolver;

/**
 * Tests for media query support in CssVariableBuilder.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder
 */
class CssVariableBuilderMediaTest extends TestCase
{
    private CssVariableBuilder $builder;

    protected function setUp(): void
    {
        $this->builder = new CssVariableBuilder(
            new CssValueFormatter(
                new ColorFormatResolver(new ColorConverter())
            ),
            new MediaQueryResolver()
        );
    }

    // -----------------------------------------------------------------------
    // buildFieldMap — _media resolution
    // -----------------------------------------------------------------------

    public function testBuildFieldMapNoMediaDefaultsToNull(): void
    {
        $sections = [[
            'id'       => 'globals',
            'settings' => [['id' => 'font_size', 'property' => '--font-size']],
        ]];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertArrayHasKey('globals.font_size', $map);
        $this->assertNull($map['globals.font_size']['_media']);
    }

    public function testBuildFieldMapMobileAliasResolved(): void
    {
        $sections = [[
            'id'       => 'typography',
            'settings' => [[
                'id'       => 'font_size_mobile',
                'property' => '--font-size',
                'media'    => 'mobile',
            ]],
        ]];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertSame('(max-width: 767px)', $map['typography.font_size_mobile']['_media']);
    }

    public function testBuildFieldMapTabletAliasResolved(): void
    {
        $sections = [[
            'id'       => 'layout',
            'settings' => [[
                'id'       => 'columns_gap',
                'property' => '--columns-gap',
                'media'    => 'tablet',
            ]],
        ]];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertSame('(max-width: 1023px)', $map['layout.columns_gap']['_media']);
    }

    public function testBuildFieldMapDesktopAliasResolved(): void
    {
        $sections = [[
            'id'       => 'layout',
            'settings' => [[
                'id'       => 'sidebar_width',
                'property' => '--sidebar-width',
                'media'    => 'desktop',
            ]],
        ]];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertSame('(min-width: 1024px)', $map['layout.sidebar_width']['_media']);
    }

    public function testBuildFieldMapRawQueryPassedThrough(): void
    {
        $sections = [[
            'id'       => 'layout',
            'settings' => [[
                'id'       => 'max_width',
                'property' => '--max-width',
                'media'    => '(max-width: 768px)',
            ]],
        ]];

        $map = $this->builder->buildFieldMap($sections);

        $this->assertSame('(max-width: 768px)', $map['layout.max_width']['_media']);
    }

    // -----------------------------------------------------------------------
    // buildSelectorBlocks — grouping by selector+media
    // -----------------------------------------------------------------------

    public function testBuildSelectorBlocksMediaGroupedSeparately(): void
    {
        $fieldMap = [
            'typography.font_size' => [
                'property'  => '--font-size',
                'default'   => '16px',
                '_selector' => ':root',
                '_media'    => null,
            ],
            'typography.font_size_mobile' => [
                'property'  => '--font-size',
                'default'   => '14px',
                '_selector' => ':root',
                '_media'    => '(max-width: 767px)',
            ],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'font_size',        'value' => '18px'],
            ['section_code' => 'typography', 'setting_code' => 'font_size_mobile', 'value' => '13px'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        // No-media block keyed by selector alone
        $this->assertArrayHasKey(':root', $blocks);
        // Media block keyed by "media||selector"
        $this->assertArrayHasKey('(max-width: 767px)||:root', $blocks);
    }

    public function testBuildSelectorBlocksRootNoMediaBlockContent(): void
    {
        $fieldMap = [
            'globals.font_size' => [
                'property'  => '--font-size',
                'default'   => '14px',
                '_selector' => ':root',
                '_media'    => null,
            ],
        ];

        $values = [
            ['section_code' => 'globals', 'setting_code' => 'font_size', 'value' => '18px'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $this->assertArrayHasKey(':root', $blocks);
        $this->assertStringContainsString('--font-size: 18px', $blocks[':root'][0]);
    }

    public function testBuildSelectorBlocksMediaBlockContent(): void
    {
        $fieldMap = [
            'typography.font_size_mobile' => [
                'property'  => '--font-size',
                'default'   => '16px',
                '_selector' => ':root',
                '_media'    => '(max-width: 767px)',
            ],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'font_size_mobile', 'value' => '13px'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $key = '(max-width: 767px)||:root';
        $this->assertArrayHasKey($key, $blocks);
        $this->assertStringContainsString('--font-size: 13px', $blocks[$key][0]);
    }

    public function testBuildSelectorBlocksCustomSelectorWithMedia(): void
    {
        $fieldMap = [
            'layout.columns_gap' => [
                'property'  => '--columns-gap',
                'default'   => '16px',
                '_selector' => '.columns-container',
                '_media'    => '(max-width: 767px)',
            ],
        ];

        $values = [
            ['section_code' => 'layout', 'setting_code' => 'columns_gap', 'value' => '8px'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $key = '(max-width: 767px)||.columns-container';
        $this->assertArrayHasKey($key, $blocks);
        $this->assertStringContainsString('--columns-gap: 8px', $blocks[$key][0]);
        $this->assertArrayNotHasKey(':root', $blocks);
        $this->assertArrayNotHasKey('.columns-container', $blocks);
    }

    public function testBuildSelectorBlocksMultipleVarsSameMediaGrouped(): void
    {
        $fieldMap = [
            'typography.font_size_mobile' => [
                'property'  => '--font-size',
                'default'   => '16px',
                '_selector' => ':root',
                '_media'    => '(max-width: 767px)',
            ],
            'typography.line_height_mobile' => [
                'property'  => '--line-height',
                'default'   => '1.5',
                '_selector' => ':root',
                '_media'    => '(max-width: 767px)',
            ],
        ];

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'font_size_mobile',   'value' => '13px'],
            ['section_code' => 'typography', 'setting_code' => 'line_height_mobile', 'value' => '1.4'],
        ];

        $blocks = $this->builder->buildSelectorBlocks($values, $fieldMap);

        $key = '(max-width: 767px)||:root';
        $this->assertArrayHasKey($key, $blocks);
        $this->assertCount(2, $blocks[$key]);
    }
}
