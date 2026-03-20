<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service\Css;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssValueFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;

/**
 * @covers \Swissup\BreezeThemeEditor\Model\Service\Css\CssValueFormatter
 */
class CssValueFormatterTest extends TestCase
{
    private CssValueFormatter $formatter;

    protected function setUp(): void
    {
        $this->formatter = new CssValueFormatter(
            new ColorFormatResolver(new ColorConverter())
        );
    }

    // -----------------------------------------------------------------------
    // formatValue — dispatch by type
    // -----------------------------------------------------------------------

    public function testFormatValueNullFieldReturnsEscapedString(): void
    {
        $this->assertSame('hello', $this->formatter->formatValue('hello', null));
    }

    public function testFormatValueNoTypeReturnsEscapedString(): void
    {
        $this->assertSame('hello', $this->formatter->formatValue('hello', []));
    }

    public function testFormatValueColorTypeHex(): void
    {
        $field = ['type' => 'color', 'default' => '#000000'];
        $this->assertSame('#1979c3', $this->formatter->formatValue('#1979c3', $field));
    }

    public function testFormatValueColorTypeRgbDefault(): void
    {
        // default is rgb → format resolves to 'rgb'
        $field = ['type' => 'color', 'default' => 'rgb(17, 24, 39)'];
        $this->assertSame('25, 121, 195', $this->formatter->formatValue('#1979c3', $field));
    }

    public function testFormatValueFontPickerType(): void
    {
        $field = ['type' => 'font_picker'];
        $this->assertSame('"Roboto", sans-serif', $this->formatter->formatValue('Roboto', $field));
    }

    public function testFormatValueToggleTrue(): void
    {
        $field = ['type' => 'toggle'];
        $this->assertSame('1', $this->formatter->formatValue('1', $field));
        $this->assertSame('1', $this->formatter->formatValue(true, $field));
        $this->assertSame('1', $this->formatter->formatValue(1, $field));
    }

    public function testFormatValueToggleFalse(): void
    {
        $field = ['type' => 'toggle'];
        $this->assertSame('0', $this->formatter->formatValue('0', $field));
        $this->assertSame('0', $this->formatter->formatValue(false, $field));
        $this->assertSame('0', $this->formatter->formatValue(0, $field));
    }

    public function testFormatValueCheckboxType(): void
    {
        $field = ['type' => 'checkbox'];
        $this->assertSame('1', $this->formatter->formatValue('1', $field));
        $this->assertSame('0', $this->formatter->formatValue('0', $field));
    }

    public function testFormatValueNumberType(): void
    {
        $field = ['type' => 'number'];
        $this->assertSame('42', $this->formatter->formatValue(42, $field));
        $this->assertSame('3.14', $this->formatter->formatValue(3.14, $field));
    }

    public function testFormatValueRangeType(): void
    {
        $field = ['type' => 'range'];
        $this->assertSame('100', $this->formatter->formatValue(100, $field));
    }

    public function testFormatValueTextType(): void
    {
        $field = ['type' => 'text'];
        $this->assertSame('hello world', $this->formatter->formatValue('hello world', $field));
    }

    public function testFormatValueTextareaType(): void
    {
        $field = ['type' => 'textarea'];
        $this->assertSame('line1', $this->formatter->formatValue('line1', $field));
    }

    public function testFormatValueCodeType(): void
    {
        $field = ['type' => 'code'];
        $this->assertSame('body {}', $this->formatter->formatValue('body {}', $field));
    }

    public function testFormatValueImageUploadType(): void
    {
        $field = ['type' => 'image_upload'];
        $this->assertSame('/path/to/img.png', $this->formatter->formatValue('/path/to/img.png', $field));
    }

    public function testFormatValueSpacingType(): void
    {
        $field = ['type' => 'spacing'];
        $spacing = json_encode(['top' => 10, 'right' => 20, 'bottom' => 10, 'left' => 20, 'unit' => 'px']);
        $this->assertSame('10px 20px', $this->formatter->formatValue($spacing, $field));
    }

    public function testFormatValueRepeaterType(): void
    {
        $field = ['type' => 'repeater'];
        $data = [['key' => 'val']];
        $this->assertSame(json_encode($data), $this->formatter->formatValue($data, $field));
    }

