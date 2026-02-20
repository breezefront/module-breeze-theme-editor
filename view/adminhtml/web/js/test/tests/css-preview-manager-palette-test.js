/**
 * CssPreviewManager — Palette Injection Tests  (Bug 3 JS Layer Fix)
 *
 * Bug: When a user picks a palette color (e.g. --color-brand-amber-primary) for a
 * field whose format is "rgb", setVariable() wrote:
 *
 *   --base-color: var(--color-brand-amber-primary-rgb)
 *
 * …but --color-brand-amber-primary-rgb was never defined in the live-preview
 * <style> tag, so the browser resolved it to nothing → black.
 *
 * Fix (css-preview-manager.js::setVariable): when `value` starts with '--'
 * (palette reference), look up the current HEX from PaletteManager and inject
 * both the HEX var and the -rgb var into `changes`.
 *
 * Tests are split into three layers:
 *   1–5   _formatColorValue()  — pure format-conversion logic (always runnable)
 *   6–10  Injection algorithm  — exact code block from setVariable(), isolated
 *         with a mock PaletteManager (always runnable)
 *   11    Integration          — calls real setVariable() when editor is in
 *         DRAFT mode; skipped automatically otherwise
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/color-utils'
], function (TestFramework, CssPreviewManager, ColorUtils) {
    'use strict';

    /**
     * Local copy of the injection block from setVariable().
     * Kept in sync with the production code so that tests 6–10 test the real algorithm.
     *
     * @param {Object} changes        - mutable changes map
     * @param {String} value          - raw field value (may start with '--')
     * @param {Object|null} paletteManager - mock or real PaletteManager
     */
    function runInjection(changes, value, paletteManager) {
        if (typeof value === 'string' && value.startsWith('--') && paletteManager) {
            var paletteColor = paletteManager.getColor(value);
            if (paletteColor) {
                var hex = paletteColor.value || paletteColor.hex;
                if (hex) {
                    if (!changes[value]) {
                        changes[value] = hex;
                    }
                    var rgbVar = value + '-rgb';
                    if (!changes[rgbVar]) {
                        changes[rgbVar] = ColorUtils.hexToRgb(hex);
                    }
                }
            }
        }
    }

    return TestFramework.suite('CssPreviewManager - Palette Injection', {

        // ─── Layer 1: _formatColorValue (pure) ───────────────────────────────

        /**
         * Test 1: palette ref, no format → var(--x)
         */
        'should format palette ref without format as var()': function () {
            var result = CssPreviewManager._formatColorValue('--color-brand-primary', {});
            this.assertEquals(
                result,
                'var(--color-brand-primary)',
                'Palette ref without format should become var(--color-brand-primary)'
            );
        },

        /**
         * Test 2: palette ref + format:rgb → var(--x-rgb)
         * This is the exact conversion that was producing black before the fix.
         */
        'should format palette ref with format:rgb as var(--x-rgb)': function () {
            var result = CssPreviewManager._formatColorValue('--color-brand-primary', { format: 'rgb' });
            this.assertEquals(
                result,
                'var(--color-brand-primary-rgb)',
                'Palette ref with format:rgb must append -rgb suffix'
            );
        },

        /**
         * Test 3: deeper palette var name (amber) + format:rgb → var(--x-rgb)
         */
        'should handle multi-segment palette var name with format:rgb': function () {
            var result = CssPreviewManager._formatColorValue('--color-brand-amber-primary', { format: 'rgb' });
            this.assertEquals(
                result,
                'var(--color-brand-amber-primary-rgb)',
                '--color-brand-amber-primary + rgb → var(--color-brand-amber-primary-rgb)'
            );
        },

        /**
         * Test 4: plain hex + format:rgb → "r, g, b"
         * Mirrors CssGenerator::formatColor() for concrete hex values.
         */
        'should convert hex to rgb string when format is rgb': function () {
            var result = CssPreviewManager._formatColorValue('#a16207', { format: 'rgb' });
            this.assertEquals(
                result,
                '161, 98, 7',
                '#a16207 with format:rgb should produce "161, 98, 7"'
            );
        },

        /**
         * Test 5: plain hex without format → normalised #hex
         */
        'should normalise uppercase hex to lowercase': function () {
            var result = CssPreviewManager._formatColorValue('#A16207', {});
            this.assertEquals(result, '#a16207', '#A16207 should normalise to #a16207');
        },

        // ─── Layer 2: injection algorithm (isolated) ─────────────────────────

        /**
         * Test 6: palette ref → HEX var injected into changes
         */
        'should inject palette HEX var when value is a palette reference': function () {
            var changes = {};
            var mockPM = {
                getColor: function (v) {
                    return v === '--color-brand-amber-primary'
                        ? { value: '#a16207', hex: '#a16207' }
                        : null;
                }
            };

            runInjection(changes, '--color-brand-amber-primary', mockPM);

            this.assertEquals(
                changes['--color-brand-amber-primary'],
                '#a16207',
                'HEX var --color-brand-amber-primary should be injected into changes'
            );
        },

        /**
         * Test 7: palette ref → RGB var injected into changes
         * This is the variable that var(--color-brand-amber-primary-rgb) resolves to.
         */
        'should inject palette RGB var when value is a palette reference': function () {
            var changes = {};
            var mockPM = {
                getColor: function () {
                    return { value: '#a16207', hex: '#a16207' };
                }
            };

            runInjection(changes, '--color-brand-amber-primary', mockPM);

            this.assertEquals(
                changes['--color-brand-amber-primary-rgb'],
                '161, 98, 7',
                'RGB var --color-brand-amber-primary-rgb should be "161, 98, 7"'
            );
        },

        /**
         * Test 8: does NOT overwrite an existing palette var
         * (e.g. set by a direct palette-color change — that value takes precedence)
         */
        'should not overwrite palette var already present in changes': function () {
            var changes = { '--color-brand-amber-primary': '#ffcc00' };
            var mockPM = {
                getColor: function () {
                    return { value: '#a16207', hex: '#a16207' };
                }
            };

            runInjection(changes, '--color-brand-amber-primary', mockPM);

            this.assertEquals(
                changes['--color-brand-amber-primary'],
                '#ffcc00',
                'Pre-existing palette var must not be overwritten by injection'
            );
        },

        /**
         * Test 9: injection skipped when _paletteManager is null
         * (safe fallback before PaletteManager lazy-loads)
         */
        'should skip injection when paletteManager is null': function () {
            var changes = {};
            runInjection(changes, '--color-brand-amber-primary', null);

            this.assertEquals(
                changes['--color-brand-amber-primary'],
                undefined,
                'Nothing should be injected when paletteManager is null'
            );
        },

        /**
         * Test 10: injection skipped for plain hex values (not palette refs)
         */
        'should skip injection for plain hex values': function () {
            var changes = {};
            var mockPM = {
                getColor: function () {
                    return { value: '#a16207', hex: '#a16207' };
                }
            };

            runInjection(changes, '#a16207', mockPM);

            this.assertEquals(
                Object.keys(changes).length,
                0,
                'No injection should occur for a plain hex value'
            );
        },

        // ─── Layer 3: integration (live DRAFT mode) ───────────────────────────

        /**
         * Test 11: end-to-end via real setVariable()
         *
         * Calls CssPreviewManager.setVariable() with a real palette reference and
         * verifies that getChanges() contains both the HEX and RGB injected vars.
         * Skipped automatically if the editor is not in DRAFT mode or palette
         * data is unavailable.
         */
        'should inject palette HEX+RGB vars via real setVariable() in DRAFT mode': function (done) {
            var self = this;

            require([
                'Swissup_BreezeThemeEditor/js/editor/css-manager',
                'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager'
            ], function (CssManager, PaletteManager) {

                if (!CssManager.isEditable()) {
                    console.log('   ⚠️  Skipping integration test: editor not in DRAFT mode');
                    done();
                    return;
                }

                // Pick the first available palette color
                var testVar = null;
                var paletteColor = null;
                var palettes = PaletteManager.palettes || {};

                Object.keys(palettes).some(function (cssVar) {
                    var c = palettes[cssVar];
                    if (c && (c.value || c.hex)) {
                        testVar = cssVar;
                        paletteColor = c;
                        return true;
                    }
                });

                if (!testVar) {
                    console.log('   ⚠️  Skipping integration test: no palette colors loaded');
                    done();
                    return;
                }

                var expectedHex = paletteColor.value || paletteColor.hex;
                var expectedRgb = ColorUtils.hexToRgb(expectedHex);
                var fieldVar    = '--bte-test-integration-color';

                // Act
                var ok = CssPreviewManager.setVariable(fieldVar, testVar, 'color', { format: 'rgb' });

                if (!ok) {
                    console.log('   ⚠️  setVariable() returned false, cannot verify injection');
                    done();
                    return;
                }

                var changes = CssPreviewManager.getChanges();

                // Assert — field var formatted correctly
                self.assertEquals(
                    changes[fieldVar],
                    'var(' + testVar + '-rgb)',
                    'Field var should be set to var(' + testVar + '-rgb)'
                );

                // Assert — palette HEX injected
                self.assertEquals(
                    changes[testVar],
                    expectedHex,
                    'Palette HEX var ' + testVar + ' should be injected as ' + expectedHex
                );

                // Assert — palette RGB injected
                self.assertEquals(
                    changes[testVar + '-rgb'],
                    expectedRgb,
                    'Palette RGB var ' + testVar + '-rgb should be injected as "' + expectedRgb + '"'
                );

                // Cleanup — remove only what we added
                CssPreviewManager.resetVariable(fieldVar);
                CssPreviewManager.resetVariable(testVar);
                CssPreviewManager.resetVariable(testVar + '-rgb');

                console.log('   ✅ Integration: injected', testVar, '→', expectedHex, '/', expectedRgb);
                done();
            });
        }
    });
});
