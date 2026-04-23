/**
 * Bsync — Promise-based async utilities for Breeze Theme Editor
 *
 * Replaces ad-hoc setTimeout patterns with explicit, testable Promise helpers.
 *
 * Available helpers:
 *   delay(ms)                          — resolves after `ms` milliseconds
 *   nextTick()                         — resolves on the next microtask (replaces setTimeout(fn, 0))
 *   waitForElement(selector, doc, ms)  — resolves when selector appears in document
 *   waitForTransition($el, ms)         — resolves when CSS transition ends on $el
 *
 * Usage:
 *   define(['Swissup_BreezeThemeEditor/js/editor/utils/bsync'], function (Bsync) {
 *       Async.delay(200).then(function () { ... });
 *       Async.nextTick().then(function () { ... });
 *       Async.waitForElement('#my-el', document).then(function (el) { ... });
 *       Async.waitForTransition($panel).then(function () { $panel.hide(); });
 *   });
 */
define([], function () {
    'use strict';

    var DEFAULT_WAIT_TIMEOUT = 4000; // ms — max wait for element / transition

    return {

        /**
         * Resolve after `ms` milliseconds.
         *
         * Replaces: setTimeout(fn, ms)
         *
         * @param  {number} ms
         * @return {Promise<void>}
         */
        delay: function (ms) {
            return new Promise(function (resolve) {
                setTimeout(resolve, ms);
            });
        },

        /**
         * Resolve on the next microtask tick.
         * Use when you need to defer execution until after the current call-stack
         * has finished (e.g. after widget initialisation).
         *
         * Replaces: setTimeout(fn, 0)
         *
         * @return {Promise<void>}
         */
        nextTick: function () {
            return Promise.resolve();
        },

        /**
         * Resolve when `selector` appears in `doc` (or `document` by default).
         * Uses MutationObserver when available, falls back to polling every 50 ms.
         * Rejects after `timeout` ms if the element never appears.
         *
         * Replaces: recursive setTimeout retry loops
         *
         * @param  {string}        selector
         * @param  {Document}      [doc]      defaults to window.document
         * @param  {number}        [timeout]  defaults to DEFAULT_WAIT_TIMEOUT
         * @return {Promise<Element>}
         */
        waitForElement: function (selector, doc, timeout) {
            doc     = doc     || document;
            timeout = timeout || DEFAULT_WAIT_TIMEOUT;

            return new Promise(function (resolve, reject) {
                // Synchronous fast-path
                var el = doc.querySelector(selector);
                if (el) {
                    resolve(el);
                    return;
                }

                var timer;

                function done(foundEl) {
                    clearTimeout(timer);
                    if (observer) {
                        observer.disconnect();
                    }
                    resolve(foundEl);
                }

                function fail() {
                    if (observer) {
                        observer.disconnect();
                    }
                    reject(new Error('waitForElement: "' + selector + '" not found within ' + timeout + 'ms'));
                }

                timer = setTimeout(fail, timeout);

                // MutationObserver path
                var observer = null;
                if (typeof MutationObserver !== 'undefined') {
                    observer = new MutationObserver(function () {
                        var found = doc.querySelector(selector);
                        if (found) {
                            done(found);
                        }
                    });
                    observer.observe(doc.documentElement || doc.body, {
                        childList: true,
                        subtree:   true
                    });
                } else {
                    // Fallback polling (IE11 / environments without MutationObserver)
                    clearTimeout(timer);
                    var elapsed  = 0;
                    var interval = 50;

                    var poll = function () {
                        var found = doc.querySelector(selector);
                        if (found) {
                            resolve(found);
                            return;
                        }
                        elapsed += interval;
                        if (elapsed >= timeout) {
                            fail();
                            return;
                        }
                        timer = setTimeout(poll, interval);
                    };

                    timer = setTimeout(poll, interval);
                }
            });
        },

        /**
         * Resolve when the CSS transition on `$el` ends.
         * Falls back (resolves immediately) when $el has no active transition.
         * Rejects after `timeout` ms if `transitionend` never fires.
         *
         * Replaces: setTimeout(fn, transitionDuration)
         *
         * @param  {jQuery}  $el
         * @param  {number}  [timeout]  defaults to DEFAULT_WAIT_TIMEOUT
         * @return {Promise<void>}
         */
        waitForTransition: function ($el, timeout) {
            timeout = timeout || DEFAULT_WAIT_TIMEOUT;

            return new Promise(function (resolve, reject) {
                if (!$el || !$el.length) {
                    resolve();
                    return;
                }

                // If no transition is defined, resolve immediately
                var duration = parseFloat($el.css('transition-duration') || '0');
                if (!duration) {
                    resolve();
                    return;
                }

                var settled = false;

                var timer = setTimeout(function () {
                    if (!settled) {
                        settled = true;
                        $el.off('transitionend.bsync');
                        reject(new Error('waitForTransition: transition did not end within ' + timeout + 'ms'));
                    }
                }, timeout);

                $el.one('transitionend.bsync', function () {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        resolve();
                    }
                });
            });
        }
    };
});
