/**
 * Toolbar Toggle Widget Test Suite
 *
 * Tests for toolbar/toolbar-toggle.js:
 * - _hideToolbar()    — adds collapsed class, saves state '0' via StorageHelper
 * - _showToolbar()    — removes collapsed class, saves state '1' via StorageHelper
 * - _saveState()      — writes to StorageHelper.setGlobalItem('admin_toolbar_visible', ...)
 * - _restoreState()   — reads from StorageHelper and collapses when '0'
 *
 * The widget requires real DOM elements. We build a minimal toolbar scaffold
 * so the widget can initialise without the live admin toolbar being present.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/toolbar-toggle'
], function ($, TestFramework, StorageHelper, ToolbarToggleWidget) {
    'use strict';

    /**
     * Build minimal DOM for the toggle widget.
     * Returns { $toggleEl, $toolbar, $compactContainer, widget, cleanup }.
     */
    function makeEnv(id) {
        var toggleId   = id + '-btn';
        var toolbarId  = id + '-toolbar';
        var compactId  = id + '-compact';

        // Toolbar placeholder
        var $toolbar   = $('<div class="bte-toolbar" id="' + toolbarId + '" style="height:50px"></div>');
        // Container for the toggle button (the element the widget binds to)
        var $toggleEl  = $('<div id="' + toggleId + '"></div>');
        // Compact container (widget checks / creates this itself, but we pre-create to keep tests isolated)
        var $compact   = $('<div id="' + compactId + '"></div>');

        $('body').append($toolbar).append($toggleEl).append($compact);

        // Clean localStorage before widget initialises so _restoreState is neutral
        StorageHelper.removeGlobalItem('admin_toolbar_visible');

        $toggleEl.breezeToolbarToggle({
            toolbarSelector:        '#' + toolbarId,
            compactContainerSelector: '#' + compactId
        });

        var widget = $toggleEl.data('breezeBreezeToolbarToggle');

        return {
            $toggleEl:  $toggleEl,
            $toolbar:   $toolbar,
            $compact:   $compact,
            widget:     widget,
            cleanup: function () {
                $toggleEl.remove();
                $toolbar.remove();
                $compact.remove();
                // Remove bte-compact-toggle if the widget appended one to body
                $('#bte-compact-toggle').remove();
                StorageHelper.removeGlobalItem('admin_toolbar_visible');
            }
        };
    }

    return TestFramework.suite('Toolbar Toggle Widget', {

        // ====================================================================
        // GROUP 1: _hideToolbar() — 3 tests
        // ====================================================================

        '_hideToolbar() adds toolbar-collapsed class': function () {
            var env = makeEnv('bte-tt-1');

            env.widget._hideToolbar();

            this.assertTrue(env.$toolbar.hasClass('toolbar-collapsed'),
                'Toolbar should have toolbar-collapsed class after _hideToolbar()');

            env.cleanup();
            console.log('✅ _hideToolbar() adds toolbar-collapsed class');
        },

        '_hideToolbar() sets options.collapsed = true': function () {
            var env = makeEnv('bte-tt-2');

            env.widget._hideToolbar();

            this.assertTrue(env.widget.options.collapsed,
                'options.collapsed should be true after _hideToolbar()');

            env.cleanup();
            console.log('✅ _hideToolbar() sets options.collapsed = true');
        },

        '_hideToolbar() saves state "0" to StorageHelper': function () {
            var env = makeEnv('bte-tt-3');
            StorageHelper.removeGlobalItem('admin_toolbar_visible');

            env.widget._hideToolbar();

            var saved = StorageHelper.getGlobalItem('admin_toolbar_visible');
            this.assertEquals(saved, '0', 'StorageHelper should have "0" after hiding');

            env.cleanup();
            console.log('✅ _hideToolbar() saves "0" to admin_toolbar_visible');
        },

        // ====================================================================
        // GROUP 2: _showToolbar() — 3 tests
        // ====================================================================

        '_showToolbar() removes toolbar-collapsed class': function () {
            var env = makeEnv('bte-tt-4');

            env.widget._hideToolbar();
            env.widget._showToolbar();

            this.assertFalse(env.$toolbar.hasClass('toolbar-collapsed'),
                'Toolbar should NOT have toolbar-collapsed class after _showToolbar()');

            env.cleanup();
            console.log('✅ _showToolbar() removes toolbar-collapsed class');
        },

        '_showToolbar() sets options.collapsed = false': function () {
            var env = makeEnv('bte-tt-5');

            env.widget._hideToolbar();
            env.widget._showToolbar();

            this.assertFalse(env.widget.options.collapsed,
                'options.collapsed should be false after _showToolbar()');

            env.cleanup();
            console.log('✅ _showToolbar() sets options.collapsed = false');
        },

        '_showToolbar() saves state "1" to StorageHelper': function () {
            var env = makeEnv('bte-tt-6');
            StorageHelper.removeGlobalItem('admin_toolbar_visible');

            env.widget._showToolbar();

            var saved = StorageHelper.getGlobalItem('admin_toolbar_visible');
            this.assertEquals(saved, '1', 'StorageHelper should have "1" after showing');

            env.cleanup();
            console.log('✅ _showToolbar() saves "1" to admin_toolbar_visible');
        },

        // ====================================================================
        // GROUP 3: _saveState() — 2 tests
        // ====================================================================

        '_saveState(true) writes "1" to admin_toolbar_visible': function () {
            StorageHelper.removeGlobalItem('admin_toolbar_visible');

            var env = makeEnv('bte-tt-7');
            env.widget._saveState(true);

            this.assertEquals(StorageHelper.getGlobalItem('admin_toolbar_visible'), '1',
                'Visible state should be stored as "1"');

            env.cleanup();
            console.log('✅ _saveState(true) stores "1"');
        },

        '_saveState(false) writes "0" to admin_toolbar_visible': function () {
            StorageHelper.removeGlobalItem('admin_toolbar_visible');

            var env = makeEnv('bte-tt-8');
            env.widget._saveState(false);

            this.assertEquals(StorageHelper.getGlobalItem('admin_toolbar_visible'), '0',
                'Hidden state should be stored as "0"');

            env.cleanup();
            console.log('✅ _saveState(false) stores "0"');
        },

        // ====================================================================
        // GROUP 4: _restoreState() — 2 tests (async)
        // ====================================================================

        '_restoreState() collapses toolbar when stored state is "0"': function (done) {
            var self = this;

            // Pre-set stored state to hidden
            StorageHelper.setGlobalItem('admin_toolbar_visible', '0');

            var env = makeEnv('bte-tt-9');

            // Call _restoreState explicitly (widget already called it in _create,
            // but we need to verify via a fresh call after setting the state)
            env.widget._restoreState();

            // _restoreState uses setTimeout(100) internally
            setTimeout(function () {
                self.assertTrue(env.$toolbar.hasClass('toolbar-collapsed'),
                    'Toolbar should be collapsed when stored state is "0"');

                env.cleanup();
                console.log('✅ _restoreState() collapses toolbar for stored state "0"');
                done();
            }, 300);
        },

        '_restoreState() does not collapse toolbar when no state stored': function (done) {
            var self = this;

            StorageHelper.removeGlobalItem('admin_toolbar_visible');

            var env = makeEnv('bte-tt-10');
            env.widget._restoreState();

            setTimeout(function () {
                self.assertFalse(env.$toolbar.hasClass('toolbar-collapsed'),
                    'Toolbar should NOT be collapsed when no stored state');

                env.cleanup();
                console.log('✅ _restoreState() leaves toolbar visible when no stored state');
                done();
            }, 300);
        }
    });
});
