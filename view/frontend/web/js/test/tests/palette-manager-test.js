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
            this.assertEquals(color.value, '#1979c3', 'Color value should match');
        },
        
        /**
         * Test 3: Should find matching color by HEX value
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
         * Test 4: Should update color value and notify subscribers
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
                self.assertEquals(color.value, '#ff0000', 
                    'Color value should be updated in index');
                
                done();
            }, 50);
        },
        
        /**
         * Test 5: Should track dirty state when color changes
         */
        'should track dirty state when color changes': function() {
            var manager = Object.create(PaletteManager);
            manager.init({ palettes: [fixtures.mockPaletteConfig], storeId: 1, themeId: 1 });
            
            // Test 1: Initially no dirty changes
            this.assertEquals(manager.getDirtyCount(), 0, 
                'Should have no dirty changes initially');
            this.assertEquals(manager.hasDirtyChanges(), false, 
                'hasDirtyChanges should return false initially');
            
            // Test 2: Update color -> should track dirty state
            manager.updateColor('--color-brand-primary', '#ff0000');
            
            this.assertEquals(manager.getDirtyCount(), 1, 
                'Should have 1 dirty change after first update');
            this.assertEquals(manager.hasDirtyChanges(), true, 
                'hasDirtyChanges should return true');
            
            // Test 3: Update same color again -> count stays 1
            manager.updateColor('--color-brand-primary', '#00ff00');
            
            this.assertEquals(manager.getDirtyCount(), 1, 
                'Should still have 1 dirty change (same cssVar)');
            
            // Test 4: Update different color -> count increases
            manager.updateColor('--color-brand-secondary', '#0000ff');
            
            this.assertEquals(manager.getDirtyCount(), 2, 
                'Should have 2 dirty changes (different cssVars)');
            
            // Test 5: getDirtyChanges should format correctly
            var changes = manager.getDirtyChanges();
            
            this.assertEquals(changes.length, 2, 
                'getDirtyChanges should return 2 items');
            this.assertEquals(changes[0].sectionCode, '_palette', 
                'Should have sectionCode="_palette" (special backend section)');
            this.assertNotNull(changes[0].fieldCode, 
                'Should have fieldCode (cssVar)');
            this.assertNotNull(changes[0].value, 
                'Should have value (RGB)');
            
            // Test 6: markAsSaved should clear dirty state
            manager.markAsSaved();
            
            this.assertEquals(manager.getDirtyCount(), 0, 
                'Should clear dirty state after markAsSaved');
            this.assertEquals(manager.hasDirtyChanges(), false, 
                'hasDirtyChanges should return false after markAsSaved');
        },
        
        /**
         * Test 6: Should notify all subscribers on color change
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
         * Test 7: Should handle invalid color formats gracefully (wrapper integration test)
         */
        'should handle invalid color formats gracefully': function() {
            var manager = Object.create(PaletteManager);
            
            // Test wrapper methods still work (delegates to ColorUtils)
            var result1 = manager.hexToRgb('invalid');
            this.assertEquals(result1, '0, 0, 0', 
                'Invalid HEX should return black RGB via wrapper');
            
            // Test invalid RGB formats
            var result3 = manager.rgbToHex('invalid');
            this.assertEquals(result3, '#000000', 
                'Invalid RGB should return black HEX via wrapper');
            
            var result4 = manager.rgbToHex('999, 999, 999');
            this.assertEquals(result4, '#ffffff', 
                'RGB values > 255 should clamp to white via wrapper');
        }
    });
});
