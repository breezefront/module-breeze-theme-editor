/**
 * syncPaletteSwatchesFromChanges — F5 Reload Bug Tests  (Issue: palette swatches
 * show stale saved colour after page reload in DRAFT mode)
 *
 * Root cause:
 *   syncFieldsFromChanges() intentionally skips palette swatches
 *   ([data-property] elements without [data-section][data-field]).
 *   As a result, after F5 the CSS preview reflects the draft palette colour
 *   (loaded from localStorage) but the swatch squares still show the saved value.
 *
 * Fix (css-preview-manager.js):
 *   syncPaletteSwatchesFromChanges() is called at the end of syncFieldsFromChanges().
 *   For every entry in `changes` that maps to a palette color (PaletteManager.getColor
 *   returns non-null), it:
 *     1. Finds the swatch DOM element ([data-property].bte-palette-swatch)
 *     2. Sets background-color to the draft hex value
 *     3. Adds bte-swatch-dirty class
 *     4. Calls PaletteManager.restoreFromDraft() to sync dirtyColors bookkeeping
 *
 * Fix (palette-manager.js):
 *   restoreFromDraft(property, hexValue) — sets dirtyColors + updates color state
 *   without triggering notify (no CSS cascade side-effects).
 *
 * Test layers:
 *   1–3  Unit — mirror function, pure DOM assertions (always run)
 *   4    Unit — PaletteManager.restoreFromDraft() in isolation
 *   5    Integration — real CssPreviewManager.syncFieldsFromChanges() on synthetic
 *        DOM (auto-skipped when not in DRAFT mode with palette draft changes)
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager'
], function ($, TestFramework, CssPreviewManager, PaletteManager) {
    'use strict';

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Build a minimal palette swatch DOM element.
     * Mirrors the structure created by palette-section-renderer._createSwatch().
     *
     * @param {String} property  - CSS var, e.g. '--color-brand-primary'
     * @param {String} hexColor  - current saved hex, e.g. '#aabbcc'
     * @returns {jQuery} .bte-palette-swatch element (detached)
     */
    function buildFakeSwatch(property, hexColor) {
        var $visual = $('<div class="bte-swatch-visual">').css('background-color', hexColor);
        return $('<div class="bte-palette-swatch">')
            .attr('data-property', property)
            .append($visual);
    }

    /**
     * Mirror of syncPaletteSwatchesFromChanges() logic for unit testing.
     * Keeps tests decoupled from private `changes` closure in CssPreviewManager.
     *
     * @param {Object} changes        - map of { property: { value: hex } }
     * @param {Object} paletteManager - mock with getColor() / restoreFromDraft()
     */
    function runSync(changes, paletteManager) {
        Object.keys(changes).forEach(function(property) {
            var color = paletteManager && paletteManager.getColor(property);
            if (!color) {
                return;
            }
            var hexValue = changes[property].value;
            if (!hexValue || typeof hexValue !== 'string') {
                return;
            }
            var $swatch = $('[data-property="' + property + '"].bte-palette-swatch');
            if ($swatch.length) {
                $swatch.find('.bte-swatch-visual').css('background-color', hexValue);
                $swatch.addClass('bte-swatch-dirty');
            }
            paletteManager.restoreFromDraft(property, hexValue);
        });
    }

    // ─── Tests ──────────────────────────────────────────────────────────────────

    return TestFramework.suite('syncPaletteSwatchesFromChanges', {

        /**
         * Test 1:
         * When changes contain a palette property, the swatch background-color
         * must be updated to the draft value.
         */
        'should update swatch background-color to draft value': function () {
            var property = '--color-brand-primary';
            var savedHex = '#aabbcc';
            var draftHex = '#ff0000';

            var $swatch = buildFakeSwatch(property, savedHex).appendTo('body');

            try {
                var mockPaletteManager = {
                    restoreCalls: [],
                    getColor: function(prop) {
                        return prop === property ? { hex: savedHex, value: savedHex } : null;
                    },
                    restoreFromDraft: function(prop, hex) {
                        this.restoreCalls.push({ prop: prop, hex: hex });
                    }
                };

                runSync(
                    { '--color-brand-primary': { value: draftHex } },
                    mockPaletteManager
                );

                var bg = $swatch.find('.bte-swatch-visual').css('background-color');
                var r = parseInt(draftHex.slice(1, 3), 16);
                var g = parseInt(draftHex.slice(3, 5), 16);
                var b = parseInt(draftHex.slice(5, 7), 16);
                var expectedRgb = 'rgb(' + r + ', ' + g + ', ' + b + ')';

                this.assertTrue(
                    bg === expectedRgb || bg === draftHex.toLowerCase(),
                    'Swatch background-color must be draft value ' + draftHex + ', got: ' + bg
                );
            } finally {
                $swatch.remove();
            }
        },

        /**
         * Test 2:
         * When changes contain a palette property, the swatch must receive
         * the bte-swatch-dirty class.
         */
        'should add bte-swatch-dirty class to swatch': function () {
            var property = '--color-brand-secondary';
            var $swatch  = buildFakeSwatch(property, '#ffffff').appendTo('body');

            try {
                var mockPaletteManager = {
                    getColor: function(prop) {
                        return prop === property ? { hex: '#ffffff', value: '#ffffff' } : null;
                    },
                    restoreFromDraft: function() {}
                };

                runSync(
                    { '--color-brand-secondary': { value: '#123456' } },
                    mockPaletteManager
                );

                this.assertTrue(
                    $swatch.hasClass('bte-swatch-dirty'),
                    'Swatch must have bte-swatch-dirty class after sync'
                );
            } finally {
                $swatch.remove();
            }
        },

        /**
         * Test 3:
         * Changes that are NOT palette vars must not touch swatches.
         * (Non-palette property — getColor returns null.)
         */
        'should not touch swatch for non-palette properties': function () {
            var property = '--body-background-color'; // regular field, not palette
            var savedHex = '#ccddee';
            var $swatch  = buildFakeSwatch(property, savedHex).appendTo('body');

            try {
                var mockPaletteManager = {
                    getColor: function() { return null; }, // not a palette var
                    restoreFromDraft: function() {}
                };

                runSync(
                    { '--body-background-color': { value: '#ff0000' } },
                    mockPaletteManager
                );

                this.assertFalse(
                    $swatch.hasClass('bte-swatch-dirty'),
                    'Non-palette swatch must NOT get bte-swatch-dirty class'
                );

                var bg = $swatch.find('.bte-swatch-visual').css('background-color');
                var r = parseInt(savedHex.slice(1, 3), 16);
                var g = parseInt(savedHex.slice(3, 5), 16);
                var b = parseInt(savedHex.slice(5, 7), 16);
                var expectedRgb = 'rgb(' + r + ', ' + g + ', ' + b + ')';
                this.assertTrue(
                    bg === expectedRgb || bg === savedHex.toLowerCase(),
                    'Non-palette swatch background-color must remain ' + savedHex + ', got: ' + bg
                );
            } finally {
                $swatch.remove();
            }
        },

        /**
         * Test 4:
         * PaletteManager.restoreFromDraft() must set dirtyColors and update
         * color.hex / color.value without calling notify (no subscribers fire).
         */
        'PaletteManager.restoreFromDraft() should set dirty state without notify': function () {
            var property = '--bte-test-restore-draft';
            var savedHex = '#112233';
            var draftHex = '#aabbcc';

            // Inject a fake palette entry directly
            PaletteManager.palettes[property] = { hex: savedHex, value: savedHex, property: property };

            var notifyCalled = false;
            var origNotify = PaletteManager.notify;
            PaletteManager.notify = function() { notifyCalled = true; };

            try {
                PaletteManager.restoreFromDraft(property, draftHex);

                this.assertFalse(
                    notifyCalled,
                    'restoreFromDraft() must NOT call notify()'
                );

                this.assertTrue(
                    !!PaletteManager.dirtyColors[property],
                    'dirtyColors must contain the property after restoreFromDraft()'
                );

                this.assertEquals(
                    PaletteManager.dirtyColors[property].hex,
                    draftHex,
                    'dirtyColors[property].hex must be the draft hex value'
                );

                this.assertEquals(
                    PaletteManager.dirtyColors[property].original.hex,
                    savedHex,
                    'dirtyColors[property].original.hex must be the saved hex value'
                );

                this.assertEquals(
                    PaletteManager.palettes[property].hex,
                    draftHex,
                    'palette color.hex must be updated to draft value'
                );
            } finally {
                PaletteManager.notify = origNotify;
                delete PaletteManager.dirtyColors[property];
                delete PaletteManager.palettes[property];
            }
        },

        /**
         * Test 5 (Integration):
         * Real CssPreviewManager.syncFieldsFromChanges() on a synthetic panel DOM
         * with a palette swatch must update the swatch background-color and add
         * bte-swatch-dirty class when a palette draft change exists.
         *
         * Auto-skipped if not in DRAFT mode or no palette draft changes exist.
         */
        'syncFieldsFromChanges() should restore palette swatch from draft (integration)': function () {
            var existingChanges = CssPreviewManager.getChanges();

            // Find a change that matches a palette color
            var testProperty = null;
            var testHex      = null;

            Object.keys(existingChanges).some(function(prop) {
                var entry = existingChanges[prop];
                var val   = entry && entry.value ? entry.value : entry;
                var color = PaletteManager.getColor(prop);
                if (color && typeof val === 'string' && val.charAt(0) === '#') {
                    testProperty = prop;
                    testHex      = val;
                    return true;
                }
            });

            if (!testProperty) {
                console.log('   Skipping Test 5: no palette draft changes found (not in DRAFT mode or no palette changes)');
                return;
            }

            var $swatch = buildFakeSwatch(testProperty, '#ffffff').appendTo('body');

            try {
                CssPreviewManager.syncFieldsFromChanges($('<div>'));

                this.assertTrue(
                    $swatch.hasClass('bte-swatch-dirty'),
                    'Swatch must have bte-swatch-dirty after syncFieldsFromChanges(), property: ' + testProperty
                );

                var bg = $swatch.find('.bte-swatch-visual').css('background-color');
                var r = parseInt(testHex.slice(1, 3), 16);
                var g = parseInt(testHex.slice(3, 5), 16);
                var b = parseInt(testHex.slice(5, 7), 16);
                var expectedRgb = 'rgb(' + r + ', ' + g + ', ' + b + ')';

                this.assertTrue(
                    bg === expectedRgb || bg === testHex.toLowerCase(),
                    'Swatch background-color must be ' + testHex + ' after syncFieldsFromChanges(), got: ' + bg
                );
            } finally {
                $swatch.remove();
            }
        }

    });
});
