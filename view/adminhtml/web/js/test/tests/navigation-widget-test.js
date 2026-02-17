/**
 * Navigation Widget Tests (Phase 3)
 * 
 * Tests for navigation.js widget functionality
 * Validates setActive(), deactivate(), toggle behavior, and disabled items
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';
    
    return TestFramework.suite('Navigation Widget', {
        
        /**
         * Test 1: Navigation widget should be initialized
         */
        'navigation widget should be initialized on #bte-navigation': function() {
            var $navigation = $('#bte-navigation');
            
            this.assert($navigation.length > 0, 
                'Navigation element should exist');
            
            var widget = $navigation.data('swissupBreezeNavigation');
            this.assertNotNull(widget, 
                'Navigation widget should be initialized');
            
            this.assertNotNull(widget.options, 
                'Widget should have options');
            this.assertTrue(Array.isArray(widget.options.items), 
                'Widget should have items array');
            
            console.log('   Widget items count:', widget.options.items.length);
            console.log('   Panel selector:', widget.options.panelSelector);
            console.log('✅ Navigation widget initialized');
        },
        
        /**
         * Test 2: setActive() should activate navigation item and show panel
         */
        'setActive() should activate navigation item and show panel': function(done) {
            var self = this;
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // Deactivate first to ensure clean state
            widget.deactivate('theme-editor', true);
            
            setTimeout(function() {
                // Activate theme-editor
                widget.setActive('theme-editor', true); // silent mode
                
                // Wait for DOM update
                setTimeout(function() {
                    // Check navigation button has active class
                    var $navItem = $navigation.find('[data-id="theme-editor"]');
                    self.assertTrue($navItem.hasClass('active'),
                        'Navigation item should have active class');
                    
                    // Check panel is visible
                    var $panel = $('#theme-editor-panel');
                    self.assertTrue($panel.hasClass('active'),
                        'Panel should have active class');
                    self.assertTrue($panel.is(':visible'),
                        'Panel should be visible');
                    
                    console.log('   Navigation item active:', $navItem.hasClass('active'));
                    console.log('   Panel active:', $panel.hasClass('active'));
                    console.log('   Panel visible:', $panel.is(':visible'));
                    console.log('✅ setActive() works correctly');
                    done();
                }, 100);
            }, 100);
        },
        
        /**
         * Test 3: deactivate() should hide panel and remove active state
         */
        'deactivate() should hide panel and remove active state': function(done) {
            var self = this;
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // First activate
            widget.setActive('theme-editor', true);
            
            setTimeout(function() {
                // Then deactivate
                widget.deactivate('theme-editor', true);
                
                setTimeout(function() {
                    var $navItem = $navigation.find('[data-id="theme-editor"]');
                    var $panel = $('#theme-editor-panel');
                    
                    self.assertFalse($navItem.hasClass('active'),
                        'Navigation item should NOT have active class');
                    self.assertFalse($panel.hasClass('active'),
                        'Panel should NOT have active class');
                    self.assertFalse($panel.is(':visible'),
                        'Panel should be hidden');
                    
                    console.log('   Navigation item inactive:', !$navItem.hasClass('active'));
                    console.log('   Panel inactive:', !$panel.hasClass('active'));
                    console.log('   Panel hidden:', !$panel.is(':visible'));
                    console.log('✅ deactivate() works correctly');
                    done();
                }, 100);
            }, 100);
        },
        
        /**
         * Test 4: Clicking active item should toggle it off
         */
        'clicking active navigation item should deactivate it': function(done) {
            var self = this;
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // Activate first
            widget.setActive('theme-editor', true);
            
            setTimeout(function() {
                var $navItem = $navigation.find('[data-id="theme-editor"]');
                var $panel = $('#theme-editor-panel');
                
                // Verify it's active
                self.assertTrue($navItem.hasClass('active'), 
                    'Panel should be active before click');
                
                // Click again (should deactivate via toggle behavior)
                $navItem.trigger('click');
                
                setTimeout(function() {
                    self.assertFalse($panel.hasClass('active'),
                        'Panel should be deactivated after second click');
                    self.assertFalse($navItem.hasClass('active'),
                        'Navigation item should be deactivated after second click');
                    
                    console.log('   Toggle behavior confirmed');
                    console.log('✅ Toggle (click twice) works');
                    done();
                }, 100);
            }, 100);
        },
        
        /**
         * Test 5: Should prevent activating disabled items
         */
        'should not activate disabled navigation items': function() {
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                this.fail('Navigation widget not initialized');
                return;
            }
            
            // Try to find a disabled item in config
            var disabledItem = null;
            for (var i = 0; i < widget.options.items.length; i++) {
                if (widget.options.items[i].disabled === true) {
                    disabledItem = widget.options.items[i];
                    break;
                }
            }
            
            if (!disabledItem) {
                console.log('⚠️ No disabled items found in navigation config');
                console.log('   Available items:', widget.options.items.map(function(item) {
                    return item.id + ' (disabled: ' + (item.disabled ? 'yes' : 'no') + ')';
                }).join(', '));
                this.assert(true, 'No disabled items to test');
                return;
            }
            
            console.log('   Testing disabled item:', disabledItem.id);
            
            // Try to activate disabled item
            widget.setActive(disabledItem.id);
            
            // Should still not be active
            var $navItem = $navigation.find('[data-id="' + disabledItem.id + '"]');
            this.assertFalse($navItem.hasClass('active'),
                'Disabled item should not become active');
            
            // Panel should not exist or should not be visible
            var $panel = $('#' + disabledItem.id + '-panel');
            if ($panel.length > 0) {
                this.assertFalse($panel.is(':visible'),
                    'Disabled item panel should not be visible');
            }
            
            console.log('   Disabled item stayed inactive:', !$navItem.hasClass('active'));
            console.log('✅ Disabled items cannot be activated');
        },
        
        /**
         * Test 6: Should support switching between multiple navigation items
         */
        'should support multiple navigation items switching': function(done) {
            var self = this;
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // Check if there are multiple items
            var items = widget.options.items;
            
            if (items.length < 2) {
                console.log('⚠️ Only one navigation item (' + items[0].id + ')');
                console.log('   Multi-item switching test skipped');
                self.assert(true, 'Only one item, test skipped');
                done();
                return;
            }
            
            console.log('   Testing with', items.length, 'navigation items');
            
            // Get first two enabled items
            var firstItem = items[0];
            var secondItem = null;
            
            for (var i = 1; i < items.length; i++) {
                if (!items[i].disabled) {
                    secondItem = items[i];
                    break;
                }
            }
            
            if (!secondItem) {
                console.log('⚠️ Only one enabled item, test skipped');
                self.assert(true, 'Only one enabled item');
                done();
                return;
            }
            
            console.log('   First item:', firstItem.id);
            console.log('   Second item:', secondItem.id);
            
            // Activate first item
            widget.setActive(firstItem.id, true);
            
            setTimeout(function() {
                var $firstPanel = $('#' + firstItem.id + '-panel');
                self.assertTrue($firstPanel.hasClass('active'),
                    'First panel should be active');
                
                // Switch to second item
                widget.setActive(secondItem.id, true);
                
                setTimeout(function() {
                    var $secondPanel = $('#' + secondItem.id + '-panel');
                    
                    // First should be deactivated, second activated
                    self.assertFalse($firstPanel.hasClass('active'),
                        'First panel should be deactivated when switching');
                    self.assertTrue($secondPanel.hasClass('active'),
                        'Second panel should be activated');
                    
                    console.log('   Successfully switched from', firstItem.id, 'to', secondItem.id);
                    console.log('✅ Multi-item navigation switching works');
                    done();
                }, 100);
            }, 100);
        }
    });
});
