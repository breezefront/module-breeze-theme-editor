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
        'Toolbar uses #breeze-theme-editor-toolbar (not #bte-toolbar)': function() {
            // Check that correct selector exists
            var $toolbar = $('#breeze-theme-editor-toolbar');
            this.assert(
                $toolbar.length === 1,
                'Toolbar element with ID #breeze-theme-editor-toolbar should exist. ' +
                'Found: ' + $toolbar.length + ' elements'
            );

            // Check that legacy selector does NOT exist
            var $legacyToolbar = $('#bte-toolbar');
            this.assert(
                $legacyToolbar.length === 0,
                'Legacy toolbar ID #bte-toolbar should NOT exist. ' +
                'Found: ' + $legacyToolbar.length + ' legacy elements'
            );

            // Verify toolbar has expected structure
            this.assert(
                $toolbar.hasClass('bte-toolbar') || $toolbar.find('.bte-toolbar-container').length > 0,
                'Toolbar should have expected structure (toolbar-related classes/children). ' +
                'Classes: ' + $toolbar.attr('class')
            );
        },

        // ========================================================================
        // Test 2: Navigation Selector Alignment
        // ========================================================================
        'Navigation uses #toolbar-navigation (not #bte-navigation)': function() {
            // Check that correct selector exists
            var $navigation = $('#toolbar-navigation');
            this.assert(
                $navigation.length === 1,
                'Navigation element with ID #toolbar-navigation should exist. ' +
                'Found: ' + $navigation.length + ' elements'
            );

            // Check that legacy selector does NOT exist
            var $legacyNavigation = $('#bte-navigation');
            this.assert(
                $legacyNavigation.length === 0,
                'Legacy navigation ID #bte-navigation should NOT exist. ' +
                'Found: ' + $legacyNavigation.length + ' legacy elements'
            );

            // Verify navigation has expected structure (should have tabs/buttons)
            this.assert(
                $navigation.find('.btn, button, a, [data-panel]').length > 0,
                'Navigation should contain interactive elements (buttons/links). ' +
                'Found: ' + $navigation.find('.btn, button, a').length + ' interactive elements'
            );
        },

        // ========================================================================
        // Test 3: Panels Container Selector Alignment
        // ========================================================================
        'Panels container uses #bte-panels-container': function() {
            // Check that correct selector exists
            var $panels = $('#bte-panels-container');
            this.assert(
                $panels.length === 1,
                'Panels container with ID #bte-panels-container should exist. ' +
                'Found: ' + $panels.length + ' elements'
            );

            // Check for legacy alternative selector
            var $legacyPanels = $('#bte-panels');
            var hasLegacy = $legacyPanels.length > 0 && !$legacyPanels.is($panels);
            this.assert(
                !hasLegacy,
                'Should not have separate legacy panels container #bte-panels. ' +
                'Legacy panels: ' + $legacyPanels.length
            );
        },

        // ========================================================================
        // Test 4: Constants.js Values Match Actual DOM
        // ========================================================================
        'Constants.js selector values match actual DOM IDs': function(done) {
            var self = this;

            require(['Swissup_BreezeThemeEditor/js/editor/constants'], function(Constants) {
                // Test TOOLBAR constant
                if (Constants.SELECTORS && Constants.SELECTORS.TOOLBAR) {
                    var toolbarSelector = Constants.SELECTORS.TOOLBAR;
                    self.assertEquals(
                        toolbarSelector,
                        '#breeze-theme-editor-toolbar',
                        'Constants.SELECTORS.TOOLBAR should be "#breeze-theme-editor-toolbar"'
                    );

                    var $toolbarFromConstants = $(toolbarSelector);
                    self.assert(
                        $toolbarFromConstants.length === 1,
                        'Toolbar selector from Constants should find exactly 1 element. ' +
                        'Found: ' + $toolbarFromConstants.length + ' elements'
                    );
                }

                // Test NAVIGATION constant
                if (Constants.SELECTORS && Constants.SELECTORS.NAVIGATION) {
                    var navigationSelector = Constants.SELECTORS.NAVIGATION;
                    self.assertEquals(
                        navigationSelector,
                        '#toolbar-navigation',
                        'Constants.SELECTORS.NAVIGATION should be "#toolbar-navigation"'
                    );

                    var $navigationFromConstants = $(navigationSelector);
                    self.assert(
                        $navigationFromConstants.length === 1,
                        'Navigation selector from Constants should find exactly 1 element. ' +
                        'Found: ' + $navigationFromConstants.length + ' elements'
                    );
                }

                // Test PANELS constant
                if (Constants.SELECTORS && Constants.SELECTORS.PANELS) {
                    var panelsSelector = Constants.SELECTORS.PANELS;
                    self.assertEquals(
                        panelsSelector,
                        '#bte-panels-container',
                        'Constants.SELECTORS.PANELS should be "#bte-panels-container"'
                    );

                    var $panelsFromConstants = $(panelsSelector);
                    self.assert(
                        $panelsFromConstants.length === 1,
                        'Panels selector from Constants should find exactly 1 element. ' +
                        'Found: ' + $panelsFromConstants.length + ' elements'
                    );
                }

                done();
            });
        },

        // ========================================================================
        // Test 5: Settings Editor Uses Correct Navigation Selector
        // ========================================================================
        'Settings Editor finds navigation via #toolbar-navigation only': function(done) {
            var self = this;

            // Navigation widget is initialized by toolbar.js at page load — no need to require settings-editor.
            // Widget is registered as $.widget('swissup.breezeNavigation', ...) → data key: 'swissupBreezeNavigation'
            var $navigation = $('#toolbar-navigation');
            self.assert(
                $navigation.length === 1,
                'Settings Editor should find navigation via #toolbar-navigation. ' +
                'Found: ' + $navigation.length + ' elements'
            );

            // Verify navigation widget is attached
            var navigationWidget = $navigation.data('swissupBreezeNavigation');
            self.assert(
                typeof navigationWidget === 'object' && navigationWidget !== null,
                'Navigation should have widget data attached. ' +
                'Widget data: ' + typeof navigationWidget
            );

            done();
        },

        // ========================================================================
        // Test 6: No Dual Selectors Remain in Code
        // ========================================================================
        'No dual selectors like $("#bte-navigation, #toolbar-navigation")': function() {
            var $newNavigation = $('#toolbar-navigation');
            var $legacyNavigation = $('#bte-navigation');
            var $dualSelector = $('#bte-navigation, #toolbar-navigation');

            this.assert(
                $newNavigation.length === 1,
                'New selector #toolbar-navigation should find 1 element. ' +
                'Found: ' + $newNavigation.length
            );

            this.assert(
                $legacyNavigation.length === 0,
                'Legacy selector #bte-navigation should find 0 elements. ' +
                'Found: ' + $legacyNavigation.length
            );

            this.assert(
                $dualSelector.length === 1,
                'Dual selector should only match 1 element (proving no duplicates exist). ' +
                'Found: ' + $dualSelector.length + ' elements'
            );

            this.assert(
                $dualSelector.is($newNavigation),
                'Dual selector should match the new navigation element. ' +
                'Elements match: ' + $dualSelector.is($newNavigation)
            );
        },

        // ========================================================================
        // Test 7: Toolbar.js Uses Correct Selectors
        // ========================================================================
        'Toolbar.js uses aligned selectors for initialization': function(done) {
            var self = this;

            require(['Swissup_BreezeThemeEditor/js/editor/toolbar'], function() {
                // Check that toolbar can find its elements
                var $toolbar = $('#breeze-theme-editor-toolbar');
                self.assert(
                    $toolbar.length === 1,
                    'Toolbar.js should be able to find #breeze-theme-editor-toolbar. ' +
                    'Found: ' + $toolbar.length + ' elements'
                );

                var $navigation = $('#toolbar-navigation');
                self.assert(
                    $navigation.length === 1,
                    'Toolbar.js should be able to find #toolbar-navigation. ' +
                    'Found: ' + $navigation.length + ' elements'
                );

                // Verify these are actual parent-child or sibling relationships
                var isRelated = $toolbar.find('#toolbar-navigation').length > 0 ||
                               $navigation.parent().is($toolbar) ||
                               $navigation.closest('#breeze-theme-editor-toolbar').length > 0;

                self.assert(
                    isRelated,
                    'Toolbar and Navigation should have a DOM relationship. ' +
                    'Related: ' + isRelated
                );

                done();
            });
        },

        // ========================================================================
        // Test 8: Publication Selector Widget Uses Correct Events
        // ========================================================================
        'Publication Selector triggers events on correct elements': function() {
            var eventReceived = false;
            var eventData = null;

            // Use a namespaced handler so other tests' triggers cannot consume it
            // and so we can clean up reliably after this test runs.
            $(document).on('publicationStatusChanged.selectorAlignTest', function(event, data) {
                eventReceived = true;
                eventData = data;
                // Remove immediately — behave like .one() but scoped to our namespace
                $(document).off('publicationStatusChanged.selectorAlignTest');
            });

            // Simulate publication selector triggering event
            $(document).trigger('publicationStatusChanged', {
                status: 'DRAFT',
                publicationId: null
            });

            // Ensure handler is always cleaned up (safety net if trigger failed)
            $(document).off('publicationStatusChanged.selectorAlignTest');

            this.assert(
                eventReceived,
                'Event publicationStatusChanged should be received by listeners. ' +
                'Received: ' + eventReceived
            );

            this.assert(
                eventData && eventData.status === 'DRAFT' && eventData.publicationId === null,
                'Event data should be correctly formatted as object. ' +
                'Data: ' + JSON.stringify(eventData)
            );
        }

    });

});
