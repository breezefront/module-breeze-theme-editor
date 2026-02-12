/**
 * Admin Status Indicator Widget
 * 
 * Показує поточний статус публікації (Draft/Published/Scheduled)
 * та кількість змін в draft версії.
 * Автоматично оновлюється через GraphQL.
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/status-indicator.html',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-statuses'
], function ($, widget, mageTemplate, statusTemplate, graphqlClient, getStatusesQuery) {
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
            // Get store and theme IDs from config
            var config = window.breezeThemeEditorConfig || {};
            this.storeId = config.storeId || this.options.storeId;
            this.themeId = config.themeId || this.options.themeId;
            
            this.template = mageTemplate(statusTemplate);
            this._render();
            this._bindEvents();
            
            // Start auto-refresh
            this._startAutoRefresh();
            
            // Initial status refresh from GraphQL
            this._refreshStatus();
            
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
        },

        /**
         * Bind event handlers
         * @private
         */
        _bindEvents: function() {
            var self = this;
            
            // Refresh after save
            $(document).on('bte:saved', function() {
                self._refreshStatus();
            });
            
            // Refresh after publish
            $(document).on('bte:published', function() {
                self._refreshStatus();
            });
            
            // Manual refresh on click (if clickable)
            this.element.on('click', '[data-action="refresh"]', function(e) {
                e.preventDefault();
                self._refreshStatus();
            });
        },

        /**
         * Refresh status from GraphQL
         * @private
         */
        _refreshStatus: function() {
            var self = this;
            
            if (!this.storeId || !this.themeId) {
                console.warn('⚠️ Status refresh skipped: missing storeId or themeId');
                return;
            }
            
            graphqlClient.query(getStatusesQuery, {
                storeId: parseInt(this.storeId),
                themeId: parseInt(this.themeId)
            }).then(function(response) {
                if (response.data && response.data.breezeThemeEditorStatuses) {
                    var statuses = response.data.breezeThemeEditorStatuses;
                    
                    // Update options
                    self.options.currentStatus = statuses.currentStatus;
                    self.options.draftChangesCount = statuses.draftChangesCount;
                    
                    // Store additional data if available
                    if (statuses.lastPublishedAt) {
                        self.options.lastPublished = statuses.lastPublishedAt;
                    }
                    
                    // Re-render
                    self._render();
                    
                    console.log('✅ Status updated:', statuses.currentStatus, 
                               'Changes:', statuses.draftChangesCount);
                }
            }).catch(function(error) {
                console.error('Failed to refresh status:', error);
                // Don't show error to user - status refresh is background operation
            });
        },

        /**
         * Start auto-refresh timer
         * @private
         */
        _startAutoRefresh: function() {
            var self = this;
            
            // Refresh every 30 seconds
            this.refreshInterval = setInterval(function() {
                self._refreshStatus();
            }, 30000);
        },

        /**
         * Cleanup on destroy
         * @private
         */
        _destroy: function() {
            // Stop auto-refresh
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            
            // Unbind events
            $(document).off('bte:saved bte:published');
            this.element.off('click', '[data-action="refresh"]');
        }
    });

    return $.swissup.breezeStatusIndicator;
});
