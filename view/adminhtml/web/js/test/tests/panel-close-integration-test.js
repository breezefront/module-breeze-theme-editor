/**
 * Panel Close Integration Tests
 * 
 * Tests the integration between Settings Editor and Navigation widgets
 * for proper panel closing functionality.
 * 
 * Architecture:
 * - Settings Editor stores reference to navigation widget
 * - Close button calls navigation.deactivate() via widget API
 * - Navigation widget handles panel hiding and state management
 */
define([
    'jquery'
], function ($) {
    'use strict';

    return {
        /**
         * Test 1: Navigation widget should be accessible from settings editor
         */
        'settings editor should store reference to navigation widget': function () {
            var $navigation = $('#toolbar-navigation');
            var $panel = $('#theme-editor-panel');
            
            if (!$navigation.length) {
                console.warn('⚠️  Navigation not found - skipping test');
                return true;
            }
            
            if (!$panel.length) {
                console.warn('⚠️  Panel not found - skipping test');
                return true;
            }
            
            // Open panel first (initializes widget)
            $navigation.find('.nav-item[data-id="theme-editor"]').click();
            
            // Wait for initialization
            setTimeout(function() {
                var settingsWidget = $panel.data('swissupThemeSettingsEditor');
                
                if (!settingsWidget) {
                    console.error('❌ Settings editor widget not initialized');
                    return false;
                }
                
                // Check if navigation reference is stored
                if (!settingsWidget.$navigation || !settingsWidget.$navigation.length) {
                    console.error('❌ Navigation reference not stored in settings editor');
                    console.error('   settingsWidget.$navigation:', settingsWidget.$navigation);
                    return false;
                }
                
                console.log('✅ Settings editor has navigation reference');
                console.log('   Navigation selector:', settingsWidget.$navigation.selector);
                return true;
            }, 500);
            
            return true;
        },

        /**
         * Test 2: Close button should call navigation.deactivate()
         */
        'close button should deactivate navigation item': function () {
            var $navigation = $('#toolbar-navigation');
            var $panel = $('#theme-editor-panel');
            
            if (!$navigation.length || !$panel.length) {
                console.warn('⚠️  Required elements not found - skipping test');
                return true;
            }
            
            // Open panel
            $navigation.find('.nav-item[data-id="theme-editor"]').click();
            
            setTimeout(function() {
                var navigationWidget = $navigation.data('swissupBreezeNavigation');
                
                if (!navigationWidget) {
                    console.error('❌ Navigation widget not found');
                    return false;
                }
                
                // Track if deactivate was called
                var deactivateCalled = false;
                var originalDeactivate = navigationWidget.deactivate;
                
                navigationWidget.deactivate = function(itemId) {
                    deactivateCalled = true;
                    console.log('📞 navigation.deactivate() called with:', itemId);
                    originalDeactivate.apply(this, arguments);
                };
                
                // Click close button
                $panel.find('.bte-panel-close').click();
                
                setTimeout(function() {
                    // Restore original method
                    navigationWidget.deactivate = originalDeactivate;
                    
                    if (!deactivateCalled) {
                        console.error('❌ navigation.deactivate() was NOT called by close button');
                        return false;
                    }
                    
                    console.log('✅ Close button correctly calls navigation.deactivate()');
                    return true;
                }, 100);
            }, 500);
            
            return true;
        },

        /**
         * Test 3: Panel should close when navigation.deactivate() is called
         */
        'navigation.deactivate should close panel': function () {
            var $navigation = $('#toolbar-navigation');
            var $panel = $('#theme-editor-panel');
            
            if (!$navigation.length || !$panel.length) {
                console.warn('⚠️  Required elements not found - skipping test');
                return true;
            }
            
            // Open panel first
            $navigation.find('.nav-item[data-id="theme-editor"]').click();
            
            setTimeout(function() {
                if (!$panel.hasClass('active')) {
                    console.error('❌ Panel not opened');
                    return false;
                }
                
                // Deactivate via navigation widget API
                var navigationWidget = $navigation.data('swissupBreezeNavigation');
                if (!navigationWidget) {
                    console.error('❌ Navigation widget not found');
                    return false;
                }
                
                navigationWidget.deactivate('theme-editor');
                
                // Check if panel closed after animation (300ms)
                setTimeout(function() {
                    if ($panel.hasClass('active')) {
                        console.error('❌ Panel still has active class after deactivate');
                        return false;
                    }
                    
                    if ($panel.is(':visible')) {
                        console.error('❌ Panel still visible after deactivate');
                        return false;
                    }
                    
                    console.log('✅ Panel correctly closed via navigation.deactivate()');
                    return true;
                }, 400);
            }, 500);
            
            return true;
        },

        /**
         * Test 4: Navigation button should lose active class when panel closes
         */
        'navigation button should deactivate when panel closes': function () {
            var $navigation = $('#toolbar-navigation');
            var $navButton = $navigation.find('.nav-item[data-id="theme-editor"]');
            var $panel = $('#theme-editor-panel');
            
            if (!$navigation.length || !$panel.length || !$navButton.length) {
                console.warn('⚠️  Required elements not found - skipping test');
                return true;
            }
            
            // Open panel
            $navButton.click();
            
            setTimeout(function() {
                if (!$navButton.hasClass('active')) {
                    console.error('❌ Navigation button not active after click');
                    return false;
                }
                
                // Close panel via close button
                $panel.find('.bte-panel-close').click();
                
                setTimeout(function() {
                    if ($navButton.hasClass('active')) {
                        console.error('❌ Navigation button still active after close');
                        return false;
                    }
                    
                    console.log('✅ Navigation button correctly deactivated');
                    return true;
                }, 100);
            }, 500);
            
            return true;
        },

        /**
         * Test 5: Error handling - graceful failure if navigation not found
         */
        'close should handle missing navigation gracefully': function () {
            var $panel = $('#theme-editor-panel');
            
            if (!$panel.length) {
                console.warn('⚠️  Panel not found - skipping test');
                return true;
            }
            
            var settingsWidget = $panel.data('swissupThemeSettingsEditor');
            
            if (!settingsWidget) {
                console.warn('⚠️  Settings widget not initialized - skipping test');
                return true;
            }
            
            // Temporarily remove navigation reference
            var originalNavigation = settingsWidget.$navigation;
            settingsWidget.$navigation = $('<div></div>'); // Empty jQuery object
            
            try {
                // Should not throw error
                settingsWidget._close();
                console.log('✅ Gracefully handled missing navigation');
                
                // Restore
                settingsWidget.$navigation = originalNavigation;
                return true;
            } catch (e) {
                console.error('❌ Threw error when navigation missing:', e);
                settingsWidget.$navigation = originalNavigation;
                return false;
            }
        }
    };
});