    public function testFormatValueUnknownTypeReturnsEscaped(): void
    {
        $field = ['type' => 'unknown_custom_type'];
        $this->assertSame('some value', $this->formatter->formatValue('some value', $field));
    }

    // -----------------------------------------------------------------------
    // formatColor
    // -----------------------------------------------------------------------

    public function testFormatColorHexFormatReturnsNormalizedHex(): void
    {
        $this->assertSame('#1979c3', $this->formatter->formatColor('#1979C3', 'hex'));
    }

    public function testFormatColorHexFormatNormalizesShortHex(): void
    {
        $this->assertSame('#ffffff', $this->formatter->formatColor('#fff', 'hex'));
    }

    public function testFormatColorRgbFormatConvertsHexToRgb(): void
    {
        $this->assertSame('25, 121, 195', $this->formatter->formatColor('#1979c3', 'rgb'));
    }

    public function testFormatColorRgbFormatPassesThroughRgbValue(): void
    {
        $this->assertSame('25, 121, 195', $this->formatter->formatColor('25, 121, 195', 'rgb'));
    }

    public function testFormatColorHexFormatConvertsRgbToHex(): void
    {
        $this->assertSame('#1979c3', $this->formatter->formatColor('25, 121, 195', 'hex'));
    }

    public function testFormatColorPaletteRefHexFormatNosuffix(): void
    {
        $this->assertSame('var(--color-brand-primary)', $this->formatter->formatColor('--color-brand-primary', 'hex'));
    }

    public function testFormatColorPaletteRefRgbFormatAddsSuffix(): void
    {
        $this->assertSame('var(--color-brand-primary-rgb)', $this->formatter->formatColor('--color-brand-primary', 'rgb'));
    }

    public function testFormatColorAlreadyWrappedVarPassesThrough(): void
    {
        $this->assertSame('var(--color-test)', $this->formatter->formatColor('var(--color-test)', 'hex'));
        $this->assertSame('var(--color-test)', $this->formatter->formatColor('var(--color-test)', 'rgb'));
    }

    public function testFormatColorHex8WithRgbFormatEmitsRgba(): void
    {
        // #1979c380 → ~50% opacity
        $result = $this->formatter->formatColor('#1979c380', 'rgb');
        $this->assertStringStartsWith('rgba(', $result);
        $this->assertStringContainsString('25, 121, 195', $result);
    }

    public function testFormatColorHex8WithHexFormatEmitsHex8(): void
    {
        $this->assertSame('#1979c380', $this->formatter->formatColor('#1979c380', 'hex'));
    }

    public function testFormatColorHex8FullyOpaqueWithRgbFormatEmitsRgba(): void
    {
        $result = $this->formatter->formatColor('#1979c3ff', 'rgb');
        $this->assertStringStartsWith('rgba(', $result);
    }

    public function testFormatColorUnknownValueFallsThrough(): void
    {
        $this->assertSame('transparent', $this->formatter->formatColor('transparent', 'hex'));
    }

    // -----------------------------------------------------------------------
    // formatFont
    // -----------------------------------------------------------------------

    public function testFormatFontSansSerif(): void
    {
        $this->assertSame('"Roboto", sans-serif', $this->formatter->formatFont('Roboto'));
    }

    public function testFormatFontSerif(): void
    {
        $this->assertSame('"Georgia", serif', $this->formatter->formatFont('Georgia'));
    }

    public function testFormatFontMonospace(): void
    {
        $this->assertSame('"Courier New", monospace', $this->formatter->formatFont('Courier New'));
    }

    public function testFormatFontAlreadyQuoted(): void
    {
        $this->assertSame('"Roboto", sans-serif', $this->formatter->formatFont('"Roboto", sans-serif'));
    }

    public function testFormatFontCommaSeparatedPassThrough(): void
    {
        $this->assertSame('Arial, Helvetica, sans-serif', $this->formatter->formatFont('Arial, Helvetica, sans-serif'));
    }

    public function testFormatFontPaletteRoleReference(): void
    {
        $this->assertSame('var(--primary-font)', $this->formatter->formatFont('--primary-font'));
    }

