/**
 * CssPreviewManager — Raw CSS Block Tests
 *
 * Tests the raw CSS injection feature: 'code' fields without a CSS property
 * inject their value verbatim into the live-preview <style> element, after
 * all CSS variable blocks.
 *
 * Approach: inline copies of the relevant logic from css-preview-manager.js
 * (_updateStyles, setRawCss, resetRawCss, reset). No DOM/iframe required.
 * Same pattern as css-preview-manager-selector-test.js.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    // =========================================================================
    // Inline copy of _updateStyles() with rawCssBlocks support
    // Mirrors the production logic in css-preview-manager.js
    // =========================================================================

    function buildCss(changes, rawCssBlocks) {
        var noMediaBlocks = {};
        var mediaGroups   = {};

        Object.keys(changes).forEach(function (varName) {
            var entry    = changes[varName];
            var value    = entry.value;
            var selector = entry.selector || ':root';
            var media    = entry.media    || null;
            var line     = '    ' + varName + ': ' + value + ';';

            if (!media) {
                if (!noMediaBlocks[selector]) { noMediaBlocks[selector] = []; }
                noMediaBlocks[selector].push(line);
            } else {
                if (!mediaGroups[media]) { mediaGroups[media] = {}; }
                if (!mediaGroups[media][selector]) { mediaGroups[media][selector] = []; }
                mediaGroups[media][selector].push(line);
            }
        });

        var parts = [];

        Object.keys(noMediaBlocks).forEach(function (selector) {
            parts.push(selector + ' {\n' + noMediaBlocks[selector].join('\n') + '\n}');
        });

        Object.keys(mediaGroups).forEach(function (media) {
            var inner = Object.keys(mediaGroups[media]).map(function (selector) {
                return '    ' + selector + ' {\n' +
                    mediaGroups[media][selector].map(function (l) { return '    ' + l; }).join('\n') +
                    '\n    }';
            }).join('\n');
            parts.push('@media ' + media + ' {\n' + inner + '\n}');
        });

        var css = parts.join('\n');

        // Append raw CSS blocks (mirrors production _updateStyles)
        var rawParts = Object.keys(rawCssBlocks || {}).map(function (id) {
            return '/* ' + id + ' */\n' + rawCssBlocks[id];
        });
        if (rawParts.length) {
            css = (css ? css + '\n' : '') + rawParts.join('\n');
        }

        return css || ':root {}';
    }

    // Inline copy of setRawCss / resetRawCss / reset logic
    function makeRawCssManager() {
        var rawCssBlocks = {};

        return {
            setRawCss: function (id, css) {
                if (!css || !css.trim()) {
                    delete rawCssBlocks[id];
                } else {
                    rawCssBlocks[id] = css;
                }
            },
            resetRawCss: function (id) {
                delete rawCssBlocks[id];
            },
            reset: function () {
                rawCssBlocks = {};
            },
            getBlocks: function () {
                return rawCssBlocks;
            },
            buildCss: function (changes) {
                return buildCss(changes, rawCssBlocks);
            }
        };
    }

    // =========================================================================
    // Tests
    // =========================================================================

    return TestFramework.suite('CssPreviewManager — raw CSS blocks', function (t) {

        // --------------------------------------------------------------------
        // GROUP 1: _updateStyles() output with rawCssBlocks
        // --------------------------------------------------------------------

        t.test('raw CSS block is appended after :root {} block', function () {
            var changes = {
                '--bg-color': { value: '#ffffff', selector: ':root', media: null }
            };
            var rawCssBlocks = {
                'additional_styles_additional_css': '.bte-test-hello { color: green; }'
            };

            var css = buildCss(changes, rawCssBlocks);

            var rootPos = css.indexOf(':root {');
            var rawPos  = css.indexOf('.bte-test-hello');

            t.assertTrue(rootPos !== -1, ':root block must be present');
            t.assertTrue(rawPos  !== -1, 'raw CSS must be present');
            t.assertTrue(rawPos > rootPos, 'raw CSS must appear after :root {}');

            console.log('✅ raw CSS block appears after :root {}');
        });

        t.test('raw CSS block is wrapped with /* id */ comment', function () {
            var rawCssBlocks = {
                'additional_styles_additional_css': '.bte-test-hello { color: green; }'
            };

            var css = buildCss({}, rawCssBlocks);

            t.assertTrue(
                css.indexOf('/* additional_styles_additional_css */') !== -1,
                'Block id comment must be present'
            );

            console.log('✅ raw CSS block wrapped with /* id */ comment');
        });

        t.test('multiple raw CSS blocks all appear in output', function () {
            var rawCssBlocks = {
                'custom_header_css': '.header { display: flex; }',
                'custom_footer_css': '.footer { color: blue; }'
            };

            var css = buildCss({}, rawCssBlocks);

            t.assertTrue(css.indexOf('.header { display: flex; }') !== -1, 'header CSS must be present');
            t.assertTrue(css.indexOf('.footer { color: blue; }')   !== -1, 'footer CSS must be present');

            console.log('✅ multiple raw CSS blocks all appear in output');
        });

        t.test('raw CSS coexists with CSS variables', function () {
            var changes = {
                '--bg-color': { value: '#ffffff', selector: ':root', media: null }
            };
            var rawCssBlocks = {
                'additional_styles_additional_css': '.hero { padding: 0; }'
            };

            var css = buildCss(changes, rawCssBlocks);

            t.assertTrue(css.indexOf('--bg-color: #ffffff;') !== -1, 'CSS variable must be present');
            t.assertTrue(css.indexOf('.hero { padding: 0; }') !== -1, 'raw CSS must be present');

            // CSS var must be inside :root {}, raw CSS must be outside
            var rootStart = css.indexOf(':root {');
            var rootEnd   = css.indexOf('}', rootStart);
            var varPos    = css.indexOf('--bg-color:');
            var rawPos    = css.indexOf('.hero');

            t.assertTrue(varPos > rootStart && varPos < rootEnd, 'CSS var must be inside :root {}');
            t.assertTrue(rawPos > rootEnd,                        'raw CSS must be outside :root {}');

            console.log('✅ raw CSS coexists with CSS variables');
        });

        t.test('no raw blocks → output is unchanged (only :root {})', function () {
            var changes = {
                '--bg-color': { value: '#ffffff', selector: ':root', media: null }
            };

            var css = buildCss(changes, {});

            t.assertTrue(css.indexOf('--bg-color: #ffffff;') !== -1, 'CSS variable must be present');
            t.assertTrue(css.indexOf('/*') === -1, 'No block comments when rawCssBlocks is empty');

            console.log('✅ no raw blocks → output unchanged');
        });

        t.test('empty changes + raw block → raw CSS still emitted', function () {
            var rawCssBlocks = {
                'additional_styles_additional_css': '.bte-test-hello { color: green; }'
            };

            var css = buildCss({}, rawCssBlocks);

            t.assertTrue(css.indexOf('.bte-test-hello') !== -1, 'raw CSS must appear even with no CSS variables');

            console.log('✅ raw CSS emitted even when changes is empty');
        });

        // --------------------------------------------------------------------
        // GROUP 2: setRawCss() / resetRawCss() logic
        // --------------------------------------------------------------------

        t.test('setRawCss() adds block to rawCssBlocks', function () {
            var mgr = makeRawCssManager();

            mgr.setRawCss('additional_styles_additional_css', '.bte-test-hello { color: green; }');

            t.assertEquals(
                mgr.getBlocks()['additional_styles_additional_css'],
                '.bte-test-hello { color: green; }',
                'Block should be stored'
            );

            console.log('✅ setRawCss() adds block');
        });

        t.test('setRawCss() with empty string removes block', function () {
            var mgr = makeRawCssManager();

            mgr.setRawCss('additional_styles_additional_css', '.bte-test-hello { color: green; }');
            mgr.setRawCss('additional_styles_additional_css', '');

            t.assertTrue(
                !('additional_styles_additional_css' in mgr.getBlocks()),
                'Block should be removed when value is empty string'
            );

            console.log('✅ setRawCss("") removes block');
        });

        t.test('setRawCss() with whitespace-only string removes block', function () {
            var mgr = makeRawCssManager();

            mgr.setRawCss('additional_styles_additional_css', '.bte-test-hello { color: green; }');
            mgr.setRawCss('additional_styles_additional_css', '   \n  ');

            t.assertTrue(
                !('additional_styles_additional_css' in mgr.getBlocks()),
                'Block should be removed when value is whitespace only'
            );

            console.log('✅ setRawCss("   ") removes block');
        });

        t.test('resetRawCss() removes existing block', function () {
            var mgr = makeRawCssManager();

            mgr.setRawCss('additional_styles_additional_css', '.bte-test-hello { color: green; }');
            mgr.resetRawCss('additional_styles_additional_css');

            t.assertTrue(
                !('additional_styles_additional_css' in mgr.getBlocks()),
                'Block should be removed'
            );

            console.log('✅ resetRawCss() removes block');
        });

        t.test('resetRawCss() is no-op for missing id', function () {
            var mgr = makeRawCssManager();

            mgr.setRawCss('other_block', '.x { color: red; }');

            // Should not throw
            mgr.resetRawCss('nonexistent_id');

            t.assertEquals(Object.keys(mgr.getBlocks()).length, 1, 'Other blocks must be untouched');

            console.log('✅ resetRawCss() is no-op for missing id');
        });

        // --------------------------------------------------------------------
        // GROUP 3: reset()
        // --------------------------------------------------------------------

        t.test('reset() clears all raw CSS blocks', function () {
            var mgr = makeRawCssManager();

            mgr.setRawCss('block_a', '.a { color: red; }');
            mgr.setRawCss('block_b', '.b { color: blue; }');
            mgr.reset();

            t.assertEquals(Object.keys(mgr.getBlocks()).length, 0, 'All blocks must be cleared after reset()');

            console.log('✅ reset() clears all raw CSS blocks');
        });

        t.test('reset() + setRawCss() works correctly after reset', function () {
            var mgr = makeRawCssManager();

            mgr.setRawCss('block_a', '.a { color: red; }');
            mgr.reset();
            mgr.setRawCss('block_b', '.b { color: blue; }');

            var blocks = mgr.getBlocks();
            t.assertTrue(!('block_a' in blocks), 'Old block must be gone after reset');
            t.assertEquals(blocks['block_b'], '.b { color: blue; }', 'New block must be present');

            console.log('✅ setRawCss() works correctly after reset()');
        });

        // --------------------------------------------------------------------
        // GROUP 4: recreateLivePreviewStyle() — raw CSS survives iframe reload
        // Regression for: PHP-only field change triggers iframe reload, which
        // called _updateStyles() only when changes.length > 0, so raw CSS
        // blocks were lost if no CSS variables had been changed.
        // --------------------------------------------------------------------

        t.test('recreateLivePreviewStyle: raw CSS re-applied when changes is empty', function () {
            // Simulate the condition check fixed in recreateLivePreviewStyle():
            //   OLD: if (Object.keys(changes).length > 0)
            //   NEW: if (Object.keys(changes).length > 0 || Object.keys(rawCssBlocks).length > 0)

            var changes      = {};   // no CSS var changes
            var rawCssBlocks = { 'additional_styles_additional_css': '.bte-test-hello { color: yellow; }' };

            var shouldUpdate = Object.keys(changes).length > 0 || Object.keys(rawCssBlocks).length > 0;

            t.assertTrue(shouldUpdate, 'Should call _updateStyles() when only rawCssBlocks has content');

            var css = buildCss(changes, rawCssBlocks);
            t.assertTrue(css.indexOf('.bte-test-hello { color: yellow; }') !== -1, 'Raw CSS must be present after reload');

            console.log('✅ recreateLivePreviewStyle: raw CSS re-applied even when changes is empty');
        });

        t.test('recreateLivePreviewStyle: raw CSS re-applied when changes also has vars', function () {
            var changes = {
                '--bg-color': { value: '#ffffff', selector: ':root', media: null }
            };
            var rawCssBlocks = { 'additional_styles_additional_css': '.bte-test-hello { color: yellow; }' };

            var shouldUpdate = Object.keys(changes).length > 0 || Object.keys(rawCssBlocks).length > 0;

            t.assertTrue(shouldUpdate, 'Should call _updateStyles() when both changes and rawCssBlocks have content');

            var css = buildCss(changes, rawCssBlocks);
            t.assertTrue(css.indexOf('--bg-color: #ffffff;') !== -1, 'CSS var must be present');
            t.assertTrue(css.indexOf('.bte-test-hello { color: yellow; }') !== -1, 'Raw CSS must be present');

            console.log('✅ recreateLivePreviewStyle: both CSS vars and raw CSS re-applied after reload');
        });

        t.test('recreateLivePreviewStyle: nothing updated when both changes and rawCssBlocks are empty', function () {
            var changes      = {};
            var rawCssBlocks = {};

            var shouldUpdate = Object.keys(changes).length > 0 || Object.keys(rawCssBlocks).length > 0;

            t.assertTrue(!shouldUpdate, 'Should NOT call _updateStyles() when both are empty');

            console.log('✅ recreateLivePreviewStyle: skips _updateStyles() when nothing to re-apply');
        });
    });
});
