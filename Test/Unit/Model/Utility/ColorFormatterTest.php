<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;

/**
 * Unit tests for ColorFormatter utility
 * 
 * Tests color format conversion for GraphQL responses and CSS generation.
 * Ensures proper handling of HEX ↔ RGB conversion, palette references,
 * CSS variables, and edge cases.
 * 
 * @covers \Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter
 */
class ColorFormatterTest extends TestCase
{
    private ColorFormatter $formatter;
    private ColorConverter $colorConverter;

    protected function setUp(): void
    {
        $this->colorConverter = new ColorConverter();
        $this->formatter = new ColorFormatter($this->colorConverter);
    }

    /**
     * Group 1: HEX to RGB Conversion (format="rgb")
     */

    /**
     * Test 1: Should convert standard HEX colors to RGB format
     */
    public function testConvertsStandardHexToRgb(): void
    {
        // Bug report color: purple
        $this->assertEquals(
            '107, 33, 168',
            $this->formatter->formatColorValue('#6b21a8', 'rgb'),
            'Should convert #6b21a8 to RGB format'
        );

        // Existing color: blue
        $this->assertEquals(
            '25, 121, 195',
            $this->formatter->formatColorValue('#1979c3', 'rgb'),
            'Should convert #1979c3 to RGB format'
        );

        // Orange color
        $this->assertEquals(
            '255, 165, 0',
            $this->formatter->formatColorValue('#ffa500', 'rgb'),
            'Should convert #ffa500 to RGB format'
        );
    }

    /**
     * Test 2: Should convert black HEX to RGB (original bug case)
     */
    public function testConvertsBlackHexToRgb(): void
    {
        // Original bug: #000000 returned null instead of "0, 0, 0"
        $this->assertEquals(
            '0, 0, 0',
            $this->formatter->formatColorValue('#000000', 'rgb'),
            'Should convert black #000000 to RGB format'
        );
    }

    /**
     * Test 3: Should convert white HEX to RGB
     */
    public function testConvertsWhiteHexToRgb(): void
    {
        $this->assertEquals(
            '255, 255, 255',
            $this->formatter->formatColorValue('#ffffff', 'rgb'),
            'Should convert white #ffffff to RGB format'
        );

        // Uppercase variant
        $this->assertEquals(
            '255, 255, 255',
            $this->formatter->formatColorValue('#FFFFFF', 'rgb'),
            'Should convert uppercase #FFFFFF to RGB format'
        );
    }

    /**
     * Test 4: Should convert shorthand HEX to RGB
     */
    public function testConvertsShorthandHexToRgb(): void
    {
        // White shorthand
        $this->assertEquals(
            '255, 255, 255',
            $this->formatter->formatColorValue('#FFF', 'rgb'),
            'Should expand #FFF to white RGB'
        );

        // Red shorthand
        $this->assertEquals(
            '255, 0, 0',
            $this->formatter->formatColorValue('#F00', 'rgb'),
            'Should expand #F00 to red RGB'
        );

        // Green shorthand
        $this->assertEquals(
            '0, 255, 0',
            $this->formatter->formatColorValue('#0F0', 'rgb'),
            'Should expand #0F0 to green RGB'
        );

        // Blue shorthand
        $this->assertEquals(
            '0, 0, 255',
            $this->formatter->formatColorValue('#00F', 'rgb'),
            'Should expand #00F to blue RGB'
        );

        // Custom shorthand
        $this->assertEquals(
            '170, 187, 204',
            $this->formatter->formatColorValue('#ABC', 'rgb'),
            'Should expand #ABC to RGB'
        );
    }

    /**
     * Group 2: RGB to HEX Conversion (format="hex")
     */

    /**
     * Test 5: Should convert standard RGB to HEX format
     */
    public function testConvertsStandardRgbToHex(): void
    {
        $this->assertEquals(
            '#6b21a8',
            $this->formatter->formatColorValue('107, 33, 168', 'hex'),
            'Should convert RGB to #6b21a8'
        );

        $this->assertEquals(
            '#1979c3',
            $this->formatter->formatColorValue('25, 121, 195', 'hex'),
            'Should convert RGB to #1979c3'
        );

        $this->assertEquals(
            '#ffa500',
            $this->formatter->formatColorValue('255, 165, 0', 'hex'),
            'Should convert RGB to #ffa500'
        );
    }

