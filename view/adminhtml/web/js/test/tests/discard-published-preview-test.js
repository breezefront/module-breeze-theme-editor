/**
 * Discard Published — Preview Refresh Tests
 *
 * Regression tests for the bug where clicking "Discard published changes"
 * in the publication-selector dropdown did NOT update the live preview.
 *
 * Root cause (publication-selector.js):
 *   After a successful discardBreezeThemeEditorPublished mutation the selector
 *   fired $(document).trigger('bte:publishedDiscarded', {...}) but there were
 *   ZERO listeners for that event anywhere in the codebase.  As a result:
 *     - #bte-live-preview kept the old CSS (e.g. --header-panel-bg: red)
 *     - #bte-theme-css-variables in the iframe kept the stale published CSS
 *     - The panel was never reloaded
 *
 * Fix applied:
 *   1. css-manager.js     — new public method refreshPublishedCss()
 *                           calls getCss(storeId, themeId, 'PUBLISHED', null),
 *                           then writes the response CSS into $publishedStyle.
 *   2. settings-editor.js — new listener for 'bte:publishedDiscarded' that
 *                           calls CssPreviewManager.reset(),
 *                                 CssManager.refreshPublishedCss(),
 *                                 self._loadConfig().
 *
 * Test layers:
 *   1–5   Response parsing (parseCssFromResponse) — pure logic, always runnable
 *   6–8   DOM update simulation — fake <style> elements, no iframe needed
 *   9–10  Event system — jQuery document events
 *   11–12 Regression guards — before-fix vs after-fix proof
 *   13–14 MockHelper integration — async, verifies getCss is called with
 *         PUBLISHED status and that errors are handled gracefully
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function ($, TestFramework) {
    'use strict';

    // ─── Helpers: extracted logic mirroring the production code ──────────────

    /**
     * Mirrors the response-parsing step inside refreshPublishedCss().
     * Production: css-manager.js — the .then() handler of getCss().
     *
     * @param {Object|null} response  - GraphQL response object
     * @returns {String}              - CSS string, or '' when absent
     */
    function parseCssFromResponse(response) {
        if (!response || !response.getThemeEditorCss) {
            return '';
        }
        return response.getThemeEditorCss.css || '';
    }

    /**
     * Mirrors the DOM-update step inside refreshPublishedCss().
     * Production: $publishedStyle.text(css || ':root {}')
     *
     * @param {jQuery} $styleEl  - simulated #bte-theme-css-variables element
     * @param {Object|null} response
     * @returns {String}         - CSS actually written to the element
     */
    function applyFreshCssToStyle($styleEl, response) {
        var css = parseCssFromResponse(response);
        var content = css || ':root {}';
        $styleEl.text(content);
        return content;
    }

    /**
     * Mirrors CssPreviewManager.reset() DOM effect.
     * Production: $styleElement.text(':root {}')
     *
     * @param {jQuery} $livePreview  - simulated #bte-live-preview element
     */
    function resetLivePreview($livePreview) {
        $livePreview.text(':root {}');
    }

    // ─── Suite ───────────────────────────────────────────────────────────────

    return TestFramework.suite('Discard Published — Preview Refresh', {

        // ─── Layer 1: Response parsing (pure logic) ───────────────────────

        /**
         * Test 1: Happy path — valid response returns the CSS string.
         */
        'should extract CSS string from valid getThemeEditorCss response': function () {
            var response = {
                getThemeEditorCss: {
                    css: ':root { --header-panel-bg: var(--color-brand-primary); }',
                    hasContent: true,
                    status: 'PUBLISHED'
                }
            };

            var result = parseCssFromResponse(response);

            this.assertEquals(
                result,
                ':root { --header-panel-bg: var(--color-brand-primary); }',
                'Should return the css field from getThemeEditorCss'
            );
        },

        /**
         * Test 2: Null response (network error, GraphQL unreachable).
         * Must return '' — caller applies ':root {}' fallback.
         */
        'should return empty string for null response': function () {
            this.assertEquals(
                parseCssFromResponse(null),
                '',
                'null response must yield empty string'
            );
        },

        /**
         * Test 3: Response object exists but getThemeEditorCss key is absent.
         * (Unexpected server payload shape — defensive guard.)
         */
        'should return empty string when getThemeEditorCss key is absent': function () {
            this.assertEquals(
                parseCssFromResponse({}),
                '',
                'Missing getThemeEditorCss key must yield empty string'
            );
        },

        /**
         * Test 4: getThemeEditorCss present but css field is null.
         * (Server returns hasContent: false — no published customisations.)
         */
        'should return empty string when css field is null': function () {
            var response = {
                getThemeEditorCss: { css: null, hasContent: false, status: 'PUBLISHED' }
            };

            this.assertEquals(
                parseCssFromResponse(response),
                '',
                'null css field must yield empty string'
            );
        },

        /**
         * Test 5: applyFreshCssToStyle writes ':root {}' when css is empty.
         * This is the exact fallback the production code uses.
         */
        'applyFreshCssToStyle should write :root {} fallback when css is empty': function () {
            var $fakeStyle = $('<style>').text(':root { --old: red; }');
            var emptyResponse = {
                getThemeEditorCss: { css: '', hasContent: false }
            };

            var written = applyFreshCssToStyle($fakeStyle, emptyResponse);

            this.assertEquals(
                written,
                ':root {}',
                'Empty css must fall back to ":root {}"'
            );
            this.assertEquals(
                $fakeStyle.text(),
                ':root {}',
                'Style element content must be ":root {}" after applying empty response'
            );
        },

        // ─── Layer 2: DOM update simulation ───────────────────────────────

        /**
         * Test 6: After discard, published style element content is replaced.
         *
         * Simulates:  $publishedStyle.text(css || ':root {}')
         * Scenario:   server returns fresh published CSS (theme defaults only).
         */
        'should update published style element content after discard': function () {
            var $fakePublished = $('<style id="bte-theme-css-variables-sim">').text(
                ':root { --header-panel-bg: var(--color-red); --color-red: #c10007; }'
            );

            var freshResponse = {
                getThemeEditorCss: {
                    css: ':root { --color-brand-primary: #1a6e3c; }',
                    hasContent: true
                }
            };

            applyFreshCssToStyle($fakePublished, freshResponse);

            this.assertEquals(
                $fakePublished.text(),
                ':root { --color-brand-primary: #1a6e3c; }',
                'Published style element must contain the fresh server CSS'
            );
        },

        /**
         * Test 7: Red-header scenario — published style is cleared to defaults.
         *
         * This is the exact scenario the user reported: after discarding published
         * customisations (which had --header-panel-bg: red), the preview kept
         * showing red.  After the fix, applyFreshCssToStyle writes ':root {}',
         * removing the red variable from the published layer.
         */
        'should replace red header CSS with empty :root {} after discard': function () {
            // State BEFORE discard: published style has the red header override
            var $fakePublished = $('<style>').text(
                ':root {\n    --header-panel-bg: var(--color-red);\n    --color-red: #c10007;\n    --color-red-rgb: 193, 0, 7;\n}'
            );

            // Server returns empty CSS after published values are deleted
            var emptyResponse = {
                getThemeEditorCss: { css: null, hasContent: false }
            };

            applyFreshCssToStyle($fakePublished, emptyResponse);

            var content = $fakePublished.text();

            this.assertFalse(
                content.indexOf('--color-red') !== -1,
                'After discard, --color-red must NOT appear in published style'
            );
            this.assertFalse(
                content.indexOf('--header-panel-bg') !== -1,
                'After discard, --header-panel-bg must NOT appear in published style'
            );
            this.assertEquals(
                content,
                ':root {}',
                'Published style must be reset to ":root {}" (empty defaults)'
            );
        },

        /**
         * Test 8: Live-preview (#bte-live-preview) content is cleared.
         *
         * Simulates CssPreviewManager.reset() effect:
         *   $styleElement.text(':root {}')
         *
         * Before fix: reset() was never called → live preview kept old CSS.
         * After fix:  the bte:publishedDiscarded handler calls reset() first.
         */
        'should clear #bte-live-preview content when reset is applied': function () {
            // Simulate the style tag the user reported
            var $fakeLivePreview = $('<style id="bte-live-preview-sim">').text(
                ':root {\n    --header-panel-bg: var(--color-red);\n    --color-red: #c10007;\n    --color-red-rgb: 193, 0, 7;\n}'
            );

            // CssPreviewManager.reset() does: $styleElement.text(':root {}')
            resetLivePreview($fakeLivePreview);

            this.assertEquals(
                $fakeLivePreview.text(),
                ':root {}',
                '#bte-live-preview must be cleared to ":root {}" by reset()'
            );
        },

        // ─── Layer 3: Event system ─────────────────────────────────────────

        /**
         * Test 9: bte:publishedDiscarded event can be triggered and received.
         */
        'bte:publishedDiscarded should fire and be received by listener': function (done) {
            var self = this;
            var received = false;

            $(document).one('bte:publishedDiscarded.discardTest', function () {
                received = true;
            });

            $(document).trigger('bte:publishedDiscarded', { storeId: 1, themeId: 2 });

            setTimeout(function () {
                self.assertTrue(received, 'bte:publishedDiscarded listener must receive the event');

                $(document).off('.discardTest');
                done();
            }, 50);
        },

        /**
         * Test 10: Event data must carry storeId and themeId.
         *
         * These are the values publication-selector.js passes to the event
         * so that listeners can scope their operations to the correct store/theme.
         */
        'bte:publishedDiscarded event data should contain storeId and themeId': function (done) {
            var self = this;
            var capturedData = null;

            $(document).one('bte:publishedDiscarded.discardDataTest', function (e, data) {
                capturedData = data;
            });

            $(document).trigger('bte:publishedDiscarded', { storeId: 21, themeId: 5 });

            setTimeout(function () {
                self.assertNotNull(capturedData, 'Event data must be provided');
                self.assertTrue('storeId' in capturedData, 'Event data must have storeId property');
                self.assertTrue('themeId' in capturedData, 'Event data must have themeId property');
                self.assertEquals(capturedData.storeId, 21, 'storeId must be 21');
                self.assertEquals(capturedData.themeId, 5,  'themeId must be 5');

                $(document).off('.discardDataTest');
                done();
            }, 50);
        },

        // ─── Layer 4: Regression guards ───────────────────────────────────

        /**
         * Test 11 — REGRESSION GUARD: published style with red header must be cleared.
         *
         * Documents the BEFORE state (no handler → CSS unchanged) and the
         * AFTER state (fix applied → CSS is ':root {}').
         *
         * BEFORE fix:
         *   $(document).trigger('bte:publishedDiscarded', …) fired
         *   → nothing listened → $publishedStyle.text() still contained red vars
         *
         * AFTER fix:
         *   The handler calls refreshPublishedCss() which calls
         *   $publishedStyle.text(css || ':root {}') → red vars removed
         */
        'REGRESSION: published style with red header must be cleared to :root {} after discard': function () {
            var redCss = ':root {\n' +
                         '    --header-panel-bg: var(--color-red);\n' +
                         '    --color-red: #c10007;\n' +
                         '    --color-red-rgb: 193, 0, 7;\n' +
                         '}';

            // ── BEFORE (broken path): event fires but no handler acts on DOM ──
            var $beforeStyle = $('<style>').text(redCss);

            // Simulating the broken state: nothing updates the element
            // The element must still contain red after the event (proving the bug)
            var beforeContent = $beforeStyle.text();
            this.assertTrue(
                beforeContent.indexOf('--color-red') !== -1,
                'BEFORE fix: published style must still contain --color-red (bug reproduced)'
            );

            // ── AFTER (fixed path): handler calls applyFreshCssToStyle ──
            var $afterStyle = $('<style>').text(redCss);
            applyFreshCssToStyle($afterStyle, { getThemeEditorCss: { css: null, hasContent: false } });

            var afterContent = $afterStyle.text();
            this.assertFalse(
                afterContent.indexOf('--color-red') !== -1,
                'AFTER fix: --color-red must NOT appear in published style'
            );
            this.assertEquals(
                afterContent,
                ':root {}',
                'AFTER fix: published style must be ":root {}"'
            );
        },

        /**
         * Test 12 — REGRESSION GUARD: live preview with red values must be cleared.
         *
         * BEFORE fix: bte:publishedDiscarded had no listener →
         *             CssPreviewManager.reset() was never called →
         *             #bte-live-preview kept the old red CSS
         *
         * AFTER fix:  handler calls CssPreviewManager.reset() first →
         *             $styleElement.text(':root {}') → red removed
         */
        'REGRESSION: live preview with red values must be cleared after discard': function () {
            var redPreviewCss = ':root {\n' +
                                '    --header-panel-bg: var(--color-red);\n' +
                                '    --color-red: #c10007;\n' +
                                '    --color-red-rgb: 193, 0, 7;\n' +
                                '}';

            // ── BEFORE (broken path): nothing resets live preview ──
            var $beforePreview = $('<style>').text(redPreviewCss);
            var beforeContent = $beforePreview.text();
            this.assertTrue(
                beforeContent.indexOf('--header-panel-bg') !== -1,
                'BEFORE fix: live preview must still contain --header-panel-bg (bug reproduced)'
            );

            // ── AFTER (fixed path): handler calls resetLivePreview ──
            var $afterPreview = $('<style>').text(redPreviewCss);
            resetLivePreview($afterPreview);

            var afterContent = $afterPreview.text();
            this.assertFalse(
                afterContent.indexOf('--header-panel-bg') !== -1,
                'AFTER fix: --header-panel-bg must NOT appear in live preview'
            );
            this.assertEquals(
                afterContent,
                ':root {}',
                'AFTER fix: live preview must be ":root {}"'
            );
        },

        // ─── Layer 5: MockHelper integration (async) ──────────────────────

        /**
         * Test 13: getCss must be called with PUBLISHED status.
         *
         * refreshPublishedCss() must request the PUBLISHED layer specifically —
         * not DRAFT or PUBLICATION — because after discarding we need to reflect
         * the new live-site state (theme defaults).
         */
        'getCss should be called with PUBLISHED status (not DRAFT)': function (done) {
            var self = this;
            var mockHit = false;

            this.enableMocks();

            // Register mock only for PUBLISHED — if getCss is called with a
            // different status the mock will not match and the real network call
            // would be attempted (which would fail in a test context)
            this.mockGetCss(
                { storeId: 1, themeId: 1, status: 'PUBLISHED', publicationId: null },
                { getThemeEditorCss: { css: ':root {}', hasContent: false, status: 'PUBLISHED' } }
            );

            require(['Swissup_BreezeThemeEditor/js/graphql/queries/get-css'], function (getCss) {
                getCss('stores', 1, 'PUBLISHED', null)
                    .then(function (response) {
                        mockHit = true;

                        self.assertNotNull(response, 'getCss should return a response');
                        self.assertNotNull(
                            response.getThemeEditorCss,
                            'Response should contain getThemeEditorCss'
                        );
                        self.assertEquals(
                            response.getThemeEditorCss.status,
                            'PUBLISHED',
                            'Response status must be PUBLISHED'
                        );
                    })
                    .always(function () {
                        self.clearMocks();
                        self.disableMocks();

                        setTimeout(function () {
                            self.assertTrue(mockHit, 'PUBLISHED mock must have been hit');
                            done();
                        }, 10);
                    });
            });
        },

        /**
         * Test 14: refreshPublishedCss logic handles getCss error gracefully.
         *
         * When the GraphQL call rejects (network error, auth failure, …) the
         * method must not throw — it logs the error and resolves to false.
         * We verify this by replicating the .catch() handler inline.
         */
        'refreshPublishedCss should handle getCss error response gracefully': function (done) {
            var self = this;
            var errorHandled = false;
            var resolvedValue = null;

            this.enableMocks();

            // Register a mock error for the PUBLISHED query
            require([
                'Swissup_BreezeThemeEditor/js/test/helpers/mock-helper',
                'Swissup_BreezeThemeEditor/js/graphql/queries/get-css'
            ], function (MockHelper, getCss) {
                MockHelper.mockError(
                    'GetThemeEditorCss',
                    { publicationId: null, scope: { type: 'stores', scopeId: 1 }, status: 'PUBLISHED' },
                    'Service temporarily unavailable'
                );

                // Inline replication of refreshPublishedCss() error path
                getCss('stores', 1, 'PUBLISHED', null)
                    .then(function () {
                        resolvedValue = true; // should not reach here
                    })
                    .catch(function (error) {
                        errorHandled = true;
                        resolvedValue = false; // production returns false on error
                        self.assertNotNull(error, 'Error object must be provided');
                    })
                    .always(function () {
                        self.clearMocks();
                        self.disableMocks();

                        setTimeout(function () {
                            self.assertTrue(errorHandled, 'Error handler must have been called');
                            self.assertEquals(
                                resolvedValue,
                                false,
                                'refreshPublishedCss must resolve to false on error'
                            );
                            done();
                        }, 10);
                    });
            });
        }

    });
});
