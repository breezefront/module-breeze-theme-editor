/**
 * Highlight Toggle Widget Test Suite
 *
 * Tests for toolbar/highlight-toggle.js:
 * - _toggleHighlight()  — flips options.enabled, updates active class on button,
 *                         triggers highlightToggled event
 * - options.enabled     — reflects current state
 *
 * The widget has minimal DOM requirements.
 * We initialise it against a scratch element to keep tests self-contained.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/highlight-toggle'
], function ($, TestFramework, HighlightToggleWidget) {
    'use strict';

    /**
     * Build minimal DOM for the highlight-toggle widget.
     * Returns { $el, widget, cleanup }.
     */
    function makeEnv(id, initialEnabled) {
        var $el = $('<div id="' + id + '"></div>');
        $('body').append($el);

        $el.breezeHighlightToggle({
            enabled: initialEnabled || false
        });

        var widget = $el.data('breezeBreezeHighlightToggle');

        return {
            $el:    $el,
            widget: widget,
            cleanup: function () {
                $el.remove();
            }
        };
    }

    return TestFramework.suite('Highlight Toggle Widget', {

        // ====================================================================
        // GROUP 1: _toggleHighlight() — state changes (4 tests)
        // ====================================================================

        '_toggleHighlight() sets enabled = true when starting disabled': function () {
            var env = makeEnv('bte-ht-1', false);

            env.widget._toggleHighlight();

            this.assertTrue(env.widget.options.enabled,
                'options.enabled should be true after first toggle');

            env.cleanup();
            console.log('✅ _toggleHighlight() enables highlight');
        },

        '_toggleHighlight() sets enabled = false when starting enabled': function () {
            var env = makeEnv('bte-ht-2', true);

            env.widget._toggleHighlight();

            this.assertFalse(env.widget.options.enabled,
                'options.enabled should be false after toggling from enabled state');

            env.cleanup();
            console.log('✅ _toggleHighlight() disables highlight');
        },

        '_toggleHighlight() toggles back to original state on second call': function () {
            var env = makeEnv('bte-ht-3', false);

            env.widget._toggleHighlight(); // → true
            env.widget._toggleHighlight(); // → false

            this.assertFalse(env.widget.options.enabled,
                'Two toggles should return to original disabled state');

            env.cleanup();
            console.log('✅ _toggleHighlight() is a true toggle');
        },

        // ====================================================================
        // GROUP 2: active class on button (2 tests)
        // ====================================================================

        '_toggleHighlight() adds active class to button when enabling': function () {
            var env = makeEnv('bte-ht-4', false);

            env.widget._toggleHighlight();

            var $btn = env.$el.find('.toolbar-button');
            this.assertTrue($btn.hasClass('active'),
                'Button should have active class when highlight is enabled');

            env.cleanup();
            console.log('✅ _toggleHighlight() adds active class when enabling');
        },

        '_toggleHighlight() removes active class from button when disabling': function () {
            var env = makeEnv('bte-ht-5', true);

            env.widget._toggleHighlight(); // disabling

            var $btn = env.$el.find('.toolbar-button');
            this.assertFalse($btn.hasClass('active'),
                'Button should NOT have active class when highlight is disabled');

            env.cleanup();
            console.log('✅ _toggleHighlight() removes active class when disabling');
        },

        // ====================================================================
        // GROUP 3: highlightToggled event (2 tests)
        // ====================================================================

        '_toggleHighlight() triggers highlightToggled event': function () {
            var env = makeEnv('bte-ht-6', false);
            var triggered = false;

            env.$el.on('highlightToggled', function () {
                triggered = true;
            });

            env.widget._toggleHighlight();

            this.assertTrue(triggered, 'highlightToggled event should be triggered');

            env.cleanup();
            console.log('✅ _toggleHighlight() triggers highlightToggled event');
        },

        '_toggleHighlight() passes new enabled state in event payload': function () {
            var env = makeEnv('bte-ht-7', false);
            var receivedState = null;

            env.$el.on('highlightToggled', function (e, state) {
                receivedState = state;
            });

            env.widget._toggleHighlight(); // false → true

            this.assertTrue(receivedState,
                'Event payload should be true after enabling');

            env.widget._toggleHighlight(); // true → false

            this.assertFalse(receivedState,
                'Event payload should be false after disabling');

            env.cleanup();
            console.log('✅ _toggleHighlight() event payload reflects new state');
        }
    });
});
