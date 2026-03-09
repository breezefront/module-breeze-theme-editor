/**
 * Publication Selector Renderer Module
 * Handles all UI updates and DOM manipulations
 */
define([
    'jquery',
    'mage/template',
    'mage/translate',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function($, mageTemplate, $t, Logger) {
    'use strict';

    var log = Logger.for('toolbar/publication-selector/renderer');

    return {
        /**
         * Initialize renderer
         * @param {Object} options
         * @param {jQuery} options.element - Widget element
         * @param {string} options.templateString - Template HTML string
         */
        init: function(options) {
            this.$element = options.element;
            this.template = mageTemplate(options.templateString);
            
            log.info('Renderer initialized');
            return this;
        },

        /**
         * Full render (initial or after data change)
         * @param {Object} data - Render data
         */
        render: function(data) {
            var html = this.template({
                status: data.status,
                changesCount: data.changesCount,
                publishedModifiedCount: data.publishedModifiedCount || 0,
                publications: data.publications,
                currentPublicationId: data.currentPublicationId,
                currentPublicationTitle: data.currentPublicationTitle,
                canPublish: data.canPublish,
                canRollback: data.canRollback,
                canResetPublished: data.canResetPublished,
                canDeletePublication: data.canDeletePublication,
                activePublicationId: data.activePublicationId,
                // Computed values
                displayLabel: this._getDisplayLabel(data),
                badgeText: this._getBadgeText(data),
                badgeClass: this._getBadgeClass(data),
                draftMeta: this._getMetaText('DRAFT', data),
                publishedMeta: this._getMetaText('PUBLISHED', data)
            });
            
            this.$element.html(html);
            log.debug('Full render completed');
        },

        /**
         * Update only button (partial update)
         * @param {Object} data
         */
        updateButton: function(data) {
            var $button = this.$element.find('.toolbar-select');
            if (!$button.length) {
                return;
            }
            
            // Update status class
            $button.removeClass('status-draft status-published status-publication')
                   .addClass('status-' + data.status.toLowerCase());
            
            // Update label (using translated text)
            var label = this._getDisplayLabel(data);
            $button.find('.select-label').text(label);
            
            // Update badge
            this.updateBadge(data);
            
            log.debug('Button updated: ' + data.status);
        },

        /**
         * Update only badge (partial update)
         * @param {Object} data
         */
        updateBadge: function(data) {
            var $button = this.$element.find('.toolbar-select');
            if (!$button.length) {
                return;
            }
            
            // Remove old badge
            $button.find('.select-badge').remove();
            
            // Create new badge based on status (using translated text)
            var badgeText = this._getBadgeText(data);
            var badgeClass = this._getBadgeClass(data);
            
            // Insert badge before arrow
            if (badgeText) {
                var badgeHtml = '<span class="select-badge ' + badgeClass + '">' + badgeText + '</span>';
                $button.find('.select-arrow').before(badgeHtml);
            }
            
            log.debug('Badge updated: ' + data.status + ' ' + data.changesCount);
        },

        /**
         * Update checkmarks in dropdown (partial update)
         * @param {Object} data
         */
        updateCheckmarks: function(data) {
            var $dropdown = this.$element.find('.toolbar-dropdown');
            if (!$dropdown.length) {
                return;
            }
            
            // Remove all active classes and checkmarks
            $dropdown.find('.dropdown-item, .dropdown-item-group').removeClass('active');
            $dropdown.find('.item-check').remove();
            
            // Add active state and checkmark to current item
            if (data.status === 'PUBLICATION') {
                // Find and mark publication item
                var $pubItem = $dropdown.find('[data-publication-id="' + data.currentPublicationId + '"]');
                $pubItem.addClass('active')
                        .append('<span class="item-check">✓</span>');
            } else {
                // Find and mark draft/published item
                var $statusItem = $dropdown.find('[data-status="' + data.status + '"]');
                $statusItem.addClass('active')
                           .append('<span class="item-check">✓</span>');
                
                // Also mark the parent group for Draft (which has additional publish button)
                if (data.status === 'DRAFT') {
                    $statusItem.closest('.dropdown-item-group').addClass('active');
                }
            }
            
            log.debug('Checkmarks updated: ' + data.status);
        },

        /**
         * Show loading state
         */
        showLoading: function() {
            var $button = this.$element.find('.toolbar-select');
            $button.addClass('loading').prop('disabled', true);
        },

        /**
         * Hide loading state
         */
        hideLoading: function() {
            var $button = this.$element.find('.toolbar-select');
            $button.removeClass('loading').prop('disabled', false);
        },

        /**
         * Close dropdown
         */
        closeDropdown: function() {
            this.$element.find('.toolbar-dropdown').hide();
        },

        /**
         * Update Load More button visibility based on publications count
         * @param {Object} data - State data with publications array and totalPublications count
         */
        updateLoadMoreButton: function(data) {
            var $loadMore = this.$element.find('[data-action="load-more"]');
            var $allLoaded = this.$element.find('[data-status="all-loaded"]');
            var $count = $loadMore.find('.item-meta');
            
            if (!data.publications || !data.totalPublications) {
                $loadMore.hide();
                $allLoaded.hide();
                return;
            }
            
            var loadedCount = data.publications.length;
            var totalCount = data.totalPublications;
            
            if (loadedCount >= totalCount) {
                // All loaded → hide "Load More", show "All Loaded"
                $loadMore.hide();
                $allLoaded.show();
                log.info('All ' + totalCount + ' publications loaded');
            } else {
                // Show "Load More" with count
                $loadMore.show();
                $allLoaded.hide();
                $count.text($t('Showing %1 of %2')
                    .replace('%1', loadedCount)
                    .replace('%2', totalCount));
                log.debug('Showing ' + loadedCount + ' of ' + totalCount + ' publications');
            }
        },

        // ============ Helper Methods (Computed Values) ============

        /**
         * Get display label for button
         * @private
         * @param {Object} data
         * @returns {string}
         */
        _getDisplayLabel: function(data) {
            if (data.status === 'PUBLICATION' && data.currentPublicationTitle) {
                return data.currentPublicationTitle;
            }
            return $t(data.status);
        },

        /**
         * Get badge text for current status
         * @private
         * @param {Object} data
         * @returns {string}
         */
        _getBadgeText: function(data) {
            if (data.status === 'DRAFT' && data.changesCount > 0) {
                return '(' + data.changesCount + ' ' + $t('changes') + ')';
            } else if (data.status === 'PUBLISHED') {
                return '(' + $t('Live') + ')';
            } else if (data.status === 'PUBLICATION') {
                return '(' + $t('Archive') + ')';
            }
            return '';
        },

        /**
         * Get badge CSS class for current status
         * @private
         * @param {Object} data
         * @returns {string}
         */
        _getBadgeClass: function(data) {
            if (data.status === 'DRAFT') {
                return 'badge-changes';
            } else if (data.status === 'PUBLISHED') {
                return 'badge-live';
            } else if (data.status === 'PUBLICATION') {
                return 'badge-archive';
            }
            return '';
        },

        /**
         * Get meta text for dropdown item
         * @private
         * @param {string} status - DRAFT, PUBLISHED, or PUBLICATION
         * @param {Object} data
         * @returns {string}
         */
        _getMetaText: function(status, data) {
            if (status === 'DRAFT') {
                return data.changesCount > 0 
                    ? data.changesCount + ' ' + $t('changes')
                    : $t('No changes');
            } else if (status === 'PUBLISHED') {
                return $t('Live');
            } else if (status === 'PUBLICATION') {
                return $t('Archive');
            }
            return '';
        }
    };
});
