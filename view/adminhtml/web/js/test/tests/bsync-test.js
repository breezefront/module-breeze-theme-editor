/**
 * Bsync — Promise-based async utilities test suite
 *
 * Covers: editor/utils/bsync.js
 *
 * GROUP 1 — delay(ms)
 *   Resolves after the specified number of milliseconds.
 *
 * GROUP 2 — nextTick()
 *   Resolves on the next microtask (Promise.resolve()).
 *
 * GROUP 3 — waitForElement(selector, doc, timeout)
 *   3a. Fast-path: element already in DOM → resolves synchronously.
 *   3b. Deferred:  element added after call → resolves when element appears.
 *   3c. Timeout:   element never appears → rejects with descriptive error.
 *
 * Note: waitForTransition relies on CSS transition-duration and transitionend
 * events which are not reliably simulated in jsdom, so it is covered by the
 * existing panel-close-integration-test.js and navigation-widget-test.js.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/bsync'
], function (TestFramework, Bsync) {
    'use strict';

    TestFramework.suite('Bsync utility', {

        // ─────────────────────────────────────────────────────────────────────
        // GROUP 1 — delay(ms)
        // ─────────────────────────────────────────────────────────────────────

        'delay(0) returns a Promise': function (done) {
            var result = Bsync.delay(0);

            if (typeof result !== 'object' || typeof result.then !== 'function') {
                done(new Error('delay() did not return a Promise'));
                return;
            }

            result.then(function () {
                console.log('✅ delay(0) returns a Promise');
                done();
            }).catch(done);
        },

        'delay(50) resolves after ~50ms': function (done) {
            var start = Date.now();

            Bsync.delay(50).then(function () {
                var elapsed = Date.now() - start;

                if (elapsed < 40) {
                    done(new Error('delay(50) resolved too early: ' + elapsed + 'ms'));
                    return;
                }

                console.log('✅ delay(50) resolved after ' + elapsed + 'ms');
                done();
            }).catch(done);
        },

        'delay(0) resolves before delay(100)': function (done) {
            var order = [];

            Promise.all([
                Bsync.delay(100).then(function () { order.push('slow'); }),
                Bsync.delay(0).then(function ()   { order.push('fast'); })
            ]).then(function () {
                if (order[0] !== 'fast' || order[1] !== 'slow') {
                    done(new Error('Order wrong: ' + JSON.stringify(order)));
                    return;
                }
                console.log('✅ delay(0) resolves before delay(100)');
                done();
            }).catch(done);
        },

        // ─────────────────────────────────────────────────────────────────────
        // GROUP 2 — nextTick()
        // ─────────────────────────────────────────────────────────────────────

        'nextTick() returns a Promise': function (done) {
            var result = Bsync.nextTick();

            if (typeof result !== 'object' || typeof result.then !== 'function') {
                done(new Error('nextTick() did not return a Promise'));
                return;
            }

            result.then(function () {
                console.log('✅ nextTick() returns a Promise');
                done();
            }).catch(done);
        },

        'nextTick() defers execution after current call-stack': function (done) {
            var order = [];

            order.push('sync-1');
            Bsync.nextTick().then(function () {
                order.push('async');

                if (order[0] !== 'sync-1' || order[1] !== 'sync-2' || order[2] !== 'async') {
                    done(new Error('Execution order wrong: ' + JSON.stringify(order)));
                    return;
                }
                console.log('✅ nextTick() defers after sync code');
                done();
            }).catch(done);
            order.push('sync-2');
        },

        // ─────────────────────────────────────────────────────────────────────
        // GROUP 3 — waitForElement(selector, doc, timeout)
        // ─────────────────────────────────────────────────────────────────────

        'waitForElement resolves immediately when element already exists': function (done) {
            var id  = 'bsync-test-existing-' + Date.now();
            var $el = $('<div id="' + id + '"></div>').appendTo('body');

            Bsync.waitForElement('#' + id, document, 500).then(function (el) {
                $el.remove();

                if (!el || el.id !== id) {
                    done(new Error('Resolved with wrong element: ' + (el && el.id)));
                    return;
                }
                console.log('✅ waitForElement fast-path: found existing element');
                done();
            }).catch(function (err) {
                $el.remove();
                done(err);
            });
        },

        'waitForElement resolves when element is added to DOM': function (done) {
            var id = 'bsync-test-deferred-' + Date.now();

            // Insert element after a short delay
            setTimeout(function () {
                $('<div id="' + id + '"></div>').appendTo('body');
            }, 50);

            Bsync.waitForElement('#' + id, document, 1000).then(function (el) {
                $('#' + id).remove();

                if (!el || el.id !== id) {
                    done(new Error('Resolved with wrong element'));
                    return;
                }
                console.log('✅ waitForElement deferred: resolved when element appeared');
                done();
            }).catch(function (err) {
                $('#' + id).remove();
                done(err);
            });
        },

        'waitForElement rejects when element never appears (timeout)': function (done) {
            var selector = '#bsync-test-never-exists-' + Date.now();

            Bsync.waitForElement(selector, document, 100).then(function () {
                done(new Error('Should have rejected but resolved'));
            }).catch(function (err) {
                if (!err || err.message.indexOf('not found') === -1) {
                    done(new Error('Rejected with unexpected error: ' + (err && err.message)));
                    return;
                }
                console.log('✅ waitForElement timeout: rejected with: ' + err.message);
                done();
            });
        }
    });
});
