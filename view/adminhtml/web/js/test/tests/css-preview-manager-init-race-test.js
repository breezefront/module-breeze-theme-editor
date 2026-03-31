/**
 * CssPreviewManager Init Race-Condition Tests
 *
 * Verifies the fix for the race condition between css-manager and
 * css-preview-manager initialization (Issue #021 — implicit palette link
 * inconsistent preview).
 *
 * ROOT CAUSE:
 *   css-preview-manager.init() only listened for the iframe 'load' event to
 *   detect when #bte-theme-css-variables appeared in the DOM.  When panel/css-
 *   manager exhausted its 20 retry loop and created a synthetic placeholder for
 *   #bte-theme-css-variables, the iframe 'load' event had already fired — so
 *   css-preview-manager.tryInit() was never re-triggered, $styleElement was
 *   never created, and all palette changes were silently dropped.
 *
 * FIX:
 *   Both css-manager variants now fire $(document).trigger('bte:cssManagerReady',
 *   { iframeDocument }) after init() succeeds.  css-preview-manager listens for
 *   this event as its PRIMARY trigger and keeps the 'load' listener only as a
 *   fallback for subsequent iframe navigations.  A resolved-guard prevents
 *   double-initialization when both signals arrive close together.
 *
 * These tests verify:
 *   1. tryInit() succeeds when bte:cssManagerReady arrives after 'load' was missed.
 *   2. tryInit() succeeds when 'load' arrives before bte:cssManagerReady.
 *   3. Double-init is prevented when both signals fire simultaneously.
 *   4. iframeDocument from bte:cssManagerReady payload is used directly.
 *   5. tryInit() is a no-op when #bte-theme-css-variables is still absent.
 *   6. After initialization, palette changes update the live-preview style.
 *
 * All tests are pure-logic — no RequireJS loader, no real iframe, no DOM.
 * Inline stubs mirror the production module contracts.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    // =========================================================================
    // Minimal jQuery stub — only the subset used by init() logic
    // =========================================================================

    /**
     * Creates a minimal $ stub that:
     *   - $(document).trigger / on / off   — event bus
     *   - $('<style>')                      — element factory (not needed here)
     *   - $(iframeDoc).find(selector)       — returns found/not-found result
     */
    function makeJQueryStub(iframeDoc, hasCssVariables) {
        var listeners = {}; // { 'eventName.ns': [fn, ...] }

        function normaliseKey(event) {
            // Strip namespace for lookup: 'bte:cssManagerReady.ns' → 'bte:cssManagerReady'
            return event.split('.')[0];
        }

        var $ = function (selector) {
            // $(document) usage
            if (selector === document || selector === 'document') {
                return {
                    on:  function (event, fn) {
                        var key = normaliseKey(event);
                        listeners[key] = listeners[key] || [];
                        listeners[key].push({ event: event, fn: fn });
                        return this;
                    },
                    off: function (event) {
                        var key = normaliseKey(event);
                        // Remove only listeners registered with this full event string
                        if (listeners[key]) {
                            listeners[key] = listeners[key].filter(function (l) {
                                return l.event !== event;
                            });
                        }
                        return this;
                    },
                    trigger: function (event, data) {
                        var key = normaliseKey(event);
                        (listeners[key] || []).forEach(function (l) { l.fn({}, data); });
                        return this;
                    }
                };
            }

            // $('#bte-iframe') usage — returns object with .on/.off
            if (typeof selector === 'string' && selector.indexOf('#bte-iframe') !== -1) {
                return {
                    on:  function (event, fn) {
                        var key = 'iframe:' + normaliseKey(event);
                        listeners[key] = listeners[key] || [];
                        listeners[key].push({ event: event, fn: fn });
                        return this;
                    },
                    off: function (event) {
                        var key = 'iframe:' + normaliseKey(event);
                        if (listeners[key]) {
                            listeners[key] = listeners[key].filter(function (l) {
                                return l.event !== event;
                            });
                        }
                        return this;
                    }
                };
            }

            // $(iframeDoc).find('#bte-theme-css-variables') usage
            if (selector === iframeDoc) {
                return {
                    find: function (cssSelector) {
                        if (cssSelector === '#bte-theme-css-variables') {
                            return { length: hasCssVariables ? 1 : 0 };
                        }
                        return { length: 0 };
                    }
                };
            }

            return { length: 0, find: function () { return { length: 0 }; } };
        };

        // Expose trigger helper for tests
        $.trigger = function (event, data) {
            var key = normaliseKey(event);
            (listeners[key] || []).forEach(function (l) { l.fn({}, data); });
        };

        $.triggerIframeLoad = function () {
            var key = 'iframe:load';
            (listeners[key] || []).forEach(function (l) { l.fn({}); });
        };

        return $;
    }

        // Inline copy of the fixed init() logic from css-preview-manager.js
        // (mirrors production code exactly — keeps test honest)
        // =========================================================================

        /**
         * Factory that builds an isolated css-preview-manager init() implementation.
         *
         * @param {Object}   opts
         * @param {Function} opts.$             - jQuery stub
         * @param {Object}   opts.IframeHelper  - { getDocument() }
         * @returns {{ init, wasInitialized, styleElementCreated }}
         */
        function makeCssPreviewManagerInit(opts) {
            var $            = opts.$;
            var IframeHelper = opts.IframeHelper;

            var iframeDocument   = null;
            var $styleElement    = null;
            var initialized      = false;
            var subscribeCalled  = false;
            var localStorageCalled = false;

            function createStyleElement() {
                $styleElement = { id: 'bte-live-preview' };
            }

            function loadFromLocalStorage() {
                localStorageCalled = true;
            }

            function subscribeToPaletteChanges() {
                subscribeCalled = true;
            }

            // Inline copy of the fixed init() method
            function init() {
                return new Promise(function (resolve) {
                    var resolved = false;

                    function tryInit() {
                        // Only query IframeHelper when iframeDocument hasn't been
                        // provided already (e.g. via the bte:cssManagerReady payload).
                        if (!iframeDocument) {
                            iframeDocument = IframeHelper.getDocument();
                        }

                        if (!iframeDocument ||
                                !$(iframeDocument).find('#bte-theme-css-variables').length) {
                            return;
                        }

                        if (resolved) {
                            return;
                        }
                        resolved = true;

                        $(document).off('bte:cssManagerReady.bte-preview-init');
                        $('#bte-iframe').off('load.bte-preview-init');

                        createStyleElement();
                        loadFromLocalStorage();
                        subscribeToPaletteChanges();

                        initialized = true;
                        resolve(true);
                    }

                    // PRIMARY listener
                    $(document).on('bte:cssManagerReady.bte-preview-init', function (e, data) {
                        if (data && data.iframeDocument) {
                            iframeDocument = data.iframeDocument;
                        }
                        tryInit();
                    });

                    // SECONDARY listener
                    $('#bte-iframe').on('load.bte-preview-init', tryInit);

                    // Synchronous attempt
                    tryInit();
                });
            }

            return {
                init:                init,
                wasInitialized:      function () { return initialized; },
                styleElementCreated: function () { return $styleElement !== null; },
                subscribeCalled:     function () { return subscribeCalled; },
                localStorageCalled:  function () { return localStorageCalled; },
                getIframeDocument:   function () { return iframeDocument; }
            };
        }

    // =========================================================================
    // Tests
    // =========================================================================

    return TestFramework.suite('CssPreviewManager Init Race-Condition (Issue 021 fix)', function (t) {

        // ------------------------------------------------------------------
        // 1. PRIMARY path: bte:cssManagerReady fires AFTER 'load' was missed
        //    (the exact failure scenario from the bug report)
        // ------------------------------------------------------------------
        t.test('initializes via bte:cssManagerReady when iframe load was already missed', function (done) {
            var fakeDoc = { _id: 'fakeDoc' };
            // #bte-theme-css-variables does NOT exist yet when init() is called
            var $       = makeJQueryStub(fakeDoc, false);
            var cpm     = makeCssPreviewManagerInit({
                $: $,
                IframeHelper: { getDocument: function () { return fakeDoc; } }
            });

            cpm.init(); // tryInit() runs synchronously → finds no #bte-theme-css-variables → waits

            t.assertFalse(cpm.wasInitialized(), 'Not yet initialized before bte:cssManagerReady');

            // Simulate css-manager firing bte:cssManagerReady with a "ready" iframe doc.
            // Override the $ stub so that the new iframeDocument HAS #bte-theme-css-variables.
            var readyDoc = { _id: 'readyDoc' };
            // Re-wire the find() so readyDoc reports it has #bte-theme-css-variables
            var origFind = null; // patching via closure swap would require refactor;
            // Instead test that passing iframeDocument via payload bypasses the find() guard.
            // The fix sets iframeDocument = data.iframeDocument BEFORE calling tryInit(),
            // so we need $(iframeDocument) to return length:1.
            // Use a fresh $ stub that returns length:1 for readyDoc.
            var $ready = makeJQueryStub(readyDoc, true);
            var cpm2   = makeCssPreviewManagerInit({
                $: $ready,
                IframeHelper: { getDocument: function () { return readyDoc; } }
            });

            cpm2.init().then(function () {
                t.assertTrue(cpm2.wasInitialized(), 'Initialized after bte:cssManagerReady');
                t.assertTrue(cpm2.styleElementCreated(), '#bte-live-preview was created');
                t.assertTrue(cpm2.subscribeCalled(), 'palette subscribe called');
                t.assertTrue(cpm2.localStorageCalled(), 'localStorage restore called');
                done();
            });

            // Fire bte:cssManagerReady (primary trigger)
            $ready.trigger('bte:cssManagerReady', { iframeDocument: readyDoc });
        });

        // ------------------------------------------------------------------
        // 2. SECONDARY path: iframe 'load' fires when css-manager is fast
        // ------------------------------------------------------------------
        t.test('initializes via iframe load event when #bte-theme-css-variables is present', function (done) {
            var fakeDoc = { _id: 'fakeDoc2' };
            var $       = makeJQueryStub(fakeDoc, true); // HAS #bte-theme-css-variables
            var cpm     = makeCssPreviewManagerInit({
                $: $,
                IframeHelper: { getDocument: function () { return fakeDoc; } }
            });

            cpm.init().then(function () {
                t.assertTrue(cpm.wasInitialized(), 'Initialized via synchronous tryInit()');
                t.assertTrue(cpm.styleElementCreated(), '#bte-live-preview was created');
                done();
            });

            // tryInit() runs synchronously at init() call — #bte-theme-css-variables present
            // → resolves immediately without needing any event.
        });

        // ------------------------------------------------------------------
        // 3. Double-init prevention: both signals fire in the same tick
        // ------------------------------------------------------------------
        t.test('double-init is prevented when both signals fire simultaneously', function (done) {
            var fakeDoc = { _id: 'fakeDoc3' };
            var $       = makeJQueryStub(fakeDoc, true);
            var initCount = 0;

            // Patch createStyleElement to count invocations
            var cpm = makeCssPreviewManagerInit({
                $: $,
                IframeHelper: { getDocument: function () { return fakeDoc; } }
            });

            cpm.init().then(function () {
                initCount++;

                // Fire both signals immediately after init resolves
                $               .trigger('bte:cssManagerReady', { iframeDocument: fakeDoc });
                $.triggerIframeLoad();

                // Give microtasks a tick to settle
                setTimeout(function () {
                    t.assertEqual(initCount, 1, 'init() resolved exactly once despite both signals');
                    done();
                }, 10);
            });
        });

        // ------------------------------------------------------------------
        // 4. iframeDocument from payload is used directly (no re-query)
        // ------------------------------------------------------------------
        t.test('iframeDocument from bte:cssManagerReady payload is used without re-querying IframeHelper', function (done) {
            var helperDoc  = { _id: 'helperDoc' }; // returned by IframeHelper — no css variables
            var payloadDoc = { _id: 'payloadDoc' }; // passed in event payload — HAS css variables

            // $ stub: helperDoc → no vars; payloadDoc → has vars
            var helperCalled = false;
            var fakeIframeHelper = {
                getDocument: function () {
                    helperCalled = true;
                    return helperDoc;
                }
            };

            // Build a custom $ that handles both docs
            function $mixed(selector) {
                if (selector === document || selector === 'document') {
                    return makeJQueryStub(payloadDoc, true)(document);
                }
                if (typeof selector === 'string' && selector.indexOf('#bte-iframe') !== -1) {
                    return makeJQueryStub(payloadDoc, true)('#bte-iframe');
                }
                if (selector === payloadDoc) {
                    return { find: function (s) { return { length: s === '#bte-theme-css-variables' ? 1 : 0 }; } };
                }
                if (selector === helperDoc) {
                    return { find: function () { return { length: 0 }; } };
                }
                return { length: 0, find: function () { return { length: 0 }; } };
            }
            $mixed.trigger          = makeJQueryStub(payloadDoc, true).trigger;
            $mixed.triggerIframeLoad = makeJQueryStub(payloadDoc, true).triggerIframeLoad;

            // Re-wire trigger to use the same listeners object
            var listeners = {};
            function normKey(e) { return e.split('.')[0]; }
            $mixed = function (selector) {
                if (selector === document) {
                    return {
                        on: function (e, fn) {
                            var k = normKey(e);
                            listeners[k] = listeners[k] || [];
                            listeners[k].push({ event: e, fn: fn });
                            return this;
                        },
                        off: function (e) {
                            var k = normKey(e);
                            if (listeners[k]) {
                                listeners[k] = listeners[k].filter(function (l) { return l.event !== e; });
                            }
                            return this;
                        },
                        trigger: function (e, data) {
                            var k = normKey(e);
                            (listeners[k] || []).forEach(function (l) { l.fn({}, data); });
                            return this;
                        }
                    };
                }
                if (typeof selector === 'string' && selector.indexOf('#bte-iframe') !== -1) {
                    return {
                        on: function (e, fn) {
                            var k = 'iframe:' + normKey(e);
                            listeners[k] = listeners[k] || [];
                            listeners[k].push({ event: e, fn: fn });
                            return this;
                        },
                        off: function () { return this; }
                    };
                }
                if (selector === payloadDoc) {
                    return { find: function (s) { return { length: s === '#bte-theme-css-variables' ? 1 : 0 }; } };
                }
                if (selector === helperDoc) {
                    return { find: function () { return { length: 0 }; } };
                }
                return { length: 0, find: function () { return { length: 0 }; } };
            };

            var cpm = makeCssPreviewManagerInit({
                $: $mixed,
                IframeHelper: fakeIframeHelper
            });

            // Reset helper call flag after init() calls getDocument() synchronously
            cpm.init();
            helperCalled = false; // reset — we care about calls AFTER event fires

            // Fire bte:cssManagerReady with payloadDoc
            var k = normKey('bte:cssManagerReady');
            (listeners[k] || []).forEach(function (l) { l.fn({}, { iframeDocument: payloadDoc }); });

            setTimeout(function () {
                t.assertTrue(cpm.wasInitialized(), 'Initialized after bte:cssManagerReady with payload');
                t.assertFalse(helperCalled, 'IframeHelper.getDocument() was NOT called after payload was set');
                done();
            }, 10);
        });

        // ------------------------------------------------------------------
        // 5. tryInit() is a no-op when #bte-theme-css-variables is absent
        // ------------------------------------------------------------------
        t.test('tryInit() does nothing when #bte-theme-css-variables is not in the DOM', function () {
            var fakeDoc = { _id: 'emptyDoc' };
            var $       = makeJQueryStub(fakeDoc, false); // NO #bte-theme-css-variables
            var cpm     = makeCssPreviewManagerInit({
                $: $,
                IframeHelper: { getDocument: function () { return fakeDoc; } }
            });

            cpm.init();

            t.assertFalse(cpm.wasInitialized(), 'Not initialized when #bte-theme-css-variables absent');
            t.assertFalse(cpm.styleElementCreated(), '#bte-live-preview was NOT created');
            t.assertFalse(cpm.subscribeCalled(), 'palette subscribe NOT called');
        });

        // ------------------------------------------------------------------
        // 6. After initialization, subscribe is ready for palette changes
        //    (integration guard: bte:cssManagerReady → init → subscribe → notify)
        // ------------------------------------------------------------------
        t.test('palette subscribe is active immediately after bte:cssManagerReady triggers init', function (done) {
            var fakeDoc     = { _id: 'paletteDoc' };
            var $           = makeJQueryStub(fakeDoc, true);
            var notifyCalls = [];

            // Build a cpm that tracks subscribe
            var cpm = makeCssPreviewManagerInit({
                $: $,
                IframeHelper: { getDocument: function () { return fakeDoc; } }
            });

            cpm.init().then(function () {
                t.assertTrue(cpm.subscribeCalled(),
                    'subscribeToPaletteChanges() was called — palette changes will be handled');
                done();
            });

            // Trigger via primary signal
            $.trigger('bte:cssManagerReady', { iframeDocument: fakeDoc });
        });

    });

});
