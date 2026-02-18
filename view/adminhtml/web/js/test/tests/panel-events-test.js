/**
 * Panel Events Tests (Phase 3)
 * 
 * Tests for navigation event system
 * Validates navigationChanged, panelShown, panelHidden events and silent mode
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';
    
    return TestFramework.suite('Panel Events', {
        
        /**
         * Test 1: navigationChanged event should fire with correct data
         */
        'navigationChanged event should fire when activating panel': function(done) {
            var self = this;
            var $navigation = $('#toolbar-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            var eventFired = false;
            var eventData = null;
            
            // Ensure panel is closed first
            widget.deactivate('theme-editor', true);
            
            setTimeout(function() {
                // Listen for event
                $navigation.one('navigationChanged', function(e, data) {
                    eventFired = true;
                    eventData = data;
                    
                    console.log('   Event data:', JSON.stringify(data));
                });
                
                // Activate (NOT silent mode, so event fires)
                widget.setActive('theme-editor', false);
                
                setTimeout(function() {
                    self.assertTrue(eventFired, 
                        'navigationChanged event should fire');
                    self.assertNotNull(eventData, 
                        'Event data should be provided');
                    self.assertEquals(eventData.id, 'theme-editor', 
                        'Event should have correct id');
                    self.assertEquals(eventData.active, true, 
                        'Event should indicate active state');
                    
                    console.log('✅ navigationChanged event works');
                    done();
                }, 100);
            }, 100);
        },
        
        /**
         * Test 2: panelShown event should fire when panel opens
         */
        'panelShown event should fire when panel opens': function(done) {
            var self = this;
            var $navigation = $('#toolbar-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            var eventFired = false;
            var eventData = null;
            
            // Ensure closed
            widget.deactivate('theme-editor', true);
            
            setTimeout(function() {
                // Listen for panelShown event
                $navigation.one('panelShown', function(e, data) {
                    eventFired = true;
                    eventData = data;
                    
                    console.log('   panelShown data:', JSON.stringify(data));
                });
                
                // Open panel (NOT silent)
                widget.setActive('theme-editor', false);
                
                setTimeout(function() {
                    self.assertTrue(eventFired, 
                        'panelShown event should fire');
                    self.assertNotNull(eventData, 
                        'Event data should be provided');
                    self.assertEquals(eventData.itemId, 'theme-editor', 
                        'Event should have correct itemId');
                    self.assertEquals(eventData.panelId, 'theme-editor-panel', 
                        'Event should have correct panelId');
                    
                    console.log('✅ panelShown event works');
                    done();
                }, 100);
            }, 100);
        },
        
        /**
         * Test 3: panelHidden event should fire when panel closes
         */
        'panelHidden event should fire when panel closes': function(done) {
            var self = this;
            var $navigation = $('#toolbar-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // First open panel
            widget.setActive('theme-editor', true);
            
            setTimeout(function() {
                var eventFired = false;
                var eventData = null;
                
                // Listen for panelHidden event
                $navigation.one('panelHidden', function(e, data) {
                    eventFired = true;
                    eventData = data;
                    
                    console.log('   panelHidden data:', JSON.stringify(data));
                });
                
                // Close panel (NOT silent)
                widget.deactivate('theme-editor', false);
                
                setTimeout(function() {
                    self.assertTrue(eventFired, 
                        'panelHidden event should fire');
                    self.assertNotNull(eventData, 
                        'Event data should be provided');
                    self.assertEquals(eventData.itemId, 'theme-editor', 
                        'Event should have correct itemId');
                    
                    console.log('✅ panelHidden event works');
                    done();
                }, 100);
            }, 100);
        },
        
        /**
         * Test 4: Silent mode should prevent events from firing
         */
        'silent mode should prevent navigationChanged event from firing': function(done) {
            var self = this;
            var $navigation = $('#toolbar-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            var eventFired = false;
            
            // Ensure closed
            widget.deactivate('theme-editor', true);
            
            setTimeout(function() {
                // Listen for navigationChanged event
                $navigation.on('navigationChanged.silentTest', function() {
                    eventFired = true;
                    console.log('   ⚠️ Event fired in silent mode!');
                });
                
                // Activate with silent=true (should NOT fire event)
                widget.setActive('theme-editor', true);
                
                setTimeout(function() {
                    self.assertFalse(eventFired,
                        'navigationChanged event should NOT fire in silent mode');
                    
                    // Cleanup event handler
                    $navigation.off('navigationChanged.silentTest');
                    
                    console.log('   Silent mode confirmed - no event fired');
                    console.log('✅ Silent mode prevents events');
                    done();
                }, 100);
            }, 100);
        }
    });
});
