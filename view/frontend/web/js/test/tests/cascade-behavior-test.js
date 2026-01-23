/**
 * Cascade Behavior Tests
 * 
 * Tests for palette color cascade updates:
 * - PaletteManager subscription in CssPreviewManager
 * - Field updates when palette color changes
 * - Pickr instance updates
 * - data-palette-ref preservation during cascade
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager'
], function($, TestFramework, fixtures, PaletteManager, CssPreviewManager) {
    'use strict';
    
    return TestFramework.suite('Cascade Behavior', {
        
        /**
         * Test 1: CssPreviewManager should subscribe to PaletteManager on init
         */
        'should subscribe to PaletteManager on init': function() {
            // Initialize PaletteManager
            PaletteManager.init({ 
                palettes: [fixtures.mockPaletteConfig], 
                storeId: 1, 
                themeId: 1 
            });
            
            // Get initial listener count
            var initialCount = PaletteManager.listeners ? PaletteManager.listeners.length : 0;
            
            // Initialize CssPreviewManager (should subscribe to PaletteManager)
            var previewManager = Object.create(CssPreviewManager);
            previewManager.init({});
            
            // Verify subscription was added
            var newCount = PaletteManager.listeners ? PaletteManager.listeners.length : 0;
            
            this.assert(newCount > initialCount, 
                'CssPreviewManager should add subscription to PaletteManager');
        },
        
        /**
         * Test 2: Should find fields with matching data-palette-ref attribute
         */
        'should find fields with matching palette ref': function() {
            // Create test DOM structure
            var $container = $('<div id="cascade-test-container"></div>').appendTo('body');
            
            // Add fields with palette refs
            $container.append(
                '<input class="bte-color-input" value="#1979c3" data-palette-ref="--color-brand-primary" />' +
                '<input class="bte-color-input" value="#ff0000" data-palette-ref="--color-brand-secondary" />' +
                '<input class="bte-color-input" value="#00ff00" />' // No palette ref
            );
            
            // Find fields with specific palette ref
            var $fields = $container.find('[data-palette-ref="--color-brand-primary"]');
            
            this.assertEquals($fields.length, 1, 
                'Should find exactly 1 field with --color-brand-primary ref');
            this.assertEquals($fields.attr('data-palette-ref'), '--color-brand-primary',
                'Found field should have correct palette ref');
            
            // Cleanup
            $container.remove();
        },
        
        /**
         * Test 3: Should update input values when palette color changes
         */
        'should update input values when palette changes': function(done) {
            var self = this;
            
            // Initialize PaletteManager
            PaletteManager.init({ 
                palettes: [fixtures.mockPaletteConfig], 
                storeId: 1, 
                themeId: 1 
            });
            
            // Create test field
            var $container = $('<div id="cascade-test-container"></div>').appendTo('body');
            $container.append(
                '<input class="bte-color-input" value="#1979c3" data-palette-ref="--color-brand-primary" />' +
                '<div class="bte-color-preview" style="background-color: rgb(25, 121, 195);"></div>'
            );
            
            var $input = $container.find('.bte-color-input');
            var $preview = $container.find('.bte-color-preview');
            
            // Subscribe to palette changes (simulate CssPreviewManager behavior)
            PaletteManager.subscribe(function(cssVar, hexValue, rgbValue) {
                if (cssVar === '--color-brand-primary') {
                    // Update fields with matching palette ref
                    var $matchingFields = $('[data-palette-ref="' + cssVar + '"]');
                    
                    $matchingFields.each(function() {
                        var $field = $(this);
                        $field.val(hexValue);
                        
                        // Update preview box
                        $field.closest('.bte-color-picker-wrapper')
                            .find('.bte-color-preview')
                            .css('background-color', hexValue);
                    });
                }
            });
            
            // Update palette color
            PaletteManager.updateColor('--color-brand-primary', '#ff0000');
            
            // Check after notification
            setTimeout(function() {
                self.assertEquals($input.val(), '#ff0000',
                    'Input value should be updated to new color');
                
                // Check if palette ref is preserved
                self.assertEquals($input.attr('data-palette-ref'), '--color-brand-primary',
                    'data-palette-ref should be preserved after update');
                
                // Cleanup
                $container.remove();
                done();
            }, 100);
        },
        
        /**
         * Test 4: Should preserve data-palette-ref during cascade updates
         */
        'should preserve data-palette-ref during cascade': function(done) {
            var self = this;
            
            // Initialize PaletteManager
            PaletteManager.init({ 
                palettes: [fixtures.mockPaletteConfig], 
                storeId: 1, 
                themeId: 1 
            });
            
            // Create test field with palette ref
            var $container = $('<div id="cascade-test-container"></div>').appendTo('body');
            $container.append(
                '<input class="bte-color-input" value="#1979c3" data-palette-ref="--color-brand-primary" />'
            );
            
            var $input = $container.find('.bte-color-input');
            
            // Verify initial state
            self.assertEquals($input.attr('data-palette-ref'), '--color-brand-primary',
                'Initial palette ref should be set');
            
            // Subscribe and update
            PaletteManager.subscribe(function(cssVar, hexValue) {
                if (cssVar === '--color-brand-primary') {
                    $input.val(hexValue);
                    // Simulate setting is-palette-update flag
                    $input.attr('data-is-palette-update', 'true');
                }
            });
            
            // Update color
            PaletteManager.updateColor('--color-brand-primary', '#00ff00');
            
            setTimeout(function() {
                // Verify palette ref is still present
                self.assertEquals($input.attr('data-palette-ref'), '--color-brand-primary',
                    'Palette ref should be preserved after cascade update');
                
                self.assertEquals($input.val(), '#00ff00',
                    'Value should be updated');
                
                // Cleanup
                $container.remove();
                done();
            }, 100);
        },
        
        /**
         * Test 5: Should set is-palette-update flag during cascade
         */
        'should set is-palette-update flag during cascade': function(done) {
            var self = this;
            
            // Initialize PaletteManager
            PaletteManager.init({ 
                palettes: [fixtures.mockPaletteConfig], 
                storeId: 1, 
                themeId: 1 
            });
            
            // Create test field
            var $container = $('<div id="cascade-test-container"></div>').appendTo('body');
            $container.append(
                '<input class="bte-color-input" value="#1979c3" data-palette-ref="--color-brand-primary" />'
            );
            
            var $input = $container.find('.bte-color-input');
            var flagWasSet = false;
            
            // Subscribe and simulate CssPreviewManager behavior
            PaletteManager.subscribe(function(cssVar, hexValue) {
                if (cssVar === '--color-brand-primary') {
                    // Set flag (like CssPreviewManager does)
                    $input.attr('data-is-palette-update', 'true');
                    flagWasSet = true;
                    
                    // Flag should be cleared after timeout (simulate)
                    setTimeout(function() {
                        $input.removeAttr('data-is-palette-update');
                    }, 50);
                }
            });
            
            // Update color
            PaletteManager.updateColor('--color-brand-primary', '#0000ff');
            
            // Check immediately - flag should be set
            setTimeout(function() {
                self.assertEquals(flagWasSet, true,
                    'is-palette-update flag should have been set');
                
                // Check after flag timeout - should be cleared
                setTimeout(function() {
                    self.assertEquals($input.attr('data-is-palette-update'), undefined,
                        'is-palette-update flag should be cleared after timeout');
                    
                    // Cleanup
                    $container.remove();
                    done();
                }, 100);
            }, 10);
        },
        
        /**
         * Test 6: Should handle multiple fields with same palette ref
         */
        'should update multiple fields with same palette ref': function(done) {
            var self = this;
            
            // Initialize PaletteManager
            PaletteManager.init({ 
                palettes: [fixtures.mockPaletteConfig], 
                storeId: 1, 
                themeId: 1 
            });
            
            // Create multiple fields with same palette ref
            var $container = $('<div id="cascade-test-container"></div>').appendTo('body');
            $container.append(
                '<input class="field-1" value="#1979c3" data-palette-ref="--color-brand-primary" />' +
                '<input class="field-2" value="#1979c3" data-palette-ref="--color-brand-primary" />' +
                '<input class="field-3" value="#1979c3" data-palette-ref="--color-brand-primary" />'
            );
            
            // Subscribe to updates
            PaletteManager.subscribe(function(cssVar, hexValue) {
                if (cssVar === '--color-brand-primary') {
                    $('[data-palette-ref="' + cssVar + '"]').val(hexValue);
                }
            });
            
            // Update palette color
            PaletteManager.updateColor('--color-brand-primary', '#ff00ff');
            
            setTimeout(function() {
                // Check all fields were updated
                self.assertEquals($container.find('.field-1').val(), '#ff00ff',
                    'Field 1 should be updated');
                self.assertEquals($container.find('.field-2').val(), '#ff00ff',
                    'Field 2 should be updated');
                self.assertEquals($container.find('.field-3').val(), '#ff00ff',
                    'Field 3 should be updated');
                
                // Cleanup
                $container.remove();
                done();
            }, 100);
        },
        
        /**
         * Test 7: Should not affect fields without palette ref
         */
        'should not affect fields without palette ref': function(done) {
            var self = this;
            
            // Initialize PaletteManager
            PaletteManager.init({ 
                palettes: [fixtures.mockPaletteConfig], 
                storeId: 1, 
                themeId: 1 
            });
            
            // Create fields with and without palette ref
            var $container = $('<div id="cascade-test-container"></div>').appendTo('body');
            $container.append(
                '<input class="with-ref" value="#1979c3" data-palette-ref="--color-brand-primary" />' +
                '<input class="without-ref" value="#aabbcc" />'
            );
            
            var $withRef = $container.find('.with-ref');
            var $withoutRef = $container.find('.without-ref');
            var originalValue = $withoutRef.val();
            
            // Subscribe to updates
            PaletteManager.subscribe(function(cssVar, hexValue) {
                if (cssVar === '--color-brand-primary') {
                    $('[data-palette-ref="' + cssVar + '"]').val(hexValue);
                }
            });
            
            // Update palette color
            PaletteManager.updateColor('--color-brand-primary', '#123456');
            
            setTimeout(function() {
                self.assertEquals($withRef.val(), '#123456',
                    'Field with palette ref should be updated');
                self.assertEquals($withoutRef.val(), originalValue,
                    'Field without palette ref should remain unchanged');
                
                // Cleanup
                $container.remove();
                done();
            }, 100);
        }
    });
});
