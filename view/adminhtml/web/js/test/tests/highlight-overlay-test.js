/**
 * Highlight Overlay Tests
 *
 * Verifies panel/highlight-overlay.js:
 *  - clicking a `.bte-field-highlight-icon[data-property]` button marks the
 *    preview elements resolved by utils/dom/css-var-usage-index.js by
 *    toggling a class directly inside the iframe document (mirrors
 *    swissup/module-theme-editor's theme-editor-highlighter.js
 *    `theme-editor-selected-border` technique), toggling the icon's active
 *    state, and switching cleanly between fields;
 *  - shows an info badge instead of marking when 0 elements resolve, or
 *    more than Constants.HIGHLIGHT.MAX_MARKED_ELEMENTS do;
 *  - auto-scrolls the iframe to the single matched element when exactly
 *    one resolves and it's currently off-screen.
 *
 * IframeHelper and CssVarUsageIndex are plain singleton objects (AMD
 * `define` modules) — same pattern helpers/mock-helper.js uses for
 * GraphQLClient — so they're monkey-patched directly and restored after
 * each test rather than mocked via jest.mock().
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/highlight-overlay',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/css-var-usage-index',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, TestFramework, HighlightOverlay, IframeHelper, CssVarUsageIndex, Constants) {
    'use strict';

    var OVERLAY_SEL   = '#bte-highlight-overlay';
    var TARGET_CLASS  = 'bte-highlight-target';
    var STYLE_ID      = 'bte-highlight-style';
    var ICON_CLASS    = 'bte-field-highlight-icon';
    var ICON_ACTIVE   = 'bte-field-highlight-icon--active';
    var EMPTY_TEXT    = 'No elements on this page are affected by this change.';
    var MAX_MARKED    = Constants.HIGHLIGHT.MAX_MARKED_ELEMENTS;

    function makeFakeIframeSibling() {
        var $iframe = $('<div id="bte-iframe"></div>');
        $('body').append($iframe);
        return $iframe;
    }

    function makeIcon(property) {
        var $btn = $('<button>', { 'class': ICON_CLASS });
        $btn.data('highlightProperty', property);
        $('body').append($btn);
        return $btn;
    }

    /** A fresh HTML document standing in for the preview iframe's document. */
    function makePreviewDoc(bodyHtml) {
        var doc = document.implementation.createHTMLDocument('preview');
        doc.body.innerHTML = bodyHtml;
        return doc;
    }

    /**
     * Patch IframeHelper + CssVarUsageIndex for the duration of `fn`, then
     * restore the originals. Also removes the overlay container so each
     * test starts from a clean DOM state.
     */
    function withMocks(overrides, fn) {
        var originals = {
            getDocument:     IframeHelper.getDocument,
            getWindow:       IframeHelper.getWindow,
            build:           CssVarUsageIndex.build,
            resolveElements: CssVarUsageIndex.resolveElements
        };

        IframeHelper.getDocument         = overrides.getDocument     || function () { return null; };
        IframeHelper.getWindow           = overrides.getWindow       || function () { return null; };
        CssVarUsageIndex.build           = overrides.build           || function () { return {}; };
        CssVarUsageIndex.resolveElements = overrides.resolveElements || function () { return []; };

        try {
            fn();
        } finally {
            IframeHelper.getDocument         = originals.getDocument;
            IframeHelper.getWindow           = originals.getWindow;
            CssVarUsageIndex.build           = originals.build;
            CssVarUsageIndex.resolveElements = originals.resolveElements;

            HighlightOverlay.clear();
            HighlightOverlay.invalidateIndex();
            $(OVERLAY_SEL).remove();
            $('#bte-iframe').remove();
        }
    }

    return TestFramework.suite('Highlight Overlay', {

        'show() marks every resolved element with the highlight class, no empty-state': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<button class="btn"></button><span class="cta"></span>');
            var elA = doc.querySelector('.btn');
            var elB = doc.querySelector('.cta');

            withMocks({
                getDocument:     function () { return doc; },
                resolveElements: function () { return [elA, elB]; }
            }, function () {
                HighlightOverlay.show('--button-primary-bg');

                this.assertTrue(elA.classList.contains(TARGET_CLASS), 'first resolved element marked');
                this.assertTrue(elB.classList.contains(TARGET_CLASS), 'second resolved element marked');
                this.assertTrue(!!doc.getElementById(STYLE_ID), 'highlight <style> injected into the iframe document');
                this.assertEqual($(OVERLAY_SEL + ' .bte-highlight-empty').length, 0, 'no empty-state message shown');
            }.bind(this));

            console.log('✅ show() marks resolved elements via class, no empty-state');
        },

        'show() with zero resolved elements shows the exact empty-state message and marks nothing': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<div class="header"></div>');

            withMocks({
                getDocument:     function () { return doc; },
                resolveElements: function () { return []; }
            }, function () {
                HighlightOverlay.show('--footer-only-var');

                var $empty = $(OVERLAY_SEL + ' .bte-highlight-empty');
                this.assertEqual($empty.length, 1, 'empty-state element shown');
                this.assertEqual($empty.text(), EMPTY_TEXT, 'empty-state has the exact required copy');
                this.assertFalse(
                    doc.querySelector('.header').classList.contains(TARGET_CLASS),
                    'unrelated element on the page is not marked'
                );
            }.bind(this));

            console.log('✅ empty-state shown with exact copy when nothing resolves');
        },

        'clear() unmarks all previously marked elements and removes the empty-state': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<button class="btn"></button>');
            var elA = doc.querySelector('.btn');

            withMocks({
                getDocument:     function () { return doc; },
                resolveElements: function () { return [elA]; }
            }, function () {
                HighlightOverlay.show('--some-var');
                this.assertTrue(elA.classList.contains(TARGET_CLASS), 'sanity: element marked before clear');

                HighlightOverlay.clear();

                this.assertFalse(elA.classList.contains(TARGET_CLASS), 'class removed after clear()');
                this.assertEqual($(OVERLAY_SEL).children().length, 0, 'empty-state container cleared too');
            }.bind(this));

            console.log('✅ clear() unmarks elements and clears empty-state');
        },

        'show() clears the previous field\'s marks before applying the new one': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<button class="btn-a"></button><button class="btn-b"></button>');
            var elA = doc.querySelector('.btn-a');
            var elB = doc.querySelector('.btn-b');
            var currentVar = '--var-a';

            withMocks({
                getDocument:     function () { return doc; },
                resolveElements: function (d, varName) {
                    return varName === '--var-a' ? [elA] : [elB];
                }
            }, function () {
                HighlightOverlay.show('--var-a');
                this.assertTrue(elA.classList.contains(TARGET_CLASS), 'first field marks elA');

                HighlightOverlay.show('--var-b');
                this.assertFalse(elA.classList.contains(TARGET_CLASS), 'elA unmarked when hover moves to a new field');
                this.assertTrue(elB.classList.contains(TARGET_CLASS), 'elB marked for the new field');
            }.bind(this));

            console.log('✅ show() swaps marks cleanly between fields');
        },

        'show() without an iframe document does not throw and shows the empty-state': function () {
            withMocks({
                getDocument: function () { return null; }
            }, function () {
                var threw = false;
                try {
                    HighlightOverlay.show('--button-primary-bg');
                } catch (e) {
                    threw = true;
                }

                this.assertFalse(threw, 'show() does not throw when the iframe document is unavailable');
            }.bind(this));

            console.log('✅ show() is a no-op-safe empty-state without an iframe document');
        },

        'clicking a field\'s highlight icon marks its elements and activates the icon': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<button class="btn"></button>');
            var el = doc.querySelector('.btn');
            var $icon = makeIcon('--icon-click-var');

            HighlightOverlay.init();

            withMocks({
                getDocument:     function () { return doc; },
                resolveElements: function () { return [el]; }
            }, function () {
                $icon.trigger('click');

                this.assertTrue(el.classList.contains(TARGET_CLASS), 'clicked field\'s element is marked');
                this.assertTrue($icon.hasClass(ICON_ACTIVE), 'clicked icon gets the active class');
            }.bind(this));

            HighlightOverlay.destroy();
            $icon.remove();
            console.log('✅ click marks elements and activates the icon');
        },

        'clicking the already-active icon again toggles it off': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<button class="btn"></button>');
            var el = doc.querySelector('.btn');
            var $icon = makeIcon('--icon-toggle-var');

            HighlightOverlay.init();

            withMocks({
                getDocument:     function () { return doc; },
                resolveElements: function () { return [el]; }
            }, function () {
                $icon.trigger('click');
                this.assertTrue(el.classList.contains(TARGET_CLASS), 'sanity: marked after first click');

                $icon.trigger('click');
                this.assertFalse(el.classList.contains(TARGET_CLASS), 'unmarked after clicking the active icon again');
                this.assertFalse($icon.hasClass(ICON_ACTIVE), 'active class removed on toggle-off');
            }.bind(this));

            HighlightOverlay.destroy();
            $icon.remove();
            console.log('✅ clicking the active icon again toggles off');
        },

        'clicking a different icon moves the active state and swaps marks': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<button class="a"></button><button class="b"></button>');
            var elA = doc.querySelector('.a');
            var elB = doc.querySelector('.b');
            var $iconA = makeIcon('--icon-switch-a');
            var $iconB = makeIcon('--icon-switch-b');

            HighlightOverlay.init();

            withMocks({
                getDocument:     function () { return doc; },
                resolveElements: function (d, varName) {
                    return varName === '--icon-switch-a' ? [elA] : [elB];
                }
            }, function () {
                $iconA.trigger('click');
                this.assertTrue($iconA.hasClass(ICON_ACTIVE), 'icon A active after its click');

                $iconB.trigger('click');
                this.assertFalse($iconA.hasClass(ICON_ACTIVE), 'icon A no longer active');
                this.assertTrue($iconB.hasClass(ICON_ACTIVE), 'icon B now active');
                this.assertFalse(elA.classList.contains(TARGET_CLASS), 'elA unmarked after switching fields');
                this.assertTrue(elB.classList.contains(TARGET_CLASS), 'elB marked for the new field');
            }.bind(this));

            HighlightOverlay.destroy();
            $iconA.remove();
            $iconB.remove();
            console.log('✅ switching icons moves active state and swaps marks');
        },

        'show() with more than MAX_MARKED_ELEMENTS resolved elements shows a count instead of marking': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<div class="a"></div>');
            var elements = [];
            for (var i = 0; i < MAX_MARKED + 1; i++) {
                elements.push(doc.createElement('div'));
            }

            withMocks({
                getDocument:     function () { return doc; },
                resolveElements: function () { return elements; }
            }, function () {
                HighlightOverlay.show('--broad-var');

                elements.forEach(function (el, i) {
                    this.assertFalse(el.classList.contains(TARGET_CLASS), 'element ' + i + ' not marked over the cap');
                }.bind(this));

                var $info = $(OVERLAY_SEL + ' .bte-highlight-empty');
                this.assertEqual($info.length, 1, 'count info shown instead of marking');
                this.assertEqual(
                    $info.text(),
                    (MAX_MARKED + 1) + ' elements on this page are affected by this change.',
                    'info text states the exact count'
                );
            }.bind(this));

            console.log('✅ over-cap resolved elements show a count, no marking');
        },

        'show() auto-scrolls the single resolved element only when it is off-screen': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<div class="a"></div>');
            var el = doc.querySelector('.a');
            var scrollCalls = [];
            el.scrollIntoView = function (opts) { scrollCalls.push(opts); };
            el.getBoundingClientRect = function () {
                return { top: -50, left: 0, bottom: 50, right: 50 }; // top < 0 -> off-screen
            };

            withMocks({
                getDocument:     function () { return doc; },
                getWindow:       function () { return { innerWidth: 800, innerHeight: 600 }; },
                resolveElements: function () { return [el]; }
            }, function () {
                HighlightOverlay.show('--offscreen-var');

                this.assertEqual(scrollCalls.length, 1, 'scrollIntoView called once for the off-screen element');
                this.assertEqual(scrollCalls[0].block, 'center', 'scrolls with block: center');
                this.assertEqual(scrollCalls[0].behavior, 'smooth', 'scrolls smoothly');
            }.bind(this));

            console.log('✅ auto-scrolls the single off-screen resolved element');
        },

        'show() does not auto-scroll a single resolved element that is already fully visible': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<div class="a"></div>');
            var el = doc.querySelector('.a');
            var scrollCalls = [];
            el.scrollIntoView = function (opts) { scrollCalls.push(opts); };
            el.getBoundingClientRect = function () {
                return { top: 10, left: 10, bottom: 60, right: 60 }; // fully inside 800x600 viewport
            };

            withMocks({
                getDocument:     function () { return doc; },
                getWindow:       function () { return { innerWidth: 800, innerHeight: 600 }; },
                resolveElements: function () { return [el]; }
            }, function () {
                HighlightOverlay.show('--visible-var');

                this.assertEqual(scrollCalls.length, 0, 'scrollIntoView not called for an already-visible element');
            }.bind(this));

            console.log('✅ no auto-scroll for an already-visible element');
        },

        'show() never auto-scrolls when 2+ elements resolve (ambiguous target)': function () {
            makeFakeIframeSibling();
            var doc = makePreviewDoc('<div class="a"></div><div class="b"></div>');
            var elA = doc.querySelector('.a');
            var elB = doc.querySelector('.b');
            var scrollCalls = [];
            [elA, elB].forEach(function (el) {
                el.scrollIntoView = function (opts) { scrollCalls.push(opts); };
                el.getBoundingClientRect = function () {
                    return { top: -50, left: 0, bottom: 50, right: 50 }; // off-screen, would trigger scroll if single
                };
            });

            withMocks({
                getDocument:     function () { return doc; },
                getWindow:       function () { return { innerWidth: 800, innerHeight: 600 }; },
                resolveElements: function () { return [elA, elB]; }
            }, function () {
                HighlightOverlay.show('--multi-var');

                this.assertEqual(scrollCalls.length, 0, 'scrollIntoView never called when multiple elements resolve');
            }.bind(this));

            console.log('✅ no auto-scroll when multiple elements resolve');
        }
    });
});
