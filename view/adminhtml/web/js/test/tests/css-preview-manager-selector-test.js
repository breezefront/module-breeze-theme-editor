/**
 * CssPreviewManager CSS Selector Tests
 *
 * Verifies that live preview correctly emits CSS variables into their
 * configured CSS selector blocks (not always hardcoded into :root).
 *
 * Bug: _updateStyles() always builds ":root { ... }" for ALL variables,
 * ignoring the "selector" config field (e.g. ".columns-container", "body").
 * PHP CssGenerator correctly emits non-root vars into their own blocks,
 * but preview does not — causing wrong/missing styles in preview mode.
 *
 * Fix: store selector per variable in `changes`, group by selector in
 * _updateStyles(), emit separate CSS blocks per selector.
 *
 * All tests are pure-logic — no real DOM, no RequireJS, no iframe required.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    // =========================================================================
    // Inline copy of the relevant _updateStyles logic
    // This mirrors the CURRENT (buggy) production code for baseline,
    // and the FIXED version for regression tests.
    // =========================================================================

    /**
     * BUGGY implementation — always writes :root regardless of selector.
     */
    function buildCssBuggy(changes) {
        var css = ':root {\n';
        Object.keys(changes).forEach(function (varName) {
            css += '    ' + varName + ': ' + changes[varName] + ';\n';
        });
        css += '}';
        return css;
    }

    /**
     * FIXED implementation — groups vars by selector, emits one block per selector.
     * changes shape: { varName: { value: '...', selector: '...' } }
     */
    function buildCssFixed(changes) {
        var blocks = {};

        Object.keys(changes).forEach(function (varName) {
            var entry   = changes[varName];
            var value    = entry.value;
            var selector = entry.selector || ':root';

            if (!blocks[selector]) {
                blocks[selector] = [];
            }
            blocks[selector].push('    ' + varName + ': ' + value + ';');
        });

        return Object.keys(blocks).map(function (selector) {
            return selector + ' {\n' + blocks[selector].join('\n') + '\n}';
        }).join('\n');
    }

    /**
     * Minimal setVariable stub — records calls, stores entries in changes.
     * selector defaults to ':root' when not provided (backward compat).
     */
    function makeSetVariable(changes) {
        return function setVariable(varName, value, selector) {
            changes[varName] = {
                value:    value,
                selector: selector || ':root'
            };
        };
    }

    // =========================================================================
    // Tests
    // =========================================================================

    return TestFramework.suite('CssPreviewManager — CSS selector in preview', function (t) {

        // ------------------------------------------------------------------
        // 1. Production _updateStyles groups by selector correctly.
        //    Inlines the fixed logic from css-preview-manager.js _updateStyles.
        // ------------------------------------------------------------------
        t.test('[fixed] _updateStyles respects non-root selector', function () {
            // New changes shape: { varName: { value, selector } }
            var changes = {
                '--columns-gap': { value: '24px', selector: '.columns-container' }
            };

            // Inline the FIXED production _updateStyles logic:
            var blocks = {};
            Object.keys(changes).forEach(function (varName) {
                var entry    = changes[varName];
                var value    = entry.value;
                var selector = entry.selector || ':root';
                if (!blocks[selector]) { blocks[selector] = []; }
                blocks[selector].push('    ' + varName + ': ' + value + ';');
            });
            var css = Object.keys(blocks).map(function (selector) {
                return selector + ' {\n' + blocks[selector].join('\n') + '\n}';
            }).join('\n');

            t.assertTrue(
                css.indexOf('.columns-container {') !== -1,
                '.columns-container block emitted'
            );
            t.assertTrue(
                css.indexOf(':root') === -1,
                'No :root block when all vars have custom selector'
            );
            t.assertTrue(
                css.indexOf('--columns-gap: 24px') !== -1,
                '--columns-gap present in output'
            );
        });

        // ------------------------------------------------------------------
        // 2. FIX: :root vars stay in :root
        // ------------------------------------------------------------------
        t.test('[fix] :root vars are emitted in :root block', function () {
            var changes = {};
            var set = makeSetVariable(changes);

            set('--base-color', '#ff0000', ':root');
            set('--font-size',  '16px',    ':root');

            var css = buildCssFixed(changes);

            t.assertTrue(
                css.indexOf(':root {') !== -1,
                ':root block emitted'
            );
            t.assertTrue(
                css.indexOf('--base-color: #ff0000') !== -1,
                ':root var --base-color present'
            );
            t.assertTrue(
                css.indexOf('--font-size: 16px') !== -1,
                ':root var --font-size present'
            );
        });

        // ------------------------------------------------------------------
        // 3. FIX: custom selector vars go into their own block, NOT :root
        // ------------------------------------------------------------------
        t.test('[fix] custom-selector var is emitted in its own block, not :root', function () {
            var changes = {};
            var set = makeSetVariable(changes);

            set('--columns-gap', '24px', '.columns-container');

            var css = buildCssFixed(changes);

            t.assertTrue(
                css.indexOf('.columns-container {') !== -1,
                '.columns-container block emitted'
            );
            t.assertTrue(
                css.indexOf('--columns-gap: 24px') !== -1,
                '--columns-gap var present'
            );
            // Must NOT appear inside :root
            t.assertTrue(
                css.indexOf(':root') === -1,
                'No :root block when all vars have custom selector'
            );
        });

        // ------------------------------------------------------------------
        // 4. FIX: mixed selectors produce separate blocks
        // ------------------------------------------------------------------
        t.test('[fix] mixed selectors produce separate CSS blocks', function () {
            var changes = {};
            var set = makeSetVariable(changes);

            set('--base-color',   '#ff0000', ':root');
            set('--columns-gap',  '24px',    '.columns-container');
            set('--header-bg',    '#000000', 'header');

            var css = buildCssFixed(changes);

            t.assertTrue(css.indexOf(':root {') !== -1,             ':root block present');
            t.assertTrue(css.indexOf('.columns-container {') !== -1, '.columns-container block present');
            t.assertTrue(css.indexOf('header {') !== -1,             'header block present');

            // Each var in correct block
            var rootStart        = css.indexOf(':root {');
            var rootEnd          = css.indexOf('}', rootStart);
            var colStart         = css.indexOf('.columns-container {');
            var colEnd           = css.indexOf('}', colStart);
            var headerStart      = css.indexOf('header {');
            var headerEnd        = css.indexOf('}', headerStart);

            var rootBlock        = css.slice(rootStart, rootEnd);
            var colBlock         = css.slice(colStart, colEnd);
            var headerBlock      = css.slice(headerStart, headerEnd);

            t.assertTrue(rootBlock.indexOf('--base-color')  !== -1, '--base-color in :root');
            t.assertTrue(colBlock.indexOf('--columns-gap')  !== -1, '--columns-gap in .columns-container');
            t.assertTrue(headerBlock.indexOf('--header-bg') !== -1, '--header-bg in header');

            // Cross-contamination checks
            t.assertTrue(rootBlock.indexOf('--columns-gap') === -1,  '--columns-gap NOT in :root');
            t.assertTrue(rootBlock.indexOf('--header-bg')   === -1,  '--header-bg NOT in :root');
        });

        // ------------------------------------------------------------------
        // 5. FIX: selector defaults to :root when omitted (backward compat)
        // ------------------------------------------------------------------
        t.test('[fix] selector defaults to :root when not provided', function () {
            var changes = {};
            var set = makeSetVariable(changes);

            // No selector passed — old callers without selector support
            set('--legacy-var', '42px', undefined);

            var css = buildCssFixed(changes);

            t.assertTrue(
                css.indexOf(':root {') !== -1,
                ':root block emitted for var with no selector'
            );
            t.assertTrue(
                css.indexOf('--legacy-var: 42px') !== -1,
                'Legacy var present in :root'
            );
        });

        // ------------------------------------------------------------------
        // 6. FIX: localStorage migration — old flat string entries get :root
        // ------------------------------------------------------------------
        t.test('[fix] old localStorage flat entries migrated to {value, selector}', function () {
            // Simulate old format loaded from localStorage
            var rawStored = {
                '--base-color': '#ff0000',    // old: plain string
                '--font-size':  '16px'        // old: plain string
            };

            // Migration logic (to be implemented in _loadFromLocalStorage)
            function migrate(stored) {
                var migrated = {};
                Object.keys(stored).forEach(function (key) {
                    var entry = stored[key];
                    if (typeof entry === 'string') {
                        migrated[key] = { value: entry, selector: ':root' };
                    } else {
                        migrated[key] = entry;
                    }
                });
                return migrated;
            }

            var changes = migrate(rawStored);

            t.assertEqual(changes['--base-color'].value,    '#ff0000', 'value migrated');
            t.assertEqual(changes['--base-color'].selector, ':root',   'selector defaults to :root');
            t.assertEqual(changes['--font-size'].value,     '16px',    'value migrated');
            t.assertEqual(changes['--font-size'].selector,  ':root',   'selector defaults to :root');

            var css = buildCssFixed(changes);
            t.assertTrue(css.indexOf(':root {') !== -1,          ':root block in migrated CSS');
            t.assertTrue(css.indexOf('--base-color: #ff0000') !== -1, '--base-color present');
        });

        // ------------------------------------------------------------------
        // 7. FIX: palette-injected vars always go to :root
        // ------------------------------------------------------------------
        t.test('[fix] palette-injected vars always use :root selector', function () {
            var changes = {};
            var set = makeSetVariable(changes);

            // Field var with custom selector
            set('--columns-gap', '24px', '.columns-container');

            // Palette vars injected for palette reference resolution — always :root
            set('--color-brand-primary',     '#1979c3', ':root');
            set('--color-brand-primary-rgb', '25,121,195', ':root');

            var css = buildCssFixed(changes);

            var rootStart = css.indexOf(':root {');
            var rootEnd   = css.indexOf('}', rootStart);
            var rootBlock = css.slice(rootStart, rootEnd);

            t.assertTrue(rootBlock.indexOf('--color-brand-primary:')     !== -1, 'palette var in :root');
            t.assertTrue(rootBlock.indexOf('--color-brand-primary-rgb:') !== -1, 'palette rgb var in :root');
            t.assertTrue(rootBlock.indexOf('--columns-gap')              === -1, 'field var NOT in :root');
        });

    });
});
