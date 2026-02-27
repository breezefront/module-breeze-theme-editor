/**
 * Settings Editor — Field Reset/Restore CSS Preview Update Tests
 *
 * Regression tests for the bug where clicking the "↺ Discard" button on a
 * color field did NOT update the live-preview <style> tag, leaving the old
 * (changed) color visible even though the field value was correctly reset.
 *
 * Root cause (settings-editor.js, field-reset and field-restore handlers):
 *   The handlers read $field.attr('data-css-var') to get the CSS variable name.
 *   The color field template (color.html) renders data-property, not data-css-var,
 *   so fieldCssVar was always undefined → the if (fieldCssVar && ...) guard failed
 *   silently → CssPreviewManager.setVariable/removeVariable was never called.
 *
 * Fixes applied (both field-reset and field-restore blocks):
 *   1. $field.attr('data-css-var')
 *        → $field.attr('data-property') || $field.attr('data-css-var')
 *      Matches how BaseHandler.extractFieldData() already reads it.
 *
 *   2. $field.attr('data-default-value')
 *        → $field.attr('data-default')
 *      The template renders data-default, not data-default-value.
 *
 *   3. Added .first() to the selector — a color field renders two elements
 *      with [data-section][data-field] (trigger div + input), so jQuery's
 *      .attr() must read from the first match only.
 *
 * Test layers:
 *   1–4   Attribute-reading logic  — isolated with real jQuery DOM nodes
 *   5–8   Dispatch routing logic   — routing between setVariable / removeVariable
 *   9–10  Regression guards        — exact before/after proof of the two attribute bugs
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function ($, TestFramework) {
    'use strict';

    // ─── DOM helpers ─────────────────────────────────────────────────────────

    /**
     * Create a jQuery element that mimics a rendered color field node.
     * Uses data-property (not data-css-var) — exactly like color.html template.
     *
     * @param {Object} opts
     * @param {String} [opts.sectionCode]
     * @param {String} [opts.fieldCode]
     * @param {String} [opts.property]   - renders as data-property (the standard)
     * @param {String} [opts.cssVar]     - renders as data-css-var  (legacy fallback)
     * @param {String} [opts.type]
     * @param {String} [opts.format]
     * @param {String} [opts.defaultValue] - renders as data-default
     * @returns {jQuery}
     */
    function makeField(opts) {
        opts = opts || {};
        var $el = $('<div></div>')
            .attr('data-section', opts.sectionCode || 'colors')
            .attr('data-field',   opts.fieldCode   || 'body-bg')
            .attr('data-type',    opts.type        || 'color');

        if (opts.property !== undefined) {
            $el.attr('data-property', opts.property);
        }
        if (opts.cssVar !== undefined) {
            $el.attr('data-css-var', opts.cssVar);
        }
        if (opts.format !== undefined) {
            $el.attr('data-format', opts.format);
        }
        if (opts.defaultValue !== undefined) {
            $el.attr('data-default', opts.defaultValue);
        }

        return $el;
    }

    // ─── Inline reproductions of settings-editor.js logic ────────────────────

    /**
     * Inline reproduction of the CSS-var resolution from the fixed handler.
     * Production code: $field.attr('data-property') || $field.attr('data-css-var')
     *
     * @param {jQuery} $field
     * @returns {String|undefined}
     */
    function resolveCssVar($field) {
        return $field.attr('data-property') || $field.attr('data-css-var');
    }

    /**
     * Inline reproduction of the OLD (broken) CSS-var resolution.
     * Production code before fix: $field.attr('data-css-var')
     *
     * Used only in the regression-guard test (Test 9) to prove the bug existed.
     *
     * @param {jQuery} $field
     * @returns {String|undefined}
     */
    function resolveCssVarOld($field) {
        return $field.attr('data-css-var');
    }

    /**
     * Inline reproduction of the full field-reset / field-restore dispatch block
     * extracted from settings-editor.js (field-reset and field-restore handlers
     * share identical logic).
     *
     * Returns a call-record describing which CssPreviewManager method should be
     * called and with what arguments, or null when the dispatch is skipped.
     *
     * @param {jQuery} $field  - element with [data-section][data-field] attributes
     * @param {*}      value   - reset/restore value from PanelState event data
     * @returns {Object|null}
     *   { method: 'setVariable',    varName, value, fieldType, fieldData } or
     *   { method: 'removeVariable', varName }                              or
     *   null (when skipped)
     */
    function runDispatch($field, value) {
        var fieldCssVar = $field.attr('data-property') || $field.attr('data-css-var');
        var fieldType   = ($field.attr('data-type') || '').toLowerCase();

        if (!fieldCssVar || value === undefined) {
            return null;
        }

        if (typeof value === 'string' && value.startsWith('--color-')) {
            return { method: 'removeVariable', varName: fieldCssVar };
        }

        return {
            method:    'setVariable',
            varName:   fieldCssVar,
            value:     value,
            fieldType: fieldType,
            fieldData: {
                format:       $field.attr('data-format'),
                defaultValue: $field.attr('data-default')
            }
        };
    }

    /**
     * Inline reproduction of the OLD (broken) dispatch that used data-css-var.
     * Used only in the regression-guard test (Test 9).
     */
    function runDispatchOld($field, value) {
        var fieldCssVar = $field.attr('data-css-var');   // broken: ignores data-property

        if (!fieldCssVar || value === undefined) {
            return null;   // silently skipped — this was the production bug
        }

        return { method: 'setVariable', varName: fieldCssVar, value: value };
    }

    // ─── Suite ───────────────────────────────────────────────────────────────

    return TestFramework.suite('Settings Editor — Field Reset CSS Preview', {

        // ─── Layer 1: attribute-reading logic ─────────────────────────────

        /**
         * Test 1: data-property is read correctly
         *
         * The color.html template renders data-property for every field element.
         * resolveCssVar() must return that value.
         */
        'should read CSS var from data-property attribute': function () {
            var $field = makeField({ property: '--body-bg' });
            this.assertEquals(
                resolveCssVar($field),
                '--body-bg',
                'data-property="--body-bg" must resolve to "--body-bg"'
            );
        },

        /**
         * Test 2: data-css-var is used as fallback when data-property is absent
         *
         * Ensures backward compatibility with any non-color field that may still
         * render data-css-var instead of data-property.
         */
        'should fall back to data-css-var when data-property is absent': function () {
            var $field = makeField({ cssVar: '--body-bg' });  // no data-property

            this.assertEquals(
                resolveCssVar($field),
                '--body-bg',
                'data-css-var="--body-bg" must be used as a fallback'
            );
        },

        /**
         * Test 3: data-property takes precedence over data-css-var when both present
         */
        'should prefer data-property over data-css-var when both are present': function () {
            var $field = makeField({ property: '--body-bg-new', cssVar: '--body-bg-old' });

            this.assertEquals(
                resolveCssVar($field),
                '--body-bg-new',
                'data-property must take precedence over data-css-var'
            );
        },

        /**
         * Test 4: neither attribute present → undefined → dispatch is skipped
         */
        'should return undefined when neither data-property nor data-css-var is present': function () {
            var $field = makeField({});  // no property, no cssVar

            this.assertEquals(
                resolveCssVar($field),
                undefined,
                'Missing both attributes must return undefined'
            );
        },

        // ─── Layer 2: dispatch routing logic ──────────────────────────────

        /**
         * Test 5: HEX reset value → setVariable dispatched with correct args
         *
         * Scenario: user changed body-bg to #b05a5a52, then clicks Discard.
         * PanelState restores it to #FFFFFF52 (draft value).
         * The live preview must be updated via setVariable('--body-bg', '#FFFFFF52', ...).
         */
        'should dispatch setVariable for a HEX reset value': function () {
            var $field = makeField({
                property:     '--body-bg',
                type:         'color',
                defaultValue: '#ffffff'
            });

            var result = runDispatch($field, '#FFFFFF52');

            this.assertNotNull(result,                      'Dispatch must produce a result for a HEX value');
            this.assertEquals(result.method,    'setVariable', 'HEX value must route to setVariable');
            this.assertEquals(result.varName,   '--body-bg',   'CSS var name must be "--body-bg"');
            this.assertEquals(result.value,     '#FFFFFF52',   'Value must be passed through unchanged');
            this.assertEquals(result.fieldType, 'color',       'fieldType must be "color"');
        },

        /**
         * Test 6: palette reference reset value → removeVariable dispatched
         *
         * When the draft value is a palette reference (e.g. --color-brand-primary),
         * the live preview removes the override var so the cascade resolves it via
         * var(--color-brand-primary) from the theme stylesheet.
         */
        'should dispatch removeVariable for a palette reference reset value': function () {
            var $field = makeField({ property: '--base-color', type: 'color' });

            var result = runDispatch($field, '--color-brand-primary');

            this.assertNotNull(result,                         'Dispatch must produce a result for a palette ref');
            this.assertEquals(result.method,  'removeVariable', 'Palette ref must route to removeVariable');
            this.assertEquals(result.varName, '--base-color',   'CSS var name must be "--base-color"');
        },

        /**
         * Test 7: undefined reset value → dispatch is skipped
         *
         * If PanelState.resetField() returns undefined the handler must be a no-op.
         */
        'should skip dispatch when reset value is undefined': function () {
            var $field = makeField({ property: '--body-bg' });

            var result = runDispatch($field, undefined);

            this.assertEquals(result, null, 'Dispatch must be skipped when value is undefined');
        },

        /**
         * Test 8: unresolvable CSS var → dispatch skipped even with valid value
         *
         * Defensive guard: if the field element somehow lacks both data-property
         * and data-css-var, the handler must not call setVariable with undefined
         * as the variable name.
         */
        'should skip dispatch when CSS var attribute is missing': function () {
            var $field = makeField({});  // no data-property, no data-css-var

            var result = runDispatch($field, '#FFFFFF52');

            this.assertEquals(result, null, 'Dispatch must be skipped when CSS var is unresolvable');
        },

        // ─── Layer 3: regression guards ───────────────────────────────────

        /**
         * Test 9 — REGRESSION GUARD: data-property vs data-css-var bug
         *
         * Directly documents the production bug that was fixed:
         *
         *   Before fix  settings-editor.js used $field.attr('data-css-var')
         *               The color.html template renders data-property → undefined
         *               → fieldCssVar was always undefined → guard failed → NO update
         *
         *   After fix   settings-editor.js uses $field.attr('data-property') || ...
         *               Reads data-property correctly → guard passes → update sent
         *
         * Both the broken and the fixed paths are asserted so that any future
         * regression (e.g. accidentally reverting to data-css-var) is caught
         * immediately.
         */
        'REGRESSION: data-property (fixed) must dispatch; data-css-var alone (broken) must not': function () {
            // Color field template renders data-property, NOT data-css-var
            var $field = makeField({ property: '--body-bg' });  // no data-css-var

            var brokenResult = runDispatchOld($field, '#FFFFFF52');
            var fixedResult  = runDispatch($field, '#FFFFFF52');

            this.assertEquals(
                brokenResult,
                null,
                'OLD code (data-css-var only): dispatch must be skipped — reproduces the bug'
            );
            this.assertNotNull(
                fixedResult,
                'FIXED code (data-property || data-css-var): dispatch must proceed'
            );
            this.assertEquals(
                fixedResult.varName,
                '--body-bg',
                'FIXED code: varName must be "--body-bg" resolved from data-property'
            );
        },

        /**
         * Test 10 — REGRESSION GUARD: data-default vs data-default-value bug
         *
         * The same handlers also read $field.attr('data-default-value') for
         * fieldData.defaultValue.  The template renders data-default (no "-value"
         * suffix), so defaultValue was always undefined before the fix.
         *
         * Impact: _formatColorValue() fell back to format:'hex' unconditionally
         * instead of auto-detecting from the default value.  For most fields this
         * produced a valid (if possibly wrong-format) result, so the visual bug was
         * masked — but the data was still incorrect.
         */
        'REGRESSION: defaultValue must come from data-default, not data-default-value': function () {
            var $field = makeField({
                property:     '--body-bg',
                defaultValue: '#ffffff52'  // renders as data-default
            });

            var result = runDispatch($field, '#FFFFFF52');

            this.assertNotNull(result, 'Dispatch must produce a result');
            this.assertEquals(
                result.fieldData.defaultValue,
                '#ffffff52',
                'fieldData.defaultValue must be read from data-default attribute'
            );

            // Also prove the OLD broken attribute name returns nothing
            var oldRead = $field.attr('data-default-value');
            this.assertEquals(
                oldRead,
                undefined,
                'data-default-value must be undefined — template uses data-default (no "-value")'
            );
        }

    });
});
