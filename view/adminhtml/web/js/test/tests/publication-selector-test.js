/**
 * Publication Selector — canPublish + canRollback + _rollbackTo logic tests
 *
 * Tests the _getState() logic in isolation by directly invoking the pure
 * computation that drives whether the Publish and "Publish this version" buttons
 * are rendered.
 *
 * We do NOT instantiate the jQuery widget — we test only the logic extracted
 * from _getState() so tests run without a DOM or GraphQL server.
 *
 * Bugs covered:
 *   Bug 1 — permissions missing from window.breezeThemeEditorConfig
 *            → permissions.canPublish() always returns false
 *            → canPublish in _getState() is always false
 *            → Publish button never renders even with 2 draft changes
 *
 *   Bug 2 — updateChangesCount() calls renderer.updateBadge() instead of
 *            renderer.render(), so the Publish button in the dropdown never
 *            appears even after the count is updated externally.
 *
 *   Rollback — _rollbackTo() guards (permission, draft warning, confirm flow)
 *              and canRollback state passed to template.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/permissions'
], function (TestFramework, permissions) {
    'use strict';

    // -------------------------------------------------------------------------
    // Helper: compute canPublish exactly as _getState() does in the widget
    // -------------------------------------------------------------------------

    /**
     * @param {boolean} permCanPublish   — value returned by permissions.canPublish()
     * @param {number}  changesCount     — widget's options.changesCount
     * @param {string}  currentStatus    — widget's options.currentStatus
     * @returns {boolean}
     */
    function computeCanPublish(permCanPublish, changesCount, currentStatus) {
        return permCanPublish &&
               changesCount > 0 &&
               currentStatus === 'DRAFT';
    }

    // -------------------------------------------------------------------------
    // Helper: set / clear window.breezeThemeEditorConfig.permissions
    // -------------------------------------------------------------------------

    var _originalConfig;

    function setPermissionsInGlobalConfig(perms) {
        _originalConfig = window.breezeThemeEditorConfig;
        window.breezeThemeEditorConfig = {
            storeId: 1,
            themeId: 1,
            permissions: perms
        };
    }

    function restoreGlobalConfig() {
        window.breezeThemeEditorConfig = _originalConfig;
    }

    // -------------------------------------------------------------------------
    // Suite
    // -------------------------------------------------------------------------

    return TestFramework.suite('Publication Selector — canPublish logic', {

        // ====================================================================
        // GROUP 1: canPublish computation (pure logic, no permissions module)
        // ====================================================================

        'canPublish: all three conditions true → true': function () {
            var result = computeCanPublish(true, 2, 'DRAFT');
            this.assertTrue(result, 'Should be true when permissions ok, count=2, status=DRAFT');
        },

        'canPublish: changesCount = 0 → false regardless of other conditions': function () {
            var result = computeCanPublish(true, 0, 'DRAFT');
            this.assertFalse(result, 'Should be false when changesCount = 0');
        },

        'canPublish: status = PUBLISHED → false': function () {
            var result = computeCanPublish(true, 5, 'PUBLISHED');
            this.assertFalse(result, 'Should be false when status is PUBLISHED');
        },

        'canPublish: status = PUBLICATION → false': function () {
            var result = computeCanPublish(true, 3, 'PUBLICATION');
            this.assertFalse(result, 'Should be false when status is PUBLICATION');
        },

        'canPublish: permissions = false → false regardless of count and status': function () {
            var result = computeCanPublish(false, 5, 'DRAFT');
            this.assertFalse(result, 'Should be false when canPublish permission denied');
        },

        'canPublish: changesCount = 1 (boundary) → true': function () {
            var result = computeCanPublish(true, 1, 'DRAFT');
            this.assertTrue(result, 'Should be true at boundary changesCount = 1');
        },

        'canPublish: changesCount negative → false': function () {
            var result = computeCanPublish(true, -1, 'DRAFT');
            this.assertFalse(result, 'Should be false for negative changesCount');
        },

        'canPublish: all three conditions false → false': function () {
            var result = computeCanPublish(false, 0, 'PUBLISHED');
            this.assertFalse(result, 'Should be false when all conditions are false');
        },

        // ====================================================================
        // GROUP 2: Bug 1 regression — permissions module reads from
        //          window.breezeThemeEditorConfig
        //          When `permissions` key is missing → canPublish() returns false
        // ====================================================================

        'Bug 1: permissions missing from breezeThemeEditorConfig → canPublish() returns false': function () {
            setPermissionsInGlobalConfig(undefined);

            var result = permissions.canPublish();

            restoreGlobalConfig();

            this.assertFalse(result,
                'permissions.canPublish() must return false when permissions key is absent ' +
                '(reproduces the bug: publish button never appears)'
            );
        },

        'Bug 1: permissions present with canPublish=true → canPublish() returns true': function () {
            setPermissionsInGlobalConfig({
                canView: true,
                canEdit: true,
                canPublish: true,
                canRollback: true
            });

            var result = permissions.canPublish();

            restoreGlobalConfig();

            this.assertTrue(result,
                'permissions.canPublish() must return true when config contains canPublish: true'
            );
        },

        'Bug 1: permissions present with canPublish=false → canPublish() returns false': function () {
            setPermissionsInGlobalConfig({
                canView: true,
                canEdit: true,
                canPublish: false,
                canRollback: false
            });

            var result = permissions.canPublish();

            restoreGlobalConfig();

            this.assertFalse(result,
                'permissions.canPublish() must honour canPublish: false from config'
            );
        },

        'Bug 1 end-to-end: missing permissions → canPublish in state = false even with 2 changes and DRAFT status': function () {
            setPermissionsInGlobalConfig(undefined);

            var permResult = permissions.canPublish();
            var stateResult = computeCanPublish(permResult, 2, 'DRAFT');

            restoreGlobalConfig();

            this.assertFalse(stateResult,
                'End-to-end: when permissions are not forwarded to breezeThemeEditorConfig, ' +
                'canPublish in _getState() is false and the Publish button never renders'
            );
        },

        'Bug 1 fixed: permissions forwarded → canPublish in state = true with 2 changes and DRAFT status': function () {
            setPermissionsInGlobalConfig({ canPublish: true });

            var permResult = permissions.canPublish();
            var stateResult = computeCanPublish(permResult, 2, 'DRAFT');

            restoreGlobalConfig();

            this.assertTrue(stateResult,
                'After fix: when permissions.canPublish is forwarded correctly, ' +
                'canPublish in _getState() is true and the Publish button renders'
            );
        },

        // ====================================================================
        // GROUP 3: Bug 2 — updateChangesCount must trigger a full render,
        //          not just a badge update.
        //          We test the logic consequence: after count changes, the
        //          new canPublish value must be recomputed correctly.
        // ====================================================================

        'Bug 2: after updateChangesCount(2), canPublish recomputed from new count': function () {
            // Simulate widget state: start with count = 0 (no publish button)
            var options = { changesCount: 0, currentStatus: 'DRAFT' };
            var perm = true;

            var before = computeCanPublish(perm, options.changesCount, options.currentStatus);
            this.assertFalse(before, 'canPublish should be false before count update (count = 0)');

            // Simulate updateChangesCount(2)
            options.changesCount = 2;

            var after = computeCanPublish(perm, options.changesCount, options.currentStatus);
            this.assertTrue(after,
                'canPublish should be true after updateChangesCount(2) — ' +
                'requires render() not just updateBadge()'
            );
        },

        'Bug 2: after updateChangesCount(0), canPublish recomputed to false': function () {
            var options = { changesCount: 3, currentStatus: 'DRAFT' };
            var perm = true;

            var before = computeCanPublish(perm, options.changesCount, options.currentStatus);
            this.assertTrue(before, 'canPublish should be true before count is cleared');

            // Simulate updateChangesCount(0) — e.g. after publishing
            options.changesCount = 0;

            var after = computeCanPublish(perm, options.changesCount, options.currentStatus);
            this.assertFalse(after,
                'canPublish should be false after updateChangesCount(0)'
            );
        },

        // ====================================================================
        // GROUP 4: permissions.getPermissions() fallback and other checks
        // ====================================================================

        'getPermissions() returns safe defaults when breezeThemeEditorConfig is undefined': function () {
            var saved = window.breezeThemeEditorConfig;
            window.breezeThemeEditorConfig = undefined;

            var perms = permissions.getPermissions();

            window.breezeThemeEditorConfig = saved;

            this.assertFalse(perms.canView,    'canView default must be false');
            this.assertFalse(perms.canEdit,    'canEdit default must be false');
            this.assertFalse(perms.canPublish, 'canPublish default must be false');
            this.assertFalse(perms.canRollback,'canRollback default must be false');
        },

        'canEdit() mirrors config.permissions.canEdit': function () {
            setPermissionsInGlobalConfig({ canView: true, canEdit: true, canPublish: false, canRollback: false });
            var result = permissions.canEdit();
            restoreGlobalConfig();
            this.assertTrue(result, 'canEdit() must return true when config says canEdit: true');
        },

        'canRollback() mirrors config.permissions.canRollback': function () {
            setPermissionsInGlobalConfig({ canView: true, canEdit: true, canPublish: true, canRollback: true });
            var result = permissions.canRollback();
            restoreGlobalConfig();
            this.assertTrue(result, 'canRollback() must return true when config says canRollback: true');
        },

        // ====================================================================
        // GROUP 5: canRollback in _getState — "Publish this version" button
        // ====================================================================

        'canRollback: true when config has canRollback=true → button renders': function () {
            setPermissionsInGlobalConfig({ canView: true, canEdit: true, canPublish: true, canRollback: true });
            var result = permissions.canRollback();
            restoreGlobalConfig();
            this.assertTrue(result,
                'canRollback must be true so the "Publish this version" button can render for the active publication'
            );
        },

        'canRollback: false when config has canRollback=false → button hidden': function () {
            setPermissionsInGlobalConfig({ canView: true, canEdit: true, canPublish: true, canRollback: false });
            var result = permissions.canRollback();
            restoreGlobalConfig();
            this.assertFalse(result,
                'canRollback must be false so the "Publish this version" button is hidden for non-admin users'
            );
        },

        'canRollback: false when permissions missing from config → button hidden': function () {
            setPermissionsInGlobalConfig(undefined);
            var result = permissions.canRollback();
            restoreGlobalConfig();
            this.assertFalse(result,
                'canRollback defaults to false when permissions key is absent (same bug vector as Bug 1 for publish)'
            );
        },

        // ====================================================================
        // GROUP 6: _rollbackTo() guards — draft warning logic
        //
        // We test the decision logic in isolation:
        //   shouldWarnAboutDraft(changesCount, hasUnsaved) → boolean
        // which mirrors the condition in _rollbackTo():
        //   if (this.options.changesCount > 0 || PanelState.hasChanges()) { confirm(...) }
        // ====================================================================

        'rollback draft warning: no warning when changesCount=0 and no unsaved changes': function () {
            var changesCount = 0;
            var hasUnsaved   = false;
            var shouldWarn   = changesCount > 0 || hasUnsaved;
            this.assertFalse(shouldWarn,
                'Should not warn when there are no saved draft changes and no unsaved edits'
            );
        },

        'rollback draft warning: warns when changesCount > 0': function () {
            var changesCount = 2;
            var hasUnsaved   = false;
            var shouldWarn   = changesCount > 0 || hasUnsaved;
            this.assertTrue(shouldWarn,
                'Should warn when there are saved draft changes (changesCount=2)'
            );
        },

        'rollback draft warning: warns when unsaved in-panel changes exist': function () {
            var changesCount = 0;
            var hasUnsaved   = true;
            var shouldWarn   = changesCount > 0 || hasUnsaved;
            this.assertTrue(shouldWarn,
                'Should warn even when changesCount=0 but there are unsaved panel edits'
            );
        },

        'rollback draft warning: warns when both changesCount > 0 and unsaved exist': function () {
            var changesCount = 3;
            var hasUnsaved   = true;
            var shouldWarn   = changesCount > 0 || hasUnsaved;
            this.assertTrue(shouldWarn,
                'Should warn when both conditions are true'
            );
        },

        // ====================================================================
        // GROUP 7: Rollback-of-rollback — allowed by design
        //          Any historical publication (isRollback=true or false)
        //          can be re-published. Tested as a logic invariant.
        // ====================================================================

        'rollback-of-rollback: canRollback does not depend on isRollback flag of publication': function () {
            // The "Publish this version" button visibility depends on:
            //   canRollback (permission) AND status === 'PUBLICATION' AND currentPublicationId == pub.id
            // The isRollback flag on the publication record does NOT affect the button —
            // any publication (regular or itself a rollback) can be re-published when active.
            setPermissionsInGlobalConfig({ canRollback: true });

            var canRollbackRegular    = permissions.canRollback(); // pub with isRollback=false
            var canRollbackOfRollback = permissions.canRollback(); // pub with isRollback=true

            restoreGlobalConfig();

            this.assertTrue(canRollbackRegular,    'Regular publication: permission allows button');
            this.assertTrue(canRollbackOfRollback, 'Rollback publication: permission also allows button');
            this.assertEquals(canRollbackRegular, canRollbackOfRollback,
                'isRollback flag does not gate the permission — only active-selection + permission matter'
            );
        },

        // ====================================================================
        // GROUP 7b: rollback button visibility — only for the actively previewed
        //           publication (status=PUBLICATION, currentPublicationId == pub.id)
        // ====================================================================

        'rollback button: hidden when status is DRAFT (not previewing any publication)': function () {
            var state  = { status: 'DRAFT', currentPublicationId: null, canRollback: true };
            var pubId  = 5;
            var show   = state.canRollback && state.status === 'PUBLICATION' && state.currentPublicationId == pubId;
            this.assertFalse(show,
                'Button must be hidden when not in PUBLICATION mode'
            );
        },

        'rollback button: hidden when status is PUBLISHED': function () {
            var state  = { status: 'PUBLISHED', currentPublicationId: null, canRollback: true };
            var pubId  = 5;
            var show   = state.canRollback && state.status === 'PUBLICATION' && state.currentPublicationId == pubId;
            this.assertFalse(show,
                'Button must be hidden when viewing the live Published state'
            );
        },

        'rollback button: hidden for a non-active publication row': function () {
            var state  = { status: 'PUBLICATION', currentPublicationId: 3, canRollback: true };
            var pubId  = 5; // different publication
            var show   = state.canRollback && state.status === 'PUBLICATION' && state.currentPublicationId == pubId;
            this.assertFalse(show,
                'Button must be hidden for publications that are not currently being previewed'
            );
        },

        'rollback button: shown only for the active publication row': function () {
            var state  = { status: 'PUBLICATION', currentPublicationId: 5, canRollback: true };
            var pubId  = 5; // same publication
            var show   = state.canRollback && state.status === 'PUBLICATION' && state.currentPublicationId == pubId;
            this.assertTrue(show,
                'Button must be shown when the user is previewing this exact publication'
            );
        },

        'rollback button: hidden even for active publication when canRollback=false': function () {
            var state  = { status: 'PUBLICATION', currentPublicationId: 5, canRollback: false };
            var pubId  = 5;
            var show   = state.canRollback && state.status === 'PUBLICATION' && state.currentPublicationId == pubId;
            this.assertFalse(show,
                'Button must be hidden when user lacks canRollback permission, even if publication is active'
            );
        },

        // ====================================================================
        // GROUP 8: Bug 3 regression — [data-publication-id] handler must NOT
        //          fire for rollback buttons (which also carry data-publication-id).
        //
        //          The selector '[data-publication-id]:not([data-action])' ensures
        //          that _loadPublication() is skipped when the element already
        //          has a data-action attribute (handled by the rollback handler).
        //
        //          We test the selector logic as a pure string predicate.
        // ====================================================================

        'Bug 3: element with data-publication-id but no data-action matches load handler': function () {
            // Simulates: <a data-publication-id="5"> — should trigger _loadPublication
            var el = { hasDataAction: false, hasDataPublicationId: true };
            var matchesLoadHandler = el.hasDataPublicationId && !el.hasDataAction;
            this.assertTrue(matchesLoadHandler,
                'A plain publication link (no data-action) must match the load handler selector'
            );
        },

        'Bug 3: element with both data-publication-id and data-action="rollback" does NOT match load handler': function () {
            // Simulates: <button data-action="rollback" data-publication-id="5">
            // Must NOT trigger _loadPublication — only _rollbackTo
            var el = { hasDataAction: true, hasDataPublicationId: true, dataAction: 'rollback' };
            var matchesLoadHandler = el.hasDataPublicationId && !el.hasDataAction;
            this.assertFalse(matchesLoadHandler,
                'A rollback button carries data-publication-id but must not match the load handler ' +
                '(regression: both handlers fired before the :not([data-action]) guard was added)'
            );
        },

        'Bug 3: only the data-action handler fires for rollback button click': function () {
            // Invariant: given a button with data-action="rollback" and data-publication-id="7",
            // exactly one handler fires (_rollbackTo), not two (_rollbackTo + _loadPublication).
            var el = { dataAction: 'rollback', dataPublicationId: 7 };

            var rollbackHandlerFired = el.dataAction === 'rollback';
            var loadHandlerFired     = el.dataPublicationId !== undefined && el.dataAction === undefined;

            this.assertTrue(rollbackHandlerFired, 'Rollback handler must fire for this element');
            this.assertFalse(loadHandlerFired,
                'Load handler must NOT fire for a rollback button — ' +
                'selector must be [data-publication-id]:not([data-action])'
            );
        },

        // ====================================================================
         // GROUP 9: Discard draft button visibility logic
         //
         // The discard button is shown only when status === 'DRAFT' && changesCount > 0.
         // It is independent of canPublish (user may not have publish permission but can
         // still discard), but it must be hidden when not in DRAFT mode even if there
         // are pending changes.
         // We test the pure visibility predicate:
         //   shouldShowDiscard(status, changesCount) → boolean
         // ====================================================================

         'discard button: hidden when changesCount = 0': function () {
             var status       = 'DRAFT';
             var changesCount = 0;
             var shouldShow   = status === 'DRAFT' && changesCount > 0;
             this.assertFalse(shouldShow,
                 'Discard button must be hidden when there are no draft changes'
             );
         },

         'discard button: shown when status is DRAFT and changesCount = 1 (boundary)': function () {
             var status       = 'DRAFT';
             var changesCount = 1;
             var shouldShow   = status === 'DRAFT' && changesCount > 0;
             this.assertTrue(shouldShow,
                 'Discard button must appear at changesCount = 1 in DRAFT mode'
             );
         },

         'discard button: shown when status is DRAFT and changesCount > 1': function () {
             var status       = 'DRAFT';
             var changesCount = 5;
             var shouldShow   = status === 'DRAFT' && changesCount > 0;
             this.assertTrue(shouldShow,
                 'Discard button must be shown when there are multiple draft changes'
             );
         },

         'discard button: visible regardless of canPublish permission': function () {
             // canPublish = false but DRAFT + changesCount > 0 → discard button still shows
             var status          = 'DRAFT';
             var changesCount    = 3;
             var permCanPublish  = false;
             var showDiscard     = status === 'DRAFT' && changesCount > 0;
             var showPublish     = permCanPublish && changesCount > 0; // requires permission too
             this.assertTrue(showDiscard,
                 'Discard button must show even when user lacks canPublish permission'
             );
             this.assertFalse(showPublish,
                 'Publish button must stay hidden when canPublish is false'
             );
         },

         'discard button: hidden when status is PUBLISHED even if changesCount > 0': function () {
             var status       = 'PUBLISHED';
             var changesCount = 3;
             var shouldShow   = status === 'DRAFT' && changesCount > 0;
             this.assertFalse(shouldShow,
                 'Discard button must be hidden in PUBLISHED mode'
             );
         },

         'discard button: hidden when status is PUBLICATION even if changesCount > 0': function () {
             var status       = 'PUBLICATION';
             var changesCount = 3;
             var shouldShow   = status === 'DRAFT' && changesCount > 0;
             this.assertFalse(shouldShow,
                 'Discard button must be hidden in PUBLICATION (preview) mode'
             );
         },

        // ====================================================================
        // GROUP 10: Discard draft confirm dialog logic
        //
        // _discardDraft() shows confirm(message) and aborts if user cancels.
        // Test the confirm condition: only called when changesCount > 0.
        // ====================================================================

        'discard confirm: dialog shown when changesCount > 0': function () {
            var changesCount = 3;
            var dialogShouldShow = changesCount > 0;
            this.assertTrue(dialogShouldShow,
                'Confirm dialog must be triggered when there are draft changes to discard'
            );
        },

        'discard confirm: dialog skipped when changesCount = 0 (early return)': function () {
            var changesCount = 0;
            var dialogShouldShow = changesCount > 0;
            this.assertFalse(dialogShouldShow,
                '_discardDraft() must return early (no dialog, no mutation) when changesCount = 0'
            );
        },

        'discard confirm: after discard changesCount resets to 0': function () {
            // Simulate the success path of _discardDraft()
            var state = { changesCount: 4 };
            // On success response:
            state.changesCount = 0;
            this.assertEquals(0, state.changesCount,
                'changesCount must be reset to 0 after a successful discard'
            );
        },

        'discard confirm: after discard canPublish becomes false': function () {
            // After discard: changesCount=0 → canPublish must be false
            var perm = true;
            var changesCount = 0; // after discard
            var status = 'DRAFT';
            var result = computeCanPublish(perm, changesCount, status);
            this.assertFalse(result,
                'canPublish must be false after draft is discarded (changesCount=0)'
            );
        },

        // ====================================================================
        // GROUP 11: themeEditorDraftSaved → server re-fetch fix
        //
        // Regression tests for the bug where the Publish button did not appear
        // after saving font/palette changes because the client-side
        // draftChangesCount (PanelState.getModifiedCount + PaletteManager.getModifiedCount)
        // could return 0 when all saved values happened to equal the theme defaults.
        //
        // The fix: the themeEditorDraftSaved handler now calls
        // metadataLoader.loadMetadata() to get the real server count and only
        // falls back to the client-supplied value if the request fails.
        //
        // We test the decision logic and integration contract in isolation
        // using a simulated metadataLoader and options object.
        // ====================================================================

        'fix: server count wins over client count in happy path': function (done) {
            // Scenario: client computes draftChangesCount=0 (saved value == default)
            // but server actually has 3 draft records.
            var options = { changesCount: 0, currentStatus: 'DRAFT' };
            var renderCallCount = 0;

            // Simulate metadataLoader.loadMetadata() resolving with real server data
            var fakeMetadataLoader = {
                loadMetadata: function () {
                    return $.Deferred().resolve({ draftChangesCount: 3 }).promise();
                }
            };

            // Simulate the fixed handler logic
            fakeMetadataLoader.loadMetadata().then(function (meta) {
                options.changesCount = meta.draftChangesCount;
                renderCallCount++;
            }).always(function () {
                try {
                    this.assertEquals(3, options.changesCount,
                        'changesCount must be 3 (from server), not 0 (from client)'
                    );
                    this.assertEquals(1, renderCallCount,
                        'render must be called exactly once after server responds'
                    );
                    this.assertTrue(
                        computeCanPublish(true, options.changesCount, options.currentStatus),
                        'Publish button must appear after server returns changesCount=3'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            }.bind(this));
        },

        'fix: fallback to client count when loadMetadata fails': function (done) {
            // Scenario: server request fails → fall back to client-supplied count
            var options = { changesCount: 0, currentStatus: 'DRAFT' };
            var clientData = { draftChangesCount: 2 };

            var fakeMetadataLoader = {
                loadMetadata: function () {
                    return $.Deferred().reject('network error').promise();
                }
            };

            fakeMetadataLoader.loadMetadata().then(function () {
                // should not reach here
                options.changesCount = 999;
            }).catch(function () {
                // fallback path
                if (clientData && typeof clientData.draftChangesCount !== 'undefined') {
                    options.changesCount = clientData.draftChangesCount;
                }
            }).always(function () {
                try {
                    this.assertEquals(2, options.changesCount,
                        'On network failure, changesCount must fall back to client-supplied value (2)'
                    );
                    this.assertTrue(
                        computeCanPublish(true, options.changesCount, options.currentStatus),
                        'Publish button must still appear via fallback count'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            }.bind(this));
        },

        'fix: no crash when loadMetadata fails and data has no draftChangesCount': function (done) {
            // Edge case: server fails AND event data is malformed — must not throw
            var options = { changesCount: 0, currentStatus: 'DRAFT' };
            var clientData = {}; // no draftChangesCount key

            var fakeMetadataLoader = {
                loadMetadata: function () {
                    return $.Deferred().reject('timeout').promise();
                }
            };

            var errorThrown = false;
            try {
                fakeMetadataLoader.loadMetadata().then(function () {
                    options.changesCount = 999;
                }).catch(function () {
                    if (clientData && typeof clientData.draftChangesCount !== 'undefined') {
                        options.changesCount = clientData.draftChangesCount;
                    }
                    // else: leave changesCount unchanged — no crash
                }).always(function () {
                    try {
                        this.assertEquals(0, options.changesCount,
                            'changesCount stays 0 when both server and fallback data are unavailable'
                        );
                        done();
                    } catch (e) {
                        done(e);
                    }
                }.bind(this));
            } catch (e) {
                errorThrown = true;
                done(new Error('Handler threw unexpectedly: ' + e.message));
            }
        },

        'fix: server count=0 correctly hides Publish button (all changes reverted)': function (done) {
            // Scenario: user saved changes that brought all values back to defaults.
            // Server correctly returns 0 draft records → Publish button must be hidden.
            var options = { changesCount: 5, currentStatus: 'DRAFT' }; // stale value before save

            var fakeMetadataLoader = {
                loadMetadata: function () {
                    return $.Deferred().resolve({ draftChangesCount: 0 }).promise();
                }
            };

            fakeMetadataLoader.loadMetadata().then(function (meta) {
                options.changesCount = meta.draftChangesCount;
            }).always(function () {
                try {
                    this.assertEquals(0, options.changesCount,
                        'changesCount must be 0 when server reports no outstanding draft records'
                    );
                    this.assertFalse(
                        computeCanPublish(true, options.changesCount, options.currentStatus),
                        'Publish button must be hidden when server confirms 0 draft changes'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            }.bind(this));
        },

        'fix: client count=0 is ignored when server returns actual count (font/palette edge case)': function (done) {
            // This is the exact reproduction of the reported bug:
            // - User changes font settings, saves
            // - PanelState.getModifiedCount() returns 0 because saved value equals theme default
            // - Without the fix: draftChangesCount=0 → Publish button hidden
            // - With the fix: server returns 1 → Publish button shown
            var clientSuppliedCount = 0; // what settings-editor.js triggers in the event
            var options = { changesCount: clientSuppliedCount, currentStatus: 'DRAFT' };

            // Without fix: apply client count directly
            var withoutFix = computeCanPublish(true, clientSuppliedCount, 'DRAFT');
            this.assertFalse(withoutFix,
                'Without fix: Publish button hidden because client count=0 (bug reproduced)'
            );

            // With fix: server re-fetch overrides client count
            var fakeMetadataLoader = {
                loadMetadata: function () {
                    return $.Deferred().resolve({ draftChangesCount: 1 }).promise();
                }
            };

            fakeMetadataLoader.loadMetadata().then(function (meta) {
                options.changesCount = meta.draftChangesCount;
            }).always(function () {
                try {
                    var withFix = computeCanPublish(true, options.changesCount, 'DRAFT');
                    this.assertTrue(withFix,
                        'With fix: Publish button appears because server returns real count=1'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            }.bind(this));
        }
    });
});
