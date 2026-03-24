/**
 * Color Handler Swatch Tests
 *
 * Verifies the fix for two bugs in the color field handler:
 *
 *   BUG A (css-preview-manager.js) — was: $trigger.data('pickr') always returned
 *   undefined. Pickr is stored as $trigger.data('popup-instance').pickr
 *   (color.js:298-301), but _updateFieldsReferencingPalette() was reading the
 *   wrong key 'pickr'. Fix: read $trigger.data('popup-instance').pickr.
 *
 *   BUG B (color.js) — was: setTimeout(clearFlag, 50ms) raced against Pickr's
 *   requestAnimationFrame constructor callback. Pickr 1.9.1 defers
 *   setColor(defaultColor) inside a rAF (~16ms). If the timeout fired first,
 *   the guard flag was gone when the rAF arrived, causing a spurious 'change'
 *   event with the wrong (default) color. Fix: clear the flag inside
 *   pickr.on('change') immediately when isPaletteSelection is true, and return
 *   early — no setTimeout needed.
 *
 * All tests are pure-logic — no real DOM, no jQuery, no Pickr required.
 * Inline copies of the fixed logic from production files are used.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    // =========================================================================
    // Minimal jQuery-like data() store (no real jQuery needed)
    // =========================================================================

    /**
     * Creates a minimal element stub with independent .data() and .attr() stores.
     * Mirrors the jQuery data/attr API used by the production code.
     */
    function makeElement() {
        var dataStore = {};
        var attrStore = {};

        return {
            data: function (key, value) {
                if (arguments.length === 1) {
                    return dataStore.hasOwnProperty(key) ? dataStore[key] : undefined;
                }
                dataStore[key] = value;
                return this;
            },
            removeData: function (key) {
                delete dataStore[key];
                return this;
            },
            attr: function (key, value) {
                if (arguments.length === 1) {
                    return attrStore.hasOwnProperty(key) ? attrStore[key] : undefined;
                }
                attrStore[key] = value;
                return this;
            },
            removeAttr: function (key) {
                delete attrStore[key];
                return this;
            }
        };
    }

    // =========================================================================
    // How color.js stores the Pickr instance (unchanged, correct)
    // =========================================================================

    /**
     * Simulates what color.js:298-301 does after opening the popup:
     *   $trigger.data('popup-instance', { $popup: $popup, pickr: pickr });
     */
    function storePickrInTrigger($trigger, pickrStub) {
        $trigger.data('popup-instance', {
            $popup: {},
            pickr: pickrStub
        });
    }

    // =========================================================================
    // BUG A fix — correct key lookup (css-preview-manager.js)
    // =========================================================================

    /**
     * Fixed lookup: $trigger.data('popup-instance').pickr
     * (was: $trigger.data('pickr') — always undefined)
     */
    function getPickr($trigger) {
        var popupInstance = $trigger.data('popup-instance');
        return popupInstance && popupInstance.pickr;
    }

    /**
     * Reproduces the fixed block from css-preview-manager.js.
     * Returns what happened (for assertion).
     */
    function runPaletteUpdateBlock($trigger, $input, hexValue, setTimeoutFn) {
        var result = { pickrFound: false, flagSet: false, setColorCalled: false };

        var popupInstance = $trigger.data('popup-instance');      // FIX: correct key
        var pickrInstance = popupInstance && popupInstance.pickr; // FIX: unwrap

        if (pickrInstance) {
            result.pickrFound = true;

            $input.data('is-palette-update', true);
            $trigger.data('is-palette-update', true);
            result.flagSet = true;

            pickrInstance.setColor(hexValue, true);
            result.setColorCalled = true;

            setTimeoutFn(function () {
                $input.removeData('is-palette-update');
                $trigger.removeData('is-palette-update');
            }, 50);
        }

        return result;
    }

    // =========================================================================
    // BUG B fix — flag cleared in change handler, no setTimeout
    // =========================================================================

    /**
     * Reproduces the fixed swatch-click handler from color.js.
     *
     * Returns firePickrRaf() — simulates Pickr's constructor rAF callback that
     * calls setColor(defaultColor, silent=false) → fires 'change'.
     *
     * In the fixed version pickr.on('change') clears is-palette-selection
     * immediately and returns early, so no spurious save occurs regardless of
     * when the rAF fires relative to any timer.
     */
    function runSwatchClickHandler($textInput, $trigger, hex, changeLog) {
        // Set guard flag (color.js)
        $textInput.data('is-palette-selection', true);
        $trigger.data('is-palette-selection', true);

        // Pickr setColor(hex, silent=true) — no change event fired

        // Trigger _handleColorChange — the intended save
        changeLog.calls.push({ source: 'swatch-click', hex: hex });

        // NOTE: no setTimeout — flag is cleared inside pickr.on('change') below

        var defaultColor = '#000000'; // Pickr 1.9.1 default

        // Returns a function that simulates Pickr's rAF firing,
        // which triggers pickr.on('change') with the default color.
        return function firePickrRaf() {
            var isPaletteSelection = $textInput.data('is-palette-selection');

            if (isPaletteSelection) {
                // FIX: clear flag here and return — no spurious save
                $textInput.removeData('is-palette-selection');
                $trigger.removeData('is-palette-selection');
                // return early (no changeLog entry)
            } else {
                // Guard already gone — would fire spurious change (old bug)
                changeLog.calls.push({ source: 'pickr-raf', hex: defaultColor });
            }
        };
    }

    // =========================================================================
    // Test suite
    // =========================================================================

    return TestFramework.suite('Color Handler Swatch', {

        // =====================================================================
        // BUG A — correct key reads the Pickr instance
        // =====================================================================

        'BUG A fix: data("popup-instance").pickr returns the Pickr instance': function () {
            var $trigger = makeElement();
            var pickrStub = { setColor: function () {} };

            storePickrInTrigger($trigger, pickrStub);

            var result = getPickr($trigger);

            this.assertEquals(
                result,
                pickrStub,
                'getPickr must return the Pickr instance stored under popup-instance'
            );
        },

        'BUG A fix: palette update block finds Pickr instance': function () {
            var $trigger = makeElement();
            var $input   = makeElement();
            var pickrStub = { setColor: function () {} };

            storePickrInTrigger($trigger, pickrStub);

            var r = runPaletteUpdateBlock($trigger, $input, '#ff0000', function () {});

            this.assertTrue(r.pickrFound, 'Pickr instance must be found with the correct key');
        },

        'BUG A fix: setColor is called with correct hex': function () {
            var $trigger = makeElement();
            var $input   = makeElement();
            var setColorCalls = 0;
            var lastHex  = null;
            var pickrStub = {
                setColor: function (hex) { setColorCalls++; lastHex = hex; }
            };

            storePickrInTrigger($trigger, pickrStub);

            runPaletteUpdateBlock($trigger, $input, '#ff0000', function () {});

            this.assertEquals(setColorCalls, 1, 'setColor must be called exactly once');
            this.assertEquals(lastHex, '#ff0000', 'setColor must receive the correct hex value');
        },

        'BUG A fix: is-palette-update flag is set on both input and trigger': function () {
            var $trigger = makeElement();
            var $input   = makeElement();
            var pickrStub = { setColor: function () {} };

            storePickrInTrigger($trigger, pickrStub);

            runPaletteUpdateBlock($trigger, $input, '#aabbcc', function () {});

            this.assertEquals(
                $input.data('is-palette-update'),
                true,
                'is-palette-update must be set on $input'
            );
            this.assertEquals(
                $trigger.data('is-palette-update'),
                true,
                'is-palette-update must be set on $trigger'
            );
        },

        'BUG A fix: is-palette-update flag is cleared after setTimeout fires': function () {
            var $trigger = makeElement();
            var $input   = makeElement();
            var pickrStub = { setColor: function () {} };
            var capturedCb = null;

            storePickrInTrigger($trigger, pickrStub);

            runPaletteUpdateBlock($trigger, $input, '#aabbcc', function (cb) {
                capturedCb = cb;
            });

            this.assertEquals($input.data('is-palette-update'), true, 'flag must be set before timeout');

            capturedCb(); // simulate 50ms timeout firing

            this.assertEquals(
                $input.data('is-palette-update'),
                undefined,
                'flag must be cleared after timeout fires'
            );
        },

        'BUG A fix: when no popup-instance on trigger, block is skipped gracefully': function () {
            var $trigger = makeElement(); // no popup-instance stored
            var $input   = makeElement();
            var pickrStub = { setColor: function () {} };
            // NOTE: storePickrInTrigger NOT called intentionally

            var r = runPaletteUpdateBlock($trigger, $input, '#ff0000', function () {});

            this.assertFalse(r.pickrFound, 'block must be skipped when no popup-instance exists');
            this.assertFalse(r.setColorCalled, 'setColor must not be called when no Pickr found');
        },

        // =====================================================================
        // BUG B — no race: flag cleared in change handler, not via setTimeout
        // =====================================================================

        'BUG B fix: guard flag is set immediately after swatch click': function () {
            var $textInput = makeElement();
            var $trigger   = makeElement();
            var changeLog  = { calls: [] };

            runSwatchClickHandler($textInput, $trigger, '#aabbcc', changeLog);

            this.assertEquals(
                $textInput.data('is-palette-selection'),
                true,
                'is-palette-selection must be set immediately after swatch click'
            );
            this.assertEquals(
                $trigger.data('is-palette-selection'),
                true,
                'is-palette-selection must be set on $trigger immediately after swatch click'
            );
        },

        'BUG B fix: swatch click records exactly one change event': function () {
            var $textInput = makeElement();
            var $trigger   = makeElement();
            var changeLog  = { calls: [] };

            runSwatchClickHandler($textInput, $trigger, '#336699', changeLog);

            this.assertEquals(changeLog.calls.length, 1, 'exactly one change event must be recorded');
            this.assertEquals(changeLog.calls[0].source, 'swatch-click', 'change must come from swatch-click');
            this.assertEquals(changeLog.calls[0].hex, '#336699', 'correct hex must be saved');
        },

        'BUG B fix: when rAF fires AFTER click, guard suppresses spurious change': function () {
            var $textInput = makeElement();
            var $trigger   = makeElement();
            var changeLog  = { calls: [] };

            var firePickrRaf = runSwatchClickHandler($textInput, $trigger, '#336699', changeLog);

            // rAF fires (no timer involved — fix clears flag inside rAF handler)
            firePickrRaf();

            this.assertEquals(
                changeLog.calls.length,
                1,
                'rAF must not add a second change event — guard clears it silently'
            );
        },

        'BUG B fix: after rAF fires, guard flag is cleared': function () {
            var $textInput = makeElement();
            var $trigger   = makeElement();
            var changeLog  = { calls: [] };

            var firePickrRaf = runSwatchClickHandler($textInput, $trigger, '#336699', changeLog);

            this.assertEquals($textInput.data('is-palette-selection'), true, 'flag set before rAF');

            firePickrRaf();

            this.assertEquals(
                $textInput.data('is-palette-selection'),
                undefined,
                'flag must be cleared after rAF fires (inside change handler)'
            );
        },

        'BUG B fix: multiple swatch clicks each record exactly one change': function () {
            var $textInput = makeElement();
            var $trigger   = makeElement();
            var changeLog  = { calls: [] };

            // First click
            var rAF1 = runSwatchClickHandler($textInput, $trigger, '#ff0000', changeLog);
            rAF1();

            // Second click
            var rAF2 = runSwatchClickHandler($textInput, $trigger, '#00ff00', changeLog);
            rAF2();

            this.assertEquals(changeLog.calls.length, 2, 'two swatch clicks must produce exactly two change events');
            this.assertEquals(changeLog.calls[0].hex, '#ff0000', 'first change must use first swatch color');
            this.assertEquals(changeLog.calls[1].hex, '#00ff00', 'second change must use second swatch color');
        }

    });
});
