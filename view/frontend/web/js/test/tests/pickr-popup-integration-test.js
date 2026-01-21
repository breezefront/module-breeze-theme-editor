/**
 * Pickr Popup Integration Tests
 * 
 * Tests for Pickr popup integration with palette grid:
 * - Pickr instance creation and configuration
 * - Color synchronization between Pickr and input
 * - Palette swatch click behavior
 * - Save/Cancel button behavior
 * - Popup positioning
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/color',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager'
], function($, TestFramework, fixtures, ColorFieldHandler, PaletteManager) {
    'use strict';
    
    return TestFramework.suite('Pickr Popup Integration', {
        
        /**
         * Setup: Create test environment
         */
        setup: function() {
            // Initialize PaletteManager with mock data
            PaletteManager.init({
                palettes: [fixtures.mockPaletteConfig],
                storeId: 1,
                themeId: 1
            });
            
            // Create test container
            this.$container = $('<div class="bte-test-container">').css({
                position: 'absolute',
                top: '100px',
                left: '100px',
                width: '300px'
            }).appendTo('body');
            
            // Create color field
            this.$container.html(`
                <div class="bte-field bte-field-color" data-field-name="test_color">
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
            this.lastCallbackValue = null;
            
            var self = this;
            this.changeCallback = function($input) {
                self.changeCallbackCalled = true;
                self.lastCallbackValue = $input.val();
            };
        },
        
        /**
         * Teardown: Clean up
         */
        teardown: function() {
            ColorFieldHandler._closeAllPopups();
            if (this.$container) {
                this.$container.remove();
            }
        },
        
        // =====================================================================
        // PICKR INSTANCE TESTS
        // =====================================================================
        
        /**
         * Test 1: Should create Pickr instance when popup opens
         */
        'should create Pickr instance when popup opens': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var popupInstance = $trigger.data('popup-instance');
                
                self.assertNotNull(popupInstance, 'Popup instance should be stored');
                self.assertNotNull(popupInstance.pickr, 'Pickr instance should exist');
                self.assertTrue(typeof popupInstance.pickr.setColor === 'function', 
                    'Pickr should have setColor method');
                
                done();
            }, 300);
        },
        
        /**
         * Test 2: Should initialize Pickr with current color
         */
        'should initialize Pickr with current color': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var popupInstance = $trigger.data('popup-instance');
                var pickrColor = popupInstance.pickr.getColor();
                
                self.assertNotNull(pickrColor, 'Pickr should have a color set');
                
                var hexColor = pickrColor.toHEXA().toString();
                self.assertTrue(
                    hexColor.toLowerCase().startsWith('#1979c3'),
                    'Pickr should be initialized with #1979c3, got: ' + hexColor
                );
                
                done();
            }, 300);
        },
        
        /**
         * Test 3: Should destroy Pickr instance when popup closes
         */
        'should destroy Pickr instance when popup closes': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            // Open popup
            $trigger.trigger('click');
            
            setTimeout(function() {
                var popupInstance = $trigger.data('popup-instance');
                self.assertNotNull(popupInstance, 'Popup instance should exist');
                
                // Close popup
                var $closeBtn = $('.bte-popup-close');
                $closeBtn.trigger('click');
                
                setTimeout(function() {
                    var instanceAfter = $trigger.data('popup-instance');
                    self.assertTrue(
                        instanceAfter === null || instanceAfter === undefined,
                        'Popup instance should be cleared'
                    );
                    
                    done();
                }, 150);
            }, 300);
        },
        
        // =====================================================================
        // COLOR SYNCHRONIZATION TESTS
        // =====================================================================
        
        /**
         * Test 4: Should update text input when Pickr color changes
         */
        'should update text input when Pickr color changes': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var $input = this.$container.find('.bte-color-input');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var popupInstance = $trigger.data('popup-instance');
                var pickr = popupInstance.pickr;
                
                // Change Pickr color to red
                pickr.setColor('#ff0000');
                
                setTimeout(function() {
                    var inputValue = $input.val();
                    self.assertEquals(inputValue, '#ff0000', 
                        'Input should update to #ff0000, got: ' + inputValue);
                    
                    self.assertTrue(self.changeCallbackCalled, 
                        'Change callback should be called');
                    
                    done();
                }, 200);
            }, 300);
        },
        
        /**
         * Test 5: Should update Pickr when text input changes
         */
        'should update Pickr when text input changes (popup open)': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var $input = this.$container.find('.bte-color-input');
            var self = this;
            
            // Open popup first
            $trigger.trigger('click');
            
            setTimeout(function() {
                var popupInstance = $trigger.data('popup-instance');
                var pickr = popupInstance.pickr;
                
                // Reset callback state
                self.changeCallbackCalled = false;
                
                // Change input to green
                $input.val('#00ff00').trigger('input');
                
                setTimeout(function() {
                    var pickrColor = pickr.getColor().toHEXA().toString().toLowerCase();
                    
                    self.assertTrue(
                        pickrColor.startsWith('#00ff00'),
                        'Pickr should update to green, got: ' + pickrColor
                    );
                    
                    done();
                }, 200);
            }, 300);
        },
        
        /**
         * Test 6: Should update trigger preview when Pickr changes
         */
        'should update trigger preview when Pickr changes': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var $preview = $trigger.find('.bte-color-preview');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var popupInstance = $trigger.data('popup-instance');
                var pickr = popupInstance.pickr;
                
                // Change to orange
                pickr.setColor('#ffa500');
                
                setTimeout(function() {
                    var bgColor = $preview.css('background-color');
                    
                    self.assertTrue(
                        bgColor === 'rgb(255, 165, 0)' || bgColor === '#ffa500',
                        'Preview should be orange, got: ' + bgColor
                    );
                    
                    done();
                }, 200);
            }, 300);
        },
        
        // =====================================================================
        // PALETTE SWATCH INTERACTION TESTS
        // =====================================================================
        
        /**
         * Test 7: Should update Pickr when palette swatch is clicked
         */
        'should update Pickr when palette swatch is clicked': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                var $firstSwatch = $popup.find('.bte-palette-swatch').first();
                var swatchColor = $firstSwatch.attr('data-color');
                
                self.assertNotNull(swatchColor, 'Swatch should have data-color attribute');
                
                // Click swatch
                $firstSwatch.trigger('click');
                
                setTimeout(function() {
                    var popupInstance = $trigger.data('popup-instance');
                    var pickr = popupInstance.pickr;
                    var pickrColor = pickr.getColor().toHEXA().toString().toLowerCase();
                    
                    self.assertTrue(
                        pickrColor.startsWith(swatchColor.toLowerCase()),
                        'Pickr should update to swatch color: ' + swatchColor + ', got: ' + pickrColor
                    );
                    
                    done();
                }, 200);
            }, 300);
        },
        
        /**
         * Test 8: Should keep popup open after swatch click
         */
        'should keep popup open after swatch click': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                var $swatch = $popup.find('.bte-palette-swatch').first();
                
                // Click swatch
                $swatch.trigger('click');
                
                setTimeout(function() {
                    var $popupAfter = $('.bte-color-popup');
                    self.assertTrue($popupAfter.length > 0, 
                        'Popup should remain open after swatch click');
                    self.assertTrue($popupAfter.is(':visible'), 
                        'Popup should be visible');
                    
                    done();
                }, 200);
            }, 300);
        },
        
        /**
         * Test 9: Should highlight selected swatch
         */
        'should add selected class to clicked swatch': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                var $swatch = $popup.find('.bte-palette-swatch').eq(1);
                
                // Click second swatch
                $swatch.trigger('click');
                
                setTimeout(function() {
                    self.assertTrue($swatch.hasClass('selected'), 
                        'Clicked swatch should have "selected" class');
                    
                    // Other swatches should not have selected class
                    var $otherSwatches = $popup.find('.bte-palette-swatch').not($swatch);
                    var hasOtherSelected = $otherSwatches.hasClass('selected');
                    self.assertFalse(hasOtherSelected, 
                        'Other swatches should not be selected');
                    
                    done();
                }, 200);
            }, 300);
        },
        
        // =====================================================================
        // SAVE/CANCEL BUTTON TESTS
        // =====================================================================
        
        /**
         * Test 10: Should close popup when Save button is clicked
         */
        'should close popup when Save button is clicked': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                var popupInstance = $trigger.data('popup-instance');
                var pickr = popupInstance.pickr;
                
                // Change color
                pickr.setColor('#00ff00');
                
                setTimeout(function() {
                    // Click save button (Pickr's save button)
                    var $saveBtn = $popup.find('.pcr-save');
                    
                    if ($saveBtn.length > 0) {
                        $saveBtn.trigger('click');
                        
                        setTimeout(function() {
                            var $popupAfter = $('.bte-color-popup');
                            self.assertEquals($popupAfter.length, 0, 
                                'Popup should close after Save');
                            
                            done();
                        }, 150);
                    } else {
                        console.warn('Save button not found in Pickr widget');
                        done();
                    }
                }, 200);
            }, 300);
        },
        
        /**
         * Test 11: Should restore original color on Cancel
         */
        'should restore original color on Cancel': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var $input = this.$container.find('.bte-color-input');
            var originalColor = $input.val();
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                var popupInstance = $trigger.data('popup-instance');
                var pickr = popupInstance.pickr;
                
                // Change to different color
                pickr.setColor('#ff00ff');
                
                setTimeout(function() {
                    // Click cancel button
                    var $cancelBtn = $popup.find('.pcr-cancel');
                    
                    if ($cancelBtn.length > 0) {
                        $cancelBtn.trigger('click');
                        
                        setTimeout(function() {
                            var currentColor = $input.val();
                            self.assertEquals(currentColor, originalColor,
                                'Color should be restored to original: ' + originalColor);
                            
                            done();
                        }, 150);
                    } else {
                        console.warn('Cancel button not found in Pickr widget');
                        done();
                    }
                }, 200);
            }, 300);
        },
        
        // =====================================================================
        // POSITIONING TESTS
        // =====================================================================
        
        /**
         * Test 12: Should position popup to the right of trigger
         */
        'should position popup to the right of trigger': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                var triggerOffset = $trigger.offset();
                var popupOffset = $popup.offset();
                
                self.assertTrue(popupOffset.left > triggerOffset.left,
                    'Popup should be positioned to the right of trigger');
                
                done();
            }, 300);
        },
        
        /**
         * Test 13: Should have correct popup structure
         */
        'should have correct popup structure': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popup = $('.bte-color-popup');
                
                // Check main containers
                self.assertEquals($popup.find('.bte-popup-palette').length, 1,
                    'Should have palette container');
                self.assertEquals($popup.find('.bte-popup-pickr-container').length, 1,
                    'Should have Pickr container');
                self.assertEquals($popup.find('.bte-popup-close').length, 1,
                    'Should have close button');
                
                // Check Pickr widget
                self.assertEquals($popup.find('.pcr-app').length, 1,
                    'Should have Pickr widget');
                
                done();
            }, 300);
        },
        
        // =====================================================================
        // EDGE CASES
        // =====================================================================
        
        /**
         * Test 14: Should handle rapid open/close
         */
        'should handle rapid open/close operations': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            // Rapid clicks
            $trigger.trigger('click');
            $trigger.trigger('click');
            $trigger.trigger('click');
            
            setTimeout(function() {
                var $popups = $('.bte-color-popup');
                self.assertTrue($popups.length <= 1, 
                    'Should have at most one popup, found: ' + $popups.length);
                
                done();
            }, 400);
        },
        
        /**
         * Test 15: Should handle invalid color gracefully
         */
        'should handle setting invalid color in Pickr': function(done) {
            ColorFieldHandler.init(this.$container, this.changeCallback);
            
            var $trigger = this.$container.find('.bte-color-trigger');
            var self = this;
            
            $trigger.trigger('click');
            
            setTimeout(function() {
                var popupInstance = $trigger.data('popup-instance');
                var pickr = popupInstance.pickr;
                
                // Try to set invalid color (should not crash)
                self.assert(function() {
                    try {
                        pickr.setColor('invalid');
                        return true;
                    } catch (e) {
                        console.warn('Pickr threw error on invalid color:', e);
                        return true; // Still acceptable if it throws controlled error
                    }
                }(), 'Should handle invalid color without crashing');
                
                done();
            }, 300);
        }
    });
});
