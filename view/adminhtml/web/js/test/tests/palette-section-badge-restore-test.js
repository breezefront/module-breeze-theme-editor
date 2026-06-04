/**
 * Palette Section Badge Restore Tests
 *
 * Bug: After F5 (page reload) in DRAFT mode, the palette section header badges
 * (Changed N / Reset button) are not restored because paletteColorChanged event
 * does not trigger _updateHeaderBadges() in the color palette widget.
 *
 * Root cause:
 *   palette-section-renderer.js _bind() never calls _bindBadgeUpdates(), so
 *   paletteColorChanged → _updateHeaderBadges() subscription is missing.
 *   (font-palette-section-renderer.js already calls _bindBadgeUpdates() — not affected.)
 *
 * Fix:
 *   Call this._bindBadgeUpdates() in paletteSection._bind().
 *   Call this._destroyBadgeUpdates() in paletteSection._destroy().
 *
 * Tests:
 *   1. After widget init, paletteColorChanged triggers _updateHeaderBadges
 *   2. After widget destroy, paletteColorChanged does NOT trigger _updateHeaderBadges
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/palette-section-renderer'
], function ($, TestFramework) {
    'use strict';

    /**
     * Build a minimal paletteSection widget with empty palettes.
     * Appends to body so DOM queries inside widget work.
     *
     * @returns {jQuery} container element (widget already initialized)
     */
    function buildFixture() {
        var $el = $('<div>').appendTo(document.body);
        $el.paletteSection({ palettes: [] });
        return $el;
    }

    /** Destroy widget and remove from DOM. */
    function tearDown($el) {
        try { $el.paletteSection('destroy'); } catch (e) {}
        $el.remove();
    }

    return TestFramework.suite('paletteSection badge restore after F5', {

        /**
         * Test 1:
         * After widget initialization, triggering paletteColorChanged must
         * call _updateHeaderBadges() so the dirty badge and reset button
         * are refreshed after syncPaletteSwatchesFromChanges() fires the event.
         *
         * FAILS before fix (missing _bindBadgeUpdates() call in _bind()).
         */
        'paletteColorChanged should trigger _updateHeaderBadges after init': function () {
            var called = 0;
            var $el = buildFixture();
            var widget = $el.data('swissupPaletteSection');

            widget._updateHeaderBadges = function () { called++; };

            try {
                $(document).trigger('paletteColorChanged');

                this.assertEqual(
                    1, called,
                    'paletteColorChanged must trigger _updateHeaderBadges — missing _bindBadgeUpdates() in _bind()'
                );
            } finally {
                tearDown($el);
            }
        },

        /**
         * Test 2:
         * After widget destroy, paletteColorChanged must NOT trigger
         * _updateHeaderBadges() — the subscription added by _bind() must be
         * cleaned up by _destroy() via _destroyBadgeUpdates().
         *
         * FAILS before fix (missing _destroyBadgeUpdates() call in _destroy()).
         */
        'paletteColorChanged should NOT trigger _updateHeaderBadges after destroy': function () {
            var called = 0;
            var $el = buildFixture();
            var widget = $el.data('swissupPaletteSection');

            // Stub after init — _bind() already subscribed via _bindBadgeUpdates()
            widget._updateHeaderBadges = function () { called++; };

            tearDown($el); // must call _destroyBadgeUpdates() inside _destroy()

            $(document).trigger('paletteColorChanged');

            this.assertEqual(
                0, called,
                'paletteColorChanged must not fire _updateHeaderBadges after destroy — missing _destroyBadgeUpdates() in _destroy()'
            );
        }

    });
});
