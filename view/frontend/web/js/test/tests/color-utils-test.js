define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/color-utils'
], function (TestFramework, ColorUtils) {
    'use strict';

    return TestFramework.suite('ColorUtils', {
        
        /**
         * Test 1: Should convert HEX to RGB correctly
         */
        'should convert HEX to RGB correctly': function() {
            // Test standard 6-digit HEX colors
            this.assertEquals(ColorUtils.hexToRgb('#1979c3'), '25, 121, 195', 
                'Should convert #1979c3 to RGB');
            this.assertEquals(ColorUtils.hexToRgb('#ffffff'), '255, 255, 255', 
                'Should convert white to RGB');
            this.assertEquals(ColorUtils.hexToRgb('#000000'), '0, 0, 0', 
                'Should convert black to RGB');
            this.assertEquals(ColorUtils.hexToRgb('#ffa500'), '255, 165, 0', 
                'Should convert orange to RGB');
                
            // Test HEX without # prefix
            this.assertEquals(ColorUtils.hexToRgb('1979c3'), '25, 121, 195', 
                'Should convert HEX without # prefix');
                
            // Test 3-digit shorthand HEX
            this.assertEquals(ColorUtils.hexToRgb('#fff'), '255, 255, 255', 
                'Should expand #fff to white RGB');
            this.assertEquals(ColorUtils.hexToRgb('#f00'), '255, 0, 0', 
                'Should expand #f00 to red RGB');
            this.assertEquals(ColorUtils.hexToRgb('#0f0'), '0, 255, 0', 
                'Should expand #0f0 to green RGB');
            this.assertEquals(ColorUtils.hexToRgb('#00f'), '0, 0, 255', 
                'Should expand #00f to blue RGB');
        },
        
        /**
         * Test 2: Should convert RGB to HEX correctly
         */
        'should convert RGB to HEX correctly': function() {
            // Test standard RGB colors
            this.assertEquals(ColorUtils.rgbToHex('25, 121, 195'), '#1979c3', 
                'Should convert RGB to #1979c3');
            this.assertEquals(ColorUtils.rgbToHex('255, 255, 255'), '#ffffff', 
                'Should convert white RGB to HEX');
            this.assertEquals(ColorUtils.rgbToHex('0, 0, 0'), '#000000', 
                'Should convert black RGB to HEX');
            this.assertEquals(ColorUtils.rgbToHex('255, 165, 0'), '#ffa500', 
                'Should convert orange RGB to HEX');
                
            // Test RGB without spaces
            this.assertEquals(ColorUtils.rgbToHex('25,121,195'), '#1979c3', 
                'Should handle RGB without spaces');
                
            // Test RGB with extra whitespace
            this.assertEquals(ColorUtils.rgbToHex(' 25 , 121 , 195 '), '#1979c3', 
                'Should handle RGB with extra whitespace');
        },
        
        /**
         * Test 3: Should normalize RGB strings correctly
         */
        'should normalize RGB strings correctly': function() {
            // Test removing whitespace
            this.assertEquals(ColorUtils.normalizeRgb('25, 121, 195'), '25,121,195', 
                'Should remove spaces from RGB');
            this.assertEquals(ColorUtils.normalizeRgb('25,121,195'), '25,121,195', 
                'Should keep RGB without spaces unchanged');
            this.assertEquals(ColorUtils.normalizeRgb(' 25 , 121 , 195 '), '25,121,195', 
                'Should remove all whitespace from RGB');
                
            // Test edge cases
            this.assertEquals(ColorUtils.normalizeRgb(''), '', 
                'Should handle empty string');
            this.assertEquals(ColorUtils.normalizeRgb(null), null, 
                'Should handle null');
            this.assertEquals(ColorUtils.normalizeRgb(undefined), undefined, 
                'Should handle undefined');
        },
        
        /**
         * Test 4: Should compare RGB strings correctly
         */
        'should compare RGB strings correctly': function() {
            // Test equal RGB strings with different formatting
            this.assertEquals(ColorUtils.compareRgb('25, 121, 195', '25,121,195'), true, 
                'Should match RGB with and without spaces');
            this.assertEquals(ColorUtils.compareRgb(' 25 , 121 , 195 ', '25,121,195'), true, 
                'Should match RGB with extra whitespace');
            this.assertEquals(ColorUtils.compareRgb('0, 0, 0', '0,0,0'), true, 
                'Should match black RGB variations');
                
            // Test non-equal RGB strings
            this.assertEquals(ColorUtils.compareRgb('25, 121, 195', '25, 120, 195'), false, 
                'Should not match different RGB values');
            this.assertEquals(ColorUtils.compareRgb('255, 255, 255', '0, 0, 0'), false, 
                'Should not match white and black');
        },
        
        /**
         * Test 5: Should handle invalid color formats gracefully
         */
        'should handle invalid color formats gracefully': function() {
            // Test invalid HEX formats
            var result1 = ColorUtils.hexToRgb('invalid');
            this.assertEquals(result1, '0, 0, 0', 
                'Invalid HEX should return black RGB');
                
            var result2 = ColorUtils.hexToRgb('');
            this.assertEquals(result2, '', 
                'Empty HEX should return empty string');
                
            var result3 = ColorUtils.hexToRgb(null);
            this.assertEquals(result3, null, 
                'Null HEX should return null');
            
            // Test invalid RGB formats
            var result4 = ColorUtils.rgbToHex('invalid');
            this.assertEquals(result4, '#000000', 
                'Invalid RGB should return black HEX');
                
            var result5 = ColorUtils.rgbToHex('');
            this.assertEquals(result5, '#000000', 
                'Empty RGB should return black HEX');
                
            var result6 = ColorUtils.rgbToHex(null);
            this.assertEquals(result6, '#000000', 
                'Null RGB should return black HEX');
        },
        
        /**
         * Test 6: Should clamp RGB values when converting to HEX
         */
        'should clamp RGB values when converting to HEX': function() {
            // Test values > 255 (should clamp to 255)
            var result1 = ColorUtils.rgbToHex('300, 300, 300');
            this.assertEquals(result1, '#ffffff', 
                'RGB values > 255 should clamp to white');
                
            // Test negative values (should clamp to 0)
            var result2 = ColorUtils.rgbToHex('-10, -20, -30');
            this.assertEquals(result2, '#000000', 
                'Negative RGB values should clamp to black');
                
            // Test mixed valid/invalid ranges
            var result3 = ColorUtils.rgbToHex('128, 300, -10');
            this.assertEquals(result3, '#80ff00', 
                'Mixed range values should clamp correctly');
        },
        
        /**
         * Test 7: Should handle case-insensitive HEX colors
         */
        'should handle case-insensitive HEX colors': function() {
            // Test uppercase HEX
            this.assertEquals(ColorUtils.hexToRgb('#FFFFFF'), '255, 255, 255', 
                'Should handle uppercase HEX');
            this.assertEquals(ColorUtils.hexToRgb('#FF0000'), '255, 0, 0', 
                'Should handle mixed case HEX');
                
            // Test lowercase HEX
            this.assertEquals(ColorUtils.hexToRgb('#ffffff'), '255, 255, 255', 
                'Should handle lowercase HEX');
        },
        
        /**
         * Test 8: RGB to HEX to RGB round-trip conversion
         */
        'should maintain color fidelity in round-trip conversion': function() {
            var testColors = [
                '25, 121, 195',
                '255, 255, 255',
                '0, 0, 0',
                '128, 128, 128',
                '255, 0, 0'
            ];
            
            testColors.forEach(function(originalRgb) {
                var hex = ColorUtils.rgbToHex(originalRgb);
                var rgbAgain = ColorUtils.hexToRgb(hex);
                
                this.assertEquals(
                    ColorUtils.normalizeRgb(rgbAgain), 
                    ColorUtils.normalizeRgb(originalRgb),
                    'Round-trip conversion should preserve color: ' + originalRgb
                );
            }.bind(this));
        }
    });
});
