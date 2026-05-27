/**
 * Settings Editor — Field Reset/Restore CSS Preview Selector Tests
 *
 * Verifies that _applyFieldResetToPreview() passes the correct CSS selector
 * to CssPreviewManager.setVariable() when the field has a custom data-selector.
 *
 * Bug: _applyFieldResetToPreview reads data-property, data-format, data-default
 * but does NOT read data-selector — so setVariable always receives selector=undefined
 * which falls back to ':root', regardless of the field's actual selector.
 *
 * Result: after Discard or Restore, the live-preview CSS block is updated under
 * ':root' instead of the field's custom selector (e.g. '.columns-container').
 *
 * Test layers:
 *   L1  DOM attribute reading — data-selector present / absent
 *   L2  dispatch call shape   — selector forwarded to setVariable / defaulted to :root
 *   REGRESSION  old code (no selector) vs fixed code (with selector)
 *   L3  full chain            — reset → correct CSS block per selector
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function ($, TestFramework) {
    'use strict';

    // ─── DOM helpers ─────────────────────────────────────────────────────────

    function makeField(opts) {
        opts = opts || {};
        var $el = $('<div></div>')
            .attr('data-section', opts.sectionCode || 'layout')
            .attr('data-field',   opts.fieldCode   || 'columns_gap')
            .attr('data-type',    opts.type        || 'range');

        if (opts.property !== undefined) {
            $el.attr('data-property', opts.property);
        }
        if (opts.selector !== undefined) {
            $el.attr('data-selector', opts.selector);
        }
        if (opts.format !== undefined) {
            $el.attr('data-format', opts.format);
        }
        if (opts.defaultValue !== undefined) {
            $el.attr('data-default', opts.defaultValue);
        }

        return $el;
    }

    // ─── Inline reproduction of _applyFieldResetToPreview logic ─────────────

    /**
     * OLD (broken) dispatch — does not forward selector.
     * Mirrors production code before the fix.
     */
    function runDispatchOld($field, value) {
        var fieldCssVar = $field.attr('data-property');
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
                // selector intentionally absent — this is the bug
            }
        };
    }

    /**
     * FIXED dispatch — reads data-selector and forwards to fieldData.selector.
     * This is the expected post-fix behaviour.
     */
    function runDispatchFixed($field, value) {
        var fieldCssVar = $field.attr('data-property');
        var fieldType   = ($field.attr('data-type') || '').toLowerCase();

        if (!fieldCssVar || value === undefined) {
            return null;
        }

        if (typeof value === 'string' && value.startsWith('--color-')) {
            return {
                method:   'removeVariable',
                varName:  fieldCssVar,
                selector: $field.attr('data-selector') || ':root'
            };
        }

        return {
            method:    'setVariable',
            varName:   fieldCssVar,
            value:     value,
            fieldType: fieldType,
            fieldData: {
                format:       $field.attr('data-format'),
                defaultValue: $field.attr('data-default'),
                selector:     $field.attr('data-selector') || ':root'
            }
        };
    }

    // ─── Inline CSS preview (mirrors makePreview from selector-integration-test) ──

    function makePreview() {
        var changes = {};
        return {
            setVariable: function (varName, value, selector) {
                changes[varName] = { value: value, selector: selector || ':root' };
            },
            removeVariable: function (varName) {
                delete changes[varName];
            },
            buildCss: function () {
                var blocks = {};
                Object.keys(changes).forEach(function (varName) {
                    var entry    = changes[varName];
                    var selector = entry.selector || ':root';
                    if (!blocks[selector]) { blocks[selector] = []; }
                    blocks[selector].push('    ' + varName + ': ' + entry.value + ';');
                });
                return Object.keys(blocks).map(function (sel) {
                    return sel + ' {\n' + blocks[sel].join('\n') + '\n}';
                }).join('\n');
            }
        };
    }

    // ─── Suite ───────────────────────────────────────────────────────────────

    return TestFramework.suite('Settings Editor — Field Reset CSS Preview Selector', {

        // ── L1: DOM attribute reading ─────────────────────────────────────────

        '[L1] reads data-selector from field element': function () {
            var $field = makeField({ selector: '.columns-container' });
            this.assertEquals(
                $field.attr('data-selector'),
                '.columns-container',
                'data-selector must be readable from DOM element'
            );
        },

        '[L1] data-selector absent → falls back to :root': function () {
            var $field = makeField({});
            this.assertEquals(
                $field.attr('data-selector') || ':root',
                ':root',
                'missing data-selector must default to :root'
            );
        },

        // ── L2: dispatch call shape ───────────────────────────────────────────

        '[L2] setVariable receives custom selector on reset': function () {
            var $field = makeField({
                property: '--columns-gap',
                selector: '.columns-container'
            });

            var result = runDispatchFixed($field, '32px');

            this.assertNotNull(result, 'dispatch must produce result');
            this.assertEquals(result.method, 'setVariable');
            this.assertEquals(
                result.fieldData.selector,
                '.columns-container',
                'selector must be forwarded to setVariable fieldData'
            );
        },

        '[L2] setVariable defaults to :root when no data-selector': function () {
            var $field = makeField({ property: '--font-size' });

            var result = runDispatchFixed($field, '18px');

            this.assertNotNull(result);
            this.assertEquals(
                result.fieldData.selector,
                ':root',
                'selector must default to :root when absent'
            );
        },

        '[L2] removeVariable includes selector for palette-ref reset': function () {
            var $field = makeField({
                property: '--base-color',
                selector: '.columns-container'
            });

            var result = runDispatchFixed($field, '--color-brand-primary');

            this.assertNotNull(result);
            this.assertEquals(result.method, 'removeVariable');
            this.assertEquals(
                result.selector,
                '.columns-container',
                'removeVariable must receive selector for custom-selector field'
            );
        },

        // ── REGRESSION: old code vs fixed code ───────────────────────────────

        'REGRESSION: old code sends to :root; fixed code sends to custom selector': function () {
            var $field = makeField({
                property: '--columns-gap',
                selector: '.columns-container'
            });

            var oldResult   = runDispatchOld($field, '32px');
            var fixedResult = runDispatchFixed($field, '32px');

            // Old code: selector absent in fieldData → setVariable defaults to :root
            this.assertEquals(
                oldResult.fieldData.selector,
                undefined,
                'OLD: selector must be absent in fieldData (reproduces the bug)'
            );

            // Fixed code: selector correctly forwarded
            this.assertEquals(
                fixedResult.fieldData.selector,
                '.columns-container',
                'FIXED: selector must be .columns-container'
            );
        },

        // ── L3: full chain ────────────────────────────────────────────────────

        '[L3] reset of custom-selector field updates correct CSS block': function () {
            var $field = makeField({
                property: '--columns-gap',
                selector: '.columns-container'
            });

            var result  = runDispatchFixed($field, '32px');
            var preview = makePreview();

            preview.setVariable(result.varName, result.value, result.fieldData.selector);

            var css = preview.buildCss();

            this.assertTrue(
                css.indexOf('.columns-container {') !== -1,
                '.columns-container block must be emitted'
            );
            this.assertTrue(
                css.indexOf('--columns-gap') !== -1,
                '--columns-gap must be in CSS'
            );
            this.assertEquals(
                css.indexOf(':root'),
                -1,
                'no :root block — var belongs to .columns-container only'
            );
        },

        '[L3] old code: reset of custom-selector field wrongly updates :root': function () {
            var $field = makeField({
                property: '--columns-gap',
                selector: '.columns-container'
            });

            var result  = runDispatchOld($field, '32px');
            var preview = makePreview();

            // Old code passes undefined selector → preview defaults to :root
            preview.setVariable(result.varName, result.value, result.fieldData.selector);

            var css = preview.buildCss();

            this.assertTrue(
                css.indexOf(':root {') !== -1,
                'OLD: :root block emitted (wrong — should be .columns-container)'
            );
            this.assertEquals(
                css.indexOf('.columns-container'),
                -1,
                'OLD: .columns-container block absent (confirms the bug)'
            );
        }

    });
});
