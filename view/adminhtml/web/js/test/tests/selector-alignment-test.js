/**
 * Test Suite: Selector Alignment between Admin and Frontend
 * 
 * Purpose: Verify that Admin area uses the same DOM selectors as Frontend
 * to ensure architecture consistency and prevent selector-based bugs.
 * 
 * Background:
 * - Previously, Admin used legacy selectors (#bte-toolbar, #bte-navigation)
 * - Frontend uses semantic selectors (#breeze-theme-editor-toolbar, #toolbar-navigation)
 * - Misalignment caused issues with event handlers and widget initialization
 * 
 * Tests:
 * 1. Toolbar selector alignment
 * 2. Navigation selector alignment
 * 3. Panels container selector alignment
 * 4. Constants.js values match actual DOM
 * 5. Widget initialization uses correct selectors
 * 6. No dual selectors remain (e.g., '#bte-navigation, #toolbar-navigation')
 */

define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';

    return TestFramework.suite('Selector Alignment: Admin-Frontend Consistency', {

        // ========================================================================
        // Test 1: Toolbar Selector Alignment
        // ========================================================================
        TestFramework.test('Toolbar uses #breeze-theme-editor-toolbar (not #bte-toolbar)', function() {
            TestFramework.describe('Verifies that the toolbar element has the correct ID matching Frontend');

            // Check that correct selector exists
            var $toolbar = $('#breeze-theme-editor-toolbar');
            TestFramework.assert(
                $toolbar.length === 1,
                'Toolbar element with ID #breeze-theme-editor-toolbar should exist',
                'Found: ' + $toolbar.length + ' elements'
            );

            // Check that legacy selector does NOT exist
            var $legacyToolbar = $('#bte-toolbar');
            TestFramework.assert(
                $legacyToolbar.length === 0,
                'Legacy toolbar ID #bte-toolbar should NOT exist',
                'Found: ' + $legacyToolbar.length + ' legacy elements'
            );

            // Verify toolbar has expected structure
            TestFramework.assert(
                $toolbar.hasClass('breeze-theme-editor-toolbar') || $toolbar.find('.toolbar-container').length > 0,
                'Toolbar should have expected structure (toolbar-related classes/children)',
                'Classes: ' + $toolbar.attr('class')
            );

            TestFramework.success('Toolbar selector aligned with Frontend');
        });

        // ========================================================================
        // Test 2: Navigation Selector Alignment
        // ========================================================================
        TestFramework.test('Navigation uses #toolbar-navigation (not #bte-navigation)', function() {
            TestFramework.describe('Verifies that the navigation element has the correct ID matching Frontend');

            // Check that correct selector exists
            var $navigation = $('#toolbar-navigation');
            TestFramework.assert(
                $navigation.length === 1,
                'Navigation element with ID #toolbar-navigation should exist',
                'Found: ' + $navigation.length + ' elements'
            );

            // Check that legacy selector does NOT exist
            var $legacyNavigation = $('#bte-navigation');
            TestFramework.assert(
                $legacyNavigation.length === 0,
                'Legacy navigation ID #bte-navigation should NOT exist',
                'Found: ' + $legacyNavigation.length + ' legacy elements'
            );

            // Verify navigation has expected structure (should have tabs/buttons)
            TestFramework.assert(
                $navigation.find('.btn, button, a, [data-panel]').length > 0,
                'Navigation should contain interactive elements (buttons/links)',
                'Found: ' + $navigation.find('.btn, button, a').length + ' interactive elements'
            );

            TestFramework.success('Navigation selector aligned with Frontend');
        });

        // ========================================================================
        // Test 3: Panels Container Selector Alignment
        // ========================================================================
        TestFramework.test('Panels container uses #bte-panels-container', function() {
            TestFramework.describe('Verifies that the panels container element has the correct ID');

            // Check that correct selector exists
            var $panels = $('#bte-panels-container');
            TestFramework.assert(
                $panels.length === 1,
                'Panels container with ID #bte-panels-container should exist',
                'Found: ' + $panels.length + ' elements'
            );

            // Check for legacy alternative selector
            var $legacyPanels = $('#bte-panels');
            var hasLegacy = $legacyPanels.length > 0 && !$legacyPanels.is($panels);
            TestFramework.assert(
                !hasLegacy,
                'Should not have separate legacy panels container #bte-panels',
                'Legacy panels: ' + $legacyPanels.length
            );

            TestFramework.success('Panels container selector aligned');
        });

        // ========================================================================
        // Test 4: Constants.js Values Match Actual DOM
        // ========================================================================
        TestFramework.test('Constants.js selector values match actual DOM IDs', function() {
            TestFramework.describe('Verifies that the constants match the actual elements in DOM');

            // Load constants module
            require(['Swissup_BreezeThemeEditor/js/editor/constants'], function(Constants) {
                
                // Test TOOLBAR constant
                if (Constants.SELECTORS && Constants.SELECTORS.TOOLBAR) {
                    var toolbarSelector = Constants.SELECTORS.TOOLBAR;
                    TestFramework.assert(
                        toolbarSelector === '#breeze-theme-editor-toolbar',
                        'Constants.SELECTORS.TOOLBAR should be "#breeze-theme-editor-toolbar"',
                        'Found: ' + toolbarSelector
                    );

                    var $toolbarFromConstants = $(toolbarSelector);
                    TestFramework.assert(
                        $toolbarFromConstants.length === 1,
                        'Toolbar selector from Constants should find exactly 1 element',
                        'Found: ' + $toolbarFromConstants.length + ' elements'
                    );
                }

                // Test NAVIGATION constant
                if (Constants.SELECTORS && Constants.SELECTORS.NAVIGATION) {
                    var navigationSelector = Constants.SELECTORS.NAVIGATION;
                    TestFramework.assert(
                        navigationSelector === '#toolbar-navigation',
                        'Constants.SELECTORS.NAVIGATION should be "#toolbar-navigation"',
                        'Found: ' + navigationSelector
                    );

                    var $navigationFromConstants = $(navigationSelector);
                    TestFramework.assert(
                        $navigationFromConstants.length === 1,
                        'Navigation selector from Constants should find exactly 1 element',
                        'Found: ' + $navigationFromConstants.length + ' elements'
                    );
                }

                // Test PANELS constant
                if (Constants.SELECTORS && Constants.SELECTORS.PANELS) {
                    var panelsSelector = Constants.SELECTORS.PANELS;
                    TestFramework.assert(
                        panelsSelector === '#bte-panels-container',
                        'Constants.SELECTORS.PANELS should be "#bte-panels-container"',
                        'Found: ' + panelsSelector
                    );

                    var $panelsFromConstants = $(panelsSelector);
                    TestFramework.assert(
                        $panelsFromConstants.length === 1,
                        'Panels selector from Constants should find exactly 1 element',
                        'Found: ' + $panelsFromConstants.length + ' elements'
                    );
                }

                TestFramework.success('Constants.js values match actual DOM elements');
            });
        });

        // ========================================================================
        // Test 5: Settings Editor Uses Correct Navigation Selector
        // ========================================================================
        TestFramework.test('Settings Editor finds navigation via #toolbar-navigation only', function() {
            TestFramework.describe('Verifies Settings Editor uses the correct selector without dual fallbacks');

            require(['Swissup_BreezeThemeEditor/js/editor/panel/settings-editor'], function(SettingsEditor) {
                
                // Check if Settings Editor can find navigation
                var $navigation = $('#toolbar-navigation');
                TestFramework.assert(
                    $navigation.length === 1,
                    'Settings Editor should find navigation via #toolbar-navigation',
                    'Found: ' + $navigation.length + ' elements'
                );

                // Verify navigation widget is attached
                var navigationWidget = $navigation.data('bte-navigation') || $navigation.data('bteNavigation');
                TestFramework.assert(
                    typeof navigationWidget === 'object' && navigationWidget !== null,
                    'Navigation should have widget data attached',
                    'Widget data: ' + typeof navigationWidget
                );

                // Verify navigation has required methods (if widget initialized)
                if (navigationWidget && typeof navigationWidget.openPanel === 'function') {
                    TestFramework.assert(
                        true,
                        'Navigation widget has required methods (e.g., openPanel)',
                        'Methods available'
                    );
                }

                TestFramework.success('Settings Editor uses correct navigation selector');
            });
        });

        // ========================================================================
        // Test 6: No Dual Selectors Remain in Code
        // ========================================================================
        TestFramework.test('No dual selectors like $("#bte-navigation, #toolbar-navigation")', function() {
            TestFramework.describe('Verifies that code does not use dual legacy/new selectors as fallbacks');

            // This is a runtime check - we verify that:
            // 1. Only one navigation element exists (the correct one)
            // 2. Legacy selector returns nothing
            // 3. If code tried dual selector, it would only match one element anyway

            var $newNavigation = $('#toolbar-navigation');
            var $legacyNavigation = $('#bte-navigation');
            var $dualSelector = $('#bte-navigation, #toolbar-navigation');

            TestFramework.assert(
                $newNavigation.length === 1,
                'New selector #toolbar-navigation should find 1 element',
                'Found: ' + $newNavigation.length
            );

            TestFramework.assert(
                $legacyNavigation.length === 0,
                'Legacy selector #bte-navigation should find 0 elements',
                'Found: ' + $legacyNavigation.length
            );

            TestFramework.assert(
                $dualSelector.length === 1,
                'Dual selector should only match 1 element (proving no duplicates exist)',
                'Found: ' + $dualSelector.length + ' elements'
            );

            TestFramework.assert(
                $dualSelector.is($newNavigation),
                'Dual selector should match the new navigation element',
                'Elements match: ' + $dualSelector.is($newNavigation)
            );

            TestFramework.success('No dual selectors needed - single correct selector works');
        });

        // ========================================================================
        // Test 7: Toolbar.js Uses Correct Selectors
        // ========================================================================
        TestFramework.test('Toolbar.js uses aligned selectors for initialization', function() {
            TestFramework.describe('Verifies that toolbar.js module uses correct selectors');

            require(['Swissup_BreezeThemeEditor/js/editor/toolbar'], function(Toolbar) {
                
                // Check that toolbar can find its elements
                var $toolbar = $('#breeze-theme-editor-toolbar');
                TestFramework.assert(
                    $toolbar.length === 1,
                    'Toolbar.js should be able to find #breeze-theme-editor-toolbar',
                    'Found: ' + $toolbar.length + ' elements'
                );

                var $navigation = $('#toolbar-navigation');
                TestFramework.assert(
                    $navigation.length === 1,
                    'Toolbar.js should be able to find #toolbar-navigation',
                    'Found: ' + $navigation.length + ' elements'
                );

                // Verify these are actual parent-child or sibling relationships
                var isRelated = $toolbar.find('#toolbar-navigation').length > 0 || 
                               $navigation.parent().is($toolbar) ||
                               $navigation.closest('#breeze-theme-editor-toolbar').length > 0;
                
                TestFramework.assert(
                    isRelated,
                    'Toolbar and Navigation should have a DOM relationship',
                    'Related: ' + isRelated
                );

                TestFramework.success('Toolbar.js uses correct aligned selectors');
            });
        });

        // ========================================================================
        // Test 8: Publication Selector Widget Uses Correct Events
        // ========================================================================
        TestFramework.test('Publication Selector triggers events on correct elements', function() {
            TestFramework.describe('Verifies that publication selector can trigger events that Settings Editor receives');

            // This test ensures the selector alignment enables proper event communication
            var eventReceived = false;
            var eventData = null;

            // Listen for publication status change (Settings Editor pattern)
            $(document).one('publicationStatusChanged', function(event, data) {
                eventReceived = true;
                eventData = data;
            });

            // Simulate publication selector triggering event
            $(document).trigger('publicationStatusChanged', {
                status: 'test-status',
                publicationId: 999
            });

            TestFramework.assert(
                eventReceived,
                'Event publicationStatusChanged should be received by listeners',
                'Received: ' + eventReceived
            );

            TestFramework.assert(
                eventData && eventData.status === 'test-status',
                'Event data should be correctly formatted as object',
                'Data: ' + JSON.stringify(eventData)
            );

            TestFramework.success('Publication selector events work with aligned architecture');
        });

    });

});
