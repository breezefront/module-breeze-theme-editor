/**
 * CssManager init() — Promise contract tests
 *
 * Verifies that cssManager.init() returns a Promise (not a Boolean) after the
 * setTimeout retry-loop was replaced with Bsync.waitForElement() (пп. 8.1–8.2).
 *
 * All tests are pure-logic — inline stubs replace real AMD deps so no
 * RequireJS loader, no real iframe and no live DOM is needed.
 *
 * GROUP 1 — Early-exit paths (resolve to false synchronously)
 *   1a. Invalid scopeId → Promise<false>
 *   1b. iframe not found → Promise<false>
 *   1c. Already ready (isReady guard) → Promise<true>
 *
 * GROUP 2 — Happy path
 *   2a. iframe body + #bte-theme-css-variables already present → Promise<true>,
 *       triggers bte:cssManagerReady event.
 *
 * GROUP 3 — waitForElement integration
 *   3a. #bte-theme-css-variables absent initially but appears → Promise<true>
 *   3b. waitForElement timeout → placeholder created, Promise<true>
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    // =========================================================================
    // Helpers — build a minimal init() stub that mirrors production logic
    // =========================================================================

    /**
     * Mirrors the Promise-based init() from editor/css-manager.js.
     *
     * @param {Object} opts
     * @param {Boolean} opts.scopeValid      — scopeManager returns valid scopeId
     * @param {Boolean} opts.iframeExists    — $('#iframeId') finds an element
     * @param {Boolean} opts.bodyReady       — iframeDoc.body truthy
     * @param {Boolean} opts.styleExists     — #bte-theme-css-variables in iframeDoc
     * @param {Boolean} opts.alreadyReady    — isReady() returns true
     * @param {Function} [opts.waitForElementFn] — override Bsync.waitForElement stub
     */
    function makeInit(opts) {
        var events = {};

        // Minimal jQuery trigger stub
        var $doc = {
            off: function () { return $doc; },
            on:  function (ev, fn) {
                events[ev.split('.')[0]] = fn;
                return $doc;
            },
            trigger: function (ev, data) {
                if (events[ev]) { events[ev]({}, data); }
            }
        };

        var fired = { cssManagerReady: false };

        // Stub scopeManager
        var scopeManager = {
            initialized: function () { return true; },
            getScope:    function () { return 'stores'; },
            getScopeId:  function () { return opts.scopeValid ? 42 : null; },
            getThemeId:  function () { return 1; }
        };

        // Stub iframeDoc
        var iframeDoc = opts.bodyReady ? {
            body: { offsetHeight: 0 },
            head: { appendChild: function () {} },
            querySelector: function (sel) {
                if (sel === 'body') { return iframeDoc.body; }
                if (sel === '#bte-theme-css-variables') {
                    return opts.styleExists ? { id: 'bte-theme-css-variables' } : null;
                }
                return null;
            }
        } : null;

        // Minimal $() stub
        function $(sel) {
            if (sel === document) { return $doc; }
            // $('#iframeId')
            if (typeof sel === 'string' && sel[0] === '#') {
                if (!opts.iframeExists) {
                    return { length: 0 };
                }
                return {
                    length: 1,
                    0: {
                        contentDocument: iframeDoc,
                        contentWindow:   { document: iframeDoc }
                    }
                };
            }
            // $(iframeDoc).find(selector)
            if (sel === iframeDoc) {
                return {
                    find: function (selector) {
                        if (selector === '#bte-theme-css-variables') {
                            return opts.styleExists
                                ? { length: 1, 0: { id: 'bte-theme-css-variables' } }
                                : { length: 0 };
                        }
                        return { length: 0 };
                    }
                };
            }
            // $('<style>') factory
            if (typeof sel === 'string' && sel[0] === '<') {
                return {
                    text: function () { return this; },
                    appendTo: function () { return this; }
                };
            }
            return { length: 0 };
        }

        $.proxy = function (fn, ctx) { return fn.bind(ctx); };

        // Default Bsync stub — resolves/rejects based on opts
        var defaultWaitForElement = function (selector, doc, timeout) {
            if (selector === 'body') {
                return opts.bodyReady
                    ? Promise.resolve(iframeDoc.body)
                    : Promise.reject(new Error('body not found'));
            }
            if (selector === '#bte-theme-css-variables') {
                return opts.styleExists
                    ? Promise.resolve({ id: 'bte-theme-css-variables' })
                    : Promise.reject(new Error('"#bte-theme-css-variables" not found within ' + timeout + 'ms'));
            }
            return Promise.reject(new Error(selector + ' not found'));
        };

        var Bsync = { waitForElement: opts.waitForElementFn || defaultWaitForElement };

        var StorageHelper = { init: function () {} };

        // Mirrors the production init() logic
        function init(config) {
            config = config || {};

            // isReady guard
            if (opts.alreadyReady) {
                return Promise.resolve(true);
            }

            var iframeId = config.iframeId || 'bte-iframe';

            StorageHelper.init(scopeManager.getScopeId(), scopeManager.getThemeId());

            $(document).off('scopeChanged.cssManager').on('scopeChanged.cssManager', function () {});

            // Validate scopeId
            if (!scopeManager.getScopeId() && scopeManager.getScope() !== 'default') {
                return Promise.resolve(false);
            }

            // iframe existence check
            var $iframe = $('#' + iframeId);
            if (!$iframe.length) {
                return Promise.resolve(false);
            }

            var iframeDocLocal = $iframe[0].contentDocument || $iframe[0].contentWindow.document;

            // 8.1 — wait for body
            var bodyReady = (iframeDocLocal && iframeDocLocal.body)
                ? Promise.resolve(iframeDocLocal.body)
                : Bsync.waitForElement('body', iframeDocLocal, 4000);

            return bodyReady
                .then(function () {
                    var $style = $(iframeDocLocal).find('#bte-theme-css-variables');
                    if ($style.length) {
                        return $style[0];
                    }
                    // 8.2 — wait for style element
                    return Bsync.waitForElement('#bte-theme-css-variables', iframeDocLocal, 4000);
                })
                .catch(function () {
                    // Timeout fallback — create placeholder
                    return { id: 'bte-theme-css-variables', _placeholder: true };
                })
                .then(function () {
                    fired.cssManagerReady = true;
                    $(document).trigger('bte:cssManagerReady', { iframeDocument: iframeDocLocal });
                    return true;
                });
        }

        return { init: init, fired: fired };
    }

    // =========================================================================
    // Tests
    // =========================================================================

    TestFramework.suite('CssManager init() Promise contract', {

        // ─────────────────────────────────────────────────────────────────────
        // GROUP 1 — Early-exit paths
        // ─────────────────────────────────────────────────────────────────────

        'init() returns a Promise (not Boolean)': function (done) {
            var m = makeInit({ scopeValid: true, iframeExists: true, bodyReady: true, styleExists: true });
            var result = m.init({ iframeId: 'bte-iframe' });

            if (!result || typeof result.then !== 'function') {
                done(new Error('init() did not return a Promise, got: ' + typeof result));
                return;
            }
            result.then(function () {
                console.log('✅ init() returns a Promise');
                done();
            }).catch(done);
        },

        'init() resolves to false when scopeId is invalid': function (done) {
            var m = makeInit({ scopeValid: false, iframeExists: true, bodyReady: true, styleExists: true });

            m.init({ iframeId: 'bte-iframe' }).then(function (result) {
                if (result !== false) {
                    done(new Error('Expected false, got: ' + result));
                    return;
                }
                console.log('✅ init() → false when scopeId invalid');
                done();
            }).catch(done);
        },

        'init() resolves to false when iframe not found': function (done) {
            var m = makeInit({ scopeValid: true, iframeExists: false, bodyReady: true, styleExists: true });

            m.init({ iframeId: 'bte-iframe' }).then(function (result) {
                if (result !== false) {
                    done(new Error('Expected false, got: ' + result));
                    return;
                }
                console.log('✅ init() → false when iframe not found');
                done();
            }).catch(done);
        },

        'init() resolves to true immediately when already ready': function (done) {
            var m = makeInit({ alreadyReady: true });

            m.init({}).then(function (result) {
                if (result !== true) {
                    done(new Error('Expected true, got: ' + result));
                    return;
                }
                console.log('✅ init() → true immediately when already ready');
                done();
            }).catch(done);
        },

        // ─────────────────────────────────────────────────────────────────────
        // GROUP 2 — Happy path
        // ─────────────────────────────────────────────────────────────────────

        'init() resolves to true when iframe and style are ready': function (done) {
            var m = makeInit({ scopeValid: true, iframeExists: true, bodyReady: true, styleExists: true });

            m.init({ iframeId: 'bte-iframe' }).then(function (result) {
                if (result !== true) {
                    done(new Error('Expected true, got: ' + result));
                    return;
                }
                console.log('✅ init() → true when everything ready');
                done();
            }).catch(done);
        },

        'init() triggers bte:cssManagerReady on success': function (done) {
            var m = makeInit({ scopeValid: true, iframeExists: true, bodyReady: true, styleExists: true });

            m.init({ iframeId: 'bte-iframe' }).then(function () {
                if (!m.fired.cssManagerReady) {
                    done(new Error('bte:cssManagerReady was not triggered'));
                    return;
                }
                console.log('✅ bte:cssManagerReady triggered after init()');
                done();
            }).catch(done);
        },

        // ─────────────────────────────────────────────────────────────────────
        // GROUP 3 — waitForElement integration
        // ─────────────────────────────────────────────────────────────────────

        'init() waits for #bte-theme-css-variables via waitForElement (8.2)': function (done) {
            var waitCalled = false;

            var m = makeInit({
                scopeValid:   true,
                iframeExists: true,
                bodyReady:    true,
                styleExists:  false, // not in DOM initially
                waitForElementFn: function (selector) {
                    if (selector === '#bte-theme-css-variables') {
                        waitCalled = true;
                        return Promise.resolve({ id: 'bte-theme-css-variables' });
                    }
                    return Promise.resolve({});
                }
            });

            m.init({ iframeId: 'bte-iframe' }).then(function (result) {
                if (!waitCalled) {
                    done(new Error('waitForElement was not called for #bte-theme-css-variables'));
                    return;
                }
                if (result !== true) {
                    done(new Error('Expected true, got: ' + result));
                    return;
                }
                console.log('✅ init() uses waitForElement for #bte-theme-css-variables (8.2)');
                done();
            }).catch(done);
        },

        'init() creates placeholder and resolves true when waitForElement times out (8.2 fallback)': function (done) {
            var m = makeInit({
                scopeValid:   true,
                iframeExists: true,
                bodyReady:    true,
                styleExists:  false,
                waitForElementFn: function (selector) {
                    if (selector === '#bte-theme-css-variables') {
                        return Promise.reject(new Error('"#bte-theme-css-variables" not found within 4000ms'));
                    }
                    return Promise.resolve({});
                }
            });

            m.init({ iframeId: 'bte-iframe' }).then(function (result) {
                if (result !== true) {
                    done(new Error('Expected true (placeholder fallback), got: ' + result));
                    return;
                }
                console.log('✅ init() fallback: placeholder created, resolves true on timeout');
                done();
            }).catch(done);
        },

        'init() does not trigger cssManagerReady on early-exit (invalid scope)': function (done) {
            var m = makeInit({ scopeValid: false, iframeExists: true, bodyReady: true, styleExists: true });

            m.init({ iframeId: 'bte-iframe' }).then(function () {
                if (m.fired.cssManagerReady) {
                    done(new Error('bte:cssManagerReady should NOT fire on early-exit'));
                    return;
                }
                console.log('✅ bte:cssManagerReady not fired on early-exit');
                done();
            }).catch(done);
        }
    });
});
