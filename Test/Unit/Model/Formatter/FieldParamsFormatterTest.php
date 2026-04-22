<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Formatter;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Formatter\FieldParamsFormatter;

/**
 * Tests for FieldParamsFormatter::formatParams() — one test per concrete params type.
 *
 * Verifies that:
 *  - Each field type emits the correct params structure
 *  - The '_fieldType' key is always set (used by FieldParamsTypeResolver)
 *  - Types with no relevant params return null
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Formatter\FieldParamsFormatter::formatParams
 */
class FieldParamsFormatterTest extends TestCase
{
    private FieldParamsFormatter $formatter;

    protected function setUp(): void
    {
        $this->formatter = new FieldParamsFormatter();
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorNumericParams (range / number / spacing)
    // -------------------------------------------------------------------------

    public function testRangeFieldProducesNumericParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'font_size',
            'label'   => 'Font Size',
            'type'    => 'range',
            'default' => '16',
            'min'     => 10,
            'max'     => 32,
            'step'    => 1,
            'unit'    => 'px',
        ]);

        $this->assertNotNull($params, 'range must produce params');
        $this->assertEquals('range', $params['_fieldType']);
        $this->assertEquals(10.0, $params['min']);
        $this->assertEquals(32.0, $params['max']);
        $this->assertEquals(1.0,  $params['step']);
        $this->assertEquals('px', $params['unit']);
    }

    public function testNumberFieldProducesNumericParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'columns',
            'label'   => 'Columns',
            'type'    => 'number',
            'default' => '3',
            'min'     => 1,
            'max'     => 6,
        ]);

        $this->assertNotNull($params);
        $this->assertEquals('number', $params['_fieldType']);
        $this->assertEquals(1.0, $params['min']);
        $this->assertEquals(6.0, $params['max']);
    }

    public function testSpacingFieldProducesNumericParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'padding',
            'label'   => 'Padding',
            'type'    => 'spacing',
            'default' => '8',
            'step'    => 4,
            'unit'    => 'px',
        ]);

        $this->assertNotNull($params);
        $this->assertEquals('spacing', $params['_fieldType']);
        $this->assertEquals(4.0,  $params['step']);
        $this->assertEquals('px', $params['unit']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorSelectParams (select / icon_set_picker)
    // -------------------------------------------------------------------------

    public function testSelectFieldProducesSelectParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'layout',
            'label'   => 'Layout',
            'type'    => 'select',
            'default' => 'grid',
            'options' => [
                ['value' => 'grid', 'label' => 'Grid'],
                ['value' => 'list', 'label' => 'List'],
            ],
            'maxItems' => 2,
        ]);

        $this->assertNotNull($params);
        $this->assertEquals('select', $params['_fieldType']);
        $this->assertCount(2, $params['options']);
        $this->assertEquals('grid', $params['options'][0]['value']);
        $this->assertEquals('Grid', $params['options'][0]['label']);
        $this->assertEquals(2, $params['maxItems']);
    }

    public function testIconSetPickerFieldProducesSelectParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'icons',
            'label'   => 'Icon Set',
            'type'    => 'icon_set_picker',
            'default' => 'heroicons',
            'options' => [
                ['value' => 'heroicons', 'label' => 'Heroicons', 'icon' => 'hero.svg'],
            ],
        ]);

        $this->assertNotNull($params);
        $this->assertEquals('icon_set_picker', $params['_fieldType']);
        $this->assertCount(1, $params['options']);
        $this->assertEquals('hero.svg', $params['options'][0]['icon']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorFontPickerParams
    // -------------------------------------------------------------------------

    public function testFontPickerFieldProducesFontPickerParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'          => 'base_font',
            'label'       => 'Base Font',
            'type'        => 'font_picker',
            'default'     => 'Arial',
            'options'     => [
                ['value' => 'Arial',  'label' => 'Arial'],
                ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
            ],
            'fontWeights' => ['400', '700'],
        ]);

        $this->assertNotNull($params);
        $this->assertEquals('font_picker', $params['_fieldType']);
        $this->assertCount(2, $params['options']);
        $this->assertEquals(['400', '700'], $params['fontWeights']);
        $this->assertArrayHasKey('fontStylesheets', $params);
        $this->assertCount(1, $params['fontStylesheets']);
        $this->assertEquals('Roboto', $params['fontStylesheets'][0]['value']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorSocialLinksParams
    // -------------------------------------------------------------------------

    public function testSocialLinksFieldProducesSocialLinksParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'        => 'social',
            'label'     => 'Social Links',
            'type'      => 'social_links',
            'default'   => '[]',
            'platforms' => ['facebook', 'twitter', 'instagram'],
        ]);

        $this->assertNotNull($params);
        $this->assertEquals('social_links', $params['_fieldType']);
        $this->assertEquals(['facebook', 'twitter', 'instagram'], $params['platforms']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorImageUploadParams
    // -------------------------------------------------------------------------

    public function testImageUploadFieldProducesImageUploadParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'                => 'logo',
            'label'             => 'Logo',
            'type'              => 'image_upload',
            'default'           => '',
            'sides'             => ['desktop', 'mobile'],
            'allowedExtensions' => ['jpg', 'png', 'webp'],
            'maxFileSize'       => 2048,
        ]);

        $this->assertNotNull($params);
        $this->assertEquals('image_upload', $params['_fieldType']);
        $this->assertEquals(['desktop', 'mobile'], $params['sides']);
        $this->assertEquals('.jpg,.png,.webp', $params['acceptTypes']);
        $this->assertEquals(2048, $params['maxSize']);
        $this->assertArrayNotHasKey('allowedExtensions', $params, 'Raw allowedExtensions key must not leak into params');
        $this->assertArrayNotHasKey('maxFileSize', $params, 'Raw maxFileSize key must not leak into params');
    }

    public function testImageUploadWithDotPrefixedExtensionsIsIdempotent(): void
    {
        $params = $this->formatter->formatParams([
            'id'                => 'logo',
            'label'             => 'Logo',
            'type'              => 'image_upload',
            'default'           => '',
            'allowedExtensions' => ['.jpg', '.png'],
        ]);

        $this->assertEquals('.jpg,.png', $params['acceptTypes']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorCodeParams
    // -------------------------------------------------------------------------

    public function testCodeFieldProducesCodeParams(): void
    {
        $params = $this->formatter->formatParams([
            'id'       => 'custom_css',
            'label'    => 'Custom CSS',
            'type'     => 'code',
            'default'  => '',
            'language' => 'css',
            'fallback' => '/* default */',
        ]);

        $this->assertNotNull($params);
        $this->assertEquals('code', $params['_fieldType']);
        $this->assertEquals('css',           $params['language']);
        $this->assertEquals('/* default */', $params['fallback']);
    }

    // -------------------------------------------------------------------------
    // Types that emit null params
    // -------------------------------------------------------------------------

    /**
     * @dataProvider nullParamsTypeProvider
     */
    public function testFieldTypesWithoutParamsReturnNull(string $type): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'test_field',
            'label'   => 'Test',
            'type'    => $type,
            'default' => 'value',
        ]);

        $this->assertNull($params, "Field type '{$type}' must return null params when no type-specific data is present");
    }

    public static function nullParamsTypeProvider(): array
    {
        return [
            'color'    => ['color'],
            'text'     => ['text'],
            'textarea' => ['textarea'],
            'checkbox' => ['checkbox'],
            'toggle'   => ['toggle'],
        ];
    }
}
