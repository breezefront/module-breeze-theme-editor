/**
 * Color Utils Tests (Admin)
 * 
 * Tests RGB→HEX conversion and RGB detection for adminhtml color-utils.js
 * Created to verify Bug 0 fix (color picker RGB→HEX conversion)
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/color-utils'
], function (TestFramework, ColorUtils) {
    'use strict';

    return TestFramework.suite('ColorUtils (Admin)', {
        
        /**
         * Test 1: rgbToHex - Standard RGB format (with spaces)
         */
        'should convert standard RGB to HEX': function() {
            this.assertEquals(
                ColorUtils.rgbToHex('228, 2, 2'), 
                '#e40202', 
                'Should convert "228, 2, 2" to #e40202'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('255, 255, 255'), 
                '#ffffff', 
                'Should convert white RGB to HEX'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('0, 0, 0'), 
                '#000000', 
                'Should convert black RGB to HEX'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('25, 121, 195'), 
                '#1979c3', 
                'Should convert blue RGB to HEX'
            );
        },
        
        /**
         * Test 2: rgbToHex - RGB format without spaces
         */
        'should convert RGB without spaces to HEX': function() {
            this.assertEquals(
                ColorUtils.rgbToHex('228,2,2'), 
                '#e40202', 
                'Should handle RGB without spaces'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('25,121,195'), 
                '#1979c3', 
                'Should handle RGB without spaces'
            );
        },
        
        /**
         * Test 3: rgbToHex - RGB format with extra whitespace
         */
        'should convert RGB with extra whitespace to HEX': function() {
            this.assertEquals(
                ColorUtils.rgbToHex(' 228 , 2 , 2 '), 
                '#e40202', 
                'Should handle RGB with extra whitespace'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('  25  ,  121  ,  195  '), 
                '#1979c3', 
                'Should handle RGB with lots of whitespace'
            );
        },
        
        /**
         * Test 4: rgbToHex - rgb() wrapper format
         */
        'should convert rgb() wrapper format to HEX': function() {
            this.assertEquals(
                ColorUtils.rgbToHex('rgb(17, 24, 39)'), 
                '#111827', 
                'Should handle rgb() wrapper with spaces'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('rgb(255, 0, 0)'), 
                '#ff0000', 
                'Should handle rgb() wrapper for red'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('rgb(228,2,2)'), 
                '#e40202', 
                'Should handle rgb() wrapper without spaces'
            );
        },
        
        /**
         * Test 5: rgbToHex - rgba() wrapper format (strip alpha)
         */
        'should convert rgba() wrapper format to HEX': function() {
            this.assertEquals(
                ColorUtils.rgbToHex('rgba(228, 2, 2, 0.5)'), 
                '#e40202', 
                'Should handle rgba() and strip alpha channel'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('rgba(255, 0, 0, 1)'), 
                '#ff0000', 
                'Should handle rgba() with full opacity'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('rgba(0, 0, 0, 0)'), 
                '#000000', 
                'Should handle rgba() with zero opacity'
            );
        },
        
        /**
         * Test 6: rgbToHex - Value clamping (0-255 range)
         */
        'should clamp RGB values to 0-255 range': function() {
            // Values > 255 should clamp to 255 (white)
            this.assertEquals(
                ColorUtils.rgbToHex('300, 300, 300'), 
                '#ffffff', 
                'Values > 255 should clamp to white'
            );
            
            // Negative values should clamp to 0 (black)
            this.assertEquals(
                ColorUtils.rgbToHex('-10, -20, -30'), 
                '#000000', 
                'Negative values should clamp to black'
            );
            
            // Mixed valid/invalid ranges
            this.assertEquals(
                ColorUtils.rgbToHex('128, 300, -10'), 
                '#80ff00', 
                'Mixed range values should clamp correctly'
            );
        },
        
        /**
         * Test 7: rgbToHex - Invalid formats return black fallback
         */
        'should return black for invalid RGB formats': function() {
            this.assertEquals(
                ColorUtils.rgbToHex('invalid'), 
                '#000000', 
                'Invalid string should return black'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex(''), 
                '#000000', 
                'Empty string should return black'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex(null), 
                '#000000', 
                'Null should return black'
            );
            
            this.assertEquals(
                ColorUtils.rgbToHex('rgb(invalid)'), 
                '#000000', 
                'rgb() with invalid content should return black'
            );
        },
        
        /**
         * Test 8: isRgbColor - Detect plain RGB format
         */
        'should detect plain RGB format': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('228, 2, 2'), 
                true, 
                'Should detect plain RGB with spaces'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('228,2,2'), 
                true, 
                'Should detect plain RGB without spaces'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor(' 17 , 24 , 39 '), 
                true, 
                'Should detect RGB with extra whitespace'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('0, 0, 0'), 
                true, 
                'Should detect black RGB'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('255, 255, 255'), 
                true, 
                'Should detect white RGB'
            );
        },
        
        /**
         * Test 9: isRgbColor - Detect rgb() and rgba() wrapper formats
         */
        'should detect rgb() and rgba() wrapper formats': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('rgb(17, 24, 39)'), 
                true, 
                'Should detect rgb() wrapper with spaces'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgb(228,2,2)'), 
                true, 
                'Should detect rgb() wrapper without spaces'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgba(228, 2, 2, 0.5)'), 
                true, 
                'Should detect rgba() wrapper with alpha'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgba(255, 0, 0, 1)'), 
                true, 
                'Should detect rgba() wrapper with full opacity'
            );
        },
        
        /**
         * Test 10: isRgbColor - Reject HEX color format
         */
        'should reject HEX color format': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('#e40202'), 
                false, 
                'Should reject HEX with hash'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('#ffffff'), 
                false, 
                'Should reject white HEX'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('e40202'), 
                false, 
                'Should reject HEX without hash'
            );
            
            this.assertEquals(
                ColorUtils.isRgbColor('#fff'), 
                false, 
                'Should reject 3-digit HEX shorthand'
            );
        },
        
        /**
         * Test 11: isRgbColor - Reject invalid formats
         */
        'should reject invalid color formats': function() {
            this.assertEquals(
                ColorUtils.isRgbColor('invalid'), 
                false, 
                'Should reject invalid string'
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
            
            this.assertEquals(
                ColorUtils.isRgbColor('rgb(invalid)'), 
                false, 
                'Should reject rgb() with invalid content'
            );
        },
        
        /**
         * Test 12: Integration - Bug 0 reproduction test
         * 
         * This test reproduces the exact Bug 0 scenario:
         * GraphQL returns "228, 2, 2" (RGB) for brand color field,
         * color.js must convert it to "#e40202" for the color picker.
         */
        'should convert GraphQL RGB values to HEX (Bug 0 fix)': function() {
            // Exact value from GraphQL response for brand color
            var graphqlValue = '228, 2, 2';
            
            // Step 1: Detect it's RGB format
            var isRgb = ColorUtils.isRgbColor(graphqlValue);
            this.assertEquals(isRgb, true, 
                'GraphQL RGB value should be detected as RGB');
            
            // Step 2: Convert to HEX for color picker
            var hexValue = ColorUtils.rgbToHex(graphqlValue);
            this.assertEquals(hexValue, '#e40202', 
                'GraphQL RGB "228, 2, 2" should convert to #e40202');
            
            // Step 3: Verify default fallback also works
            var defaultValue = 'rgb(17, 24, 39)';
            var isDefaultRgb = ColorUtils.isRgbColor(defaultValue);
            this.assertEquals(isDefaultRgb, true, 
                'Default RGB with wrapper should be detected');
            
            var defaultHex = ColorUtils.rgbToHex(defaultValue);
            this.assertEquals(defaultHex, '#111827', 
                'Default rgb(17, 24, 39) should convert to #111827');
        }
    });
});