    // -----------------------------------------------------------------------
    // formatSpacing
    // -----------------------------------------------------------------------

    public function testFormatSpacingAllSame(): void
    {
        $value = json_encode(['top' => 10, 'right' => 10, 'bottom' => 10, 'left' => 10, 'unit' => 'px']);
        $this->assertSame('10px', $this->formatter->formatSpacing($value));
    }

    public function testFormatSpacingVerticalHorizontal(): void
    {
        $value = json_encode(['top' => 10, 'right' => 20, 'bottom' => 10, 'left' => 20, 'unit' => 'px']);
        $this->assertSame('10px 20px', $this->formatter->formatSpacing($value));
    }

    public function testFormatSpacingThreeValues(): void
    {
        $value = json_encode(['top' => 5, 'right' => 10, 'bottom' => 15, 'left' => 10, 'unit' => 'rem']);
        $this->assertSame('5rem 10rem 15rem', $this->formatter->formatSpacing($value));
    }

    public function testFormatSpacingFourValues(): void
    {
        $value = json_encode(['top' => 1, 'right' => 2, 'bottom' => 3, 'left' => 4, 'unit' => 'px']);
        $this->assertSame('1px 2px 3px 4px', $this->formatter->formatSpacing($value));
    }

    public function testFormatSpacingAcceptsArray(): void
    {
        $value = ['top' => 0, 'right' => 0, 'bottom' => 0, 'left' => 0, 'unit' => 'px'];
        $this->assertSame('0px', $this->formatter->formatSpacing($value));
    }

    public function testFormatSpacingInvalidJsonReturnsEscaped(): void
    {
        $this->assertSame('not-json', $this->formatter->formatSpacing('not-json'));
    }

    public function testFormatSpacingNonArrayNonStringReturnsZero(): void
    {
        $this->assertSame('0', $this->formatter->formatSpacing(null));
    }

    // -----------------------------------------------------------------------
    // formatRepeater
    // -----------------------------------------------------------------------

    public function testFormatRepeaterStringPassesThrough(): void
    {
        $json = '[{"key":"val"}]';
        $this->assertSame($json, $this->formatter->formatRepeater($json));
    }

    public function testFormatRepeaterArrayEncodesJson(): void
    {
        $data = [['key' => 'val']];
        $this->assertSame(json_encode($data), $this->formatter->formatRepeater($data));
    }

    public function testFormatRepeaterNullReturnsEmpty(): void
    {
        $this->assertSame('', $this->formatter->formatRepeater(null));
    }

    // -----------------------------------------------------------------------
    // escapeValue
    // -----------------------------------------------------------------------

    public function testEscapeValueNeutralString(): void
    {
        $this->assertSame('hello', $this->formatter->escapeValue('hello'));
    }

    public function testEscapeValueCommentOpenInjection(): void
    {
        $this->assertSame('/ * evil', $this->formatter->escapeValue('/* evil'));
    }

    public function testEscapeValueCommentCloseInjection(): void
    {
        $this->assertSame('* / evil', $this->formatter->escapeValue('*/ evil'));
    }

    public function testEscapeValueBothCommentDelimiters(): void
    {
        $this->assertSame('/ * x * /', $this->formatter->escapeValue('/* x */'));
    }

    // -----------------------------------------------------------------------
    // getComment
    // -----------------------------------------------------------------------

    public function testGetCommentColorHexValueReturnsHex(): void
    {
        $this->assertSame('#1979c3', $this->formatter->getComment('#1979c3', 'color'));
    }

    public function testGetCommentColorNonHexValueReturnsNull(): void
    {
        $this->assertNull($this->formatter->getComment('25, 121, 195', 'color'));
    }

    public function testGetCommentSpacingReturnsJson(): void
    {
        $comment = $this->formatter->getComment('{"top":10}', 'spacing');
        $this->assertStringContainsString('JSON:', $comment);
        $this->assertStringContainsString('{"top":10}', $comment);
    }

    public function testGetCommentOtherTypeReturnsNull(): void
    {
        $this->assertNull($this->formatter->getComment('anything', 'text'));
    }

    public function testGetCommentNullTypeReturnsNull(): void
    {
        $this->assertNull($this->formatter->getComment('anything', null));
    }
}
