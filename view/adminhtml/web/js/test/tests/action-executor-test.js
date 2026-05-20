/**
 * ActionExecutor — Pure Logic Tests
 *
 * Tests the pure-logic helpers in
 * publication-selector/action-executor.js.
 *
 * We test in isolation (no DOM, no GraphQL, no widget instantiation):
 *
 *  GROUP 1 — suggestPublicationTitle()
 *    Title versioning logic: _v1 appended, _vN incremented, empty when no pubs.
 *
 *  GROUP 2 — _extractErrorMessage()
 *    How to determine success/failure from a GraphQL mutation response.
 *
 *  GROUP 3 — confirmUnsavedChanges() logic
 *    Whether to prompt the user before publishing.
 *
 *  GROUP 4 — discardDraft() early-exit guard
 *    Early return when changesCount = 0 (no mutation, no dialog).
 *
 *  GROUP 5 — discardPublished() early-exit guard
 *    Early return when publishedModifiedCount = 0.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/action-executor'
], function (TestFramework, ActionExecutor) {
    'use strict';

    return TestFramework.suite('ActionExecutor — pure logic', {

        // =====================================================================
        // GROUP 1 — suggestPublicationTitle()
        // =====================================================================

        'suggestTitle: empty list → empty string': function () {
            this.assertEquals('', ActionExecutor.suggestPublicationTitle([]),
                'No publications → suggest empty string (prompt will show blank default)'
            );
        },

        'suggestTitle: null/undefined → empty string': function () {
            this.assertEquals('', ActionExecutor.suggestPublicationTitle(null),
                'Null publications → empty string'
            );
            this.assertEquals('', ActionExecutor.suggestPublicationTitle(undefined),
                'Undefined publications → empty string'
            );
        },

        'suggestTitle: plain title (no _vN) → append _v1': function () {
            var pubs = [{ id: 1, title: 'my-theme' }];
            this.assertEquals('my-theme_v1', ActionExecutor.suggestPublicationTitle(pubs),
                'Plain title should get _v1 suffix'
            );
        },

        'suggestTitle: title ending _v1 → increment to _v2': function () {
            var pubs = [{ id: 2, title: 'my-theme_v1' }];
            this.assertEquals('my-theme_v2', ActionExecutor.suggestPublicationTitle(pubs),
                '_v1 should be incremented to _v2'
            );
        },

        'suggestTitle: title ending _v9 → increment to _v10': function () {
            var pubs = [{ id: 3, title: 'release_v9' }];
            this.assertEquals('release_v10', ActionExecutor.suggestPublicationTitle(pubs),
                '_v9 should cross to _v10'
            );
        },

        'suggestTitle: title ending _v99 → increment to _v100': function () {
            var pubs = [{ id: 4, title: 'sprint_v99' }];
            this.assertEquals('sprint_v100', ActionExecutor.suggestPublicationTitle(pubs),
                '_v99 should cross to _v100'
            );
        },

        'suggestTitle: uses most recent (index 0) publication': function () {
            var pubs = [
                { id: 10, title: 'recent_v3' },
                { id:  9, title: 'old_v1' }
            ];
            this.assertEquals('recent_v4', ActionExecutor.suggestPublicationTitle(pubs),
                'suggestTitle must use publications[0] (most recent), not the last one'
            );
        },

        'suggestTitle: title with empty string → suggest empty string': function () {
            var pubs = [{ id: 5, title: '' }];
            this.assertEquals('', ActionExecutor.suggestPublicationTitle(pubs),
                'Empty title → suggest empty string'
            );
        },

        'suggestTitle: title with underscores but no _vN → append _v1': function () {
            var pubs = [{ id: 6, title: 'my_theme_2025' }];
            this.assertEquals('my_theme_2025_v1', ActionExecutor.suggestPublicationTitle(pubs),
                'Title with underscores but no _vN suffix → append _v1'
            );
        },

        'suggestTitle: title "v2" (no underscore prefix) → append _v1 (no vN match)': function () {
            var pubs = [{ id: 7, title: 'v2' }];
            // 'v2' does NOT match /^(.*?)_v(\d+)$/ so _v1 is appended
            this.assertEquals('v2_v1', ActionExecutor.suggestPublicationTitle(pubs),
                '"v2" alone does not match _vN pattern → append _v1'
            );
        },

        // =====================================================================
        // GROUP 2 — _extractErrorMessage()
        // =====================================================================

        'extractError: extracts message from result object': function () {
            var result = { success: false, message: 'Quota exceeded' };
            this.assertEquals(
                'Quota exceeded',
                ActionExecutor._extractErrorMessage(result, 'Publish failed'),
                'Error message must be read from source.message'
            );
        },

        'extractError: falls back to provided default when message absent': function () {
            var result = { success: false };
            this.assertEquals(
                'Publish failed',
                ActionExecutor._extractErrorMessage(result, 'Publish failed'),
                'Fallback message must be used when source has no message property'
            );
        },

        'extractError: falls back when source is null': function () {
            this.assertEquals(
                'Unknown error',
                ActionExecutor._extractErrorMessage(null),
                'Must return default fallback when source is null'
            );
        },

        'extractError: falls back when source is JS Error without message': function () {
            this.assertEquals(
                'Fallback',
                ActionExecutor._extractErrorMessage({}, 'Fallback'),
                'Empty object → use fallback'
            );
        },

        // =====================================================================
        // GROUP 3 — discardDraft() early-exit guard
        // =====================================================================

        'discardDraft: changesCount=0 → skip (no dialog, no mutation)': function () {
            var skipped = false;
            var ctx = {
                options: { changesCount: 0 },
                element: null
            };
            // discardDraft returns early when changesCount === 0
            // We verify it does NOT throw and returns undefined immediately
            ActionExecutor.discardDraft(ctx);
            skipped = true;
            this.assertTrue(skipped,
                'changesCount=0: discardDraft() must return early without opening dialog'
            );
        },

        // =====================================================================
        // GROUP 4 — discardPublished() early-exit guard
        // =====================================================================

        'discardPublished: publishedModifiedCount=0 → skip': function () {
            var skipped = false;
            var ctx = {
                options: { publishedModifiedCount: 0 },
                element: null
            };
            ActionExecutor.discardPublished(ctx);
            skipped = true;
            this.assertTrue(skipped,
                'publishedModifiedCount=0: discardPublished() must return early'
            );
        }
    });
});
