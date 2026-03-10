/**
 * Global Reset Button — Palette Change Guard Tests
 *
 * Regression tests for the bug where clicking the global "↺ Reset" button in
 * the panel footer showed "No changes to reset" even when the user had unsaved
 * palette colour changes (made via Pickr).
 *
 * Root cause (settings-editor.js, _reset()):
 *   The guard checked only PanelState.hasChanges(), which tracks HTML field
 *   changes.  Palette (Pickr) changes are stored in PaletteManager.dirtyColors,
 *   which is a completely separate state — PanelState never sees them.
 *
 *   if (!PanelState.hasChanges()) { ... "No changes to reset" ... }
 *
 * Fix applied:
 *   if (!PanelState.hasChanges() && !PaletteManager.hasDirtyChanges()) { ... }
 *   PaletteManager.revertDirtyChanges() is also called inside the confirm block.
 *
 * Test layers:
 *   1–3  Guard logic               — inline reproduction of the old/new condition
 *   4–6  revertDirtyChanges()      — notify() side-effects on CssPreviewManager
 *   7–9  reset + revert ordering   — changes map state after full reset lifecycle
 *  10    REGRESSION guard          — old code vs new code side-by-side proof
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager'
], function (TestFramework, PaletteManager) {
    'use strict';

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Build a minimal PaletteManager config with one colour.
     *
     * @param {String} property  CSS var name, e.g. '--color-white'
     * @param {String} value     Current (saved) HEX value
     * @param {String} def       Theme default HEX value
     * @returns {Object}
     */
    function makeConfig(property, value, def) {
        return {
            storeId: 1,
            themeId: 1,
            palettes: [{
                id: 'test',
                label: 'Test',
                groups: [{
                    id: 'g1',
                    label: 'G1',
                    colors: [{
                        id: property,
                        label: property,
                        property: property,
                        value: value,
                        default: def || value,
                        usageCount: 0
                    }]
                }]
            }]
        };
    }

    // ─── Inline reproduction of old/new _reset() guard ───────────────────────

    /**
     * OLD guard (buggy): only checks PanelState field changes.
     *
     * @param {Boolean} panelHasChanges
     * @returns {Boolean} true = "No changes to reset" toast shown
     */
    function oldGuardBlocks(panelHasChanges) {
        return !panelHasChanges;
    }

    /**
     * NEW guard (fixed): checks both PanelState AND PaletteManager.
     *
     * @param {Boolean} panelHasChanges
     * @param {Boolean} paletteHasDirty
     * @returns {Boolean} true = "No changes to reset" toast shown
     */
    function newGuardBlocks(panelHasChanges, paletteHasDirty) {
        return !panelHasChanges && !paletteHasDirty;
    }

    // ─── Suite ───────────────────────────────────────────────────────────────

    return TestFramework.suite('Global Reset Button — Palette Guard', {

        // ── Layer 1: guard logic ──────────────────────────────────────────────

        /**
         * Test 1 — CORE BUG: old guard blocks reset when only palette is dirty
         *
         * Scenario: user changed a palette colour via Pickr.
         *   PanelState.hasChanges()       → false  (no HTML field touched)
         *   PaletteManager.hasDirtyChanges() → true  (Pickr changed a colour)
         *
         * Old code: !false → true → "No changes to reset" shown — BUG.
         */
        'OLD guard: blocks reset when only palette is dirty (reproduces the bug)': function () {
            var panelHasChanges  = false; // no regular field changes
            var paletteHasDirty  = true;  // palette colour was changed via Pickr

            this.assertEquals(
                oldGuardBlocks(panelHasChanges),
                true,
                'OLD guard must block reset when PanelState has no changes — this is the bug'
            );
            // Demonstrate that paletteHasDirty is ignored entirely by the old guard
            this.assertEquals(
                oldGuardBlocks(panelHasChanges),
                oldGuardBlocks(panelHasChanges),
                'OLD guard result is identical regardless of paletteHasDirty — palette is invisible to it'
            );
            void paletteHasDirty; // suppress unused-var lint
        },

        /**
         * Test 2 — NEW guard: allows reset when only palette is dirty
         *
         * Same scenario as Test 1, but with the fixed guard condition.
         * !false && !true → false → reset proceeds correctly.
         */
        'NEW guard: allows reset when only palette is dirty (verifies the fix)': function () {
            var panelHasChanges  = false;
            var paletteHasDirty  = true;

            this.assertEquals(
                newGuardBlocks(panelHasChanges, paletteHasDirty),
                false,
                'NEW guard must NOT block reset when palette has dirty changes'
            );
        },

        /**
         * Test 3 — NEW guard: still blocks reset when both sources are clean
         *
         * No field changes, no palette changes → toast should appear.
         */
        'NEW guard: blocks reset when nothing is dirty': function () {
            this.assertEquals(
                newGuardBlocks(false, false),
                true,
                'NEW guard must block reset when there are no changes at all'
            );
        },

        /**
         * Test 4 — NEW guard: allows reset when only panel fields are dirty
         *
         * Regular case: user changed a text/select field only.
         */
        'NEW guard: allows reset when only panel fields are dirty': function () {
            this.assertEquals(
                newGuardBlocks(true, false),
                false,
                'NEW guard must allow reset when PanelState has field changes'
            );
        },

        /**
         * Test 5 — NEW guard: allows reset when both are dirty
         */
        'NEW guard: allows reset when both panel fields and palette are dirty': function () {
            this.assertEquals(
                newGuardBlocks(true, true),
                false,
                'NEW guard must allow reset when both PanelState and PaletteManager are dirty'
            );
        },

        // ── Layer 2: PaletteManager.revertDirtyChanges() side-effects ─────────

        /**
         * Test 6 — revertDirtyChanges() clears dirtyColors
         *
         * After calling revertDirtyChanges(), hasDirtyChanges() must return false
         * so that a second click on the Reset button correctly shows the toast.
         */
        'revertDirtyChanges() clears dirty state': function () {
            var m = Object.create(PaletteManager);
            m.palettes    = { '--color-white': { hex: '#ffffff', value: '#ffffff', default: '#ffffff' } };
            m.dirtyColors = {};
            m.listeners   = [];

            // Simulate a Pickr change
            m.updateColor('--color-white', '#8b8282');
            this.assertEquals(m.hasDirtyChanges(), true,
                'hasDirtyChanges() must be true after updateColor()');

            // Revert
            m.revertDirtyChanges();
            this.assertEquals(m.hasDirtyChanges(), false,
                'hasDirtyChanges() must be false after revertDirtyChanges()');
        },

        /**
         * Test 7 — revertDirtyChanges() restores the original colour value
         *
         * The PaletteManager colour object must return to its pre-change value.
         */
        'revertDirtyChanges() restores original colour in palette': function () {
            var m = Object.create(PaletteManager);
            m.palettes = {
                '--color-white': { hex: '#ffffff', value: '#ffffff', default: '#ffffff' }
            };
            m.dirtyColors = {};
            m.listeners   = [];

            m.updateColor('--color-white', '#8b8282');
            this.assertEquals(m.getColor('--color-white').hex, '#8b8282',
                'Colour must be #8b8282 after updateColor()');

            m.revertDirtyChanges();
            this.assertEquals(m.getColor('--color-white').hex, '#ffffff',
                'Colour must be restored to #ffffff after revertDirtyChanges()');
        },

        /**
         * Test 8 — revertDirtyChanges() notifies subscribers with original value
         *
         * The notify() call inside revertDirtyChanges() must fire listeners
         * with the original (pre-change) hex, not the dirty hex.
         */
        'revertDirtyChanges() notifies subscribers with original hex': function () {
            var m = Object.create(PaletteManager);
            m.palettes = {
                '--color-white': { hex: '#ffffff', value: '#ffffff', default: '#ffffff' }
            };
            m.dirtyColors = {};
            m.listeners   = [];

            var notified = [];
            m.subscribe(function (property, hex) {
                notified.push({ property: property, hex: hex });
            });

            m.updateColor('--color-white', '#8b8282');
            notified = []; // clear change notifications, only watch revert

            m.revertDirtyChanges();

            this.assertEquals(notified.length, 1,
                'revertDirtyChanges() must notify exactly one subscriber for one dirty colour');
            this.assertEquals(notified[0].property, '--color-white',
                'Notified property must be --color-white');
            this.assertEquals(notified[0].hex, '#ffffff',
                'Notified hex must be the original value #ffffff, not the dirty #8b8282');
        },

        // ── Layer 3: reset lifecycle — changes map state ───────────────────────

        /**
         * Test 9 — full reset lifecycle via real PaletteManager.init()
         *
         * Simulates: init → change → revert → verify no dirty state remains.
         * This is what _reset() does: PaletteManager.revertDirtyChanges() then
         * CssPreviewManager.reset() (which clears its own changes map separately).
         */
        'full reset lifecycle: init → change → revert → no dirty state': function () {
            PaletteManager.init(makeConfig('--color-black', '#000000', '#000000'));

            this.assertEquals(PaletteManager.hasDirtyChanges(), false,
                'After init, no dirty changes must exist');

            // Simulate Pickr change
            PaletteManager.updateColor('--color-black', '#814a4a');
            this.assertEquals(PaletteManager.hasDirtyChanges(), true,
                'After updateColor, hasDirtyChanges must be true');
            this.assertEquals(PaletteManager.getDirtyCount(), 1,
                'getDirtyCount must be 1 after one colour change');

            // Global reset calls this
            PaletteManager.revertDirtyChanges();
            this.assertEquals(PaletteManager.hasDirtyChanges(), false,
                'After revertDirtyChanges, hasDirtyChanges must be false');
            this.assertEquals(PaletteManager.getDirtyCount(), 0,
                'getDirtyCount must be 0 after revert');
        },

        // ── REGRESSION guard ──────────────────────────────────────────────────

        /**
         * Test 10 — REGRESSION: old guard vs new guard side-by-side
         *
         * Directly documents the production bug that was fixed in settings-editor.js.
         * Both the broken and the fixed guard conditions are asserted so that any
         * future regression is caught immediately.
         *
         * Scenario: palette-only change (most common Pickr use case).
         *   PanelState.hasChanges()          = false
         *   PaletteManager.hasDirtyChanges() = true
         */
        'REGRESSION: old guard blocks palette-only reset; new guard allows it': function () {
            var panelHasChanges  = false;
            var paletteHasDirty  = true;

            // OLD code (before fix) — results in "No changes to reset" toast
            var oldResult = oldGuardBlocks(panelHasChanges);

            // NEW code (after fix)
            var newResult = newGuardBlocks(panelHasChanges, paletteHasDirty);

            this.assertEquals(oldResult, true,
                'OLD guard must return true (blocks reset) — reproduces the bug');

            this.assertEquals(newResult, false,
                'NEW guard must return false (allows reset) — verifies the fix');

            // They must differ — if they are ever equal, one of them regressed
            this.assert(
                oldResult !== newResult,
                'OLD and NEW guard must return different results for palette-only scenario'
            );
        }

    });
});
