/**
 * CssVarUsageIndex Tests
 *
 * Verifies the CSS-var -> selector scan (build) and the selector -> element
 * resolution (resolveElements) that back the highlight-overlay Phase 2
 * feature. The module has zero DOM/RequireJS dependencies, so build() is
 * tested against hand-built fake CSSOM-shaped objects (full control over
 * grouping rules / CORS-blocked sheets), while resolveElements() is tested
 * against a real (jsdom) detached document standing in for the preview
 * iframe's document.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/css-var-usage-index'
], function (TestFramework, CssVarUsageIndex) {
    'use strict';

    /**
     * Build a fake CSS style rule. `declarationsCssText` is just the
     * declaration block (e.g. "color: var(--x);"), matching what a real
     * CSSStyleRule exposes via `.style.cssText` (no selector wrapper).
     *
     * `nestedRules` defaults to an empty array — mirrors modern Chrome's
     * native CSS-nesting support, where EVERY CSSStyleRule carries a
     * `.cssRules` property (an empty, but truthy, CSSRuleList when it has
     * no nested children), not just @media/@supports groups. A prior bug
     * treated "has .cssRules" as "is a grouping rule, skip my own
     * declarations" — this default reproduces that exact real-world shape.
     */
    function styleRule(selectorText, declarationsCssText, nestedRules) {
        return {
            selectorText: selectorText,
            style: { cssText: declarationsCssText },
            cssRules: nestedRules || []
        };
    }

    /**
     * Build a fake grouping rule (@media/@supports — has .cssRules, no selectorText).
     */
    function groupingRule(innerRules) {
        return { cssRules: innerRules };
    }

    /**
     * Build a fake stylesheet whose .cssRules getter throws — simulates a
     * cross-origin sheet blocked by the browser's CORS same-origin policy.
     */
    function corsBlockedSheet() {
        var sheet = {};
        Object.defineProperty(sheet, 'cssRules', {
            get: function () {
                throw new Error('SecurityError: cssRules access denied');
            }
        });
        return sheet;
    }

    function fakeDoc(styleSheets) {
        return { styleSheets: styleSheets };
    }

    return TestFramework.suite('CssVarUsageIndex', function (t) {

        // ------------------------------------------------------------------
        t.test('build() records selector for a plain rule referencing var(--x)', function () {
            var doc = fakeDoc([
                { cssRules: [ styleRule('.hero-title', 'color: var(--button-primary-bg);') ] }
            ]);

            var index = CssVarUsageIndex.build(doc);

            t.assertTrue(!!index['--button-primary-bg'], 'index has entry for --button-primary-bg');
            t.assertTrue(
                index['--button-primary-bg'].indexOf('.hero-title') !== -1,
                '.hero-title selector recorded'
            );
        });

        // ------------------------------------------------------------------
        t.test('[regression] build() still scans a rule\'s own declarations when it has an empty .cssRules (native CSS nesting)', function () {
            // This is the exact shape that broke in production: modern
            // Chrome gives every CSSStyleRule a `.cssRules` (empty when the
            // rule has no nested children). Treating "has .cssRules" and
            // "is a plain rule with its own var() usage" as mutually
            // exclusive silently skipped every ordinary rule.
            var doc = fakeDoc([
                { cssRules: [ styleRule('html', 'color: var(--base-color);', []) ] }
            ]);

            var index = CssVarUsageIndex.build(doc);

            t.assertTrue(!!index['--base-color'], '--base-color found even though the rule has an empty .cssRules');
            t.assertEqual(index['--base-color'][0], 'html', 'selector recorded correctly');
        });

        // ------------------------------------------------------------------
        t.test('build() records both a rule\'s own var() usage and its nested children\'s (native CSS nesting)', function () {
            var doc = fakeDoc([
                { cssRules: [
                    styleRule('.card', 'color: var(--base-color);', [
                        styleRule('&:hover', 'color: var(--hover-color);')
                    ])
                ] }
            ]);

            var index = CssVarUsageIndex.build(doc);

            t.assertTrue(!!index['--base-color'], 'parent rule\'s own var() usage recorded');
            t.assertEqual(index['--base-color'][0], '.card', 'parent selector recorded for its own declaration');
            t.assertTrue(!!index['--hover-color'], 'nested child rule\'s var() usage also recorded');
        });

        // ------------------------------------------------------------------
        t.test('build() recurses into @media grouping rules', function () {
            var doc = fakeDoc([
                { cssRules: [
                    groupingRule([
                        styleRule('.hero-title', 'font-size: var(--heading-size);')
                    ])
                ] }
            ]);

            var index = CssVarUsageIndex.build(doc);

            t.assertTrue(!!index['--heading-size'], 'var found inside nested @media rule');
            t.assertEqual(index['--heading-size'][0], '.hero-title', 'selector recorded correctly');
        });

        // ------------------------------------------------------------------
        t.test('build() does not record selectors for unrelated vars', function () {
            var doc = fakeDoc([
                { cssRules: [ styleRule('.footer', 'color: var(--footer-color);') ] }
            ]);

            var index = CssVarUsageIndex.build(doc);

            t.assertTrue(!index['--button-primary-bg'], 'unrelated var --button-primary-bg not recorded');
            t.assertTrue(!!index['--footer-color'], 'the actual referenced var is recorded');
        });

        // ------------------------------------------------------------------
        t.test('build() skips a CORS-blocked sheet without crashing and keeps scanning others', function () {
            var doc = fakeDoc([
                corsBlockedSheet(),
                { cssRules: [ styleRule('.hero-title', 'color: var(--button-primary-bg);') ] }
            ]);

            var index;
            t.assertTrue(
                (function () {
                    try {
                        index = CssVarUsageIndex.build(doc);
                        return true;
                    } catch (e) {
                        return false;
                    }
                })(),
                'build() does not throw when a sheet is CORS-blocked'
            );

            t.assertTrue(!!index['--button-primary-bg'], 'sheet after the blocked one is still scanned');
        });

        // ------------------------------------------------------------------
        t.test('build() returns an empty index for an empty/missing styleSheets', function () {
            t.assertEqual(Object.keys(CssVarUsageIndex.build(fakeDoc([]))).length, 0, 'empty styleSheets -> empty index');
            t.assertEqual(Object.keys(CssVarUsageIndex.build(null)).length, 0, 'null doc -> empty index');
        });

        // ------------------------------------------------------------------
        t.test('resolveElements() strips ::before/::after and queries the base selector', function () {
            var doc = document.implementation.createHTMLDocument('preview');
            doc.body.innerHTML = '<div class="cta"></div><div class="other"></div>';

            var index = { '--cta-color': [ '.cta::before' ] };
            var elements = CssVarUsageIndex.resolveElements(doc, '--cta-color', index);

            t.assertEqual(elements.length, 1, 'one element resolved (pseudo-element stripped)');
            t.assertTrue(elements[0].classList.contains('cta'), 'resolved element is .cta');
        });

        // ------------------------------------------------------------------
        t.test('resolveElements() dedupes elements matched by multiple selectors', function () {
            var doc = document.implementation.createHTMLDocument('preview');
            doc.body.innerHTML = '<button class="btn primary"></button>';

            var index = { '--button-primary-bg': [ '.btn', '.primary' ] };
            var elements = CssVarUsageIndex.resolveElements(doc, '--button-primary-bg', index);

            t.assertEqual(elements.length, 1, 'element matched by two selectors counted once');
        });

        // ------------------------------------------------------------------
        t.test('resolveElements() returns an empty array when the var has no recorded selectors', function () {
            var doc = document.implementation.createHTMLDocument('preview');
            doc.body.innerHTML = '<div class="cta"></div>';

            var elements = CssVarUsageIndex.resolveElements(doc, '--unused-var', {});

            t.assertEqual(elements.length, 0, 'no selectors recorded -> no elements -> drives empty-state UI');
        });

        // ------------------------------------------------------------------
        t.test('resolveElements() returns an empty array when recorded selectors match nothing on this page', function () {
            var doc = document.implementation.createHTMLDocument('preview');
            doc.body.innerHTML = '<div class="header"></div>';

            var index = { '--footer-bg': [ '.footer' ] };
            var elements = CssVarUsageIndex.resolveElements(doc, '--footer-bg', index);

            t.assertEqual(elements.length, 0, 'selector recorded elsewhere but absent from this page -> empty');
        });

        // ------------------------------------------------------------------
        t.test('resolveElements() skips an invalid selector without throwing', function () {
            var doc = document.implementation.createHTMLDocument('preview');
            doc.body.innerHTML = '<div class="cta"></div>';

            var index = { '--cta-color': [ ':::not-a-real-selector(', '.cta' ] };

            var elements;
            t.assertTrue(
                (function () {
                    try {
                        elements = CssVarUsageIndex.resolveElements(doc, '--cta-color', index);
                        return true;
                    } catch (e) {
                        return false;
                    }
                })(),
                'resolveElements() does not throw on an invalid selector'
            );
            t.assertEqual(elements.length, 1, 'the valid selector in the list still resolves');
        });

    });
});
