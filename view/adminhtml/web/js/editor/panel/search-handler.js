/**
 * Search Handler for Settings Editor Panel
 *
 * Manages the search input: filtering sections/fields by query,
 * clearing the search, and restoring accordion state after clear.
 *
 * Extracted from settings-editor.js (п.3.3 refactoring).
 *
 * @module Swissup_BreezeThemeEditor/js/editor/panel/search-handler
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function (
    $,
    StorageHelper,
    Logger
) {
    'use strict';

    var log = Logger.for('panel/search-handler');

    return {
        /**
         * Bind search input and clear button events.
         *
         * @param {Object} ctx - Widget context (this)
         */
        bind: function (ctx) {
            var self = this;
            var debouncedFilter = this.debounce(function () {
                var query = ctx.$searchInput.val().trim();

                self.filter(ctx, query);
                ctx.$searchClear.toggle(query.length > 0);
            }, 250);

            ctx.$searchInput.on('input', debouncedFilter);
            ctx.$searchClear.on('click', function () {
                self.clear(ctx);
            });
        },

        /**
         * Filter sections and fields by search query.
         * Searches against: section label, field label, field description.
         * HEADING-type fields are always hidden when search is active.
         *
         * @param {Object} ctx   - Widget context (this)
         * @param {string} query
         */
        filter: function (ctx, query) {
            var normalized = query.toLowerCase();

            // Remove previous "no results" message
            ctx.$sectionsContainer.find('.bte-search-no-results').remove();

            if (!normalized) {
                // Restore: show everything, re-apply saved accordion state
                ctx.$sectionsContainer.find('.bte-accordion-section').show();
                ctx.$sectionsContainer.find('.bte-field-wrapper').show();

                var saved = StorageHelper.getOpenSections();

                ctx.$sectionsContainer.find('.bte-accordion-header').each(function () {
                    var $h = $(this);
                    var code = $h.data('section');
                    var $c = ctx.$sectionsContainer.find(
                        '.bte-accordion-content[data-section="' + code + '"]'
                    );

                    if (saved && saved.indexOf(code) !== -1) {
                        $h.addClass('active');
                        $c.addClass('active').show();
                    } else {
                        $h.removeClass('active');
                        $c.removeClass('active').hide();
                    }
                });

                log.debug('Search cleared — accordion state restored');
                return;
            }

            var totalVisible = 0;

            ctx.$sectionsContainer.find('.bte-accordion-section').each(function () {
                var $section = $(this);
                var $header  = $section.find('> .bte-accordion-header');
                var $content = $section.find('> .bte-accordion-content');
                var sectionLabel = $header.find('.bte-section-label').text().toLowerCase();
                var sectionMatches = sectionLabel.indexOf(normalized) !== -1;
                var visibleCount = 0;

                $content.find('.bte-field-wrapper').each(function () {
                    var $wrapper = $(this);

                    // HEADING fields are visual dividers — always hide during search
                    if ($wrapper.find('.bte-field-heading').length) {
                        $wrapper.hide();
                        return;
                    }

                    var labelText = $wrapper.find('.bte-field-label').first().text().toLowerCase();
                    var descText  = $wrapper.find('.bte-field-description').first().text().toLowerCase();
                    var matches   = sectionMatches ||
                                    labelText.indexOf(normalized) !== -1 ||
                                    descText.indexOf(normalized)  !== -1;

                    if (matches) {
                        $wrapper.show();
                        visibleCount++;
                    } else {
                        $wrapper.hide();
                    }
                });

                if (visibleCount > 0) {
                    $section.show();
                    $header.addClass('active');
                    $content.addClass('active').show();
                    totalVisible += visibleCount;
                } else {
                    $section.hide();
                }
            });

            if (totalVisible === 0) {
                ctx.$sectionsContainer.append(
                    '<p class="bte-search-no-results">No settings found for &ldquo;' +
                    $('<span>').text(query).html() +
                    '&rdquo;</p>'
                );
            }

            log.debug('Search "' + query + '" — ' + totalVisible + ' field(s) visible');
        },

        /**
         * Clear the search input and restore accordion state.
         *
         * @param {Object} ctx - Widget context (this)
         */
        clear: function (ctx) {
            ctx.$searchInput.val('');
            ctx.$searchClear.hide();
            this.filter(ctx, '');
        },

        /**
         * Returns a debounced version of the given function.
         *
         * @param {Function} fn
         * @param {number}   delay  milliseconds
         * @returns {Function}
         */
        debounce: function (fn, delay) {
            var timer;

            return function () {
                var context = this,
                    args    = arguments;

                clearTimeout(timer);
                timer = setTimeout(function () {
                    fn.apply(context, args);
                }, delay);
            };
        }
    };
});
