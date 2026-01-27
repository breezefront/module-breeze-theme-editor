/**
 * Field Badges Reset Tests
 * 
 * Tests for badge visibility after field reset:
 * - "Changed" badge should appear when field is modified
 * - Reset button (↺) should appear with badge
 * - Both should disappear after reset button is clicked
 * - "Modified" badge should remain after reset
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/panel-state',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/base'
], function($, TestFramework, PanelState, FieldHandlers, BaseHandler) {
    'use strict';
    
    /**
     * Helper functions (outside test suite to avoid being run as tests)
     */
    var helpers = {
        /**
         * Find a color field in the panel
         */
        findColorField: function() {
            var $panel = $('.bte-panel');
            var $colorInput = $panel.find('.bte-color-input').first();
            
            if ($colorInput.length === 0) {
                throw new Error('No color field found in panel. Make sure Theme Editor is open.');
            }
            
            return {
                $input: $colorInput,
                $field: $colorInput.closest('.bte-field'),
                $header: $colorInput.closest('.bte-field').find('.bte-field-header'),
                sectionCode: $colorInput.attr('data-section'),
                fieldCode: $colorInput.attr('data-field')
            };
        },
        
        /**
         * Get badge state
         */
        getBadgeState: function($header) {
            return {
                hasDirtyBadge: $header.find('.bte-badge-dirty').length > 0,
                hasModifiedBadge: $header.find('.bte-badge-modified').length > 0,
                hasResetButton: $header.find('.bte-field-reset-btn').length > 0
            };
        },
        
        /**
         * Change field value and wait for state update
         */
        changeFieldValue: function($input, newValue, callback) {
            // Set new value
            $input.val(newValue);
            
            // Call handleChange directly (bypassing event system)
            // This ensures badges are updated
            var updated = BaseHandler.handleChange($input, function(fieldData) {
                console.log('✅ Field changed via handleChange:', fieldData);
                
                // Wait for badges to render
                setTimeout(function() {
                    callback();
                }, 100);
            });
            
            if (!updated) {
                console.error('❌ handleChange returned false');
                callback();
            }
        },
        
        /**
         * Click reset button and wait
         */
        clickReset: function($field, callback) {
            var $resetBtn = $field.find('.bte-field-reset-btn');
            
            if ($resetBtn.length === 0) {
                callback(new Error('Reset button not found'));
                return;
            }
            
            // Click reset button
            $resetBtn.trigger('click');
            
            // Wait for reset to complete
            setTimeout(function() {
                callback();
            }, 100);
        }
    };
    
    return TestFramework.suite('Field Badges Reset', {
        
        /**
         * Test 0: Open Theme Editor panel
         */
        'panel should be opened before tests run': function(done) {
            var self = this;
            
            console.log('🔓 Opening Theme Editor panel for tests...');
            
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open Theme Editor panel: ' + err.message);
                    done();
                    return;
                }
                
                console.log('✅ Panel opened successfully');
                
                // Wait additional time for fields to render
                setTimeout(function() {
                    var $colorInputs = $('.bte-panel .bte-color-input');
                    console.log('   Color fields found:', $colorInputs.length);
                    
                    self.assert($colorInputs.length > 0, 
                        'Panel should have color fields after opening');
                    
                    done();
                }, 500);
            });
        },
        
        /**
         * Test 1: Panel should be open
         */
        'panel should be open with color fields': function() {
            var $panel = $('.bte-panel');
            var $colorInputs = $panel.find('.bte-color-input');
            
            this.assert($panel.length > 0, 
                'Theme Editor panel should be open');
            
            this.assert($colorInputs.length > 0, 
                'Panel should have at least one color field (found: ' + $colorInputs.length + ')');
        },
        
        /**
         * Test 2: PanelState should be initialized
         */
        'PanelState should be initialized with listeners': function() {
            this.assertNotNull(PanelState, 
                'PanelState module should be loaded');
            
            this.assertNotNull(PanelState.getFieldState, 
                'PanelState should have getFieldState method');
            
            this.assertNotNull(PanelState.addListener, 
                'PanelState should have addListener method');
            
            this.assertNotNull(PanelState.notifyListeners, 
                'PanelState should have notifyListeners method');
        },
        
        /**
         * Test 3: Badge should appear when field is changed
         */
        'badge should appear when color field is changed': function(done) {
            var self = this;
            
            try {
                var field = helpers.findColorField();
                var originalValue = field.$input.val();
                var newValue = '#FF0000'; // Red color
                
                // Store original value to restore later
                field.$input.data('test-original-value', originalValue);
                
                // Change field value
                helpers.changeFieldValue(field.$input, newValue, function() {
                    try {
                        var badges = helpers.getBadgeState(field.$header);
                        
                        // Check if badge appeared
                        self.assertTrue(badges.hasDirtyBadge, 
                            'Changed badge should appear after field is modified');
                        
                        self.assertTrue(badges.hasResetButton, 
                            'Reset button should appear after field is modified');
                        
                        // Check PanelState
                        var state = PanelState.getFieldState(field.sectionCode, field.fieldCode);
                        
                        if (state) {
                            self.assertTrue(state.isDirty, 
                                'Field state should have isDirty=true after change');
                        } else {
                            console.warn('⚠️ Could not get field state from PanelState');
                        }
                        
                        done();
                    } catch (err) {
                        self.fail(err.message);
                        done();
                    }
                });
            } catch (err) {
                self.fail(err.message);
                done();
            }
        },
        
        /**
         * Test 4: Badge should disappear after reset (MAIN TEST)
         */
        'badge should disappear after reset button is clicked': function(done) {
            var self = this;
            
            try {
                var field = helpers.findColorField();
                var originalValue = field.$input.data('test-original-value') || field.$input.val();
                var newValue = '#00FF00'; // Green color
                
                console.log('🧪 Test: Starting badge reset test');
                console.log('   Field:', field.sectionCode + '.' + field.fieldCode);
                console.log('   Original value:', originalValue);
                
                // Step 1: Change field to show badge
                helpers.changeFieldValue(field.$input, newValue, function() {
                    try {
                        var badgesBefore = helpers.getBadgeState(field.$header);
                        
                        console.log('   Badges before reset:', badgesBefore);
                        
                        self.assertTrue(badgesBefore.hasDirtyBadge, 
                            'Changed badge should be visible before reset');
                        
                        self.assertTrue(badgesBefore.hasResetButton, 
                            'Reset button should be visible before reset');
                        
                        // Step 2: Click reset button
                        helpers.clickReset(field.$field, function(err) {
                            if (err) {
                                self.fail(err.message);
                                done();
                                return;
                            }
                            
                            try {
                                var badgesAfter = helpers.getBadgeState(field.$header);
                                
                                console.log('   Badges after reset:', badgesAfter);
                                
                                // Check PanelState
                                var state = PanelState.getFieldState(field.sectionCode, field.fieldCode);
                                
                                if (state) {
                                    console.log('   PanelState after reset:', {
                                        isDirty: state.isDirty,
                                        isModified: state.isModified,
                                        value: state.value,
                                        savedValue: state.savedValue
                                    });
                                    
                                    self.assertEquals(state.isDirty, false, 
                                        'Field state should have isDirty=false after reset');
                                }
                                
                                // *** MAIN ASSERTIONS ***
                                self.assertEquals(badgesAfter.hasDirtyBadge, false, 
                                    'Changed badge should disappear after reset');
                                
                                self.assertEquals(badgesAfter.hasResetButton, false, 
                                    'Reset button should disappear after reset');
                                
                                console.log('✅ Test passed: Badges correctly hidden after reset');
                                
                                done();
                            } catch (err) {
                                self.fail(err.message);
                                done();
                            }
                        });
                    } catch (err) {
                        self.fail(err.message);
                        done();
                    }
                });
            } catch (err) {
                self.fail(err.message);
                done();
            }
        },
        
        /**
         * Test 5: Modified badge should remain after reset
         */
        'modified badge should remain after reset if field is modified': function(done) {
            var self = this;
            
            try {
                var field = helpers.findColorField();
                
                // Check if field is already modified
                var state = PanelState.getFieldState(field.sectionCode, field.fieldCode);
                
                if (!state || !state.isModified) {
                    console.log('⏭️  Skipping test: Field is not modified (isModified=false)');
                    done();
                    return;
                }
                
                var newValue = '#0000FF'; // Blue color
                
                // Change field
                helpers.changeFieldValue(field.$input, newValue, function() {
                    try {
                        var badgesBefore = helpers.getBadgeState(field.$header);
                        
                        self.assertTrue(badgesBefore.hasModifiedBadge, 
                            'Modified badge should be present before reset');
                        
                        // Click reset
                        helpers.clickReset(field.$field, function(err) {
                            if (err) {
                                self.fail(err.message);
                                done();
                                return;
                            }
                            
                            try {
                                var badgesAfter = helpers.getBadgeState(field.$header);
                                
                                // Changed badge should disappear
                                self.assertEquals(badgesAfter.hasDirtyBadge, false, 
                                    'Changed badge should disappear after reset');
                                
                                // Modified badge should remain
                                self.assertTrue(badgesAfter.hasModifiedBadge, 
                                    'Modified badge should remain after reset');
                                
                                done();
                            } catch (err) {
                                self.fail(err.message);
                                done();
                            }
                        });
                    } catch (err) {
                        self.fail(err.message);
                        done();
                    }
                });
            } catch (err) {
                self.fail(err.message);
                done();
            }
        },
        
        /**
         * Test 6: PanelState listener system
         */
        'PanelState should notify listeners on field-reset event': function(done) {
            var self = this;
            var listenerCalled = false;
            var listenerData = null;
            
            // Add test listener
            var testListener = function(eventType, data) {
                if (eventType === 'field-reset') {
                    console.log('🧪 Test listener received field-reset event:', data);
                    listenerCalled = true;
                    listenerData = data;
                }
            };
            
            PanelState.addListener(testListener);
            
            try {
                var field = helpers.findColorField();
                var newValue = '#FFFF00'; // Yellow color
                
                // Change field
                helpers.changeFieldValue(field.$input, newValue, function() {
                    try {
                        // Click reset
                        helpers.clickReset(field.$field, function(err) {
                            if (err) {
                                self.fail(err.message);
                                PanelState.removeListener(testListener);
                                done();
                                return;
                            }
                            
                            // Wait a bit for listener to be called
                            setTimeout(function() {
                                try {
                                    // Check if listener was called
                                    self.assertTrue(listenerCalled, 
                                        'Test listener should have been called on field-reset');
                                    
                                    if (listenerData) {
                                        self.assertEquals(listenerData.sectionCode, field.sectionCode, 
                                            'Listener should receive correct sectionCode');
                                        
                                        self.assertEquals(listenerData.fieldCode, field.fieldCode, 
                                            'Listener should receive correct fieldCode');
                                    }
                                    
                                    // Cleanup
                                    PanelState.removeListener(testListener);
                                    done();
                                } catch (err) {
                                    PanelState.removeListener(testListener);
                                    self.fail(err.message);
                                    done();
                                }
                            }, 200);
                        });
                    } catch (err) {
                        PanelState.removeListener(testListener);
                        self.fail(err.message);
                        done();
                    }
                });
            } catch (err) {
                PanelState.removeListener(testListener);
                self.fail(err.message);
                done();
            }
        }
    });
});
