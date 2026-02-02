/**
 * Color Utils RGB Wrapper Tests
 * 
 * Tests RGB wrapper support in color-utils.js
 * Covers rgb() and rgba() wrapper detection and handling
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/color-utils'
], function (TestFramework, ColorUtils) {
    'use strict';

    return TestFramework.suite('ColorUtils RGB Wrapper Support', {
        
        /**
         * Test 1: isRgbColor() should recognize rgb() wrapper format
         */
        'should recognize rgb() wrapper format': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('rgb(17, 24, 39)'), 
                true, 
                'Should recognize rgb() wrapper with spaces'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgb(255, 255, 255)'), 
                true, 
                'Should recognize rgb() with white color'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgb(0, 0, 0)'), 
                true, 
                'Should recognize rgb() with black color'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgb(25,121,195)'), 
                true, 
                'Should recognize rgb() without spaces'
            );
        },
        
        /**
         * Test 2: isRgbColor() should recognize rgba() wrapper format
         */
        'should recognize rgba() wrapper format': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('rgba(17, 24, 39, 0.5)'), 
                true, 
                'Should recognize rgba() with alpha channel'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgba(25, 121, 195, 1)'), 
                true, 
                'Should recognize rgba() with full opacity'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgba(0, 0, 0, 0)'), 
                true, 
                'Should recognize rgba() with zero opacity'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgba(255,165,0,0.75)'), 
                true, 
                'Should recognize rgba() without spaces'
            );
        },
        
        /**
         * Test 3: isRgbColor() should recognize plain RGB format (no wrapper)
         */
        'should recognize plain RGB format without wrapper': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('17, 24, 39'), 
                true, 
                'Should recognize plain RGB with spaces'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('25,121,195'), 
                true, 
                'Should recognize plain RGB without spaces'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor(' 255 , 255 , 255 '), 
                true, 
                'Should recognize RGB with extra whitespace'
            );
        },
        
        /**
         * Test 4: isRgbColor() should reject HEX format
         */
        'should reject HEX color format': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('#1979c3'), 
                false, 
                'Should reject HEX with hash'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('#ffffff'), 
                false, 
                'Should reject white HEX'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('1979c3'), 
                false, 
                'Should reject HEX without hash'
            );
        },
        
        /**
         * Test 5: isRgbColor() should reject invalid formats
         */
        'should reject invalid color formats': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('invalid'), 
                false, 
                'Should reject invalid string'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgb(invalid)'), 
                false, 
                'Should reject rgb() with invalid content'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor(''), 
                false, 
                'Should reject empty string'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor(null), 
                false, 
                'Should reject null'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor(undefined), 
                false, 
                'Should reject undefined'
            );
        },
        
        /**
         * Test 6: Integration - RGB wrapper values should work with conversion functions
         */
        'should work with conversion functions': function() {
            // Test rgbToHex with rgb() wrapper
            var hex1 = ColorUtils.rgbToHex('rgb(25, 121, 195)');
            this.assertEquals(hex1, '#1979c3', 
                'rgbToHex should handle rgb() wrapper');
            
            // Test rgbToHex with rgba() wrapper (should strip alpha)
            var hex2 = ColorUtils.rgbToHex('rgba(255, 0, 0, 0.5)');
            this.assertEquals(hex2, '#ff0000', 
                'rgbToHex should handle rgba() wrapper and strip alpha');
            
            // Test hexToRgb with rgb() wrapper input (should strip wrapper)
            var rgb1 = ColorUtils.hexToRgb('rgb(17, 24, 39)');
            this.assertEquals(rgb1, '17, 24, 39', 
                'hexToRgb should handle rgb() wrapper input');
            
            // Test hexToRgb with rgba() wrapper input (should strip wrapper and alpha)
            var rgb2 = ColorUtils.hexToRgb('rgba(25, 121, 195, 1)');
            this.assertEquals(rgb2, '25, 121, 195', 
                'hexToRgb should handle rgba() wrapper input and strip alpha');
        }
    });
});
