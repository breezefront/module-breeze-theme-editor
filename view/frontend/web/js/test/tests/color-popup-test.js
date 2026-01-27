/**
 * Color Popup Tests
 * 
 * Minimal test suite for critical popup behavior:
 * - Outside click closes popup (main fix for issue #1)
 * - Manual input removes palette-ref (badge fix for issue #2)
 * - ESC and close button work correctly
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';
    
    /**
     * Helper: Find first color field in panel
     */
    function findColorField() {
        var $panel = $('.bte-panel');
        var $colorInput = $panel.find('.bte-color-input').first();
        
        if ($colorInput.length === 0) {
            throw new Error('No color field found. Theme Editor panel must be open.');
        }
        
        return {
            $input: $colorInput,
            $trigger: $colorInput.siblings('.bte-color-trigger'),
            $field: $colorInput.closest('.bte-field')
        };
    }
    
    /**
     * Helper: Open color popup
     */
    function openPopup(field, callback) {
        // Click trigger to open popup
        field.$trigger.trigger('click');
        
        // Wait for popup to appear (Pickr lazy-loads)
        setTimeout(function() {
            var $popup = $('.bte-color-popup');
            if ($popup.length === 0) {
                callback(new Error('Popup did not open'));
                return;
            }
            callback(null, $popup);
        }, 500); // 500ms for Pickr to load
    }
    
    return TestFramework.suite('Color Popup Behavior', {
        
        /**
         * Test 1: CRITICAL - Outside click closes popup
         * This tests our main fix for popup not closing
         */
        'popup should close when clicking outside': function(done) {
            var self = this;
            
            try {
                // Arrange: Find color field and open popup
                var field = findColorField();
                
                openPopup(field, function(err, $popup) {
                    if (err) {
                        self.fail(err.message);
                        done();
                        return;
                    }
                    
                    console.log('🧪 Popup opened, clicking outside...');
                    
                    // Act: Click outside popup (on body)
                    $('body').trigger('click');
                    
                    // Wait for close handler to execute (10ms delay in code)
                    setTimeout(function() {
                        // Assert: Popup should be closed
                        var $popupAfter = $('.bte-color-popup');
                        
                        self.assertEquals($popupAfter.length, 0,
                            'Popup should be closed after outside click');
                        
                        console.log('✅ Popup closed successfully');
                        done();
                    }, 100); // Wait 100ms for handler
                });
            } catch (e) {
                self.fail('Test setup failed: ' + e.message);
                done();
            }
        },
        
        /**
         * Test 2: CRITICAL - Manual input removes palette-ref
         * This tests our badge fix
         */
        'manual input should remove palette reference': function(done) {
            var self = this;
            
            try {
                // Arrange: Find color field
                var field = findColorField();
                
                // Set initial palette-ref (simulate field with palette color)
                var initialRef = '--color-brand-primary';
                field.$input.attr('data-palette-ref', initialRef);
                field.$trigger.attr('data-palette-ref', initialRef);
                
                console.log('🧪 Initial palette-ref:', initialRef);
                
                // Verify it's set
                self.assertEquals(field.$input.attr('data-palette-ref'), initialRef,
                    'palette-ref should be set initially');
                
                // Act: Type new color manually
                var newColor = '#FF0000';
                field.$input.val(newColor);
                field.$input.trigger('input');
                
                console.log('🧪 Typed new color:', newColor);
                
                // Wait for handler to execute
                setTimeout(function() {
                    // Assert: palette-ref should be removed
                    var inputRef = field.$input.attr('data-palette-ref');
                    var triggerRef = field.$trigger.attr('data-palette-ref');
                    
                    self.assertEquals(inputRef, undefined,
                        'data-palette-ref should be removed from input after manual entry');
                    
                    self.assertEquals(triggerRef, undefined,
                        'data-palette-ref should be removed from trigger after manual entry');
                    
                    console.log('✅ palette-ref removed successfully');
                    done();
                }, 200); // Wait for handler
                
            } catch (e) {
                self.fail('Test setup failed: ' + e.message);
                done();
            }
        },
        
        /**
         * Test 3: ESC key closes popup
         */
        'popup should close when pressing ESC': function(done) {
            var self = this;
            
            try {
                // Arrange: Find color field and open popup
                var field = findColorField();
                
                openPopup(field, function(err, $popup) {
                    if (err) {
                        self.fail(err.message);
                        done();
                        return;
                    }
                    
                    console.log('🧪 Popup opened, pressing ESC...');
                    
                    // Act: Press ESC key
                    var escEvent = $.Event('keydown', { key: 'Escape', keyCode: 27 });
                    $(document).trigger(escEvent);
                    
                    // Wait for handler
                    setTimeout(function() {
                        // Assert: Popup should be closed
                        var $popupAfter = $('.bte-color-popup');
                        
                        self.assertEquals($popupAfter.length, 0,
                            'Popup should be closed after ESC key');
                        
                        console.log('✅ Popup closed with ESC');
                        done();
                    }, 100);
                });
            } catch (e) {
                self.fail('Test setup failed: ' + e.message);
                done();
            }
        },
        
        /**
         * Test 4: Close button closes popup
         */
        'popup should close when clicking × button': function(done) {
            var self = this;
            
            try {
                // Arrange: Find color field and open popup
                var field = findColorField();
                
                openPopup(field, function(err, $popup) {
                    if (err) {
                        self.fail(err.message);
                        done();
                        return;
                    }
                    
                    console.log('🧪 Popup opened, clicking close button...');
                    
                    // Act: Click close button
                    var $closeBtn = $popup.find('.bte-popup-close');
                    
                    if ($closeBtn.length === 0) {
                        self.fail('Close button not found in popup');
                        done();
                        return;
                    }
                    
                    $closeBtn.trigger('click');
                    
                    // Wait for handler
                    setTimeout(function() {
                        // Assert: Popup should be closed
                        var $popupAfter = $('.bte-color-popup');
                        
                        self.assertEquals($popupAfter.length, 0,
                            'Popup should be closed after clicking × button');
                        
                        console.log('✅ Popup closed with close button');
                        done();
                    }, 100);
                });
            } catch (e) {
                self.fail('Test setup failed: ' + e.message);
                done();
            }
        }
    });
});
