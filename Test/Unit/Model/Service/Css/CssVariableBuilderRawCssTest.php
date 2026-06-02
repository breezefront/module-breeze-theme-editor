<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service\Css;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssValueFormatter;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;

/**
 * @covers \Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder::buildRawCssBlocks
 */
class CssVariableBuilderRawCssTest extends TestCase
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

    private function makeFieldMap(array $overrides = []): array
    {
        return $this->builder->buildFieldMap([
            array_merge([
                'id'       => 'additional_styles',
                'settings' => [
                    array_merge([
                        'id'      => 'additional_css',
                        'type'    => 'code',
                        'default' => '',
                    ], $overrides['setting'] ?? []),
                ],
            ], $overrides['section'] ?? []),
        ]);
    }

    // -----------------------------------------------------------------------
    // buildRawCssBlocks — happy paths
    // -----------------------------------------------------------------------

    public function testReturnsRawCssForCodeFieldWithoutProperty(): void
    {
        $fieldMap = $this->makeFieldMap();
        $values   = [
            ['section_code' => 'additional_styles', 'setting_code' => 'additional_css', 'value' => '.bte-test-hello { color: green; }'],
        ];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertArrayHasKey('additional_styles.additional_css', $blocks);
        $this->assertSame('.bte-test-hello { color: green; }', $blocks['additional_styles.additional_css']);
    }

    public function testMultipleCodeFieldsAreAllCollected(): void
    {
        $fieldMap = $this->builder->buildFieldMap([
            [
                'id'       => 'custom',
                'settings' => [
                    ['id' => 'header_css', 'type' => 'code', 'default' => ''],
                    ['id' => 'footer_css', 'type' => 'code', 'default' => ''],
                ],
            ],
        ]);
        $values = [
            ['section_code' => 'custom', 'setting_code' => 'header_css', 'value' => '.header { display: flex; }'],
            ['section_code' => 'custom', 'setting_code' => 'footer_css', 'value' => '.footer { color: red; }'],
        ];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertCount(2, $blocks);
        $this->assertArrayHasKey('custom.header_css', $blocks);
        $this->assertArrayHasKey('custom.footer_css', $blocks);
    }

    // -----------------------------------------------------------------------
    // buildRawCssBlocks — exclusion rules
    // -----------------------------------------------------------------------

    public function testSkipsCodeFieldWithProperty(): void
    {
        $fieldMap = $this->builder->buildFieldMap([
            [
                'id'       => 's',
                'settings' => [
                    ['id' => 'f', 'type' => 'code', 'property' => '--my-var', 'default' => ''],
                ],
            ],
        ]);
        $values = [['section_code' => 's', 'setting_code' => 'f', 'value' => '.x { color: red; }']];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertEmpty($blocks, 'code field with property must not be treated as raw CSS');
    }

    public function testSkipsNonCodeFieldWithoutProperty(): void
    {
        $fieldMap = $this->builder->buildFieldMap([
            [
                'id'       => 's',
                'settings' => [
                    ['id' => 'f', 'type' => 'text', 'default' => ''],
                ],
            ],
        ]);
        $values = [['section_code' => 's', 'setting_code' => 'f', 'value' => 'hello']];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertEmpty($blocks, 'non-code field without property must not be in raw CSS blocks');
    }

    public function testSkipsEmptyValue(): void
    {
        $fieldMap = $this->makeFieldMap();
        $values   = [['section_code' => 'additional_styles', 'setting_code' => 'additional_css', 'value' => '']];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testSkipsNullValue(): void
    {
        $fieldMap = $this->makeFieldMap();
        $values   = [['section_code' => 'additional_styles', 'setting_code' => 'additional_css', 'value' => null]];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testSkipsPaletteSection(): void
    {
        $fieldMap = $this->makeFieldMap();
        $values   = [['section_code' => '_palette', 'setting_code' => 'additional_css', 'value' => '.x{}']];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testSkipsValueEqualToDefault(): void
    {
        $fieldMap = $this->makeFieldMap(['setting' => ['default' => '.bte-hello { color: green; }']]);
        $values   = [['section_code' => 'additional_styles', 'setting_code' => 'additional_css', 'value' => '.bte-hello { color: green; }']];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertEmpty($blocks, 'value equal to default should be skipped');
    }

    public function testSkipsUnknownFieldKey(): void
    {
        $fieldMap = $this->makeFieldMap();
        $values   = [['section_code' => 'unknown_section', 'setting_code' => 'unknown_field', 'value' => '.x{}']];

        $blocks = $this->builder->buildRawCssBlocks($values, $fieldMap);

        $this->assertEmpty($blocks);
    }

    public function testReturnsEmptyArrayWhenNoValues(): void
    {
        $fieldMap = $this->makeFieldMap();

        $blocks = $this->builder->buildRawCssBlocks([], $fieldMap);

        $this->assertSame([], $blocks);
    }

    public function testReturnsEmptyArrayWhenFieldMapIsEmpty(): void
    {
        $values = [['section_code' => 'additional_styles', 'setting_code' => 'additional_css', 'value' => '.x{}']];

        $blocks = $this->builder->buildRawCssBlocks($values, []);

        $this->assertSame([], $blocks);
    }
}
