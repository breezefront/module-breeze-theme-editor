<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;

/**
 * Unit tests for ColorConverter utility
 * 
 * Tests RGB wrapper support and color conversion functionality
 * 
 * @covers \Swissup\BreezeThemeEditor\Model\Utility\ColorConverter
 */
class ColorConverterTest extends TestCase
{
    /**
     * Test 1: RGB Wrapper Detection - Should recognize rgb() format
     */
    public function testIsRgbRecognizesRgbWrapper(): void
    {
        $this->assertTrue(
            ColorConverter::isRgb('rgb(17, 24, 39)'),
            'Should recognize rgb() wrapper format'
        );
        
        $this->assertTrue(
            ColorConverter::isRgb('rgb(255, 255, 255)'),
            'Should recognize rgb() with white color'
        );
        
        $this->assertTrue(
            ColorConverter::isRgb('rgb(0, 0, 0)'),
            'Should recognize rgb() with black color'
        );
    }
    
    /**
     * Test 2: RGB Wrapper Detection - Should recognize rgba() format
     */
    public function testIsRgbRecognizesRgbaWrapper(): void
    {
        $this->assertTrue(
            ColorConverter::isRgb('rgba(17, 24, 39, 0.5)'),
            'Should recognize rgba() wrapper format with alpha'
        );
        
        $this->assertTrue(
            ColorConverter::isRgb('rgba(25, 121, 195, 1)'),
            'Should recognize rgba() with full opacity'
        );
        
        $this->assertTrue(
            ColorConverter::isRgb('rgba(0, 0, 0, 0)'),
            'Should recognize rgba() with zero opacity'
        );
    }
    
    /**
     * Test 3: RGB Wrapper Detection - Should recognize plain RGB format
     */
    public function testIsRgbRecognizesPlainFormat(): void
    {
        $this->assertTrue(
            ColorConverter::isRgb('17, 24, 39'),
            'Should recognize plain RGB format with spaces'
        );
        
        $this->assertTrue(
            ColorConverter::isRgb('25,121,195'),
            'Should recognize plain RGB format without spaces'
        );
        
        $this->assertTrue(
            ColorConverter::isRgb(' 255 , 255 , 255 '),
            'Should recognize RGB with extra whitespace'
        );
    }
    
    /**
     * Test 4: RGB Wrapper Detection - Should reject HEX format
     */
    public function testIsRgbRejectsHexFormat(): void
    {
        $this->assertFalse(
            ColorConverter::isRgb('#1979c3'),
            'Should reject HEX format with hash'
        );
        
        $this->assertFalse(
            ColorConverter::isRgb('#ffffff'),
            'Should reject white HEX'
        );
        
        $this->assertFalse(
            ColorConverter::isRgb('1979c3'),
            'Should reject HEX without hash'
        );
    }
    
    /**
     * Test 5: RGB Wrapper Detection - Should reject invalid formats
     */
    public function testIsRgbRejectsInvalidFormats(): void
    {
        $this->assertFalse(
            ColorConverter::isRgb('invalid'),
            'Should reject invalid string'
        );
        
        $this->assertFalse(
            ColorConverter::isRgb('rgb(invalid)'),
            'Should reject rgb() with invalid content'
        );
        
        $this->assertFalse(
            ColorConverter::isRgb(''),
            'Should reject empty string'
        );
    }
    
    /**
     * Test 6: RGB to HEX - Should convert rgb() wrapper format
     */
    public function testRgbToHexConvertsRgbWrapper(): void
    {
        $this->assertEquals(
            '#1979c3',
            ColorConverter::rgbToHex('rgb(25, 121, 195)'),
            'Should convert rgb() wrapper to HEX'
        );
        
        $this->assertEquals(
            '#ffffff',
            ColorConverter::rgbToHex('rgb(255, 255, 255)'),
            'Should convert white rgb() to HEX'
        );
        
        $this->assertEquals(
            '#000000',
            ColorConverter::rgbToHex('rgb(0, 0, 0)'),
            'Should convert black rgb() to HEX'
        );
    }
    
    /**
     * Test 7: RGB to HEX - Should convert rgba() wrapper and strip alpha
     */
    public function testRgbToHexConvertsRgbaWrapperAndStripsAlpha(): void
    {
        $this->assertEquals(
            '#1979c3',
            ColorConverter::rgbToHex('rgba(25, 121, 195, 0.5)'),
            'Should convert rgba() to HEX, stripping alpha channel'
        );
        
        $this->assertEquals(
            '#ff0000',
            ColorConverter::rgbToHex('rgba(255, 0, 0, 1)'),
            'Should convert rgba() with full opacity'
        );
        
        $this->assertEquals(
            '#00ff00',
            ColorConverter::rgbToHex('rgba(0, 255, 0, 0)'),
            'Should convert rgba() with zero opacity'
        );
    }
    
    /**
     * Test 8: RGB to HEX - Should convert plain RGB format
     */
    public function testRgbToHexConvertsPlainFormat(): void
    {
        $this->assertEquals(
            '#1979c3',
            ColorConverter::rgbToHex('25, 121, 195'),
            'Should convert plain RGB with spaces'
        );
        
        $this->assertEquals(
            '#1979c3',
            ColorConverter::rgbToHex('25,121,195'),
            'Should convert plain RGB without spaces'
        );
        
        $this->assertEquals(
            '#ffa500',
            ColorConverter::rgbToHex(' 255 , 165 , 0 '),
            'Should convert RGB with extra whitespace'
        );
    }
    
