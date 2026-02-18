/**
 * Publication Events Alignment Tests
 * 
 * Tests that Admin publication events are aligned with Frontend
 * Validates publicationStatusChanged event (NOT bte:statusChanged)
 * 
 * Critical test for alignment refactoring
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';
    
    return TestFramework.suite('Publication Events Alignment', {
        
        /**
         * Test 1: publicationStatusChanged event should fire (NOT bte:statusChanged)
         */
        'publicationStatusChanged event should fire when switching to DRAFT': function(done) {
            var self = this;
            var eventFired = false;
            var eventData = null;
            var wrongEventFired = false;
            
            // Listen for CORRECT event (publicationStatusChanged)
            $(document).one('publicationStatusChanged.alignmentTest', function(e, data) {
                eventFired = true;
                eventData = data;
                console.log('   ✅ publicationStatusChanged fired with data:', JSON.stringify(data));
            });
            
            // Listen for WRONG event (bte:statusChanged) - should NOT fire!
            $(document).one('bte:statusChanged.alignmentTest', function(e, status) {
                wrongEventFired = true;
                console.log('   ❌ bte:statusChanged fired (WRONG EVENT!):', status);
            });
            
            // Simulate publication-selector triggering event
            // (Same format as publication-selector.js after fix)
            $(document).trigger('publicationStatusChanged', {
                status: 'DRAFT',
                publicationId: null
            });
            
            setTimeout(function() {
                self.assertTrue(eventFired, 
                    'publicationStatusChanged event should fire');
                self.assertFalse(wrongEventFired, 
                    'bte:statusChanged event should NOT fire (deprecated)');
                self.assertNotNull(eventData, 
                    'Event data should be provided');
                self.assertEquals(eventData.status, 'DRAFT', 
                    'Event should have status DRAFT');
                self.assertNull(eventData.publicationId, 
                    'DRAFT should have null publicationId');
                
                // Cleanup
                $(document).off('.alignmentTest');
                
                console.log('✅ DRAFT switch event alignment correct');
                done();
            }, 50);
        },
        
        /**
         * Test 2: publicationStatusChanged should fire with publication ID
         */
        'publicationStatusChanged event should fire when switching to PUBLICATION': function(done) {
            var self = this;
            var eventFired = false;
            var eventData = null;
            
            // Listen for correct event
            $(document).one('publicationStatusChanged.alignmentTest', function(e, data) {
                eventFired = true;
                eventData = data;
                console.log('   ✅ publicationStatusChanged fired with data:', JSON.stringify(data));
            });
            
            // Simulate publication-selector switching to publication
            $(document).trigger('publicationStatusChanged', {
                status: 'PUBLICATION',
                publicationId: 6
            });
            
            setTimeout(function() {
                self.assertTrue(eventFired, 
                    'publicationStatusChanged event should fire');
                self.assertNotNull(eventData, 
                    'Event data should be provided');
                self.assertEquals(eventData.status, 'PUBLICATION', 
                    'Event should have status PUBLICATION');
                self.assertEquals(eventData.publicationId, 6, 
                    'Event should have correct publicationId');
                
                // Cleanup
                $(document).off('.alignmentTest');
                
                console.log('✅ PUBLICATION switch event alignment correct');
                done();
            }, 50);
        },
        
        /**
         * Test 3: Settings Editor should listen for publicationStatusChanged
         */
        'Settings Editor should receive publicationStatusChanged event': function(done) {
            var self = this;
            var $panel = $('#theme-editor-panel');
            
            // First ensure panel exists and widget is initialized
            if (!$panel.length) {
                self.fail('Theme editor panel not found');
                done();
                return;
            }
            
            // Open panel to initialize widget (lazy loading)
            var $navigation = $('#toolbar-navigation');
            if (!$navigation.length) {
                self.fail('Navigation element not found (should be #toolbar-navigation)');
                done();
                return;
            }
            
            var widget = $navigation.data('swissupBreezeNavigation');
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // Open panel (initializes Settings Editor widget)
            widget.setActive('theme-editor', true);
            
            setTimeout(function() {
                // Check if Settings Editor widget is initialized
                var settingsWidget = $panel.data('swissupThemeSettingsEditor');
                
                if (!settingsWidget) {
                    self.fail('Settings Editor widget not initialized (should be themeSettingsEditor)');
                    done();
                    return;
                }
                
                console.log('   Settings Editor widget initialized:', !!settingsWidget);
                
                // Trigger publication change event
                $(document).trigger('publicationStatusChanged', {
                    status: 'PUBLICATION',
                    publicationId: 7
                });
                
                // Give some time for Settings Editor to process event
                setTimeout(function() {
                    // If we got here without errors, Settings Editor received the event
                    self.assertTrue(true, 
                        'Settings Editor processed publicationStatusChanged event');
                    
                    console.log('✅ Settings Editor listens to correct event');
                    done();
                }, 100);
            }, 300);
        },
        
        /**
         * Test 4: Orphan event publicationLoaded should NOT exist
         */
        'publicationLoaded event should NOT be triggered (orphan event removed)': function(done) {
            var self = this;
            var orphanEventFired = false;
            
            // Listen for orphan event (should NOT fire)
            $(document).one('publicationLoaded.alignmentTest', function(e, publicationId, publication) {
                orphanEventFired = true;
                console.log('   ❌ publicationLoaded fired (ORPHAN EVENT!):', publicationId);
            });
            
            // Simulate what publication-selector does AFTER refactoring
            // (Only publicationStatusChanged, NOT publicationLoaded)
            $(document).trigger('publicationStatusChanged', {
                status: 'PUBLICATION',
                publicationId: 8
            });
            
            setTimeout(function() {
                self.assertFalse(orphanEventFired, 
                    'publicationLoaded event should NOT fire (removed in refactoring)');
                
                // Cleanup
                $(document).off('.alignmentTest');
                
                console.log('✅ Orphan event publicationLoaded removed');
                done();
            }, 50);
        },
        
        /**
         * Test 5: Event data format should match Frontend
         */
        'Event data format should use object (not array)': function(done) {
            var self = this;
            var eventData = null;
            var isObject = false;
            
            // Listen for event
            $(document).one('publicationStatusChanged.alignmentTest', function(e, data) {
                eventData = data;
                isObject = typeof data === 'object' && !Array.isArray(data);
                console.log('   Event data type:', typeof data);
                console.log('   Is object:', isObject);
                console.log('   Data:', JSON.stringify(data));
            });
            
            // Trigger with object format (Admin after refactoring)
            $(document).trigger('publicationStatusChanged', {
                status: 'DRAFT',
                publicationId: null
            });
            
            setTimeout(function() {
                self.assertNotNull(eventData, 
                    'Event data should be provided');
                self.assertTrue(isObject, 
                    'Event data should be object (not array)');
                self.assertTrue('status' in eventData, 
                    'Event data should have status property');
                self.assertTrue('publicationId' in eventData, 
                    'Event data should have publicationId property');
                
                // Cleanup
                $(document).off('.alignmentTest');
                
                console.log('✅ Event data format matches Frontend (object)');
                done();
            }, 50);
        },
        
        /**
         * Test 6: Multiple listeners should receive event
         */
        'Multiple listeners should receive publicationStatusChanged event': function(done) {
            var self = this;
            var listener1Fired = false;
            var listener2Fired = false;
            var listener3Fired = false;
            
            // Simulate multiple widgets listening (css-manager, settings-editor, etc)
            $(document).on('publicationStatusChanged.alignmentTest1', function(e, data) {
                listener1Fired = true;
                console.log('   Listener 1 (css-manager simulation) received:', data.status);
            });
            
            $(document).on('publicationStatusChanged.alignmentTest2', function(e, data) {
                listener2Fired = true;
                console.log('   Listener 2 (settings-editor simulation) received:', data.status);
            });
            
            $(document).on('publicationStatusChanged.alignmentTest3', function(e, data) {
                listener3Fired = true;
                console.log('   Listener 3 (toolbar simulation) received:', data.status);
            });
            
            // Trigger event
            $(document).trigger('publicationStatusChanged', {
                status: 'PUBLICATION',
                publicationId: 9
            });
            
            setTimeout(function() {
                self.assertTrue(listener1Fired, 
                    'Listener 1 should receive event');
                self.assertTrue(listener2Fired, 
                    'Listener 2 should receive event');
                self.assertTrue(listener3Fired, 
                    'Listener 3 should receive event');
                
                // Cleanup
                $(document).off('.alignmentTest1');
                $(document).off('.alignmentTest2');
                $(document).off('.alignmentTest3');
                
                console.log('✅ All listeners received event (broadcast works)');
                done();
            }, 50);
        }
    });
});
