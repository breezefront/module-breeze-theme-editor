/**
 * Palette Reset Behavior Tests
 *
 * Verifies the two guards inside the reset-button click handler in
 * palette-section-renderer.js:
 *
 *   Guard 1 — Focus-return cooldown (_justChanged flag)
 *     After a native <input type="color"> closes on Linux/GTK the browser fires
 *     a spurious "focus-return" click at the cursor position.  If the reset
 *     button just appeared (badge update created the DOM node), that click hits
 *     it and reverts the user's palette change.  We suppress reset clicks for
 *     500 ms after any colour change via _justChanged.
 *
 *   Guard 2 — Dirty-state check (hasDirtyChanges)
 *     Reset is a no-op when nothing has been changed, regardless of the cooldown.
 *
 * All tests are pure-logic — they reproduce the exact conditional blocks from
 * the production code without requiring a real widget or DOM.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    /**
     * Inline reproduction of the reset-click guard from palette-section-renderer.js.
     *
     * Returns true when the reset should proceed, false when it should be blocked.
     *
     * @param {Boolean} justChanged    - value of this._justChanged
     * @param {Boolean} hasDirty      - return value of PaletteManager.hasDirtyChanges()
     * @returns {Boolean}
     */
    function shouldAllowReset(justChanged, hasDirty) {
        // Guard 1: focus-return cooldown
        if (justChanged) {
            return false;
        }
        // Guard 2: nothing to reset
        if (!hasDirty) {
            return false;
        }
        return true;
    }

    /**
     * Inline reproduction of the cooldown arm / clear logic from the change handler.
     *
     * @param {Object} state          - mutable object with .justChanged
     * @param {Object} timers         - mutable object with .timerId
     * @param {Function} setTimeoutFn - injectable setTimeout (use fake for testing)
     * @param {Number} delay
     */
    function armCooldown(state, timers, setTimeoutFn, delay) {
        state.justChanged = true;
        if (timers.timerId !== null) {
            clearTimeout(timers.timerId);
        }
        timers.timerId = setTimeoutFn(function () {
            state.justChanged = false;
        }, delay);
    }

    return TestFramework.suite('Palette Reset Behavior', {

        /**
         * Test 1: cooldown active → reset blocked
         *
         * When _justChanged is true (colour just changed, within 500 ms) the
         * reset handler must return early without resetting.
         */
        'should block reset when cooldown is active': function () {
            var justChanged = true;
            var hasDirty = true; // would normally allow reset
            this.assertEquals(
                shouldAllowReset(justChanged, hasDirty),
                false,
                'Reset must be blocked while cooldown is active even if there are dirty changes'
            );
        },

        /**
         * Test 2: cooldown expired → reset allowed (if dirty)
         *
         * After the 500 ms timer fires (_justChanged → false) the reset button
         * must work normally when there are unsaved changes.
         */
        'should allow reset when cooldown has expired and there are dirty changes': function () {
            var justChanged = false;
            var hasDirty = true;
            this.assertEquals(
                shouldAllowReset(justChanged, hasDirty),
                true,
                'Reset must proceed when cooldown has expired and dirty changes exist'
            );
        },

        /**
         * Test 3: no dirty changes → reset blocked regardless of cooldown
         *
         * Even with cooldown inactive, if there are no dirty changes the handler
         * must be a no-op.
         */
        'should block reset when there are no dirty changes': function () {
            var justChanged = false;
            var hasDirty = false;
            this.assertEquals(
                shouldAllowReset(justChanged, hasDirty),
                false,
                'Reset must be blocked when hasDirtyChanges() returns false'
            );
        },

        /**
         * Test 4: both guards active → reset blocked
         *
         * Worst-case: cooldown active AND no dirty changes.
         */
        'should block reset when both cooldown is active and no dirty changes': function () {
            var justChanged = true;
            var hasDirty = false;
            this.assertEquals(
                shouldAllowReset(justChanged, hasDirty),
                false,
                'Reset must be blocked when both guards fire'
            );
        },

        /**
         * Test 5: armCooldown sets _justChanged to true immediately
         *
         * Calling armCooldown must arm the flag synchronously so that a
         * focus-return click fired immediately after is blocked.
         */
        'should set justChanged to true immediately on armCooldown': function () {
            var state = {justChanged: false};
            var timers = {timerId: null};
            var noop = function () {};   // fake setTimeout — we only test sync side-effect

            armCooldown(state, timers, noop, 500);

            this.assertEquals(
                state.justChanged,
                true,
                '_justChanged must be true immediately after armCooldown'
            );
        },

        /**
         * Test 6: armCooldown clears flag after delay
         *
         * The fake setTimeout captures and calls the callback synchronously so
         * we can verify _justChanged resets to false after the timer fires.
         */
        'should clear justChanged after delay via timer callback': function () {
            var state = {justChanged: false};
            var timers = {timerId: null};
            var capturedCallback = null;

            var fakeSetTimeout = function (cb) {
                capturedCallback = cb;
                return 42; // fake timer id
            };

            armCooldown(state, timers, fakeSetTimeout, 500);

            this.assertEquals(state.justChanged, true,
                'justChanged must be true before timer fires');

            // Simulate timer firing
            capturedCallback();

            this.assertEquals(state.justChanged, false,
                'justChanged must be false after timer callback runs');
        },

        /**
         * Test 7: armCooldown cancels previous timer before arming new one
         *
         * Rapid consecutive colour changes must not leave stale timers.
         * Each call to armCooldown must clear the previous timer id.
         */
        'should cancel previous timer when armCooldown is called again': function () {
            var state = {justChanged: false};
            var timers = {timerId: null};
            var callCount = 0;

            var fakeSetTimeout = function () {
                callCount++;
                return callCount; // unique fake timer ids: 1, 2, …
            };

            // First colour change
            armCooldown(state, timers, fakeSetTimeout, 500);
            var firstTimerId = timers.timerId;

            this.assertEquals(firstTimerId, 1,
                'First timer id should be 1');

            // Second colour change (before first timer fires)
            armCooldown(state, timers, fakeSetTimeout, 500);

            this.assertEquals(timers.timerId, 2,
                'Timer id should be updated to 2 on second arm');

            this.assertEquals(callCount, 2,
                'setTimeout should have been called twice');
        },

        /**
         * Test 8: reset allowed exactly at the boundary (cooldown=false, dirty=true)
         *
         * Confirms normal user flow: user made a change more than 500 ms ago
         * (cooldown expired), clicks reset → should proceed.
         */
        'should allow reset in normal user flow after cooldown expires': function () {
            // Simulate: colour changed, 500 ms passed, timer fired
            var state = {justChanged: true};
            var timers = {timerId: null};
            var capturedCb = null;

            armCooldown(state, timers, function (cb) {
                capturedCb = cb;
                return 1;
            }, 500);

            // Timer fires
            capturedCb();

            // User now clicks reset button; there are unsaved changes
            var hasDirty = true;
            var result = shouldAllowReset(state.justChanged, hasDirty);

            this.assertEquals(result, true,
                'Reset must be allowed after cooldown expires and dirty changes exist');
        }
    });
});
