/**
 * Admin Status Indicator Widget
 * 
 * Показує поточний статус публікації (Draft/Published/Scheduled)
 * та кількість змін в draft версії.
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/status-indicator.html'
], function ($, widget, mageTemplate, statusTemplate) {
    'use strict';

    $.widget('swissup.breezeStatusIndicator', {
        options: {
            currentStatus: 'DRAFT',
            draftChangesCount: 0,
            statuses: {
                'DRAFT': {
                    label: 'Draft',
                    class: 'status-draft'
                },
                'PUBLISHED': {
                    label: 'Published',
                    class: 'status-published'
                },
                'SCHEDULED': {
                    label: 'Scheduled',
                    class: 'status-scheduled'
                }
            }
        },

        /**
         * Initialize widget
         */
        _create: function () {
            this.template = mageTemplate(statusTemplate);
            this._render();
            
            console.log('📊 Status indicator initialized:', this.options.currentStatus);
        },

        /**
         * Render status indicator from template
         */
        _render: function () {
            var statusConfig = this.options.statuses[this.options.currentStatus];
            
            if (!statusConfig) {
                console.warn('⚠️ Unknown status:', this.options.currentStatus);
                statusConfig = this.options.statuses['DRAFT'];
            }

            var data = {
                label: statusConfig.label,
                statusClass: statusConfig.class,
                draftCount: this.options.draftChangesCount,
                showBadge: this.options.draftChangesCount > 0
            };

            var html = this.template({ data: data });
            this.element.html(html);
        },

        /**
         * Set status and draft count
         * @param {String} status - Status name (DRAFT, PUBLISHED, SCHEDULED)
         * @param {Number} draftCount - Number of draft changes
         */
        setStatus: function(status, draftCount) {
            this.options.currentStatus = status;
            this.options.draftChangesCount = draftCount || 0;
            this._render();
            
            // Trigger event for other components
            this.element.trigger('statusChanged', [{
                status: status,
                draftCount: draftCount
            }]);
            
            console.log('📊 Status updated:', status, '| Drafts:', draftCount);
        },

        /**
         * Get current status data
         * @returns {Object}
         */
        getStatus: function() {
            return {
                current: this.options.currentStatus,
                draftCount: this.options.draftChangesCount
            };
        },

        /**
         * Increment draft count
         */
        incrementDraftCount: function() {
            this.setStatus(this.options.currentStatus, this.options.draftChangesCount + 1);
        },

        /**
         * Reset draft count to 0
         */
        resetDraftCount: function() {
            this.setStatus(this.options.currentStatus, 0);
        }
    });

    return $.swissup.breezeStatusIndicator;
});
