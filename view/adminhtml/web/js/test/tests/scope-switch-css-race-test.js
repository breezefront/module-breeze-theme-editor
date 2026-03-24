/**
 * Scope-Switch CSS Race Condition — Pure Logic Tests
 *
 * Validates the two fixes applied to editor/css-manager.js and
 * publication-selector/css-state-restorer.js that prevent stale CSS
 * from being injected into the iframe after a scope switch.
 *
 * BUG SCENARIO
 * ─────────────
 *  t=0    init({scopeId:21}) → iframe not ready → retry loop
 *  t=100  scopeChanged 21→20 → listener NOT registered yet → MISSED
 *  t=400  init() completes → registers listener → but scopeId is still 21 (stale)
 *  t=500  bte:iframeReloaded → restoreCssState → switchTo(DRAFT) → getCss(scopeId=21) → BUG
 *
 *  FIX A  listener is registered BEFORE the retry loop (editor/css-manager.js)
 *  FIX B  switchTo() captures effectiveScopeId at call-time; if scope changed
 *         while the HTTP request was in-flight the .then() discards the result
 *  FIX C  css-state-restorer passes {scope, scopeId} from ctx explicitly so
 *         the caller—not module-level vars—controls which scope is used
 *
 * We test the pure logic of each fix in isolation (no DOM, no real cssManager,
 * no widget instantiation) following the same pattern as css-state-restorer-test.js.
 *
 *  GROUP 1 — Stale-response guard (FIX B)
 *    effectiveScopeId captured at call-time vs. current scopeId at .then()-time
 *
 *  GROUP 2 — scopeCtx forwarding from ctx (FIX C)
 *    { scope, scopeId } formed correctly from various ctx shapes
 *
 *  GROUP 3 — reinit() updates module-level vars (FIX A side-effect)
 *    When scopeChanged fires, reinit() must update scope/scopeId and
 *    optionally flush status vars so the next switchTo() uses fresh values
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // GROUP 1 helpers
    //
    // Mirrors the stale-response guard in editor/css-manager.js switchTo():
    //
    //   var effectiveScopeId = (ctx && ctx.scopeId) || scopeId;   // captured at call-time
    //   ...
    //   .then(function(response) {
    //       if (effectiveScopeId !== scopeId) {
    //           return { ..., stale: true };
    //       }
    //       // ... use response
    //   })
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Captures effective scope id at call-time (mirrors line 294 of css-manager.js).
     * ctx overrides the module-level scopeId when provided.
     */
    function captureEffectiveScopeId(ctx, moduleScopeId) {
        return (ctx && ctx.scopeId != null) ? ctx.scopeId : moduleScopeId;
    }

    /**
     * Mirrors the stale-response guard in the .then() callback.
     * Returns true when the response should be discarded.
     */
    function isStaleResponse(effectiveScopeId, currentScopeId) {
        return effectiveScopeId !== currentScopeId;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GROUP 2 helpers
    //
    // Mirrors the scopeCtx extraction in css-state-restorer.js:
    //
    //   var scopeCtx = { scope: ctx.scope, scopeId: ctx.scopeId };
    //   cssManager.switchTo(status, pubId, scopeCtx);
    // ─────────────────────────────────────────────────────────────────────────

    function buildScopeCtx(ctx) {
        return { scope: ctx.scope, scopeId: ctx.scopeId };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GROUP 3 helpers
    //
    // Mirrors reinit() in editor/css-manager.js (lines 515-526):
    //
    //   reinit: function(config, flush) {
    //       if (config) { scope = config.scope; scopeId = config.scopeId; ... }
    //       if (flush)  { currentStatus = DRAFT; currentPublicationId = null; }
    //   }
    // ─────────────────────────────────────────────────────────────────────────

    function reinit(state, config, flush) {
        var next = {
            scope:               state.scope,
            scopeId:             state.scopeId,
            themeId:             state.themeId,
            currentStatus:       state.currentStatus,
            currentPublicationId: state.currentPublicationId
        };
        if (config) {
            next.scope   = config.scope   !== undefined ? config.scope   : next.scope;
            next.scopeId = config.scopeId !== undefined ? config.scopeId : next.scopeId;
            next.themeId = config.themeId !== undefined ? config.themeId : next.themeId;
        }
        if (flush) {
            next.currentStatus        = 'DRAFT';
            next.currentPublicationId = null;
        }
        return next;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Suite
    // ─────────────────────────────────────────────────────────────────────────

    return TestFramework.suite('Scope-Switch CSS Race Condition — pure logic', {

        // =====================================================================
        // GROUP 1 — Stale-response guard
        // =====================================================================

        'staleGuard: effectiveScopeId === scopeId → response is fresh': function () {
            // Normal case: scope did not change while request was in-flight
            var effectiveScopeId = 21;
            var currentScopeId   = 21;
            this.assertFalse(
                isStaleResponse(effectiveScopeId, currentScopeId),
                'Response must NOT be discarded when scopeId is unchanged'
            );
        },

        'staleGuard: effectiveScopeId !== scopeId → response is stale': function () {
            // Scope changed from 21→20 while GraphQL request was in-flight
            var effectiveScopeId = 21; // captured at call-time
            var currentScopeId   = 20; // scopeChanged fired mid-flight
            this.assertTrue(
                isStaleResponse(effectiveScopeId, currentScopeId),
                'Response MUST be discarded when scopeId changed during the request'
            );
        },

        'staleGuard: both scopeIds null (default scope) → not stale': function () {
            // scope=default has scopeId=null on both sides → null === null → fresh
            this.assertFalse(
                isStaleResponse(null, null),
                'null === null must be treated as fresh (default scope)'
            );
        },

        'staleGuard: effectiveScopeId=null, currentScopeId set → stale': function () {
            // Edge: was default scope at call-time, switched to stores scope mid-flight
            this.assertTrue(
                isStaleResponse(null, 20),
                'null !== 20 must be treated as stale'
            );
        },

        'staleGuard: captureEffectiveScopeId uses ctx when provided': function () {
            // ctx overrides module-level scopeId at call-time
            var captured = captureEffectiveScopeId({ scopeId: 21 }, 20);
            this.assertEquals(21, captured,
                'ctx.scopeId must override module-level scopeId'
            );
        },

        'staleGuard: captureEffectiveScopeId falls back to module var when ctx is null': function () {
            var captured = captureEffectiveScopeId(null, 20);
            this.assertEquals(20, captured,
                'Must fall back to module-level scopeId when ctx is null'
            );
        },

        'staleGuard: captureEffectiveScopeId falls back when ctx has no scopeId': function () {
            // ctx exists but scopeId is absent (e.g. partial ctx object)
            var captured = captureEffectiveScopeId({ scope: 'stores' }, 20);
            this.assertEquals(20, captured,
                'Must fall back to module-level scopeId when ctx.scopeId is absent'
            );
        },

        // =====================================================================
        // GROUP 2 — scopeCtx forwarding from ctx
        // =====================================================================

        'scopeCtx: stores scope forwarded correctly': function () {
            var ctx = { scope: 'stores', scopeId: 21 };
            var scopeCtx = buildScopeCtx(ctx);
            this.assertEquals('stores', scopeCtx.scope,   'scope must be forwarded');
            this.assertEquals(21,       scopeCtx.scopeId, 'scopeId must be forwarded');
        },

        'scopeCtx: websites scope forwarded correctly': function () {
            var ctx = { scope: 'websites', scopeId: 3 };
            var scopeCtx = buildScopeCtx(ctx);
            this.assertEquals('websites', scopeCtx.scope);
            this.assertEquals(3,          scopeCtx.scopeId);
        },

        'scopeCtx: default scope with scopeId=null forwarded correctly': function () {
            var ctx = { scope: 'default', scopeId: null };
            var scopeCtx = buildScopeCtx(ctx);
            this.assertEquals('default', scopeCtx.scope);
            this.assertNull(scopeCtx.scopeId,
                'scopeId null must be forwarded as null for default scope'
            );
        },

        'scopeCtx: scopeId=0 (falsy) forwarded as 0, not coerced': function () {
            // scopeId=0 could occur if server returns 0; must not be silently dropped
            var ctx = { scope: 'stores', scopeId: 0 };
            var scopeCtx = buildScopeCtx(ctx);
            this.assertEquals(0, scopeCtx.scopeId,
                'scopeId=0 must be preserved, not coerced to null/undefined'
            );
        },

        'scopeCtx: does not carry extra keys from ctx': function () {
            // buildScopeCtx must produce only { scope, scopeId } — no themeId leak
            var ctx = { scope: 'stores', scopeId: 5, themeId: 99, element: {} };
            var scopeCtx = buildScopeCtx(ctx);
            this.assertEquals(2, Object.keys(scopeCtx).length,
                'scopeCtx must contain exactly scope and scopeId'
            );
        },

        // =====================================================================
        // GROUP 3 — reinit() updates module-level vars (FIX A side-effect)
        // =====================================================================

        'reinit: updates scope and scopeId from config': function () {
            var state  = { scope: 'stores', scopeId: 21, themeId: 1, currentStatus: 'DRAFT', currentPublicationId: null };
            var result = reinit(state, { scope: 'stores', scopeId: 20, themeId: null }, false);
            this.assertEquals('stores', result.scope,   'scope must be updated');
            this.assertEquals(20,       result.scopeId, 'scopeId must be updated to new value');
        },

        'reinit: flush=true resets currentStatus to DRAFT': function () {
            var state  = { scope: 'stores', scopeId: 20, themeId: 1, currentStatus: 'PUBLISHED', currentPublicationId: 42 };
            var result = reinit(state, null, true);
            this.assertEquals('DRAFT', result.currentStatus,
                'flush must reset currentStatus to DRAFT'
            );
        },

        'reinit: flush=true clears currentPublicationId': function () {
            var state  = { scope: 'stores', scopeId: 20, themeId: 1, currentStatus: 'PUBLICATION', currentPublicationId: 42 };
            var result = reinit(state, null, true);
            this.assertNull(result.currentPublicationId,
                'flush must set currentPublicationId to null'
            );
        },

        'reinit: flush=false preserves currentStatus': function () {
            var state  = { scope: 'stores', scopeId: 21, themeId: 1, currentStatus: 'PUBLISHED', currentPublicationId: null };
            var result = reinit(state, { scope: 'stores', scopeId: 20, themeId: null }, false);
            this.assertEquals('PUBLISHED', result.currentStatus,
                'Without flush, currentStatus must be preserved'
            );
        },

        'reinit: null config keeps existing scope vars': function () {
            var state  = { scope: 'websites', scopeId: 5, themeId: 2, currentStatus: 'DRAFT', currentPublicationId: null };
            var result = reinit(state, null, false);
            this.assertEquals('websites', result.scope,   'scope must be unchanged when config is null');
            this.assertEquals(5,          result.scopeId, 'scopeId must be unchanged when config is null');
        },

        'reinit: scopeChanged 21→20 then stale guard catches in-flight request': function () {
            // End-to-end simulation of the race condition fix:
            // 1. switchTo() was called while scopeId=21 (effectiveScopeId=21)
            // 2. scopeChanged fires → reinit() updates scopeId to 20
            // 3. .then() runs: effectiveScopeId(21) !== current scopeId(20) → stale
            var state = { scope: 'stores', scopeId: 21, themeId: 1, currentStatus: 'DRAFT', currentPublicationId: null };

            // Step 1: capture effectiveScopeId at switchTo() call-time
            var effectiveScopeId = captureEffectiveScopeId({ scopeId: state.scopeId }, state.scopeId);
            this.assertEquals(21, effectiveScopeId, 'Captured scopeId must be 21 at call-time');

            // Step 2: scopeChanged fires → reinit updates module vars
            state = reinit(state, { scope: 'stores', scopeId: 20, themeId: null }, true);
            this.assertEquals(20, state.scopeId, 'After reinit, current scopeId must be 20');

            // Step 3: .then() stale guard
            this.assertTrue(
                isStaleResponse(effectiveScopeId, state.scopeId),
                'Stale guard must fire: captured=21, current=20 → discard response'
            );
        }
    });
});
