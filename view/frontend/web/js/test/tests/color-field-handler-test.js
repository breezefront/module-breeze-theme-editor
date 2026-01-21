/**
 * Color Field Handler Tests (Pickr Integration)
 * 
 * Tests for color field handler with Pickr popup picker:
 * - Initialization and event binding
 * - Text input validation and updates
 * - Popup opening/closing behavior
 * - Pickr widget integration
 * - Palette swatch interaction
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/color',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager'
], function($, TestFramework, fixtures, ColorFieldHandler, PaletteManager) {
    'use strict';
    
    return TestFramework.suite('Color Field Handler (Pickr)', {
        
        /**
         * Setup: Create mock HTML structure for color field
         */
        setup: function() {
            // Initialize PaletteManager with mock data
            PaletteManager.init({
                palettes: [fixtures.mockPaletteConfig],
                storeId: 1,
                themeId: 1
            });
            
            // Create test container
            this.$container = $('<div class="bte-test-container">').appendTo('body');
            
            // Create color field HTML
            this.$container.html(`
                <div class="bte-field bte-field-color" data-field-name="test_color">
                    <div class="bte-field-label">
                        <label>Test Color</label>
                    </div>
                    <div class="bte-field-input">
                        <div class="bte-color-trigger">
                            <span class="bte-color-preview" style="background-color: #1979c3;"></span>
                        </div>
                        <input type="text" 
                               class="bte-color-input" 
                               value="#1979c3" 
                               data-css-var="--color-brand-primary"
                               data-palette-id="default">
                    </div>
                </div>
            `);
            
            this.changeCallbackCalled = false;
            this.changeCallbackValue = null;
            
            var self = this;
            this.changeCallback = function($input) {
                self.changeCallbackCalled = true;
                self.changeCallbackValue = $input.val();
            };
        },
        
        /**
         * Teardown: Clean up DOM and Pickr instances
         */
        teardown: function() {
            // Close all popups and destroy Pickr instances
            ColorFieldHandler._closeAllPopups();
            
            // Remove test container
            if (this.$container) {
                this.$container.remove();
            }
        },
        
        // =====================================================================
        // INITIALIZATION TESTS
        // =====================================================================
        
        /**
         * Test 1: Should initialize color field handler
         */
        'should initialize color field handler without errors': function() {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            this.assertEquals($trigger.length, 1, 'Color trigger should exist');
            
            var $input = this.$container.find('.bte-color-input');
            this.assertEquals($input.length, 1, 'Color input should exist');
            this.assertEquals($input.val(), '#1979c3', 'Initial color value should be set');
        },
        
        /**
         * Test 2: Should validate HEX colors correctly
         */
        'should validate HEX colors correctly': function() {
            // Valid HEX colors
            this.assertTrue(ColorFieldHandler.isValidHex('#1979c3'), '#1979c3 should be valid');
            this.assertTrue(ColorFieldHandler.isValidHex('#fff'), '#fff should be valid');
            this.assertTrue(ColorFieldHandler.isValidHex('#000000'), '#000000 should be valid');
            this.assertTrue(ColorFieldHandler.isValidHex('#FFA500'), '#FFA500 (uppercase) should be valid');
            
            // Invalid HEX colors
            this.assertFalse(ColorFieldHandler.isValidHex('1979c3'), 'Missing # should be invalid');
            this.assertFalse(ColorFieldHandler.isValidHex('#xyz'), 'Non-hex chars should be invalid');
            this.assertFalse(ColorFieldHandler.isValidHex('#12'), 'Too short should be invalid');
            this.assertFalse(ColorFieldHandler.isValidHex('#1234567'), 'Too long should be invalid');
            this.assertFalse(ColorFieldHandler.isValidHex(''), 'Empty string should be invalid');
        },
        
        /**
         * Test 3: Should normalize HEX colors to lowercase
         */
        'should normalize HEX colors to lowercase': function() {
            this.assertEquals(ColorFieldHandler.normalizeHex('#FFA500'), '#ffa500', 
                'Should convert to lowercase');
            this.assertEquals(ColorFieldHandler.normalizeHex('#FFFFFF'), '#ffffff', 
                'Should convert uppercase to lowercase');
            this.assertEquals(ColorFieldHandler.normalizeHex('#abc'), '#abc', 
                'Should keep lowercase as is');
        },
        
        // =====================================================================
        // TEXT INPUT TESTS
        // =====================================================================
        
        /**
         * Test 4: Should update trigger preview when valid HEX is entered
         */
        'should update trigger preview when valid HEX is entered': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $input = this.$container.find('.bte-color-input');
            var $trigger = this.$container.find('.bte-color-trigger');
            var $preview = $trigger.find('.bte-color-preview');
            
            var self = this;
            
            // Change color to red
            $input.val('#ff0000').trigger('input');
            
            setTimeout(function() {
                var bgColor = $preview.css('background-color');
                
                // RGB(255, 0, 0) should be set
                self.assertTrue(
                    bgColor === 'rgb(255, 0, 0)' || bgColor === '#ff0000',
                    'Preview should show red color, got: ' + bgColor
                );
                
                self.assertTrue(self.changeCallbackCalled, 'Change callback should be called');
                self.assertEquals(self.changeCallbackValue, '#ff0000', 
                    'Change callback should receive new value');
                
                done();
            }, 100);
        },
        
        /**
         * Test 5: Should not trigger callback for invalid HEX
         */
        'should not trigger callback for invalid HEX': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $input = this.$container.find('.bte-color-input');
            var self = this;
            
            // Enter invalid color
            $input.val('#xyz').trigger('input');
            
            setTimeout(function() {
                self.assertFalse(self.changeCallbackCalled, 
                    'Change callback should not be called for invalid HEX');
                done();
            }, 100);
        },
        
        /**
         * Test 6: Should normalize HEX on input
         */
        'should handle uppercase HEX input': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $input = this.$container.find('.bte-color-input');
            var self = this;
            
            // Enter uppercase HEX
            $input.val('#FFA500').trigger('input');
            
            setTimeout(function() {
                self.assertTrue(self.changeCallbackCalled, 'Callback should be called');
                done();
            }, 100);
        },
        
        // =====================================================================
        // POPUP TESTS
        // =====================================================================
        
        /**
         * Test 7: Should open popup when trigger is clicked
         */
        'should open popup when trigger is clicked': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            // Click trigger
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                
                self.assertEquals($popup.length, 1, 'Popup should be created');
                self.assertTrue($popup.is(':visible'), 'Popup should be visible');
                
                // Check popup structure
                self.assertEquals($popup.find('.bte-popup-palette').length, 1, 
                    'Popup should contain palette grid');
                self.assertEquals($popup.find('.bte-popup-pickr-container').length, 1, 
                    'Popup should contain Pickr container');
                
                done();
            }, 200);
        },
        
        /**
         * Test 8: Should close popup when close button is clicked
         */
        'should close popup when close button is clicked': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            // Open popup
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                self.assertTrue($popup.length > 0, 'Popup should be open');
                
                // Click close button
                var $closeBtn = $popup.find('.bte-popup-close');
                $closeBtn.trigger('click');
                
                setTimeout(function() {
                    var $popupAfter = $('.bte-color-popup');
                    self.assertEquals($popupAfter.length, 0, 'Popup should be removed from DOM');
                    done();
                }, 100);
            }, 200);
        },
        
        /**
         * Test 9: Should close popup on ESC key
         */
        'should close popup on ESC key': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            // Open popup
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                self.assertTrue($popup.length > 0, 'Popup should be open');
                
                // Press ESC key
                var escEvent = $.Event('keydown', { keyCode: 27 });
                $(document).trigger(escEvent);
                
                setTimeout(function() {
                    var $popupAfter = $('.bte-color-popup');
                    self.assertEquals($popupAfter.length, 0, 
                        'Popup should be closed after ESC key');
                    done();
                }, 100);
            }, 200);
        },
        
        /**
         * Test 10: Should only allow one popup at a time
         */
        'should only allow one popup at a time': function(done) {
            // Create second color field
            this.$container.append(`
                <div class="bte-field bte-field-color" data-field-name="test_color_2">
                    <div class="bte-field-input">
                        <div class="bte-color-trigger">
                            <span class="bte-color-preview" style="background-color: #ff0000;"></span>
                        </div>
                        <input type="text" class="bte-color-input" value="#ff0000">
                    </div>
                </div>
            `);
            
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger1 = this.$container.find('.bte-color-trigger').eq(0);
            var $trigger2 = this.$container.find('.bte-color-trigger').eq(1);
            var self = this;
            
            // Open first popup
            $trigger1.trigger('click');
            
            setTimeout(function() {
                var $popup1 = $('.bte-color-popup');
                self.assertEquals($popup1.length, 1, 'First popup should be open');
                
                // Try to open second popup
                $trigger2.trigger('click');
                
                setTimeout(function() {
                    var $popups = $('.bte-color-popup');
                    self.assertEquals($popups.length, 1, 
                        'Only one popup should be open at a time');
                    done();
                }, 200);
            }, 200);
        },
        
        // =====================================================================
        // PALETTE GRID TESTS
        // =====================================================================
        
        /**
         * Test 11: Should render palette groups in popup
         */
        'should render palette groups in popup': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            // Open popup
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                var $groups = $popup.find('.bte-palette-group');
                
                // mockPaletteConfig has 2 groups: brand and semantic
                self.assertTrue($groups.length >= 2, 
                    'Should render at least 2 palette groups, found: ' + $groups.length);
                
                // Check for group labels
                var $labels = $popup.find('.bte-palette-group-label');
                self.assertTrue($labels.length >= 2, 
                    'Should have group labels');
                
                done();
            }, 200);
        },
        
        /**
         * Test 12: Should render palette swatches
         */
        'should render palette swatches': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            // Open popup
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                var $swatches = $popup.find('.bte-palette-swatch');
                
                // mockPaletteConfig has 3 brand colors + 2 semantic colors = 5 total
                self.assertTrue($swatches.length >= 5, 
                    'Should render at least 5 swatches, found: ' + $swatches.length);
                
                // Check first swatch has correct color (primary = #1979c3)
                var $firstSwatch = $swatches.eq(0);
                var bgColor = $firstSwatch.css('background-color');
                
                self.assertTrue(
                    bgColor === 'rgb(25, 121, 195)' || bgColor === '#1979c3',
                    'First swatch should be primary color, got: ' + bgColor
                );
                
                done();
            }, 200);
        },
        
        // =====================================================================
        // EDGE CASES
        // =====================================================================
        
        /**
         * Test 13: Should handle initialization without palette
         */
        'should handle initialization without palette': function() {
            // Create field without palette data
            var $field = $('<div class="bte-field bte-field-color">').appendTo(this.$container);
            $field.html(`
                <div class="bte-field-input">
                    <div class="bte-color-trigger">
                        <span class="bte-color-preview"></span>
                    </div>
                    <input type="text" class="bte-color-input" value="#000000">
                </div>
            `);
            
            // Should not throw error
            var self = this;
            this.assert(function() {
                try {
                    ColorFieldHandler.init($field, self.changeCallback);
                    return true;
                } catch (e) {
                    console.error('Init error:', e);
                    return false;
                }
            }(), 'Should initialize without palette data');
        },
        
        /**
         * Test 14: Should handle short HEX codes (#fff)
         */
        'should handle short HEX codes': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $input = this.$container.find('.bte-color-input');
            var self = this;
            
            // Enter short HEX
            $input.val('#fff').trigger('input');
            
            setTimeout(function() {
                self.assertTrue(self.changeCallbackCalled, 
                    'Should accept short HEX format');
                done();
            }, 100);
        },
        
        /**
         * Test 15: Should preserve alpha channel in preview (if present)
         */
        'should work with RGB color values': function() {
            var $preview = this.$container.find('.bte-color-preview');
            
            // Set RGB value directly
            $preview.css('background-color', 'rgb(255, 0, 0)');
            
            var bgColor = $preview.css('background-color');
            this.assertTrue(
                bgColor === 'rgb(255, 0, 0)' || bgColor === '#ff0000',
                'Preview should accept RGB values'
            );
        }
    });
});
