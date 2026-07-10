/**
 * Highlight Overlay
 *
 * Marks every DOM element in the live-preview iframe that a field's CSS
 * variable actually affects on the *current* preview page. Triggered by
 * clicking that field's `.bte-field-highlight-icon` button (rendered next
 * to any field with a `property` — see panel/badge-renderer.js
 * `renderHighlightIcon()` and field-renderers/base.js `prepareData()`).
 *
 * Which elements are "affected" cannot be read from field config alone —
 * most fields write to a `:root`-scoped CSS variable (see
 * field-handlers/base.js `selector` default) — so this module scans the
 * iframe's real compiled CSS via utils/dom/css-var-usage-index.js and
 * resolves the recorded selectors against the current page.
 *
 * Marking is done by toggling a class directly on the matched elements
 * inside the iframe document (same technique as the legacy
 * swissup/module-theme-editor `theme-editor-selected-border` class), with a
 * single injected <style> defining a diagonal hatch background — not by
 * computing getBoundingClientRect() boxes in the parent document. This means the
 * highlight always tracks the element natively (no scroll/resize handling
 * needed) and css-preview-manager.js already establishes the precedent of
 * writing into the iframe document (its `#bte-live-preview` <style>).
 *
 * Result depends on how many elements resolve:
 *   0                          -> info badge, no marking
 *   1                          -> mark it + scroll it into view if offscreen
 *   2..MAX_MARKED_ELEMENTS     -> mark all of them, no scroll (ambiguous target)
 *   > MAX_MARKED_ELEMENTS      -> no marking, info badge with the count instead
 *
 * The info badge (empty/over-cap case) is shown in the parent document, as
 * a small corner card sibling of #bte-iframe — same "sibling of iframe"
 * pattern php-preview-manager.js uses for its reload spinner.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/css-var-usage-index',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, IframeHelper, CssVarUsageIndex, Logger, Constants) {
    'use strict';

    var log = Logger.for('panel/highlight-overlay');

    var STYLE_ID          = 'bte-highlight-style';
    var TARGET_CLASS       = 'bte-highlight-target';
    var OVERLAY_ID          = 'bte-highlight-overlay';
    var EMPTY_TEXT         = 'No elements on this page are affected by this change.';
    var ICON_SELECTOR      = '.bte-field-highlight-icon';
    var ICON_ACTIVE_CLASS  = 'bte-field-highlight-icon--active';
    var NS                 = '.bte-highlight-overlay';
    var MAX_MARKED         = Constants.HIGHLIGHT.MAX_MARKED_ELEMENTS;

    var index          = null;
    var markedElements = [];
    var activeVarName  = null;

    /** Lazily inject the highlight rule into the iframe document (once). */
    function ensureStyleElement(iframeDocument) {
        if (iframeDocument.getElementById(STYLE_ID)) {
            return;
        }

        // Diagonal hatch pattern rather than an outline/border — an outline
        // drawn around `html` (whole-page fields like text color) reads as a
        // jarring frame around the entire viewport; a striped tint works for
        // any element size without looking boxy and reads as an overlay
        // rather than a solid paint-over.
        var style = iframeDocument.createElement('style');
        style.id = STYLE_ID;
        style.textContent =
            '.' + TARGET_CLASS + ' {' +
            'background-image: repeating-linear-gradient(' +
                '45deg,' +
                'rgba(25, 121, 195, 0.25) 0,' +
                'rgba(25, 121, 195, 0.25) 2px,' +
                'transparent 2px,' +
                'transparent 8px' +
            ') !important;' +
            '}';
        iframeDocument.head.appendChild(style);
    }

    function unmarkAll() {
        markedElements.forEach(function (el) {
            el.classList.remove(TARGET_CLASS);
        });
        markedElements = [];
    }

    /** @returns {jQuery} info-badge container, created lazily as a sibling of #bte-iframe */
    function getInfoContainer() {
        var $existing = $('#' + OVERLAY_ID);
        if ($existing.length) {
            return $existing;
        }

        var $el = $('<div>', { id: OVERLAY_ID, 'class': 'bte-highlight-overlay' });
        $(Constants.SELECTORS.IFRAME).after($el);
        return $el;
    }

    function showInfo(text) {
        getInfoContainer().empty().append(
            $('<div>', { 'class': 'bte-highlight-empty', text: text })
        );
    }

    function hideInfo() {
        var $container = $('#' + OVERLAY_ID);
        if ($container.length) {
            $container.empty();
        }
    }

    /**
     * Scroll the iframe's own document so `el` is in view, but only when it
     * isn't already — avoids a jarring scroll-jump on every click for
     * something already visible.
     */
    function maybeScrollIntoView(el) {
        var iframeWin = IframeHelper.getWindow();
        if (!iframeWin) {
            return;
        }

        var rect = el.getBoundingClientRect();
        var fullyVisible = rect.top >= 0 && rect.left >= 0 &&
            rect.bottom <= iframeWin.innerHeight && rect.right <= iframeWin.innerWidth;

        if (fullyVisible) {
            return;
        }

        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function show(varName) {
        if (!varName) {
            return;
        }

        // Always start from a clean slate — a stale mark from a previously
        // active field must never linger under a new one.
        unmarkAll();

        var iframeDocument = IframeHelper.getDocument();
        if (!iframeDocument) {
            showInfo(EMPTY_TEXT);
            return;
        }

        if (!index) {
            index = CssVarUsageIndex.build(iframeDocument);
        }

        var elements = CssVarUsageIndex.resolveElements(iframeDocument, varName, index);

        if (!elements.length) {
            log.debug('No elements affected by ' + varName + ' on current page');
            showInfo(EMPTY_TEXT);
            return;
        }

        if (elements.length > MAX_MARKED) {
            log.debug(elements.length + ' elements affected by ' + varName + ' — over the marking cap, showing count instead');
            showInfo(elements.length + ' elements on this page are affected by this change.');
            return;
        }

        hideInfo();
        ensureStyleElement(iframeDocument);

        elements.forEach(function (el) {
            el.classList.add(TARGET_CLASS);
        });
        markedElements = elements;

        if (elements.length === 1) {
            maybeScrollIntoView(elements[0]);
        }

        log.debug(elements.length + ' element(s) marked for ' + varName);
    }

    function clear() {
        unmarkAll();
        hideInfo();
    }

    function clearActiveIcon() {
        activeVarName = null;
        $(ICON_SELECTOR + '.' + ICON_ACTIVE_CLASS).removeClass(ICON_ACTIVE_CLASS);
    }

    /** Force the CSS-var usage index to be rebuilt on next show() (e.g. after iframe navigation). */
    function invalidateIndex() {
        index = null;
    }

    return {
        show: show,
        clear: clear,
        invalidateIndex: invalidateIndex,

        /**
         * Wire the per-field highlight icon clicks and iframe navigation so
         * the usage index stays in sync with the current preview page.
         */
        init: function () {
            $(document).on('click' + NS, ICON_SELECTOR, function (e) {
                var $btn = $(this);
                var property = $btn.data('highlightProperty');

                if (!property) {
                    return;
                }

                if (activeVarName === property) {
                    // Clicking the already-active field's icon toggles it off.
                    clearActiveIcon();
                    clear();
                    return;
                }

                clearActiveIcon();
                $btn.addClass(ICON_ACTIVE_CLASS);
                activeVarName = property;
                show(property);
            });

            // Iframe navigated to a new page — the old index and any marked
            // elements/active selection belong to the discarded document.
            $(Constants.SELECTORS.IFRAME).on('load' + NS, function () {
                invalidateIndex();
                markedElements = [];
                hideInfo();
                clearActiveIcon();
            });
            $(document).on('bte:cssManagerReady' + NS, function () {
                invalidateIndex();
            });

            log.info('Highlight overlay initialized');
        },

        destroy: function () {
            clear();
            clearActiveIcon();
            $(document).off(NS);
            $(Constants.SELECTORS.IFRAME).off(NS);
            index = null;
        }
    };
});
