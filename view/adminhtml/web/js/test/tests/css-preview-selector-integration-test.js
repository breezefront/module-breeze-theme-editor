/**
 * CSS Preview Selector — Integration Tests
 *
 * Verifies the full chain:
 *   field.selector (config)
 *     → prepareData() → data.selectorAttr
 *     → render() → data-selector in HTML
 *     → extractFieldData($input) → fieldData.selector
 *     → setVariable() → changes[var].selector
 *     → _updateStyles() → correct CSS block emitted
 *
 * Level 1: prepareData — selectorAttr shape
 * Level 2: render — data-selector present in rendered HTML
 * Level 3: extractFieldData — reads data-selector from DOM
 * Level 4: full chain — correct CSS block per selector
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/range',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base'
], function ($, TestFramework, BaseRenderer, RangeRenderer, FieldHandlerBase) {
    'use strict';

    function field(overrides) {
        return Object.assign({
            code:     'gap',
            label:    'Gap',
            property: '--columns-gap',
            value:    '24px',
            default:  '16px',
            params:   { unit: 'px', min: 0, max: 100 }
        }, overrides);
    }

    // ─── inline fixed _updateStyles + setVariable logic ──────────────────────

    function makePreview() {
        var changes = {};
        return {
            setVariable: function (varName, value, selector) {
                changes[varName] = { value: value, selector: selector || ':root' };
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
            },
            changes: changes
        };
    }

    // ─────────────────────────────────────────────────────────────────────────

    return TestFramework.suite('CSS Preview Selector — Integration', function (t) {

        // ── Level 1: prepareData ─────────────────────────────────────────────

        t.test('[L1] selectorAttr set when field.selector is custom', function () {
            var data = BaseRenderer.prepareData(
                field({ selector: '.columns-container' }), 'layout'
            );
            t.assertEqual(
                data.selectorAttr,
                'data-selector=".columns-container"',
                'selectorAttr must be data-selector attribute string'
            );
        });

        t.test('[L1] selectorAttr empty when field.selector is :root', function () {
            var data = BaseRenderer.prepareData(
                field({ selector: ':root' }), 'layout'
            );
            t.assertEqual(data.selectorAttr, '', 'selectorAttr must be empty for :root');
        });

        t.test('[L1] selectorAttr empty when field has no selector', function () {
            var data = BaseRenderer.prepareData(field(), 'layout');
            t.assertEqual(data.selectorAttr, '', 'selectorAttr must be empty when no selector');
        });

        // ── Level 2: render → HTML contains data-selector ───────────────────

        t.test('[L2] rendered range HTML contains data-selector for custom selector', function () {
            var html = RangeRenderer.render(
                field({ selector: '.columns-container' }), 'layout'
            );
            t.assertTrue(
                html.indexOf('data-selector=".columns-container"') !== -1,
                'data-selector must appear in rendered HTML'
            );
        });

        t.test('[L2] rendered range HTML has no data-selector when no selector', function () {
            var html = RangeRenderer.render(field(), 'layout');
            t.assertTrue(
                html.indexOf('data-selector') === -1,
                'data-selector must not appear when field has no selector'
            );
        });

        t.test('[L2] rendered range HTML has no data-selector for :root selector', function () {
            var html = RangeRenderer.render(
                field({ selector: ':root' }), 'layout'
            );
            t.assertTrue(
                html.indexOf('data-selector') === -1,
                'data-selector must not appear for :root selector'
            );
        });

        // ── Level 3: extractFieldData reads data-selector from DOM ───────────

        t.test('[L3] extractFieldData reads selector from data-selector attribute', function () {
            var html = RangeRenderer.render(
                field({ selector: '.columns-container' }), 'layout'
            );
            var $container = $('<div>').html(html);
            var $input = $container.find('[data-property="--columns-gap"]').first();

            t.assertTrue($input.length > 0, 'input element found in rendered HTML');

            var fieldData = FieldHandlerBase.extractFieldData($input);
            t.assertEqual(
                fieldData.selector,
                '.columns-container',
                'extractFieldData must return selector from data-selector attr'
            );
        });

        t.test('[L3] extractFieldData defaults to :root when no data-selector', function () {
            var html = RangeRenderer.render(field(), 'layout');
            var $container = $('<div>').html(html);
            var $input = $container.find('[data-property="--columns-gap"]').first();

            var fieldData = FieldHandlerBase.extractFieldData($input);
            t.assertEqual(
                fieldData.selector,
                ':root',
                'extractFieldData must default to :root when no data-selector'
            );
        });

        // ── Level 4: full chain → correct CSS block ──────────────────────────

        t.test('[L4] full chain: custom selector var goes to its own CSS block', function () {
            var html = RangeRenderer.render(
                field({ selector: '.columns-container' }), 'layout'
            );
            var $container = $('<div>').html(html);
            var $input = $container.find('[data-property="--columns-gap"]').first();

            var fieldData = FieldHandlerBase.extractFieldData($input);

            var preview = makePreview();
            preview.setVariable(fieldData.property, fieldData.value, fieldData.selector);

            var css = preview.buildCss();

            t.assertTrue(
                css.indexOf('.columns-container {') !== -1,
                '.columns-container block emitted'
            );
            t.assertTrue(
                css.indexOf('--columns-gap') !== -1,
                '--columns-gap present in CSS'
            );
            t.assertTrue(
                css.indexOf(':root') === -1,
                'no :root block — var belongs to .columns-container only'
            );
        });

        t.test('[L4] full chain: :root field stays in :root block', function () {
            var html = RangeRenderer.render(field(), 'layout');
            var $container = $('<div>').html(html);
            var $input = $container.find('[data-property="--columns-gap"]').first();

            var fieldData = FieldHandlerBase.extractFieldData($input);

            var preview = makePreview();
            preview.setVariable(fieldData.property, fieldData.value, fieldData.selector);

            var css = preview.buildCss();

            t.assertTrue(css.indexOf(':root {') !== -1, ':root block emitted');
            t.assertTrue(css.indexOf('--columns-gap') !== -1, '--columns-gap present');
            t.assertTrue(css.indexOf('.columns-container') === -1, 'no custom selector block');
        });

        t.test('[L4] full chain: mixed selectors produce separate blocks', function () {
            var preview = makePreview();

            // Simulate two fields changed — one custom selector, one :root
            var htmlCustom = RangeRenderer.render(
                field({ property: '--columns-gap', selector: '.columns-container' }), 'layout'
            );
            var htmlRoot = RangeRenderer.render(
                field({ code: 'font_size', property: '--font-size', selector: ':root' }), 'layout'
            );

            var $inputCustom = $('<div>').html(htmlCustom).find('[data-property="--columns-gap"]').first();
            var $inputRoot   = $('<div>').html(htmlRoot).find('[data-property="--font-size"]').first();

            var fdCustom = FieldHandlerBase.extractFieldData($inputCustom);
            var fdRoot   = FieldHandlerBase.extractFieldData($inputRoot);

            preview.setVariable(fdCustom.property, fdCustom.value, fdCustom.selector);
            preview.setVariable(fdRoot.property,   fdRoot.value,   fdRoot.selector);

            var css = preview.buildCss();

            t.assertTrue(css.indexOf('.columns-container {') !== -1, '.columns-container block');
            t.assertTrue(css.indexOf(':root {') !== -1,               ':root block');
            t.assertTrue(css.indexOf('--columns-gap') !== -1,         '--columns-gap present');
            t.assertTrue(css.indexOf('--font-size') !== -1,           '--font-size present');

            // Cross-contamination checks
            var rootStart = css.indexOf(':root {');
            var rootBlock = css.slice(rootStart, css.indexOf('}', rootStart));
            t.assertTrue(rootBlock.indexOf('--columns-gap') === -1, '--columns-gap NOT in :root');
        });

    });
});
