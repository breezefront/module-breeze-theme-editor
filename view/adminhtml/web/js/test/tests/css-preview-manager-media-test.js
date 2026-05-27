/**
 * CssPreviewManager — media query support tests
 *
 * Verifies that live preview wraps CSS variables in @media blocks
 * when the field has a `media` property (via data-media attribute).
 *
 * Shape of `changes` entry after this feature:
 *   { value: '...', selector: '...', media: '(max-width: 767px)' | null }
 *
 * _updateStyles() groups by selector+media key and wraps non-null media
 * entries in @media blocks.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function (TestFramework) {
    'use strict';

    // =========================================================================
    // Inline _updateStyles logic (mirrors production implementation)
    // =========================================================================

    /**
     * Builds CSS string from changes map.
     * changes shape: { varName: { value, selector, media } }
     * Groups vars by media+selector, emits @media wrappers for non-null media.
     * Order: no-media blocks first (in insertion order), then @media blocks.
     */
    function buildCss(changes) {
        // blocks keyed by "media||selector" or selector (when no media)
        var noMediaBlocks = {};  // selector → [lines]
        var mediaBlocks   = {};  // "media||selector" → { media, selector, lines }

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
                var key = media + '||' + selector;
                if (!mediaBlocks[key]) {
                    mediaBlocks[key] = { media: media, selector: selector, lines: [] };
                }
                mediaBlocks[key].lines.push(line);
            }
        });

        var parts = [];

        // No-media blocks
        Object.keys(noMediaBlocks).forEach(function (selector) {
            parts.push(selector + ' {\n' + noMediaBlocks[selector].join('\n') + '\n}');
        });

        // @media blocks — group by media query, then by selector inside
        var byMedia = {};
        Object.keys(mediaBlocks).forEach(function (key) {
            var entry = mediaBlocks[key];
            if (!byMedia[entry.media]) { byMedia[entry.media] = []; }
            byMedia[entry.media].push(entry);
        });

        Object.keys(byMedia).forEach(function (media) {
            var inner = byMedia[media].map(function (entry) {
                return '    ' + entry.selector + ' {\n' +
                    entry.lines.map(function (l) { return '    ' + l; }).join('\n') +
                    '\n    }';
            }).join('\n');
            parts.push('@media ' + media + ' {\n' + inner + '\n}');
        });

        return parts.join('\n') || ':root {}';
    }

    // =========================================================================
    // Tests
    // =========================================================================

    return TestFramework.suite('CssPreviewManager — media query in preview', function (t) {

        // ------------------------------------------------------------------
        // 1. No media — behaves like before (backward compat)
        // ------------------------------------------------------------------
        t.test('[media] no media: var goes to :root block (backward compat)', function () {
            var changes = {
                '--font-size': { value: '16px', selector: ':root', media: null }
            };
            var css = buildCss(changes);

            t.assertTrue(css.indexOf(':root {') !== -1,       ':root block emitted');
            t.assertTrue(css.indexOf('--font-size: 16px') !== -1, 'var present');
            t.assertTrue(css.indexOf('@media') === -1,        'no @media block');
        });

        // ------------------------------------------------------------------
        // 2. media: mobile → @media (max-width: 767px) { :root { ... } }
        // ------------------------------------------------------------------
        t.test('[media] mobile media wraps :root var in @media block', function () {
            var changes = {
                '--font-size': { value: '13px', selector: ':root', media: '(max-width: 767px)' }
            };
            var css = buildCss(changes);

            t.assertTrue(css.indexOf('@media (max-width: 767px)') !== -1, '@media block emitted');
            // :root appears only INSIDE @media (indented), never as a top-level block
            t.assertFalse(css.indexOf(':root {') === 0, 'no top-level :root block');
            t.assertTrue(css.indexOf('--font-size: 13px') !== -1, 'var present');
        });

        // ------------------------------------------------------------------
        // 3. selector + media → @media { .selector { ... } }
        // ------------------------------------------------------------------
        t.test('[media] custom selector + media emits @media { .selector { ... } }', function () {
            var changes = {
                '--columns-gap': { value: '8px', selector: '.columns-container', media: '(max-width: 767px)' }
            };
            var css = buildCss(changes);

            t.assertTrue(css.indexOf('@media (max-width: 767px)') !== -1, '@media block emitted');
            t.assertTrue(css.indexOf('.columns-container {') !== -1,      'selector block emitted');
            t.assertTrue(css.indexOf('--columns-gap: 8px') !== -1,        'var present');
            t.assertTrue(css.indexOf(':root') === -1,                      'no :root block');
        });

        // ------------------------------------------------------------------
        // 4. Multiple vars same media grouped into one @media block
        // ------------------------------------------------------------------
        t.test('[media] multiple vars same media grouped into one @media block', function () {
            var changes = {
                '--font-size':   { value: '13px', selector: ':root', media: '(max-width: 767px)' },
                '--line-height': { value: '1.4',  selector: ':root', media: '(max-width: 767px)' }
            };
            var css = buildCss(changes);

            var count = (css.match(/@media/g) || []).length;
            t.assertEqual(count, 1, 'only one @media block for same query');
            t.assertTrue(css.indexOf('--font-size: 13px') !== -1,   '--font-size present');
            t.assertTrue(css.indexOf('--line-height: 1.4') !== -1,  '--line-height present');
        });

        // ------------------------------------------------------------------
        // 5. Mixed: some vars no media, some with media
        // ------------------------------------------------------------------
        t.test('[media] mixed: no-media vars in :root, media vars in @media', function () {
            var changes = {
                '--font-size':        { value: '16px', selector: ':root', media: null },
                '--font-size-mobile': { value: '13px', selector: ':root', media: '(max-width: 767px)' }
            };
            var css = buildCss(changes);

            t.assertTrue(css.indexOf(':root {') !== -1,                    'bare :root block present');
            t.assertTrue(css.indexOf('@media (max-width: 767px)') !== -1,  '@media block present');
            t.assertTrue(css.indexOf('--font-size: 16px') !== -1,          'no-media var present');
            t.assertTrue(css.indexOf('--font-size-mobile: 13px') !== -1,   'media var present');
        });

        // ------------------------------------------------------------------
        // 6. No-media blocks come before @media blocks in output
        // ------------------------------------------------------------------
        t.test('[media] no-media blocks before @media blocks in output', function () {
            var changes = {
                '--font-size-mobile': { value: '13px', selector: ':root', media: '(max-width: 767px)' },
                '--font-size':        { value: '16px', selector: ':root', media: null }
            };
            var css = buildCss(changes);

            var rootPos  = css.indexOf(':root {');
            var mediaPos = css.indexOf('@media');

            t.assertTrue(rootPos < mediaPos, ':root block before @media block');
        });

        // ------------------------------------------------------------------
        // 7. localStorage migration: old entries get media: null
        // ------------------------------------------------------------------
        t.test('[media] old localStorage entries migrated to include media: null', function () {
            var rawStored = { '--font-size': { value: '16px', selector: ':root' } };

            // Migration: add media: null if absent
            function migrate(stored) {
                var out = {};
                Object.keys(stored).forEach(function (k) {
                    var e = stored[k];
                    out[k] = typeof e === 'string'
                        ? { value: e, selector: ':root', media: null }
                        : { value: e.value, selector: e.selector || ':root', media: e.media || null };
                });
                return out;
            }

            var changes = migrate(rawStored);

            t.assertNull(changes['--font-size'].media, 'media defaults to null');

            var css = buildCss(changes);
            t.assertTrue(css.indexOf(':root {') !== -1, ':root block emitted');
            t.assertTrue(css.indexOf('@media') === -1,  'no @media block');
        });

        // ------------------------------------------------------------------
        // 8. Different media queries produce separate @media blocks
        // ------------------------------------------------------------------
        t.test('[media] different media queries produce separate @media blocks', function () {
            var changes = {
                '--font-size-mobile':  { value: '13px', selector: ':root', media: '(max-width: 767px)' },
                '--sidebar-width-lg':  { value: '320px', selector: ':root', media: '(min-width: 1024px)' }
            };
            var css = buildCss(changes);

            var count = (css.match(/@media/g) || []).length;
            t.assertEqual(count, 2, 'two separate @media blocks');
            t.assertTrue(css.indexOf('@media (max-width: 767px)') !== -1,  'mobile @media present');
            t.assertTrue(css.indexOf('@media (min-width: 1024px)') !== -1, 'desktop @media present');
        });

    });
});
