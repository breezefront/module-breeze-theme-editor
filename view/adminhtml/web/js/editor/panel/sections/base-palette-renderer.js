define([
    'jquery',
    'jquery-ui-modules/widget',
    'Swissup_BreezeThemeEditor/js/editor/panel/badge-renderer',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/base-section-renderer'
], function ($, widget, BadgeRenderer, StorageHelper) {
    'use strict';

    /**
     * Base Palette Renderer
     *
     * Shared foundation for palette-section-renderer.js and
     * font-palette-section-renderer.js.  Extends baseSectionRenderer and adds:
     *
     *   _bindAccordion($header, $content, storageKey)
     *       Wires the open/close accordion toggle with SlideUp/Down animation
     *       and StorageHelper persistence.  Both palette section widgets use the
     *       same visual pattern, differing only in the storage key and element
     *       references.
     *
     *   _bindBadgeUpdates()
     *       Subscribes to 'paletteColorChanged' and 'themeEditorDraftSaved' and
     *       calls _updateHeaderBadges() on each.  Child widgets that register
     *       their own named listeners (e.g. font palette) may skip this and
     *       manage the subscriptions themselves; it is provided as a convenience.
     *
     *   _updateHeaderBadges()
     *       Reads counts from the abstract _getBadgeCounts() hook, renders badge
     *       HTML via BadgeRenderer.renderPaletteBadges(), and writes it to
     *       this.$badgesContainer.  Override _getBadgeCounts() in child widgets
     *       to supply the correct dirty/modified numbers.
     *
     *   _getBadgeCounts()
     *       Abstract hook — must be overridden.  Returns { dirty, modified }.
     *
     *   _escapeHtml(str) / _escapeAttr(str)
     *       Shared HTML-escape helpers used when building markup via string
     *       concatenation.
     *
     *   _destroyBadgeUpdates()
     *       Cleans up the anonymous subscriptions registered by _bindBadgeUpdates().
     *       Call from _destroy() when using the convenience binding above.
     *
     * Child widgets must:
     *   1. Extend this base:
     *        $.widget('swissup.myWidget', $.swissup.basePaletteRenderer, { … })
     *   2. Call this._super() as the first line of _create().
     *   3. Set this.$content and this.$badgesContainer before any badge update
     *      fires (i.e. inside _render(), called from _create()).
     *   4. Implement _getBadgeCounts() → { dirty, modified }.
     *   5. Call this._super() inside their own _destroy().
     */
    $.widget('swissup.basePaletteRenderer', $.swissup.baseSectionRenderer, {

        // ── Accordion ────────────────────────────────────────────────────────

        /**
         * Wire open/close accordion toggle for a palette section.
         *
         * Clicking $header slides $content up or down, toggles the 'active'
         * class on both elements, and persists the new state via StorageHelper.
         *
         * The caller is responsible for reading the initial state from storage
         * and applying it before calling this method (typically in _render()).
         *
         * @param {jQuery}  $header     Header element (click target)
         * @param {jQuery}  $content    Content element to show/hide
         * @param {String}  storageKey  StorageHelper key, e.g. 'palette_open'
         * @param {String}  [resetBtnSelector='.bte-palette-reset-btn']
         *                              Clicks on this selector inside $header
         *                              are ignored so the reset button can
         *                              handle its own event independently.
         */
        _bindAccordion: function ($header, $content, storageKey, resetBtnSelector) {
            var skipSelector = resetBtnSelector || '.bte-palette-reset-btn';

            $header.on('click.bte-accordion', function (e) {
                if ($(e.target).closest(skipSelector).length) {
                    return;
                }

                var isOpen = $header.hasClass('active');

                if (isOpen) {
                    $header.removeClass('active');
                    $content.removeClass('active').slideUp(200);
                } else {
                    $header.addClass('active');
                    $content.addClass('active').slideDown(200);
                }

                StorageHelper.setItem(storageKey, isOpen ? 'false' : 'true');
            });
        },

        // ── Badge updates ────────────────────────────────────────────────────

        /**
         * Subscribe to the two document events that require badge refresh.
         * Stores references so _destroyBadgeUpdates() can remove them cleanly.
         *
         * Optional — child widgets that need custom event handling may skip
         * this and manage their own subscriptions.
         */
        _bindBadgeUpdates: function () {
            var self = this;

            this._onBadgePaletteChanged = function () {
                self._updateHeaderBadges();
            };
            this._onBadgeDraftSaved = function () {
                self._updateHeaderBadges();
            };

            $(document).on('paletteColorChanged', this._onBadgePaletteChanged);
            $(document).on('themeEditorDraftSaved', this._onBadgeDraftSaved);
        },

        /**
         * Remove subscriptions registered by _bindBadgeUpdates().
         * Call from _destroy() when _bindBadgeUpdates() was used.
         */
        _destroyBadgeUpdates: function () {
            if (this._onBadgePaletteChanged) {
                $(document).off('paletteColorChanged', this._onBadgePaletteChanged);
            }
            if (this._onBadgeDraftSaved) {
                $(document).off('themeEditorDraftSaved', this._onBadgeDraftSaved);
            }
        },

        /**
         * Render header badges using BadgeRenderer.
         *
         * Reads counts from the abstract _getBadgeCounts() hook and writes
         * the resulting HTML into this.$badgesContainer.
         *
         * Override _getBadgeCounts() in child widgets — do NOT override this
         * method unless you need to append extra markup after the badges (see
         * font-palette-section-renderer for an example with the × restore btn).
         */
        _updateHeaderBadges: function () {
            if (!this.$badgesContainer || !this.$badgesContainer.length) {
                return;
            }

            var counts = this._getBadgeCounts();
            this.$badgesContainer.html(
                BadgeRenderer.renderPaletteBadges(counts.dirty, counts.modified)
            );
        },

        /**
         * Abstract hook — return the current dirty/modified counts.
         *
         * Must be overridden by every child widget.
         *
         * @returns {{ dirty: Number, modified: Number }}
         */
        _getBadgeCounts: function () {
            return { dirty: 0, modified: 0 };
        },

        // ── HTML escape helpers ──────────────────────────────────────────────

        /**
         * Escape a string for safe insertion as HTML text content.
         *
         * @param {String} str
         * @returns {String}
         */
        _escapeHtml: function (str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        },

        /**
         * Escape a string for safe insertion inside an HTML attribute value.
         *
         * @param {String} str
         * @returns {String}
         */
        _escapeAttr: function (str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;');
        },

        // ── Lifecycle ────────────────────────────────────────────────────────

        /**
         * Clean up accordion listeners bound via _bindAccordion().
         * Child _destroy() must call this._super().
         */
        _destroy: function () {
            if (this.$header) {
                this.$header.off('click.bte-accordion');
            }
            this._destroyBadgeUpdates();
            this._super();
        }
    });

    return $.swissup.basePaletteRenderer;
});