    /**
     * Test 6: Should convert black and white RGB to HEX
     */
    public function testConvertsBlackAndWhiteRgbToHex(): void
    {
        // Black
        $this->assertEquals(
            '#000000',
            $this->formatter->formatColorValue('0, 0, 0', 'hex'),
            'Should convert black RGB to #000000'
        );

        // White
        $this->assertEquals(
            '#ffffff',
            $this->formatter->formatColorValue('255, 255, 255', 'hex'),
            'Should convert white RGB to #ffffff'
        );
    }

    /**
     * Group 3: Same Format (No Conversion)
     */

    /**
     * Test 7: Should preserve HEX when format is HEX (optimization)
     */
    public function testPreservesHexWhenFormatIsHex(): void
    {
        $this->assertEquals(
            '#6b21a8',
            $this->formatter->formatColorValue('#6b21a8', 'hex'),
            'Should return HEX unchanged when format is hex'
        );

        $this->assertEquals(
            '#000000',
            $this->formatter->formatColorValue('#000000', 'hex'),
            'Should return black HEX unchanged'
        );

        $this->assertEquals(
            '#ffffff',
            $this->formatter->formatColorValue('#ffffff', 'hex'),
            'Should return white HEX unchanged'
        );
    }

    /**
     * Test 8: Should preserve RGB when format is RGB (optimization)
     */
    public function testPreservesRgbWhenFormatIsRgb(): void
    {
        $this->assertEquals(
            '107, 33, 168',
            $this->formatter->formatColorValue('107, 33, 168', 'rgb'),
            'Should return RGB unchanged when format is rgb'
        );

        $this->assertEquals(
            '0, 0, 0',
            $this->formatter->formatColorValue('0, 0, 0', 'rgb'),
            'Should return black RGB unchanged'
        );

        $this->assertEquals(
            '255, 255, 255',
            $this->formatter->formatColorValue('255, 255, 255', 'rgb'),
            'Should return white RGB unchanged'
        );
    }

    /**
     * Group 4: Palette References (Pass-Through)
     */

    /**
     * Test 9: Should preserve palette references regardless of format
     */
    public function testPreservesPaletteReferencesRegardlessOfFormat(): void
    {
        // Palette reference with RGB format
        $this->assertEquals(
            '--color-brand-primary',
            $this->formatter->formatColorValue('--color-brand-primary', 'rgb'),
            'Should preserve palette reference with RGB format'
        );

        // Palette reference with HEX format
        $this->assertEquals(
            '--color-brand-primary',
            $this->formatter->formatColorValue('--color-brand-primary', 'hex'),
            'Should preserve palette reference with HEX format'
        );

        // Different palette reference
        $this->assertEquals(
            '--color-neutral-900',
            $this->formatter->formatColorValue('--color-neutral-900', 'rgb'),
            'Should preserve neutral palette reference'
        );

        // Complex palette name
        $this->assertEquals(
            '--color-brand-amber-dark',
            $this->formatter->formatColorValue('--color-brand-amber-dark', 'hex'),
            'Should preserve complex palette reference'
        );
    }

    /**
     * Group 5: CSS var() Wrappers (Pass-Through)
     */

    /**
     * Test 10: Should preserve CSS var() wrappers regardless of format
     */
    public function testPreservesCssVarWrappersRegardlessOfFormat(): void
    {
        // CSS var with RGB format
        $this->assertEquals(
            'var(--color-test)',
            $this->formatter->formatColorValue('var(--color-test)', 'rgb'),
            'Should preserve CSS var() with RGB format'
        );

        // CSS var with HEX format
        $this->assertEquals(
            'var(--color-test)',
            $this->formatter->formatColorValue('var(--color-test)', 'hex'),
            'Should preserve CSS var() with HEX format'
        );

        // Different var name
        $this->assertEquals(
            'var(--primary)',
            $this->formatter->formatColorValue('var(--primary)', 'rgb'),
            'Should preserve CSS var(--primary)'
        );

        // Var with complex name
        $this->assertEquals(
            'var(--color-brand-primary)',
            $this->formatter->formatColorValue('var(--color-brand-primary)', 'hex'),
            'Should preserve CSS var with palette reference'
        );
    }

    /**
     * Group 6: Error Handling (Fallback to Original)
     */

