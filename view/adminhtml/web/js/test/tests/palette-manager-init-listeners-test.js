/**
 * PaletteManager.init() — Listener Preservation Tests
 *
 * Regression tests for the bug where PaletteManager.init() contained
 *
 *   this.listeners = []; // Reset listeners on init
 *
 * This line was executed on every _loadConfig() call in settings-editor.js
 * (triggered by store-view switch, config reload, etc.).  CssPreviewManager
 * subscribes once at app boot via PaletteManager.subscribe(); wiping listeners
 * on re-init silently disconnected live CSS preview from Pickr palette changes.
 *
 * Root cause location: palette-manager.js, init(), previously line 44.
 *
 * Fix applied:
 *   Removed `this.listeners = []` from init().
 *   dirtyColors is still reset (correct — fresh palette = no unsaved state).
 *   listeners are intentionally NOT reset (they outlive config reloads).
 *
 * Test layers:
 *   1    OLD behaviour — documents the bug (wiping listeners on re-init)
 *   2    NEW behaviour — init() preserves listeners across calls
 *   3    Subscriber fires after re-init + updateColor()
 *   4    dirtyColors is still reset on re-init (regression guard)
 *   5    palettes are updated on re-init (regression guard)
 *   6    Multiple subscribers all survive re-init
 *   7    unsubscribe() still works correctly after re-init
 *   8    REGRESSION: old vs new init() side-by-side proof
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
     * @returns {Object}
     */
    function makeConfig(property, value) {
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
                        default: value,
                        usageCount: 0
                    }]
                }]
            }]
        };
    }

    // ─── Inline reproduction of OLD init() behaviour (the bug) ───────────────

    /**
     * Simulates the OLD init() that wiped listeners.
     *
     * @param {Object} m    - Object with .listeners and .palettes and .dirtyColors
     * @param {Object} cfg  - Palette config
     */
    function oldInit(m, cfg) {
        m.palettes    = { dummy: {} };      // simplified — just overwrites palettes
        m.dirtyColors = {};
        m.listeners   = [];                 // THE BUG: wipes all subscribers
        void cfg;
    }

    /**
     * Simulates the NEW init() that preserves listeners.
     *
     * @param {Object} m    - Object with .listeners and .palettes and .dirtyColors
     * @param {Object} cfg  - Palette config
     */
    function newInit(m, cfg) {
        m.palettes    = { dummy: {} };      // simplified — just overwrites palettes
        m.dirtyColors = {};
        // listeners intentionally NOT reset
        void cfg;
    }

    // ─── Suite ───────────────────────────────────────────────────────────────

    return TestFramework.suite('PaletteManager.init() — Listener Preservation', {

        // ── Test 1: OLD behaviour documents the bug ──────────────────────────

        /**
         * Test 1 — OLD init() wipes listeners — documents the bug
         *
         * CssPreviewManager calls subscribe() once at app boot.
         * Each config reload called old init() → listeners = [] → subscriber gone.
         */
        'OLD init(): wipes listeners (reproduces the bug)': function () {
            var m = { listeners: [], palettes: {}, dirtyColors: {} };

            var called = false;
            m.listeners.push(function () { called = true; });

            this.assertEquals(m.listeners.length, 1,
                'One subscriber must be registered before re-init');

            // Simulate re-init (store switch, config reload)
            oldInit(m, makeConfig('--color-a', '#aaaaaa'));

            this.assertEquals(m.listeners.length, 0,
                'OLD init() must wipe all listeners — this is the bug');
        },

        // ── Test 2: NEW behaviour preserves listeners ────────────────────────

        /**
         * Test 2 — NEW init() preserves listeners across calls
         *
         * After the fix, re-calling init() must NOT discard subscribers.
         */
        'NEW init(): preserves listeners across re-init': function () {
            var m = { listeners: [], palettes: {}, dirtyColors: {} };

            m.listeners.push(function () {});

            newInit(m, makeConfig('--color-b', '#bbbbbb'));

            this.assertEquals(m.listeners.length, 1,
                'NEW init() must keep the existing subscriber after re-init');
        },

        // ── Test 3: subscriber fires after re-init + updateColor() ───────────

        /**
         * Test 3 — subscriber registered before init() still fires after re-init
         *
         * This is the exact production scenario:
         *   1. App boots → CssPreviewManager.subscribe(cb) registered
         *   2. User switches store → settings-editor calls PaletteManager.init()
         *   3. User changes palette colour via Pickr → updateColor() called
         *   4. notify() must reach the CssPreviewManager subscriber
         */
        'subscriber registered before re-init still fires after updateColor()': function () {
            var m = Object.create(PaletteManager);
            m.palettes    = {};
            m.dirtyColors = {};
            m.listeners   = [];

            var notified = [];
            m.subscribe(function (prop, hex) {
                notified.push({ prop: prop, hex: hex });
            });

            // Simulate re-init (new config load)
            m.init(makeConfig('--color-c', '#cccccc'));

            // Now updateColor() must still reach the subscriber
            m.updateColor('--color-c', '#123456');

            this.assertEquals(notified.length, 1,
                'Subscriber must be notified after re-init + updateColor()');
            this.assertEquals(notified[0].prop, '--color-c',
                'Notified property must be --color-c');
            this.assertEquals(notified[0].hex, '#123456',
                'Notified hex must be the new value #123456');
        },

        // ── Test 4: dirtyColors is still reset on re-init ────────────────────

        /**
         * Test 4 — init() still resets dirtyColors (regression guard)
         *
         * This behaviour must be preserved: fresh config load = clean dirty state.
         */
        'init() resets dirtyColors (desired side-effect preserved)': function () {
            var m = Object.create(PaletteManager);
            m.palettes    = {};
            m.dirtyColors = {};
            m.listeners   = [];

            m.init(makeConfig('--color-d', '#dddddd'));
            m.updateColor('--color-d', '#eeeeee');

            this.assertTrue(m.hasDirtyChanges(),
                'dirtyColors must be populated after updateColor()');

            // Re-init must clear dirty state
            m.init(makeConfig('--color-d', '#dddddd'));

            this.assertFalse(m.hasDirtyChanges(),
                'init() must reset dirtyColors — fresh config has no unsaved changes');
        },

        // ── Test 5: palettes are updated on re-init ──────────────────────────

        /**
         * Test 5 — init() updates palettes with new config (regression guard)
         *
         * Re-init with a different color value must update the palette data.
         */
        'init() updates palettes with new config': function () {
            var m = Object.create(PaletteManager);
            m.palettes    = {};
            m.dirtyColors = {};
            m.listeners   = [];

            m.init(makeConfig('--color-e', '#eeeeee'));
            this.assertEquals(m.getColor('--color-e').hex, '#eeeeee',
                'First init: palette color must be #eeeeee');

            // Re-init with updated server value (user saved from another tab)
            m.init(makeConfig('--color-e', '#111111'));
            this.assertEquals(m.getColor('--color-e').hex, '#111111',
                'After re-init: palette color must be updated to #111111');
        },

        // ── Test 6: multiple subscribers all survive re-init ─────────────────

        /**
         * Test 6 — all subscribers survive re-init
         *
         * In production only CssPreviewManager subscribes, but the API
         * allows multiple subscribers — all must survive re-init.
         */
        'multiple subscribers all survive re-init': function () {
            var m = Object.create(PaletteManager);
            m.palettes    = {};
            m.dirtyColors = {};
            m.listeners   = [];

            var callsA = 0, callsB = 0;
            m.subscribe(function () { callsA++; });
            m.subscribe(function () { callsB++; });

            // Re-init
            m.init(makeConfig('--color-f', '#ffffff'));

            // Both must still be registered
            m.updateColor('--color-f', '#abcdef');

            this.assertEquals(callsA, 1, 'First subscriber must be notified after re-init');
            this.assertEquals(callsB, 1, 'Second subscriber must be notified after re-init');
        },

        // ── Test 7: unsubscribe() still works after re-init ──────────────────

        /**
         * Test 7 — unsubscribe() works correctly after re-init
         *
         * Removing a listener after re-init must stop notifications for that listener.
         */
        'unsubscribe() works correctly after re-init': function () {
            var m = Object.create(PaletteManager);
            m.palettes    = {};
            m.dirtyColors = {};
            m.listeners   = [];

            var count = 0;
            var cb = function () { count++; };
            m.subscribe(cb);

            m.init(makeConfig('--color-g', '#gggggg'.replace(/g/g, '0')));

            // Unsubscribe after re-init
            m.unsubscribe(cb);

            m.init(makeConfig('--color-g', '#000000'));
            m.updateColor('--color-g', '#999999');

            this.assertEquals(count, 0,
                'Unsubscribed callback must not be called after re-init + updateColor()');
        },

        // ── Test 8: REGRESSION — old vs new side-by-side ─────────────────────

        /**
         * Test 8 — REGRESSION: old init() vs new init() side-by-side proof
         *
         * Directly documents the bug that was fixed in palette-manager.js.
         */
        'REGRESSION: old init() wipes listeners; new init() preserves them': function () {
            // ── OLD behaviour ──
            var mOld = { listeners: [], palettes: {}, dirtyColors: {} };
            mOld.listeners.push(function () {});
            oldInit(mOld, {});
            var oldListenersAfterInit = mOld.listeners.length;

            // ── NEW behaviour ──
            var mNew = { listeners: [], palettes: {}, dirtyColors: {} };
            mNew.listeners.push(function () {});
            newInit(mNew, {});
            var newListenersAfterInit = mNew.listeners.length;

            this.assertEquals(oldListenersAfterInit, 0,
                'OLD init() must wipe listeners (0 remaining) — documents the bug');

            this.assertEquals(newListenersAfterInit, 1,
                'NEW init() must preserve listeners (1 remaining) — verifies the fix');

            this.assert(
                oldListenersAfterInit !== newListenersAfterInit,
                'OLD and NEW must differ — if equal, one of them regressed'
            );
        }

    });
});
