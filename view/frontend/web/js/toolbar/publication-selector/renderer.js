/**
 * Publication Selector - Renderer Module
 * Handles all UI rendering and template logic
 */
define([
    'jquery',
    'mage/template',
    'mage/translate',
    'text!Swissup_BreezeThemeEditor/template/toolbar/publication-selector.html'
], function ($, mageTemplate, $t, publicationSelectorTemplate) {
    'use strict';

    function Renderer(element, options) {
        this.element = element;
        this.options = options;
        this.template = mageTemplate(publicationSelectorTemplate);
    }

    Renderer.prototype = {
        render: function() {
            var html = this.template({
                data: {
                    label: this._getLabel(),
                    badge: this._getBadge(),
                    statusClass: this._getStatusClass(),
                    hasDropdown: true,
                    isDraftActive: this.options.currentStatus === 'DRAFT',
                    draftBadge: this._getDraftBadge(),
                    showPublishButton: this._shouldShowPublishButton(),
                    publishButtonLabel: this._getPublishButtonLabel(),
                    isPublishedActive: this.options.currentStatus === 'PUBLISHED',
                    publishedBadge: this._getPublishedBadge(),
                    i18n: {
                        switchPublication: $t('Switch Publication'),
                        draft: $t('Draft'),
                        published: $t('Published'),
                        recentPublications: $t('Recent Publications'),
                        loading: $t('Loading...'),
                        loadMore: $t('Load More Publications'),
                        allLoaded: $t('All publications loaded')
                    }
                }
            });

            this.element.html(html);
            console.log('📋 Rendered (draftChangesCount: %1)', this.options.draftChangesCount);
        },

        updateBadge: function() {
            var $button = this.element.find('.toolbar-select');
            var $badge = $button.find('.select-badge');
            var newBadge = this._getBadge();

            if (newBadge) {
                if ($badge.length) {
                    $badge.text(newBadge);
                } else {
                    $button.find('.select-label').after('<span class="select-badge">' + newBadge + '</span>');
                }
            } else {
                $badge.remove();
            }
        },

        updateButton: function() {
            var $button = this.element.find('.toolbar-select');
            $button.find('.select-label').text(this._getLabel());
            this.updateBadge();
            $button.removeClass('status-draft status-published status-historical')
                .addClass(this._getStatusClass());
        },

        _getLabel: function() {
            if (this.options.currentStatus === 'DRAFT') return $t('Draft');
            if (this.options.currentStatus === 'PUBLISHED') return $t('Published');
            if (this.options.currentStatus === 'PUBLICATION' && this.options.currentPublicationTitle) {
                return this.options.currentPublicationTitle;
            }
            return $t('Draft');
        },

        _getBadge: function() {
            var count = this.options.draftChangesCount;
            if (this.options.currentStatus === 'DRAFT') {
                return count > 0 ? $t('(%1 changes)').replace('%1', count) : $t('(no changes)');
            }
            if (this.options.currentStatus === 'PUBLISHED') {
                return count > 0 ? $t('(%1 unpublished)').replace('%1', count) : $t('(live)');
            }
            if (this.options.currentStatus === 'PUBLICATION') {
                return $t('(loaded from history)');
            }
            return '';
        },

        _getDraftBadge: function() {
            var count = this.options.draftChangesCount;
            if (count > 0) {
                return count === 1 ? $t('1 change') : $t('%1 changes').replace('%1', count);
            }
            return $t('no changes');
        },

        _getPublishedBadge: function() {
            return this.options.lastPublishedAt ? $t('live') : '';
        },

        _shouldShowPublishButton: function() {
            return this.options.currentStatus === 'DRAFT' && this.options.draftChangesCount > 0;
        },

        _getPublishButtonLabel: function() {
            var count = this.options.draftChangesCount;
            return count === 1 ? $t('Publish 1 change') : $t('Publish %1 changes').replace('%1', count);
        },

        _getStatusClass: function() {
            var map = {
                'DRAFT': 'status-draft',
                'PUBLISHED': 'status-published',
                'PUBLICATION': 'status-historical'
            };
            return map[this.options.currentStatus] || '';
        }
    };

    return Renderer;
});
