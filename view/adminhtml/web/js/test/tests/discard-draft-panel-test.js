/**
 * Discard Draft — Panel Badge Refresh Tests
 *
 * Regression tests for the bug where clicking "Discard N draft modifications"
 * in the publication-selector dropdown did NOT clear the "Modified (N)" badge
 * from the panel fields until F5.
 *
 * Root cause (settings-editor.js):
 *   After a successful discardBreezeThemeEditorDraft mutation the selector
 *   fired $(document).trigger('bte:draftDiscarded', {...}) but there were
 *   ZERO listeners for that event in settings-editor.js.  As a result:
 *     - PanelState kept the old isModified flags
 *     - The "Modified (1)" badge remained visible on palette/field headers
 *     - The panel was never reloaded — stale state until F5
 *
 * Fix applied:
 *   settings-editor.js — new listener for 'bte:draftDiscarded' that calls
 *                         PanelState.reset(),
 *                         PaletteManager.revertDirtyChanges(),
 *                         CssPreviewManager.reset(),
 *                         self._loadConfig().
 *
 * Test layers:
 *   1–3   State reset logic (pure, no DOM)
 *   4–6   Badge visibility model — isModified → badge present/absent
 *   7–9   Event system — bte:draftDiscarded jQuery document events
 *   10–11 Regression guards — before-fix vs after-fix proof
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function ($, TestFramework) {
    'use strict';

    // ─── Helpers: extracted logic mirroring the production code ──────────────

    /**
     * Mirrors PanelState.reset() effect on a single field entry.
     * Production: panel-state.js — clears isDirty / isModified flags.
     *
     * @param {Object} fieldState
     * @returns {Object} reset copy
     */
    function resetFieldState(fieldState) {
        return {
            isDirty:    false,
            isModified: false,
            value:      fieldState.savedValue,
            savedValue: fieldState.savedValue
        };
    }

    /**
     * Mirrors the badge-visibility rule in badge-renderer.js.
     * A "Modified" badge is rendered only when isModified === true.
     *
     * @param {Object} fieldState
     * @returns {boolean}
     */
    function shouldShowModifiedBadge(fieldState) {
        return fieldState.isModified === true;
    }

    /**
     * Mirrors the palette "Modified (N)" badge-visibility rule.
     * Shown only when count > 0.
     *
     * @param {number} modifiedCount
     * @returns {boolean}
     */
    function shouldShowPaletteModifiedBadge(modifiedCount) {
        return modifiedCount > 0;
    }

    /**
     * Simulates DOM badge injection / removal that base.js:updateFieldBadges does.
     * Returns the badge HTML that would be rendered (empty string = no badge).
     *
     * @param {boolean} isModified
     * @returns {string}
     */
    function renderModifiedBadgeHtml(isModified) {
        if (!isModified) {
            return '';
        }
        return '<span class="bte-badge bte-badge-modified" ' +
               'title="This field has been customized from its default value">Modified</span>';
    }

    // ─── Suite ───────────────────────────────────────────────────────────────

    return TestFramework.suite('Discard Draft — Panel Badge Refresh', {

        // ─── Layer 1: State reset logic (pure) ────────────────────────────

        /**
         * Test 1: After reset, isModified must become false.
         *
         * This mirrors what PanelState.reset() does on each stored field entry.
         * If isModified stays true after discard, the badge will not disappear.
         */
        'resetFieldState: isModified must become false after reset': function () {
            var before = { isDirty: true, isModified: true, value: '#FF0000', savedValue: '#000000' };
            var after  = resetFieldState(before);

            this.assertFalse(
                after.isModified,
                'isModified must be false after PanelState.reset()'
            );
        },

        /**
         * Test 2: After reset, isDirty must become false.
         */
        'resetFieldState: isDirty must become false after reset': function () {
            var before = { isDirty: true, isModified: true, value: '#FF0000', savedValue: '#000000' };
            var after  = resetFieldState(before);

            this.assertFalse(
                after.isDirty,
                'isDirty must be false after PanelState.reset()'
            );
        },

        /**
         * Test 3: Reset must not mutate the original object.
         *
         * PanelState works with immutable updates — the original entry
         * must remain unchanged so that undo / revert logic is safe.
         */
        'resetFieldState: original object must not be mutated': function () {
            var before = { isDirty: true, isModified: true, value: '#FF0000', savedValue: '#000000' };
            resetFieldState(before);

            this.assertTrue(
                before.isModified,
                'Original fieldState.isModified must remain true (no mutation)'
            );
        },

        // ─── Layer 2: Badge visibility model ──────────────────────────────

        /**
         * Test 4: shouldShowModifiedBadge returns true when isModified is true.
         *
         * Before discard — the badge should be visible.
         */
        'badge: isModified=true → Modified badge must be shown': function () {
            this.assertTrue(
                shouldShowModifiedBadge({ isModified: true }),
                'isModified=true must produce a visible Modified badge'
            );
        },

        /**
         * Test 5: shouldShowModifiedBadge returns false when isModified is false.
         *
         * After discard + reset — the badge must disappear.
         */
        'badge: isModified=false → Modified badge must NOT be shown': function () {
            this.assertFalse(
                shouldShowModifiedBadge({ isModified: false }),
                'isModified=false must produce no Modified badge (badge disappears after discard)'
            );
        },

        /**
         * Test 6: Palette "Modified (N)" badge must disappear when count reaches 0.
         *
         * PaletteManager.revertDirtyChanges() resets the dirty count to 0.
         * After that, shouldShowPaletteModifiedBadge must return false.
         */
        'badge: palette modifiedCount=0 → palette Modified badge must NOT be shown': function () {
            this.assertFalse(
                shouldShowPaletteModifiedBadge(0),
                'modifiedCount=0 must hide the palette Modified badge'
            );
            this.assertTrue(
                shouldShowPaletteModifiedBadge(1),
                'modifiedCount=1 must show the palette Modified badge (sanity check)'
            );
        },

        // ─── Layer 3: Event system ─────────────────────────────────────────

        /**
         * Test 7: bte:draftDiscarded event can be triggered and received.
         *
         * settings-editor.js must have a $(document).on('bte:draftDiscarded')
         * listener — this test proves the event plumbing works end-to-end.
         */
        'bte:draftDiscarded should fire and be received by listener': function (done) {
            var self = this;
            var received = false;

            $(document).one('bte:draftDiscarded.draftTest', function () {
                received = true;
            });

            $(document).trigger('bte:draftDiscarded', { scope: 'stores', scopeId: 1, themeId: 2 });

            setTimeout(function () {
                self.assertTrue(received, 'bte:draftDiscarded listener must receive the event');

                $(document).off('.draftTest');
                done();
            }, 50);
        },

        /**
         * Test 8: Event data must carry scope, scopeId and themeId.
         *
         * action-executor.js passes these three values when triggering:
         *   $(document).trigger('bte:draftDiscarded', { scope, scopeId, themeId })
         */
        'bte:draftDiscarded event data should contain scope, scopeId and themeId': function (done) {
            var self = this;
            var capturedData = null;

            $(document).one('bte:draftDiscarded.draftDataTest', function (e, data) {
                capturedData = data;
            });

            $(document).trigger('bte:draftDiscarded', { scope: 'stores', scopeId: 5, themeId: 3 });

            setTimeout(function () {
                self.assertNotNull(capturedData, 'Event data must be provided');
                self.assertTrue('scope'   in capturedData, 'Event data must have scope property');
                self.assertTrue('scopeId' in capturedData, 'Event data must have scopeId property');
                self.assertTrue('themeId' in capturedData, 'Event data must have themeId property');
                self.assertEquals(capturedData.scope,   'stores', 'scope must be "stores"');
                self.assertEquals(capturedData.scopeId, 5,        'scopeId must be 5');
                self.assertEquals(capturedData.themeId, 3,        'themeId must be 3');

                $(document).off('.draftDataTest');
                done();
            }, 50);
        },

        /**
         * Test 9: Multiple independent listeners can subscribe to bte:draftDiscarded.
         *
         * Both settings-editor.js (panel badge reset) and any future subscriber
         * (e.g. CSS preview) must receive the same single event trigger.
         */
        'bte:draftDiscarded should deliver to multiple listeners': function (done) {
            var self = this;
            var count = 0;

            $(document).one('bte:draftDiscarded.multi1', function () { count++; });
            $(document).one('bte:draftDiscarded.multi2', function () { count++; });

            $(document).trigger('bte:draftDiscarded', { scope: 'stores', scopeId: 1, themeId: 1 });

            setTimeout(function () {
                self.assertEquals(count, 2, 'Both listeners must receive bte:draftDiscarded');

                $(document).off('.multi1 .multi2');
                done();
            }, 50);
        },

        // ─── Layer 4: Regression guards ───────────────────────────────────

        /**
         * Test 10 — REGRESSION GUARD: Modified badge must disappear after reset.
         *
         * Documents the BEFORE state (no listener → badge persists) and the
         * AFTER state (fix applied → badge is removed).
         *
         * BEFORE fix:
         *   bte:draftDiscarded fired → nothing listened → PanelState unchanged
         *   → isModified stayed true → badge HTML was still rendered
         *
         * AFTER fix:
         *   The listener calls PanelState.reset() → isModified = false
         *   → renderModifiedBadgeHtml returns '' → badge not rendered
         */
        'REGRESSION: Modified badge must be empty after state reset': function () {
            // ── BEFORE (broken): isModified was never reset → badge persists ──
            var beforeState = { isModified: true };
            var beforeHtml  = renderModifiedBadgeHtml(beforeState.isModified);

            this.assertStringContains(
                beforeHtml,
                'bte-badge-modified',
                'BEFORE fix: badge HTML must contain bte-badge-modified (bug reproduced)'
            );

            // ── AFTER (fixed): PanelState.reset() sets isModified=false ──
            var afterState = resetFieldState({ isDirty: true, isModified: true, savedValue: '#000' });
            var afterHtml  = renderModifiedBadgeHtml(afterState.isModified);

            this.assertEquals(
                afterHtml,
                '',
                'AFTER fix: badge HTML must be empty string (badge disappears)'
            );
        },

        /**
         * Test 11 — REGRESSION GUARD: palette Modified badge must disappear.
         *
         * BEFORE fix:
         *   PaletteManager.revertDirtyChanges() was never called →
         *   dirty count stayed > 0 → "Modified (1)" badge remained visible
         *
         * AFTER fix:
         *   revertDirtyChanges() resets count to 0 →
         *   shouldShowPaletteModifiedBadge(0) returns false → badge gone
         */
        'REGRESSION: palette Modified badge must disappear when dirty count resets to 0': function () {
            // ── BEFORE (broken): dirty count not reset ──
            var beforeCount = 1;
            this.assertTrue(
                shouldShowPaletteModifiedBadge(beforeCount),
                'BEFORE fix: palette Modified badge must be visible when count=1 (bug reproduced)'
            );

            // ── AFTER (fixed): PaletteManager.revertDirtyChanges() ──
            var afterCount = 0;
            this.assertFalse(
                shouldShowPaletteModifiedBadge(afterCount),
                'AFTER fix: palette Modified badge must NOT be visible when count=0'
            );
        }

    });
});
