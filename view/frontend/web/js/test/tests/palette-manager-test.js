/**
 * Palette Manager Tests
 * 
 * Unit tests for PaletteManager state management and color conversion logic
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager'
], function(TestFramework, fixtures, PaletteManager) {
    'use strict';
    
    return TestFramework.suite('Palette Manager', {
        
        /**
         * Test 1: Should initialize with empty palettes
         */
        'should initialize with empty palettes': function() {
            var manager = Object.create(PaletteManager);
            manager.init({ palettes: [], storeId: 1, themeId: 1 });
            
            var keys = Object.keys(manager.palettes);
            this.assertEquals(keys.length, 0, 
                'Palettes object should be empty after init with empty array');
        },
        
        /**
         * Test 2: Should index colors by cssVar after initialization
         */
        'should index colors by cssVar after initialization': function() {
            var manager = Object.create(PaletteManager);
            manager.init({ palettes: [fixtures.mockPaletteConfig], storeId: 1, themeId: 1 });
            
            // Check that primary color is indexed
            var color = manager.getColor('--color-brand-primary');
            
            this.assertNotNull(color, 'Color should be found by cssVar');
            this.assertEquals(color.id, 'primary', 'Color ID should match');
            this.assertEquals(color.label, 'Primary', 'Color label should match');
            this.assertEquals(color.value, '25, 121, 195', 'Color value should match');
        },
        
        /**
         * Test 3: Should convert HEX to RGB correctly
         */
        'should convert HEX to RGB correctly': function() {
            var manager = Object.create(PaletteManager);
            
            // Test various HEX colors
            this.assertEquals(manager.hexToRgb('#1979c3'), '25, 121, 195', 
                'Should convert #1979c3 to RGB');
            this.assertEquals(manager.hexToRgb('#ffffff'), '255, 255, 255', 
                'Should convert white to RGB');
            this.assertEquals(manager.hexToRgb('#000000'), '0, 0, 0', 
                'Should convert black to RGB');
            this.assertEquals(manager.hexToRgb('#ffa500'), '255, 165, 0', 
                'Should convert orange to RGB');
        },
        
        /**
         * Test 4: Should convert RGB to HEX correctly
         */
        'should convert RGB to HEX correctly': function() {
            var manager = Object.create(PaletteManager);
            
            // Test various RGB colors
            this.assertEquals(manager.rgbToHex('25, 121, 195'), '#1979c3', 
                'Should convert RGB to #1979c3');
            this.assertEquals(manager.rgbToHex('255, 255, 255'), '#ffffff', 
                'Should convert white RGB to HEX');
            this.assertEquals(manager.rgbToHex('0, 0, 0'), '#000000', 
                'Should convert black RGB to HEX');
            this.assertEquals(manager.rgbToHex('255, 165, 0'), '#ffa500', 
                'Should convert orange RGB to HEX');
        },
        
        /**
         * Test 5: Should find matching color by HEX value
         */
        'should find matching color by HEX value': function() {
            var manager = Object.create(PaletteManager);
            manager.init({ palettes: [fixtures.mockPaletteConfig], storeId: 1, themeId: 1 });
            
            // Find color by HEX value (returns cssVar string, not object)
            var cssVar = manager.findMatchingColor('#1979c3');
            
            this.assertNotNull(cssVar, 'Should find color by HEX value');
            this.assertEquals(cssVar, '--color-brand-primary', 
                'Should return correct CSS variable');
        },
        
        /**
         * Test 6: Should update color value and notify subscribers
         */
        'should update color value and notify subscribers': function(done) {
            var manager = Object.create(PaletteManager);
            manager.init({ palettes: [fixtures.mockPaletteConfig], storeId: 1, themeId: 1 });
            
            var notified = false;
            var notifiedCssVar = null;
            var notifiedHexValue = null;
            
            // Subscribe to changes
            manager.subscribe(function(cssVar, hexValue, rgbValue) {
                notified = true;
                notifiedCssVar = cssVar;
                notifiedHexValue = hexValue;
            });
            
            // Update color
            manager.updateColor('--color-brand-primary', '#ff0000');
            
            var self = this;
            
            // Wait a bit for notification
            setTimeout(function() {
                self.assertEquals(notified, true, 'Subscriber should be notified');
                self.assertEquals(notifiedCssVar, '--color-brand-primary', 
                    'Notified CSS var should match');
                self.assertEquals(notifiedHexValue, '#ff0000', 
                    'Notified HEX value should match');
                
                // Verify color was updated in index
                var color = manager.getColor('--color-brand-primary');
                self.assertEquals(color.value, '255, 0, 0', 
                    'Color value should be updated in index');
                
                done();
            }, 50);
        },
        
        /**
         * Test 7: Should track dirty state when color changes
         */
        'should track dirty state when color changes': function(done) {
            var manager = Object.create(PaletteManager);
            manager.init({ palettes: [fixtures.mockPaletteConfig], storeId: 1, themeId: 1 });
            
            var self = this;
            
            // Test 1: Initially no dirty changes
            self.assertEquals(manager.getDirtyCount(), 0, 
                'Should have no dirty changes initially');
            self.assertEquals(manager.hasDirtyChanges(), false, 
                'hasDirtyChanges should return false initially');
            
            // Test 2: Update color -> should track dirty state
            manager.updateColor('--color-brand-primary', '#ff0000');
            
            self.assertEquals(manager.getDirtyCount(), 1, 
                'Should have 1 dirty change after first update');
            self.assertEquals(manager.hasDirtyChanges(), true, 
                'hasDirtyChanges should return true');
            
            // Test 3: Update same color again -> count stays 1
            manager.updateColor('--color-brand-primary', '#00ff00');
            
            self.assertEquals(manager.getDirtyCount(), 1, 
                'Should still have 1 dirty change (same cssVar)');
            
            // Test 4: Update different color -> count increases
            manager.updateColor('--color-brand-secondary', '#0000ff');
            
            self.assertEquals(manager.getDirtyCount(), 2, 
                'Should have 2 dirty changes (different cssVars)');
            
            // Test 5: getDirtyChanges should format correctly
            var changes = manager.getDirtyChanges();
            
            self.assertEquals(changes.length, 2, 
                'getDirtyChanges should return 2 items');
            self.assertEquals(changes[0].sectionCode, 'palette', 
                'Should have sectionCode="palette"');
            self.assertNotNull(changes[0].fieldCode, 
                'Should have fieldCode (cssVar)');
            self.assertNotNull(changes[0].value, 
                'Should have value (RGB)');
            
            // Test 6: markAsSaved should clear dirty state
            manager.markAsSaved();
            
            self.assertEquals(manager.getDirtyCount(), 0, 
                'Should clear dirty state after markAsSaved');
            self.assertEquals(manager.hasDirtyChanges(), false, 
                'hasDirtyChanges should return false after markAsSaved');
            
            done();
        },
        
        /**
         * Test 8: Should notify all subscribers on color change
         */
        'should notify all subscribers on color change': function(done) {
            var manager = Object.create(PaletteManager);
            manager.init({ palettes: [fixtures.mockPaletteConfig], storeId: 1, themeId: 1 });
            
            var subscriber1Called = false;
            var subscriber2Called = false;
            
            // Add multiple subscribers
            manager.subscribe(function() {
                subscriber1Called = true;
            });
            
            manager.subscribe(function() {
                subscriber2Called = true;
            });
            
            // Update color
            manager.updateColor('--color-brand-accent', '#ff6600');
            
            var self = this;
            
            setTimeout(function() {
                self.assertEquals(subscriber1Called, true, 
                    'First subscriber should be notified');
                self.assertEquals(subscriber2Called, true, 
                    'Second subscriber should be notified');
                done();
            }, 50);
        },
        
        /**
         * Test 9: Should handle invalid color formats gracefully
         */
        'should handle invalid color formats gracefully': function() {
            var manager = Object.create(PaletteManager);
            
            // Test invalid HEX formats - will return NaN when parsed
            var result1 = manager.hexToRgb('invalid');
            this.assertContains(result1, 'NaN', 
                'Invalid HEX should return NaN values');
            
            // Test invalid RGB formats
            var result3 = manager.rgbToHex('invalid');
            this.assertEquals(result3, '#000000', 
                'Invalid RGB should return black HEX');
            
            var result4 = manager.rgbToHex('999, 999, 999');
            // Values > 255 will overflow in hex conversion
            this.assertNotNull(result4, 
                'RGB values > 255 should still convert');
        }
    });
});
