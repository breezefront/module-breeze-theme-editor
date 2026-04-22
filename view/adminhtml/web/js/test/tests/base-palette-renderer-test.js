/**
 * Base Palette Renderer Tests
 *
 * Covers the shared methods extracted into base-palette-renderer.js:
 *
 *   _escapeHtml / _escapeAttr
 *       HTML-escape utilities — tested via a minimal widget instance so the
 *       tests cover the real prototype methods, not inline reproductions.
 *
 *   _bindAccordion
 *       Accordion toggle: active class toggling + slideUp/Down + StorageHelper
 *       persistence.  Tested via a DOM fixture with a concrete child widget.
 *
 *   _updateHeaderBadges / _getBadgeCounts
 *       Base implementation delegates counting to _getBadgeCounts() (returns
 *       {dirty:0, modified:0} by default) and writes BadgeRenderer output into
 *       this.$badgesContainer.  A child widget overriding _getBadgeCounts()
 *       is used to verify the delegation.
 *
 *   _bindBadgeUpdates / _destroyBadgeUpdates
 *       Subscribing to paletteColorChanged / themeEditorDraftSaved triggers
 *       _updateHeaderBadges(); unsubscribing via _destroyBadgeUpdates() stops
 *       the callbacks.
 *
 * All tests use a lightweight concrete child widget
 * ($.swissup.testPaletteChild) that extends basePaletteRenderer.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/badge-renderer',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/base-palette-renderer'
], function ($, TestFramework, BadgeRenderer, StorageHelper) {
    'use strict';

    // =========================================================================
    // Minimal concrete child widget used for all DOM tests
    // =========================================================================

    // Register once — guard against repeated module evaluation in test runner
    if (!$.swissup.testPaletteChild) {
        $.widget('swissup.testPaletteChild', $.swissup.basePaletteRenderer, {
            options: {
                dirty:    0,
                modified: 0
            },

            _create: function () {
                this._super();
                this.$badgesContainer = this.element.find('.badges');
                this.$header  = this.element.find('.header');
                this.$content = this.element.find('.content');
            },

            _getBadgeCounts: function () {
                return {
                    dirty:    this.options.dirty,
                    modified: this.options.modified
                };
            }
        });
    }

    // =========================================================================
    // DOM fixture helpers
    // =========================================================================

    /**
     * Build a minimal fixture element and attach the child widget to it.
     *
     * @param {Object} [opts]   Widget option overrides
     * @returns {jQuery}        The fixture element (widget already initialised)
     */
    function buildFixture(opts) {
        var $el = $(
            '<div>' +
            '  <div class="header"></div>' +
            '  <div class="content"></div>' +
            '  <div class="badges"></div>' +
            '</div>'
        ).appendTo(document.body);

        $el.testPaletteChild(opts || {});
        return $el;
    }

    /** Remove DOM fixture and destroy widget. */
    function tearDown($el) {
        try { $el.testPaletteChild('destroy'); } catch (e) {}
        $el.remove();
    }

    // =========================================================================
    // BadgeRenderer stub helpers
    // =========================================================================

    var _origRenderPaletteBadges;

    function stubBadgeRenderer(fn) {
        _origRenderPaletteBadges = BadgeRenderer.renderPaletteBadges;
        BadgeRenderer.renderPaletteBadges = fn;
    }

    function restoreBadgeRenderer() {
        if (_origRenderPaletteBadges) {
            BadgeRenderer.renderPaletteBadges = _origRenderPaletteBadges;
            _origRenderPaletteBadges = null;
        }
    }

    // =========================================================================
    // Suite
    // =========================================================================

    return TestFramework.suite('Base Palette Renderer', {

        // ─── _escapeHtml ─────────────────────────────────────────────────────

        '_escapeHtml: converts & to &amp;': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            this.assertEqual('a &amp; b', widget._escapeHtml('a & b'));

            tearDown($el);
        },

        '_escapeHtml: converts < and > to entities': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            this.assertEqual('&lt;script&gt;', widget._escapeHtml('<script>'));

            tearDown($el);
        },

        '_escapeHtml: converts double-quote to &quot;': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            this.assertEqual('&quot;val&quot;', widget._escapeHtml('"val"'));

            tearDown($el);
        },

        '_escapeHtml: coerces numeric input to string': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            this.assertEqual('42', widget._escapeHtml(42));

            tearDown($el);
        },

        // ─── _escapeAttr ─────────────────────────────────────────────────────

        '_escapeAttr: escapes & and " but leaves < > intact': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            var result = widget._escapeAttr('a & b "val" <ok>');

            this.assertStringContains(result, '&amp;',  '& must become &amp;');
            this.assertStringContains(result, '&quot;', '" must become &quot;');
            this.assertStringContains(result, '<ok>',   '< and > must be left as-is');

            tearDown($el);
        },

        '_escapeAttr: coerces numeric input to string': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            this.assertEqual('7', widget._escapeAttr(7));

            tearDown($el);
        },

        // ─── _bindAccordion ──────────────────────────────────────────────────

        '_bindAccordion: header click removes active class when open': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');
            var $header  = $el.find('.header');
            var $content = $el.find('.content');

            // Start open
            $header.addClass('active');
            $content.addClass('active').show();

            widget._bindAccordion($header, $content, 'test_open');
            $header.trigger('click');

            this.assertFalse($header.hasClass('active'),
                'Header must lose "active" class after click when open');

            tearDown($el);
        },

        '_bindAccordion: header click adds active class when closed': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');
            var $header  = $el.find('.header');
            var $content = $el.find('.content');

            // Start closed
            $header.removeClass('active');
            $content.removeClass('active').hide();

            widget._bindAccordion($header, $content, 'test_open');
            $header.trigger('click');

            this.assertTrue($header.hasClass('active'),
                'Header must gain "active" class after click when closed');

            tearDown($el);
        },

        '_bindAccordion: ignores clicks on reset button inside header': function () {
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');
            var $header  = $el.find('.header');
            var $content = $el.find('.content');

            $header.addClass('active');
            $content.addClass('active').show();

            // Add reset button inside header
            var $resetBtn = $('<button class="bte-palette-reset-btn">Reset</button>')
                .appendTo($header);

            widget._bindAccordion($header, $content, 'test_open');
            $resetBtn.trigger('click');

            // Active state must remain unchanged
            this.assertTrue($header.hasClass('active'),
                'Accordion must not toggle when reset button is clicked');

            tearDown($el);
        },

        '_bindAccordion: persists open state via StorageHelper': function () {
            var stored = {};
            var origSet = StorageHelper.setItem;
            StorageHelper.setItem = function (key, val) { stored[key] = val; };

            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');
            var $header  = $el.find('.header');
            var $content = $el.find('.content');

            $header.addClass('active');
            $content.show();

            widget._bindAccordion($header, $content, 'my_section_open');
            $header.trigger('click'); // closes

            StorageHelper.setItem = origSet;

            this.assertEqual('false', stored['my_section_open'],
                'StorageHelper must persist "false" after closing accordion');

            tearDown($el);
        },

        '_bindAccordion: persists closed→open state via StorageHelper': function () {
            var stored = {};
            var origSet = StorageHelper.setItem;
            StorageHelper.setItem = function (key, val) { stored[key] = val; };

            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');
            var $header  = $el.find('.header');
            var $content = $el.find('.content');

            $header.removeClass('active');
            $content.hide();

            widget._bindAccordion($header, $content, 'my_section_open');
            $header.trigger('click'); // opens

            StorageHelper.setItem = origSet;

            this.assertEqual('true', stored['my_section_open'],
                'StorageHelper must persist "true" after opening accordion');

            tearDown($el);
        },

        // ─── _updateHeaderBadges / _getBadgeCounts ───────────────────────────

        '_updateHeaderBadges: writes BadgeRenderer output to $badgesContainer': function () {
            stubBadgeRenderer(function () { return '<span>BADGE</span>'; });

            var $el = buildFixture({ dirty: 1, modified: 0 });
            var widget = $el.data('swissup-testPaletteChild');

            widget._updateHeaderBadges();

            restoreBadgeRenderer();

            this.assertStringContains(
                $el.find('.badges').html(),
                'BADGE',
                '$badgesContainer must contain BadgeRenderer output'
            );

            tearDown($el);
        },

        '_updateHeaderBadges: passes dirty count from _getBadgeCounts to BadgeRenderer': function () {
            var receivedDirty;
            stubBadgeRenderer(function (d) { receivedDirty = d; return ''; });

            var $el = buildFixture({ dirty: 3, modified: 0 });
            var widget = $el.data('swissup-testPaletteChild');

            widget._updateHeaderBadges();

            restoreBadgeRenderer();

            this.assertEqual(3, receivedDirty,
                'BadgeRenderer must receive the dirty count from _getBadgeCounts');

            tearDown($el);
        },

        '_updateHeaderBadges: passes modified count from _getBadgeCounts to BadgeRenderer': function () {
            var receivedModified;
            stubBadgeRenderer(function (d, m) { receivedModified = m; return ''; });

            var $el = buildFixture({ dirty: 0, modified: 5 });
            var widget = $el.data('swissup-testPaletteChild');

            widget._updateHeaderBadges();

            restoreBadgeRenderer();

            this.assertEqual(5, receivedModified,
                'BadgeRenderer must receive the modified count from _getBadgeCounts');

            tearDown($el);
        },

        '_updateHeaderBadges: no-op when $badgesContainer is absent': function () {
            // Must not throw when the container element has not been set
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            widget.$badgesContainer = null;

            var threw = false;
            try {
                widget._updateHeaderBadges();
            } catch (e) {
                threw = true;
            }

            this.assertFalse(threw, '_updateHeaderBadges must not throw when $badgesContainer is null');

            tearDown($el);
        },

        '_getBadgeCounts base implementation: returns dirty 0 and modified 0': function () {
            // When the child widget does NOT override _getBadgeCounts, the base
            // stub returns {dirty:0, modified:0}.  We test this via a widget
            // that inherits directly without overriding.
            if (!$.swissup.testPaletteBase) {
                $.widget('swissup.testPaletteBase', $.swissup.basePaletteRenderer, {
                    _create: function () {
                        this._super();
                        this.$badgesContainer = this.element.find('.badges');
                        this.$header  = this.element.find('.header');
                        this.$content = this.element.find('.content');
                    }
                    // _getBadgeCounts is NOT overridden — uses base stub
                });
            }

            var $el = $('<div><div class="header"></div><div class="content"></div><div class="badges"></div></div>').appendTo(document.body);
            $el.testPaletteBase();
            var widget = $el.data('swissup-testPaletteBase');

            var counts = widget._getBadgeCounts();

            this.assertEqual(0, counts.dirty,    'base _getBadgeCounts must return dirty: 0');
            this.assertEqual(0, counts.modified, 'base _getBadgeCounts must return modified: 0');

            try { $el.testPaletteBase('destroy'); } catch (e) {}
            $el.remove();
        },

        // ─── _bindBadgeUpdates / _destroyBadgeUpdates ────────────────────────

        '_bindBadgeUpdates: paletteColorChanged triggers _updateHeaderBadges': function () {
            var called = 0;
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            // Stub _updateHeaderBadges on this instance
            widget._updateHeaderBadges = function () { called++; };

            widget._bindBadgeUpdates();
            $(document).trigger('paletteColorChanged');
            widget._destroyBadgeUpdates();

            this.assertEqual(1, called,
                'paletteColorChanged must trigger _updateHeaderBadges once');

            tearDown($el);
        },

        '_bindBadgeUpdates: themeEditorDraftSaved triggers _updateHeaderBadges': function () {
            var called = 0;
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            widget._updateHeaderBadges = function () { called++; };

            widget._bindBadgeUpdates();
            $(document).trigger('themeEditorDraftSaved');
            widget._destroyBadgeUpdates();

            this.assertEqual(1, called,
                'themeEditorDraftSaved must trigger _updateHeaderBadges once');

            tearDown($el);
        },

        '_destroyBadgeUpdates: stops callbacks after unsubscribing': function () {
            var called = 0;
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');

            widget._updateHeaderBadges = function () { called++; };

            widget._bindBadgeUpdates();
            widget._destroyBadgeUpdates();

            // Fire events — callbacks must NOT run after destroy
            $(document).trigger('paletteColorChanged');
            $(document).trigger('themeEditorDraftSaved');

            this.assertEqual(0, called,
                'No callbacks must fire after _destroyBadgeUpdates()');

            tearDown($el);
        },

        // ─── _destroy cleans up accordion listener ───────────────────────────

        '_bindAccordion: handler can be removed via off("click.bte-accordion")': function () {
            // Verifies that the namespace used in _bindAccordion matches what
            // _destroy calls — i.e. the same key can be used to unbind.
            var $el = buildFixture();
            var widget = $el.data('swissup-testPaletteChild');
            var $header  = $el.find('.header');
            var $content = $el.find('.content');

            $header.addClass('active');
            $content.show();

            widget._bindAccordion($header, $content, 'test_unbind');

            // Manually unbind (same as what _destroy does)
            $header.off('click.bte-accordion');

            // Click — active must remain because handler was removed
            $header.trigger('click');

            this.assertTrue($header.hasClass('active'),
                'Accordion handler must be removable via off("click.bte-accordion")');

            tearDown($el);
        }
    });
});
