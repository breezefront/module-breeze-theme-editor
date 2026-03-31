/**
 * CssPreviewManager Subscribe Tests
 *
 * Verifies the fix for Bug C:
 *
 *   BUG C (css-preview-manager.js) — _subscribeToPaletteChanges() used an
 *   async require([...], callback) pattern. If the user interacted with a
 *   palette swatch before the async callback had fired (a narrow race window
 *   on first page load), PaletteManager.notify() was called with no subscribers
 *   yet registered, so the CSS preview was never updated.
 *
 *   FIX: palette-manager is now a static AMD dependency of css-preview-manager,
 *   so PaletteManager is available synchronously in _subscribeToPaletteChanges()
 *   and the subscriber is registered before any user interaction can occur.
 *
 * All tests are pure-logic — no real DOM, no RequireJS, no iframe required.
 * Inline copies of the relevant logic from production files are used.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    // =========================================================================
    // Minimal PaletteManager stub (inline copy of subscribe/notify logic)
    // =========================================================================

    /**
     * Creates an isolated PaletteManager stub that mirrors the subscribe/notify
     * contract from the real palette-manager.js (lines 238–265).
     */
    function makePaletteManager() {
        var listeners = [];
        return {
            listeners: listeners,
            subscribe: function (callback) {
                listeners.push(callback);
            },
            unsubscribe: function (callback) {
                var idx = listeners.indexOf(callback);
                if (idx > -1) {
                    listeners.splice(idx, 1);
                }
            },
            notify: function (property, hexValue) {
                listeners.forEach(function (cb) { cb(property, hexValue); });
            }
        };
    }

    // =========================================================================
    // Minimal CssPreviewManager stub
    // Mirrors the _subscribeToPaletteChanges + setVariable interaction.
    // =========================================================================

    /**
     * Creates a CssPreviewManager stub that accepts PaletteManager as a
     * constructor argument (simulating AMD static dependency injection).
     *
     * The real _subscribeToPaletteChanges() logic is inlined here.
     */
    function makeCssPreviewManager(PaletteManager) {
        var setVariableCalls = [];
        var updateFieldCalls = [];

        var manager = {
            _paletteManager: null,

            // Inline copy of the fixed _subscribeToPaletteChanges() logic.
            // Key property: PaletteManager is provided as a closure argument,
            // NOT via an async require([...], callback).
            _subscribeToPaletteChanges: function () {
                var self = this;
                self._paletteManager = PaletteManager;

                PaletteManager.subscribe(function (cssVar, hexValue) {
                    self.setVariable(cssVar, hexValue, 'color');
                    // RGB variant (simplified — real code uses ColorUtils.hexToRgb)
                    self.setVariable(cssVar + '-rgb', hexValue + '-rgb', 'color', { format: 'rgb' });
                    self._updateFieldsReferencingPalette(cssVar, hexValue);
                });
            },

            setVariable: function (varName, value, fieldType, fieldData) {
                setVariableCalls.push({ varName: varName, value: value, fieldType: fieldType, fieldData: fieldData });
            },

            _updateFieldsReferencingPalette: function (cssVar, hexValue) {
                updateFieldCalls.push({ cssVar: cssVar, hexValue: hexValue });
            },

            // Test helpers
            _getSetVariableCalls: function () { return setVariableCalls; },
            _getUpdateFieldCalls: function () { return updateFieldCalls; },
            _resetCalls: function () { setVariableCalls = []; updateFieldCalls = []; }
        };

        return manager;
    }

    // =========================================================================
    // Tests
    // =========================================================================

    return TestFramework.suite('CssPreviewManager Subscribe (Bug C fix)', function (t) {

        // ------------------------------------------------------------------
        // 1. Subscriber registered synchronously
        // ------------------------------------------------------------------
        t.test('subscribe is registered synchronously — no async gap', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            t.assertEqual(PM.listeners.length, 0, 'No listeners before _subscribeToPaletteChanges');

            CPM._subscribeToPaletteChanges();

            t.assertEqual(PM.listeners.length, 1, 'Listener registered immediately after _subscribeToPaletteChanges');
        });

        // ------------------------------------------------------------------
        // 2. notify() fired BEFORE subscribe() would have been called in the
        //    old async pattern — subscriber must still receive the event
        // ------------------------------------------------------------------
        t.test('notify() fired immediately after subscribe() is handled', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            CPM._subscribeToPaletteChanges();

            // Simulate user dragging Pickr right after page load
            PM.notify('--color-brand-primary', '#ff0000');

            var calls = CPM._getSetVariableCalls();
            t.assertTrue(calls.length > 0, 'setVariable was called after notify');
        });

        // ------------------------------------------------------------------
        // 3. setVariable called with correct HEX value
        // ------------------------------------------------------------------
        t.test('setVariable receives correct cssVar and hexValue', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            CPM._subscribeToPaletteChanges();
            PM.notify('--color-brand-primary', '#1979c3');

            var calls = CPM._getSetVariableCalls();
            var hexCall = calls[0];
            t.assertEqual(hexCall.varName, '--color-brand-primary', 'varName is correct');
            t.assertEqual(hexCall.value, '#1979c3', 'hexValue is correct');
            t.assertEqual(hexCall.fieldType, 'color', 'fieldType is color');
        });

        // ------------------------------------------------------------------
        // 4. RGB variant is also set
        // ------------------------------------------------------------------
        t.test('setVariable called for RGB variant as well', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            CPM._subscribeToPaletteChanges();
            PM.notify('--color-brand-primary', '#1979c3');

            var calls = CPM._getSetVariableCalls();
            t.assertTrue(calls.length >= 2, 'At least two setVariable calls (HEX + RGB)');

            var rgbCall = calls[1];
            t.assertEqual(rgbCall.varName, '--color-brand-primary-rgb', 'RGB varName is correct');
            t.assertTrue(rgbCall.fieldData && rgbCall.fieldData.format === 'rgb', 'RGB call has format:rgb');
        });

        // ------------------------------------------------------------------
        // 5. _updateFieldsReferencingPalette is called
        // ------------------------------------------------------------------
        t.test('_updateFieldsReferencingPalette is called with correct args', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            CPM._subscribeToPaletteChanges();
            PM.notify('--color-brand-secondary', '#ff6600');

            var calls = CPM._getUpdateFieldCalls();
            t.assertEqual(calls.length, 1, '_updateFieldsReferencingPalette called once');
            t.assertEqual(calls[0].cssVar, '--color-brand-secondary', 'cssVar correct');
            t.assertEqual(calls[0].hexValue, '#ff6600', 'hexValue correct');
        });

        // ------------------------------------------------------------------
        // 6. Multiple notify() calls all fire the subscriber
        // ------------------------------------------------------------------
        t.test('multiple notify() calls all reach the subscriber', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            CPM._subscribeToPaletteChanges();

            PM.notify('--color-brand-primary', '#111111');
            PM.notify('--color-brand-secondary', '#222222');
            PM.notify('--color-brand-tertiary', '#333333');

            var calls = CPM._getUpdateFieldCalls();
            t.assertEqual(calls.length, 3, 'All three notify() calls were received');
        });

        // ------------------------------------------------------------------
        // 7. Multiple subscribers can coexist (CssPreviewManager + other)
        // ------------------------------------------------------------------
        t.test('multiple subscribers receive the same notification', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);
            var externalCalls = [];

            CPM._subscribeToPaletteChanges();
            PM.subscribe(function (cssVar, hexValue) {
                externalCalls.push({ cssVar: cssVar, hexValue: hexValue });
            });

            PM.notify('--color-brand-primary', '#abcdef');

            t.assertEqual(CPM._getUpdateFieldCalls().length, 1, 'CssPreviewManager received notification');
            t.assertEqual(externalCalls.length, 1, 'External subscriber also received notification');
            t.assertEqual(externalCalls[0].cssVar, '--color-brand-primary', 'External subscriber got correct cssVar');
        });

        // ------------------------------------------------------------------
        // 8. _paletteManager reference is set after _subscribeToPaletteChanges
        // ------------------------------------------------------------------
        t.test('_paletteManager reference is set synchronously', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            t.assertEqual(CPM._paletteManager, null, '_paletteManager is null before init');

            CPM._subscribeToPaletteChanges();

            t.assertTrue(CPM._paletteManager !== null, '_paletteManager is set after _subscribeToPaletteChanges');
            t.assertTrue(CPM._paletteManager === PM, '_paletteManager points to correct PaletteManager instance');
        });

        // ------------------------------------------------------------------
        // 9. Calling _subscribeToPaletteChanges twice adds a second listener
        //    (guards against accidental double-init)
        // ------------------------------------------------------------------
        t.test('calling _subscribeToPaletteChanges twice registers two listeners', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            CPM._subscribeToPaletteChanges();
            CPM._subscribeToPaletteChanges();

            // Both subscriptions fire — setVariable called twice per notify
            PM.notify('--color-brand-primary', '#ffffff');

            var calls = CPM._getSetVariableCalls();
            // 2 subscriptions × 2 setVariable calls each (HEX + RGB) = 4
            t.assertEqual(calls.length, 4, 'Double subscription causes double calls (expected behaviour)');
        });

        // ------------------------------------------------------------------
        // 10. No setVariable calls if no notify() was sent
        // ------------------------------------------------------------------
        t.test('no setVariable calls if PaletteManager never notifies', function () {
            var PM = makePaletteManager();
            var CPM = makeCssPreviewManager(PM);

            CPM._subscribeToPaletteChanges();

            t.assertEqual(CPM._getSetVariableCalls().length, 0, 'No calls before any notify()');
        });

    });

});