    /**
     * Test 11: Should fallback to original value on invalid color
     */
    public function testFallbacksToOriginalValueOnInvalidColor(): void
    {
        // Invalid color string with RGB format
        $this->assertEquals(
            'invalid-color',
            $this->formatter->formatColorValue('invalid-color', 'rgb'),
            'Should return invalid color unchanged'
        );

        // Invalid color with HEX format
        $this->assertEquals(
            'xyz123',
            $this->formatter->formatColorValue('xyz123', 'hex'),
            'Should return invalid hex-like string unchanged'
        );

        // Non-color text
        $this->assertEquals(
            'not-a-color',
            $this->formatter->formatColorValue('not-a-color', 'rgb'),
            'Should return non-color text unchanged'
        );

        // Partial HEX
        $this->assertEquals(
            '#12',
            $this->formatter->formatColorValue('#12', 'rgb'),
            'Should return partial HEX unchanged (fallback)'
        );
    }

    /**
     * Group 7: Null and Empty Values
     */

    /**
     * Test 12: Should return null for null value
     */
    public function testReturnsNullForNullValue(): void
    {
        $this->assertNull(
            $this->formatter->formatColorValue(null, 'rgb'),
            'Should return null for null value with RGB format'
        );

        $this->assertNull(
            $this->formatter->formatColorValue(null, 'hex'),
            'Should return null for null value with HEX format'
        );
    }

    /**
     * Test 13: Should return null for empty string
     */
    public function testReturnsNullForEmptyString(): void
    {
        $this->assertNull(
            $this->formatter->formatColorValue('', 'rgb'),
            'Should return null for empty string with RGB format'
        );

        $this->assertNull(
            $this->formatter->formatColorValue('', 'hex'),
            'Should return null for empty string with HEX format'
        );

        $this->assertNull(
            $this->formatter->formatColorValue('   ', 'rgb'),
            'Should return null for whitespace-only string'
        );
    }

    /**
     * Group 8: Normalization
     */

    /**
     * Test 14: Should normalize short HEX before conversion
     */
    public function testNormalizesShortHexBeforeConversion(): void
    {
        // Short HEX to RGB (#F0F = #FF00FF = 255, 0, 255)
        $this->assertEquals(
            '255, 0, 255',
            $this->formatter->formatColorValue('#F0F', 'rgb'),
            'Should normalize #F0F and convert to RGB'
        );

        // Short HEX staying as HEX (normalization happens internally)
        $result = $this->formatter->formatColorValue('#ABC', 'hex');
        $this->assertNotNull($result);
        $this->assertStringStartsWith('#', $result);
    }

    /**
     * Group 9: Round-Trip Conversion
     */

    /**
     * Test 15: Should maintain color fidelity in round-trip conversion
     */
    public function testRoundTripConversionMaintainsFidelity(): void
    {
        $testColors = [
            '#6b21a8',
            '#000000',
            '#ffffff',
            '#1979c3',
            '#ffa500',
        ];

        foreach ($testColors as $originalHex) {
            // HEX → RGB
            $rgb = $this->formatter->formatColorValue($originalHex, 'rgb');
            $this->assertNotNull($rgb, "RGB conversion should not return null for {$originalHex}");

            // RGB → HEX
            $hexAgain = $this->formatter->formatColorValue($rgb, 'hex');
            $this->assertEquals(
                $originalHex,
                $hexAgain,
                "Round-trip conversion should preserve color: {$originalHex} → {$rgb} → {$hexAgain}"
            );
        }
    }

    /**
     * Group 10: Mixed Case Format Parameter
     */

    /**
     * Test 16: Should handle mixed case format parameter
     */
    public function testHandlesMixedCaseFormatParameter(): void
    {
        // Uppercase RGB
        $this->assertEquals(
            '0, 0, 0',
            $this->formatter->formatColorValue('#000000', 'RGB'),
            'Should handle uppercase RGB format'
        );

        // Mixed case RGB
        $this->assertEquals(
            '0, 0, 0',
            $this->formatter->formatColorValue('#000000', 'RgB'),
            'Should handle mixed case RGB format'
        );

        // Uppercase HEX
        $this->assertEquals(
            '#000000',
            $this->formatter->formatColorValue('0, 0, 0', 'HEX'),
            'Should handle uppercase HEX format'
        );

        // Mixed case HEX
        $this->assertEquals(
            '#000000',
            $this->formatter->formatColorValue('0, 0, 0', 'HeX'),
            'Should handle mixed case HEX format'
        );
    }
}
