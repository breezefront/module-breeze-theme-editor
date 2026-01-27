/**
 * Color Field Renderer Tests
 * 
 * Tests for ColorRenderer palette reference resolution:
 * - Palette reference detection
 * - 3-level resolution fallback (CSS → Config → Default)
 * - prepareData() output structure
 * - Regular HEX color handling
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/color',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager'
], function($, TestFramework, fixtures, ColorRenderer, PaletteManager) {
    'use strict';
    
    return TestFramework.suite('Color Field Renderer', {
        
        /**
         * Test 1: Should detect palette reference in value
         */
        'should detect palette reference from value': function() {
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: '--color-brand-primary',
                default: '#000000',
                palette: 'default'
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.paletteRef, '--color-brand-primary',
                'Should detect palette reference from value');
            this.assertNotNull(data.hexValue,
                'Should have hexValue resolved');
        },
        
        /**
         * Test 2: Should handle regular HEX colors
         */
        'should handle regular HEX colors': function() {
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: '#ff0000',
                default: '#000000',
                palette: 'default'
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.value, '#ff0000',
                'Should keep regular HEX color as-is');
            this.assertEquals(data.hexValue, '#ff0000',
                'hexValue should match value');
            this.assertEquals(data.paletteRef, undefined,
                'Should not have paletteRef for regular HEX');
        },
        
        /**
         * Test 3: Should use default value for invalid colors
         */
        'should use default value for invalid colors': function() {
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: 'invalid',
                default: '#00ff00',
                palette: 'default'
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.value, '#00ff00',
                'Should use default for invalid value');
            this.assertEquals(data.hexValue, '#00ff00',
                'hexValue should match default');
        },
        
        /**
         * Test 4: Should fallback to black for invalid color without default
         */
        'should fallback to black for invalid color': function() {
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: 'invalid',
                default: 'also-invalid',
                palette: 'default'
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.value, '#000000',
                'Should fallback to black for invalid color and default');
        },
        
        /**
         * Test 5: Should resolve palette ref from PaletteManager config
         */
        'should resolve palette ref from config': function() {
            // Initialize PaletteManager with test data
            PaletteManager.init({
                palettes: [fixtures.mockPaletteConfig],
                storeId: 1,
                themeId: 1
            });
            
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: '--color-brand-primary',
                default: '#999999',
                palette: 'default'
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.paletteRef, '--color-brand-primary',
                'Should have palette ref');
            
            // Check if resolved to something (CSS or config)
            this.assertNotNull(data.hexValue,
                'Should resolve to HEX value');
            this.assert(/^#[0-9a-f]{6}$/i.test(data.hexValue),
                'Resolved value should be valid HEX: ' + data.hexValue);
        },
        
        /**
         * Test 6: Should resolve from PaletteManager (not CSS variables directly)
         */
        'should resolve palette ref from CSS variables': function() {
            // Initialize PaletteManager with test color
            PaletteManager.init({
                palettes: [fixtures.mockPaletteConfig],
                storeId: 1,
                themeId: 1
            });
            
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: '--color-test-red',
                default: '#999999',
                palette: 'default'
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.paletteRef, '--color-test-red',
                'Should have palette ref');
            this.assertEquals(data.hexValue, '#ff0000',
                'Should resolve from CSS variable to red');
        },
        
        /**
         * Test 7: Should fallback through resolution chain
         */
        'should fallback through resolution chain': function() {
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: '--color-nonexistent',
                default: '#abcdef',
                palette: 'default'
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.paletteRef, '--color-nonexistent',
                'Should have palette ref even if not resolved');
            
            // Should fallback to default since palette ref doesn't exist
            this.assertEquals(data.hexValue, '#abcdef',
                'Should fallback to default value when palette ref not found');
        },
        
        /**
         * Test 8: _getPaletteHexFromMapping should resolve colors from PaletteManager
         */
        'should resolve palette colors from flat index': function() {
            // Initialize PaletteManager with test data
            PaletteManager.init({
                palettes: [fixtures.mockPaletteConfig],
                storeId: 1,
                themeId: 1
            });
            
            var hex = ColorRenderer._getPaletteHexFromMapping('--color-brand-primary');
            
            this.assertNotNull(hex,
                'Should resolve color from PaletteManager flat index');
            this.assert(/^#[0-9a-f]{6}$/i.test(hex),
                'Should return valid HEX color: ' + hex);
        },
        
        /**
         * Test 9: _getPaletteHexFromMapping should handle nonexistent colors
         */
        'should handle nonexistent palette colors gracefully': function() {
            // Initialize PaletteManager
            PaletteManager.init({
                palettes: [fixtures.mockPaletteConfig],
                storeId: 1,
                themeId: 1
            });
            
            var hex = ColorRenderer._getPaletteHexFromMapping('--nonexistent-color');
            
            this.assertEquals(hex, '#000000',
                'Should return #000000 for nonexistent palette color');
        },
        
        /**
         * Test 10: prepareData should preserve palette configuration
         */
        'should preserve palette configuration in data': function() {
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: '#ff0000',
                default: '#000000',
                palette: 'custom-palette'
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.palette, 'custom-palette',
                'Should preserve palette ID');
            this.assertEquals(data.paletteId, 'custom-palette',
                'Should set paletteId for Quick Select');
        },
        
        /**
         * Test 11: Should handle missing palette configuration
         */
        'should handle missing palette configuration': function() {
            var field = {
                code: 'test_color',
                label: 'Test Color',
                value: '#ff0000',
                default: '#000000'
                // No palette property
            };
            
            var data = ColorRenderer.prepareData(field, 'test-section');
            
            this.assertEquals(data.palette, null,
                'Should set palette to null if not provided');
            this.assertEquals(data.paletteId, null,
                'Should set paletteId to null');
        },
        
        /**
         * Test 12: Should validate HEX color format strictly
         */
        'should validate HEX color format strictly': function() {
            var testCases = [
                { value: '#ff0000', valid: true, expected: '#ff0000' },
                { value: '#FF0000', valid: true, expected: '#FF0000' },
                { value: '#f00', valid: false, expected: '#000000' }, // Short format not allowed
                { value: 'ff0000', valid: false, expected: '#000000' }, // Missing #
                { value: '#gggggg', valid: false, expected: '#000000' }, // Invalid chars
                { value: '#ff00', valid: false, expected: '#000000' }, // Too short
                { value: '#ff00000', valid: false, expected: '#000000' } // Too long
            ];
            
            testCases.forEach(function(testCase) {
                var field = {
                    code: 'test_color',
                    label: 'Test Color',
                    value: testCase.value,
                    default: '#000000',
                    palette: 'default'
                };
                
                var data = ColorRenderer.prepareData(field, 'test-section');
                
                this.assertEquals(data.value, testCase.expected,
                    'Value "' + testCase.value + '" should ' + 
                    (testCase.valid ? 'be valid' : 'fallback to black'));
            }.bind(this));
        }
    });
});
