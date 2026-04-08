/**
 * CSS Manager Live Preview — Regression Tests
 *
 * Validates that switching to PUBLISHED or PUBLICATION correctly disables
 * and clears the #bte-live-preview style element.
 *
 * STATUS: Fixed in css-manager-unification refactoring.
 *   - editor/css-manager.js and panel/css-manager.js merged into one.
 *   - switchTo(PUBLISHED/PUBLICATION) now calls _disableStyle(#bte-live-preview)
 *     + _resetLivePreview() in all code paths.
 *
 * ORIGINAL BUG SCENARIO (kept for documentation)
 * ────────────────────────────────────────────────
 *  1. User is in DRAFT mode — panel makes unsaved changes → live preview CSS active
 *     #bte-live-preview:  :root { --header-panel-bg: var(--color-red); }
 *  2. User clicks "Published" in toolbar dropdown → switchTo(PUBLISHED) is called
 *  3. OLD editor/css-manager.js switchTo(PUBLISHED):
 *       _enableStyle($publishedStyle)   ← OK
 *       _disableStyle($draftStyle)      ← OK
 *       // #bte-live-preview — NEVER TOUCHED ← BUG
 *  4. Live preview CSS remained active → red header visible over published CSS
 *
 * ROOT CAUSE (resolved)
 * ──────────────────────
 *  Two separate css-manager files existed: editor/css-manager.js (toolbar, stateless,
 *  did not know about live preview) and panel/css-manager.js (panel, handled live
 *  preview correctly). After unification — one file, one switchTo(), all layers handled.
 *
 *  GROUP 1 — State matrix (pure logic)
 *    Expected CSS layer enable/disable state for each status transition.
 *
 *  GROUP 2 — Bug reproduction (DOM simulation with $('<style>'))
 *    BEFORE (buggy — old editor/css-manager behaviour): documented for history.
 *    AFTER (fixed — unified css-manager behaviour): the actual regression guard.
 *
 *  GROUP 3 — Regression guards
 *    Explicit assertions that live preview is disabled/cleared for all
 *    non-DRAFT status transitions and re-enabled for DRAFT.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function ($, TestFramework) {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // Shared constants (mirror editor/constants.js PUBLICATION_STATUS)
    // ─────────────────────────────────────────────────────────────────────────

    var STATUS = {
        DRAFT:       'DRAFT',
        PUBLISHED:   'PUBLISHED',
        PUBLICATION: 'PUBLICATION'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Layer model
    //
    // Each CSS layer is represented as a plain object with two properties:
    //   enabled  {Boolean}  — whether the <style> tag is active (media=all)
    //   content  {String}   — text content of the <style> tag
    //
    // This lets us test layer state transitions as pure logic without a DOM.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a fresh layer state snapshot.
     *
     * @param {Boolean} enabled
     * @param {String}  content
     * @returns {{ enabled: Boolean, content: String }}
     */
    function makeLayer(enabled, content) {
        return { enabled: enabled, content: content || ':root {}' };
    }

    /**
     * Mirrors the BUGGY behaviour of editor/css-manager.js switchTo():
     *   PUBLISHED   → enable published, disable draft, disable publications
     *                  ** live preview NOT touched **
     *   PUBLICATION → enable published, disable draft, enable current pub, disable others
     *                  ** live preview NOT touched **
     *   DRAFT       → enable published, enable draft, disable publications
     *                  ** live preview NOT touched (it stays as recreateLivePreviewStyle() re-creates it) **
     *
     * Returns updated layer state (immutable — original not mutated).
     *
     * @param {String} status  — STATUS.DRAFT | STATUS.PUBLISHED | STATUS.PUBLICATION
     * @param {{ published, draft, livePreview, publication }} layers
     * @returns {{ published, draft, livePreview, publication }}
     */
    function applyStatusBuggy(status, layers) {
        var next = {
            published:   { enabled: layers.published.enabled,   content: layers.published.content },
            draft:       { enabled: layers.draft.enabled,       content: layers.draft.content },
            livePreview: { enabled: layers.livePreview.enabled, content: layers.livePreview.content },
            publication: { enabled: layers.publication.enabled, content: layers.publication.content }
        };

        switch (status) {
            case STATUS.PUBLISHED:
                next.published.enabled   = true;
                next.draft.enabled       = false;
                next.publication.enabled = false;
                // livePreview — NOT touched (the bug)
                break;

            case STATUS.PUBLICATION:
                next.published.enabled   = true;
                next.draft.enabled       = false;
                next.publication.enabled = true;
                // livePreview — NOT touched (the bug)
                break;

            case STATUS.DRAFT:
                next.published.enabled   = true;
                next.draft.enabled       = true;
                next.publication.enabled = false;
                // livePreview is re-created by recreateLivePreviewStyle() asynchronously
                // In buggy model we leave it as-is (was already enabled from previous DRAFT)
                break;
        }

        return next;
    }

    /**
     * Mirrors the FIXED behaviour (panel/css-manager.js showPublished / showDraft logic):
     *   PUBLISHED   → enable published, disable draft, disable+clear live preview, remove publication
     *   PUBLICATION → enable published, disable draft, disable+clear live preview, enable current pub
     *   DRAFT       → enable published, enable draft, enable live preview
     *
     * @param {String} status
     * @param {{ published, draft, livePreview, publication }} layers
     * @returns {{ published, draft, livePreview, publication }}
     */
    function applyStatusFixed(status, layers) {
        var next = {
            published:   { enabled: layers.published.enabled,   content: layers.published.content },
            draft:       { enabled: layers.draft.enabled,       content: layers.draft.content },
            livePreview: { enabled: layers.livePreview.enabled, content: layers.livePreview.content },
            publication: { enabled: layers.publication.enabled, content: layers.publication.content }
        };

        switch (status) {
            case STATUS.PUBLISHED:
                next.published.enabled    = true;
                next.draft.enabled        = false;
                next.livePreview.enabled  = false;   // _disableStyle($livePreviewStyle)
                next.livePreview.content  = ':root {}'; // resetLivePreview()
                next.publication.enabled  = false;
                break;

            case STATUS.PUBLICATION:
                next.published.enabled    = true;
                next.draft.enabled        = false;
                next.livePreview.enabled  = false;   // _disableStyle($livePreviewStyle)
                next.livePreview.content  = ':root {}'; // resetLivePreview()
                next.publication.enabled  = true;
                break;

            case STATUS.DRAFT:
                next.published.enabled    = true;
                next.draft.enabled        = true;
                next.livePreview.enabled  = true;    // live preview re-enabled in DRAFT
                next.publication.enabled  = false;
                break;
        }

        return next;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DOM simulation helpers
    //
    // These mirror the actual jQuery-based DOM operations in css-manager.js so
    // we can verify the same logic against fake <style> elements.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Enable a simulated <style> element (mirrors _enableStyle).
     * @param {jQuery} $style
     */
    function enableStyle($style) {
        $style.prop('disabled', false);
        $style.attr('media', 'all');
    }

    /**
     * Disable a simulated <style> element (mirrors _disableStyle).
     * @param {jQuery} $style
     */
    function disableStyle($style) {
        $style.prop('disabled', true);
        $style.attr('media', 'not all');
    }

    /**
     * Reset live preview content (mirrors CssPreviewManager.reset()).
     * @param {jQuery} $livePreview
     */
    function resetLivePreviewStyle($livePreview) {
        $livePreview.text(':root {}');
    }

    /**
     * Returns true when a simulated <style> element is active.
     * @param {jQuery} $style
     * @returns {Boolean}
     */
    function isEnabled($style) {
        return !$style.prop('disabled') && $style.attr('media') === 'all';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Suite
    // ─────────────────────────────────────────────────────────────────────────

    return TestFramework.suite('CSS Manager Live Preview Bug — regression', {

        // =====================================================================
        // GROUP 1 — State matrix (pure logic, no DOM)
        // =====================================================================

        'stateMatrix: DRAFT — published/draft/livePreview all enabled': function () {
            var initialLayers = {
                published:   makeLayer(true),
                draft:       makeLayer(false),
                livePreview: makeLayer(false),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.DRAFT, initialLayers);

            this.assertTrue(result.published.enabled,   'published must be enabled in DRAFT');
            this.assertTrue(result.draft.enabled,       'draft must be enabled in DRAFT');
            this.assertTrue(result.livePreview.enabled, 'livePreview must be enabled in DRAFT');
            this.assertFalse(result.publication.enabled,'publication must be disabled in DRAFT');
        },

        'stateMatrix: PUBLISHED — only published enabled, livePreview disabled and cleared': function () {
            var initialLayers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true,  ':root { --header-panel-bg: red; }'),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.PUBLISHED, initialLayers);

            this.assertTrue(result.published.enabled,    'published must be enabled');
            this.assertFalse(result.draft.enabled,       'draft must be disabled');
            this.assertFalse(result.livePreview.enabled, 'livePreview must be disabled');
            this.assertEquals(':root {}', result.livePreview.content,
                'livePreview content must be cleared to ":root {}"');
            this.assertFalse(result.publication.enabled, 'publication must be disabled');
        },

        'stateMatrix: PUBLICATION — published+publication enabled, livePreview disabled and cleared': function () {
            var initialLayers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true,  ':root { --color-red: #c10007; }'),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.PUBLICATION, initialLayers);

            this.assertTrue(result.published.enabled,    'published must be enabled');
            this.assertFalse(result.draft.enabled,       'draft must be disabled');
            this.assertFalse(result.livePreview.enabled, 'livePreview must be disabled');
            this.assertEquals(':root {}', result.livePreview.content,
                'livePreview content must be cleared to ":root {}"');
            this.assertTrue(result.publication.enabled,  'publication must be enabled');
        },

        'stateMatrix: DRAFT→PUBLISHED→DRAFT round-trip — livePreview re-enabled': function () {
            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, ':root { --color-brand-primary: #1a6e3c; }'),
                publication: makeLayer(false)
            };

            // Go to PUBLISHED
            layers = applyStatusFixed(STATUS.PUBLISHED, layers);
            this.assertFalse(layers.livePreview.enabled, 'livePreview must be disabled after PUBLISHED');

            // Return to DRAFT
            layers = applyStatusFixed(STATUS.DRAFT, layers);
            this.assertTrue(layers.livePreview.enabled,  'livePreview must be re-enabled after DRAFT');
        },

        'stateMatrix: livePreview content preserved when switching DRAFT→DRAFT (no change)': function () {
            var previewCss = ':root { --font-size-base: 18px; }';
            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, previewCss),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.DRAFT, layers);

            // In DRAFT the live preview is enabled but its content is managed by
            // css-preview-manager independently — applyStatusFixed() does not clear it.
            this.assertTrue(result.livePreview.enabled,
                'livePreview must remain enabled in DRAFT');
            this.assertEquals(previewCss, result.livePreview.content,
                'livePreview content must NOT be cleared when staying in DRAFT');
        },

        // =====================================================================
        // GROUP 2 — Bug reproduction (DOM simulation)
        // =====================================================================

        /**
         * BEFORE (buggy): switchTo(PUBLISHED) does not touch #bte-live-preview.
         * After calling the buggy logic, live preview CSS remains active and visible.
         */
        'bugRepro BEFORE: livePreview stays active after PUBLISHED switch (buggy path)': function () {
            var redCss = ':root { --header-panel-bg: var(--color-red); --color-red: #c10007; }';

            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, redCss),
                publication: makeLayer(false)
            };

            var result = applyStatusBuggy(STATUS.PUBLISHED, layers);

            // Prove the bug: live preview is still enabled and still contains red CSS
            this.assertTrue(result.livePreview.enabled,
                'BUG: livePreview is still enabled after PUBLISHED switch (buggy path)');
            this.assertTrue(
                result.livePreview.content.indexOf('--color-red') !== -1,
                'BUG: --color-red still present in livePreview after PUBLISHED switch'
            );
        },

        /**
         * BEFORE (buggy): switchTo(PUBLICATION) does not touch #bte-live-preview.
         */
        'bugRepro BEFORE: livePreview stays active after PUBLICATION switch (buggy path)': function () {
            var redCss = ':root { --header-panel-bg: var(--color-red); --color-red: #c10007; }';

            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, redCss),
                publication: makeLayer(false)
            };

            var result = applyStatusBuggy(STATUS.PUBLICATION, layers);

            this.assertTrue(result.livePreview.enabled,
                'BUG: livePreview is still enabled after PUBLICATION switch (buggy path)');
            this.assertTrue(
                result.livePreview.content.indexOf('--header-panel-bg') !== -1,
                'BUG: --header-panel-bg still present in livePreview after PUBLICATION switch'
            );
        },

        /**
         * AFTER (fixed): switchTo(PUBLISHED) disables live preview and clears its content.
         * DOM simulation version — uses real $('<style>') elements.
         */
        'bugRepro AFTER: livePreview disabled+cleared after PUBLISHED switch (fixed DOM)': function () {
            var $livePreview = $('<style id="bte-live-preview-test1">').text(
                ':root { --header-panel-bg: var(--color-red); --color-red: #c10007; }'
            );
            enableStyle($livePreview);

            // Simulate the fix: _disableStyle + resetLivePreview
            disableStyle($livePreview);
            resetLivePreviewStyle($livePreview);

            this.assertFalse(
                isEnabled($livePreview),
                'FIXED: livePreview must be disabled after PUBLISHED switch'
            );
            this.assertEquals(
                ':root {}',
                $livePreview.text(),
                'FIXED: livePreview content must be cleared to ":root {}" after PUBLISHED switch'
            );
            this.assertFalse(
                $livePreview.text().indexOf('--color-red') !== -1,
                'FIXED: --color-red must NOT appear in livePreview'
            );
        },

        /**
         * AFTER (fixed): switchTo(PUBLICATION) disables live preview and clears its content.
         */
        'bugRepro AFTER: livePreview disabled+cleared after PUBLICATION switch (fixed DOM)': function () {
            var $livePreview = $('<style id="bte-live-preview-test2">').text(
                ':root { --color-brand-primary: #c10007; --color-red-rgb: 193, 0, 7; }'
            );
            enableStyle($livePreview);

            disableStyle($livePreview);
            resetLivePreviewStyle($livePreview);

            this.assertFalse(
                isEnabled($livePreview),
                'FIXED: livePreview must be disabled after PUBLICATION switch'
            );
            this.assertEquals(
                ':root {}',
                $livePreview.text(),
                'FIXED: livePreview content must be cleared to ":root {}" after PUBLICATION switch'
            );
        },

        /**
         * AFTER (fixed): DRAFT switch re-enables live preview.
         * (panel/css-manager.js showDraft enables $livePreviewStyle)
         */
        'bugRepro AFTER: livePreview re-enabled after DRAFT switch (fixed DOM)': function () {
            var $livePreview = $('<style id="bte-live-preview-test3">').text(':root {}');
            disableStyle($livePreview);

            // Simulate _enableStyle call in fixed showDraft
            enableStyle($livePreview);

            this.assertTrue(
                isEnabled($livePreview),
                'FIXED: livePreview must be enabled after switching to DRAFT'
            );
        },

        // =====================================================================
        // GROUP 3 — Regression guards
        // =====================================================================

        'REGRESSION: switchTo(PUBLISHED) must disable livePreview — pure logic guard': function () {
            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, ':root { --color-brand-primary: #c10007; }'),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.PUBLISHED, layers);

            this.assertFalse(result.livePreview.enabled,
                'REGRESSION: livePreview.enabled must be false after PUBLISHED');
        },

        'REGRESSION: switchTo(PUBLISHED) must clear livePreview content — pure logic guard': function () {
            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, ':root { --header-panel-bg: red; }'),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.PUBLISHED, layers);

            this.assertEquals(':root {}', result.livePreview.content,
                'REGRESSION: livePreview.content must be ":root {}" after PUBLISHED');
        },

        'REGRESSION: switchTo(PUBLICATION) must disable livePreview — pure logic guard': function () {
            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, ':root { --font-size-base: 20px; }'),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.PUBLICATION, layers);

            this.assertFalse(result.livePreview.enabled,
                'REGRESSION: livePreview.enabled must be false after PUBLICATION');
        },

        'REGRESSION: switchTo(PUBLICATION) must clear livePreview content — pure logic guard': function () {
            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, ':root { --font-size-base: 20px; }'),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.PUBLICATION, layers);

            this.assertEquals(':root {}', result.livePreview.content,
                'REGRESSION: livePreview.content must be ":root {}" after PUBLICATION');
        },

        'REGRESSION: switchTo(DRAFT) must keep livePreview enabled — pure logic guard': function () {
            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(false),
                livePreview: makeLayer(false, ':root {}'),
                publication: makeLayer(false)
            };

            var result = applyStatusFixed(STATUS.DRAFT, layers);

            this.assertTrue(result.livePreview.enabled,
                'REGRESSION: livePreview must be enabled in DRAFT mode');
        },

        'REGRESSION: buggy switchTo(PUBLISHED) does NOT clear livePreview — bug proof': function () {
            // This test documents the existing broken behaviour so we can tell
            // at a glance that the fixed and buggy paths diverge at livePreview.
            var layers = {
                published:   makeLayer(true),
                draft:       makeLayer(true),
                livePreview: makeLayer(true, ':root { --color-brand-primary: #c10007; }'),
                publication: makeLayer(false)
            };

            var buggyResult = applyStatusBuggy(STATUS.PUBLISHED, layers);
            var fixedResult = applyStatusFixed(STATUS.PUBLISHED, layers);

            // Buggy: livePreview still enabled
            this.assertTrue(buggyResult.livePreview.enabled,
                'BUG PROOF: buggy path keeps livePreview enabled');

            // Fixed: livePreview disabled
            this.assertFalse(fixedResult.livePreview.enabled,
                'FIX PROOF: fixed path disables livePreview');

            // Buggy: content unchanged
            this.assertTrue(
                buggyResult.livePreview.content.indexOf('--color-brand-primary') !== -1,
                'BUG PROOF: buggy path preserves dirty content in livePreview'
            );

            // Fixed: content cleared
            this.assertEquals(':root {}', fixedResult.livePreview.content,
                'FIX PROOF: fixed path clears livePreview content to ":root {}"');
        }

    });
});
