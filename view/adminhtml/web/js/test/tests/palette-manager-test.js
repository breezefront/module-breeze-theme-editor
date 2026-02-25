/**
 * PaletteManager Tests
 *
 * Covers the isColorModified / getModifiedCount logic.
 *
 * Core invariant: "Modified" reflects whether the SAVED (DB) value differs
 * from the theme default — NOT whether the current unsaved in-memory value
 * differs from the default. This prevents the "Modified" badge appearing
 * for unsaved changes when the saved value is still at the theme default.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager'
], function (TestFramework, PaletteManager) {
    'use strict';

    /**
     * Build a minimal palette config object accepted by PaletteManager.init().
     *
     * @param {Array} colors - Array of { property, value, default } objects
     * @returns {Object}
     */
    function makeConfig(colors) {
        return {
            storeId: 1,
            themeId: 1,
            palettes: [{
                id: 'test',
                label: 'Test Palette',
                groups: [{
                    id: 'brand',
                    label: 'Brand',
                    colors: colors.map(function (c) {
                        return {
                            id: c.property,
                            label: c.property,
                            property: c.property,
                            value: c.value,
                            default: c.default,
                            usageCount: 0
                        };
                    })
                }]
            }]
        };
    }

    return TestFramework.suite('PaletteManager.isColorModified', {

        // ─── isColorModified: edge cases ─────────────────────────────────────

        'unknown property returns false': function () {
            var m = Object.create(PaletteManager);
            m.palettes = {};
            m.dirtyColors = {};

            this.assertFalse(m.isColorModified('--nonexistent'),
                'Unknown property should return false');
        },

        'color without default returns false': function () {
            var m = Object.create(PaletteManager);
            m.palettes = { '--c': { value: '#111111' } }; // no .default
            m.dirtyColors = {};

            this.assertFalse(m.isColorModified('--c'),
                'Missing default should return false');
        },

        // ─── isColorModified: not-dirty branch ───────────────────────────────

        'not dirty, value equals default: returns false': function () {
            var m = Object.create(PaletteManager);
            m.palettes = { '--c': { value: '#000000', default: '#000000' } };
            m.dirtyColors = {};

            this.assertFalse(m.isColorModified('--c'),
                'Saved value equal to default should not be modified');
        },

        'not dirty, value differs from default: returns true': function () {
            var m = Object.create(PaletteManager);
            m.palettes = { '--c': { value: '#111111', default: '#000000' } };
            m.dirtyColors = {};

            this.assertTrue(m.isColorModified('--c'),
                'Saved value different from default should be modified');
        },

        // ─── isColorModified: dirty branch (the bug scenario) ────────────────

        /**
         * THE BUG SCENARIO:
         * default=#000, saved=#000, user changed to #222 (unsaved).
         * Before fix: compared color.value (#222) vs default (#000) → true (wrong).
         * After fix:  compared original.value (#000) vs default (#000) → false (correct).
         */
        'dirty, original equals default: returns false': function () {
            var m = Object.create(PaletteManager);
            m.palettes = { '--c': { value: '#222222', default: '#000000' } };
            m.dirtyColors = {
                '--c': {
                    original: { hex: '#000000', value: '#000000' },
                    hex: '#222222',
                    value: '#222222'
                }
            };

            this.assertFalse(m.isColorModified('--c'),
                'Unsaved change from default should NOT show Modified badge');
        },

        /**
         * TWO-BADGES SCENARIO:
         * default=#000, saved=#111, user changed to #222 (unsaved).
         * Both Changed and Modified badges should appear.
         */
        'dirty, original differs from default: returns true': function () {
            var m = Object.create(PaletteManager);
            m.palettes = { '--c': { value: '#222222', default: '#000000' } };
            m.dirtyColors = {
                '--c': {
                    original: { hex: '#111111', value: '#111111' },
                    hex: '#222222',
                    value: '#222222'
                }
            };

            this.assertTrue(m.isColorModified('--c'),
                'Unsaved change on top of a saved customization should show Modified badge');
        },

        /**
         * User changed the color back to the theme default without saving.
         * saved=#111 (≠ default #000) → Modified must still show because DB still holds #111.
         */
        'dirty, changed back to default: still returns true': function () {
            var m = Object.create(PaletteManager);
            m.palettes = { '--c': { value: '#000000', default: '#000000' } };
            m.dirtyColors = {
                '--c': {
                    original: { hex: '#111111', value: '#111111' },
                    hex: '#000000',
                    value: '#000000'
                }
            };

            this.assertTrue(m.isColorModified('--c'),
                'DB still has non-default value — Modified should remain until save');
        },

        // ─── getModifiedCount ─────────────────────────────────────────────────

        'getModifiedCount counts only saved-vs-default, ignoring unsaved changes': function () {
            var m = Object.create(PaletteManager);

            // --a: saved=#000 = default, user changed to #111 → NOT modified
            // --b: saved=#111 ≠ default=#000, user changed to #222 → modified
            // --c: saved=#333 ≠ default=#000, not dirty → modified
            m.palettes = {
                '--a': { value: '#111111', default: '#000000' },
                '--b': { value: '#222222', default: '#000000' },
                '--c': { value: '#333333', default: '#000000' }
            };
            m.dirtyColors = {
                '--a': {
                    original: { hex: '#000000', value: '#000000' },
                    hex: '#111111', value: '#111111'
                },
                '--b': {
                    original: { hex: '#111111', value: '#111111' },
                    hex: '#222222', value: '#222222'
                }
                // --c is not dirty
            };

            this.assertEquals(m.getModifiedCount(), 2,
                'Only --b (dirty, original≠default) and --c (not dirty, value≠default) count');
        },

        // ─── full flow via init() + updateColor() ────────────────────────────

        /**
         * Integration: color starts at default → user changes → only Changed shows.
         */
        'updateColor from default: Changed=1, Modified=0': function () {
            var m = Object.create(PaletteManager);
            m.init(makeConfig([
                { property: '--c', value: '#000000', default: '#000000' }
            ]));

            this.assertEquals(m.getDirtyCount(), 0, 'No dirty changes initially');
            this.assertEquals(m.getModifiedCount(), 0, 'Not modified initially');

            m.updateColor('--c', '#222222');

            this.assertEquals(m.getDirtyCount(), 1, 'Changed badge should appear');
            this.assertEquals(m.getModifiedCount(), 0,
                'Modified badge must NOT appear for an unsaved change from default');
        },

        /**
         * Integration: color already saved as non-default → user changes further
         * → both Changed and Modified should show.
         */
        'updateColor from non-default: Changed=1, Modified=1': function () {
            var m = Object.create(PaletteManager);
            m.init(makeConfig([
                { property: '--c', value: '#111111', default: '#000000' }
            ]));

            this.assertEquals(m.getDirtyCount(), 0, 'No dirty changes initially');
            this.assertEquals(m.getModifiedCount(), 1, 'Modified should show on load (saved≠default)');

            m.updateColor('--c', '#222222');

            this.assertEquals(m.getDirtyCount(), 1, 'Changed badge should appear');
            this.assertEquals(m.getModifiedCount(), 1,
                'Modified badge must remain — saved value is still #111 ≠ default');
        },

        /**
         * Integration: after markAsSaved(), dirtyColors is cleared and Modified
         * is re-evaluated against the now-saved value.
         */
        'after markAsSaved: Changed clears, Modified reflects new saved value': function () {
            var m = Object.create(PaletteManager);
            m.init(makeConfig([
                { property: '--c', value: '#000000', default: '#000000' }
            ]));

            m.updateColor('--c', '#222222');
            this.assertEquals(m.getDirtyCount(), 1, 'Changed before save');
            this.assertEquals(m.getModifiedCount(), 0, 'Not modified before save');

            m.markAsSaved();

            this.assertEquals(m.getDirtyCount(), 0, 'Changed clears after save');
            this.assertEquals(m.getModifiedCount(), 1,
                'Modified appears after saving non-default value');
        }
    });
});
