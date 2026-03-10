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
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-statuses',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, widget, mageTemplate, statusTemplate, graphqlClient, getStatusesQuery, Logger) {
    'use strict';

    var log = Logger.for('toolbar/status-indicator');

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
            // Get scope info from config
            var config = window.breezeThemeEditorConfig || {};
            this.scope = config.scope || this.options.scope || 'stores';
            this.scopeId = config.scopeId !== undefined ? config.scopeId : (this.options.scopeId !== undefined ? this.options.scopeId : null);
            this.themeId = config.themeId || this.options.themeId;
            
            this.template = mageTemplate(statusTemplate);
            this._render();
            this._bindEvents();
            
            // Start auto-refresh
            this._startAutoRefresh();
            
            // Initial status refresh from GraphQL
            this._refreshStatus();
            
            log.info('Status indicator initialized: ' + this.options.currentStatus);
        },

        /**
         * Render status indicator from template
         */
        _render: function () {
            var statusConfig = this.options.statuses[this.options.currentStatus];
            
            if (!statusConfig) {
                log.warn('Unknown status: ' + this.options.currentStatus);
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
            
            log.info('Status updated: ' + status + ' | Drafts: ' + draftCount);
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
            $(document).on('themeEditorDraftSaved', function() {
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
            
            if (this.scopeId === null && this.scope !== 'default') {
                log.warn('Status refresh skipped: missing scopeId');
                return;
            }
            
            // Call the query function (it doesn't accept parameters)
            getStatusesQuery().then(function(response) {
                if (response && response.breezeThemeEditorStatuses) {
                    var statuses = response.breezeThemeEditorStatuses;
                    
                    // Update options
                    self.options.currentStatus = statuses.currentStatus;
                    self.options.draftChangesCount = statuses.draftChangesCount;
                    
                    // Store additional data if available
                    if (statuses.lastPublishedAt) {
                        self.options.lastPublished = statuses.lastPublishedAt;
                    }
                    
                    // Re-render
                    self._render();
                    
                    log.info('Status updated: ' + statuses.currentStatus + ' Changes: ' + statuses.draftChangesCount);
                }
            }).catch(function(error) {
                log.error('Failed to refresh status: ' + error);
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