    /**
     * Test 9: HEX to RGB - Should handle rgb() wrapper input
     */
    public function testHexToRgbHandlesRgbWrapperInput(): void
    {
        $this->assertEquals(
            '17, 24, 39',
            ColorConverter::hexToRgb('rgb(17, 24, 39)'),
            'Should strip rgb() wrapper and return clean RGB'
        );
        
        $this->assertEquals(
            '255, 255, 255',
            ColorConverter::hexToRgb('rgb(255, 255, 255)'),
            'Should handle white color in rgb() wrapper'
        );
    }
    
    /**
     * Test 10: HEX to RGB - Should handle rgba() wrapper and strip alpha
     */
    public function testHexToRgbHandlesRgbaWrapperAndStripsAlpha(): void
    {
        $this->assertEquals(
            '17, 24, 39',
            ColorConverter::hexToRgb('rgba(17, 24, 39, 0.5)'),
            'Should strip rgba() wrapper and alpha channel'
        );
        
        $this->assertEquals(
            '25, 121, 195',
            ColorConverter::hexToRgb('rgba(25, 121, 195, 1)'),
            'Should strip rgba() wrapper with full opacity'
        );
        
        $this->assertEquals(
            '0, 0, 0',
            ColorConverter::hexToRgb('rgba(0, 0, 0, 0)'),
            'Should strip rgba() wrapper with zero opacity'
        );
    }
    
    /**
     * Test 11: HEX to RGB - Should convert standard HEX colors
     */
    public function testHexToRgbConvertsStandardHexColors(): void
    {
        $this->assertEquals(
            '25, 121, 195',
            ColorConverter::hexToRgb('#1979c3'),
            'Should convert 6-digit HEX to RGB'
        );
        
        $this->assertEquals(
            '255, 255, 255',
            ColorConverter::hexToRgb('#ffffff'),
            'Should convert white HEX to RGB'
        );
        
        $this->assertEquals(
            '0, 0, 0',
            ColorConverter::hexToRgb('#000000'),
            'Should convert black HEX to RGB'
        );
    }
    
    /**
     * Test 12: HEX to RGB - Should handle 3-character HEX shorthand
     */
    public function testHexToRgbHandlesShorthandHex(): void
    {
        $this->assertEquals(
            '255, 255, 255',
            ColorConverter::hexToRgb('#fff'),
            'Should expand #fff to white RGB'
        );
        
        $this->assertEquals(
            '255, 0, 0',
            ColorConverter::hexToRgb('#f00'),
            'Should expand #f00 to red RGB'
        );
        
        $this->assertEquals(
            '0, 0, 255',
            ColorConverter::hexToRgb('#00f'),
            'Should expand #00f to blue RGB'
        );
    }
    
    /**
     * Test 13: HEX to RGB - Should handle HEX without hash prefix
     */
    public function testHexToRgbHandlesHexWithoutHashPrefix(): void
    {
        $this->assertEquals(
            '25, 121, 195',
            ColorConverter::hexToRgb('1979c3'),
            'Should convert HEX without # prefix'
        );
        
        $this->assertEquals(
            '255, 165, 0',
            ColorConverter::hexToRgb('ffa500'),
            'Should handle orange HEX without prefix'
        );
    }
    
    /**
     * Test 14: Round-trip Conversion - Should maintain color fidelity
     */
    public function testRoundTripConversionMaintainsColorFidelity(): void
    {
        $testColors = [
            '25, 121, 195',
            '255, 255, 255',
            '0, 0, 0',
            '128, 128, 128',
            '255, 165, 0',
        ];
        
        foreach ($testColors as $originalRgb) {
            $hex = ColorConverter::rgbToHex($originalRgb);
            $rgbAgain = ColorConverter::hexToRgb($hex);
            
            $this->assertEquals(
                $originalRgb,
                $rgbAgain,
                "Round-trip conversion should preserve color: {$originalRgb}"
            );
        }
    }
    
    /**
     * Test 15: Backward Compatibility - Existing functionality still works
     */
    public function testBackwardCompatibilityWithExistingFunctionality(): void
    {
        // Test normalizeHex (existing method)
        $this->assertEquals(
            '#1979c3',
            ColorConverter::normalizeHex('#1979C3'),
            'normalizeHex should still work with uppercase'
        );
        
        $this->assertEquals(
            '#ffffff',
            ColorConverter::normalizeHex('#fff'),
            'normalizeHex should expand shorthand'
        );
        
        // Test isRgb with non-wrapper formats (existing behavior)
        $this->assertTrue(
            ColorConverter::isRgb('25, 121, 195'),
            'isRgb should still recognize plain RGB'
        );
        
        $this->assertFalse(
            ColorConverter::isRgb('#1979c3'),
            'isRgb should still reject HEX'
        );
        
        // Test basic conversions (existing behavior)
        $this->assertEquals(
            '#1979c3',
            ColorConverter::rgbToHex('25, 121, 195'),
            'rgbToHex should work with plain RGB'
        );
        
        $this->assertEquals(
            '25, 121, 195',
            ColorConverter::hexToRgb('#1979c3'),
            'hexToRgb should work with HEX'
        );
    }
}
