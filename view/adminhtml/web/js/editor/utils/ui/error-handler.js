/**
 * Error Handler Utility for Breeze Theme Editor
 *
 * Handles GraphQL errors and displays user-friendly messages.
 * Provides consistent error handling across all components.
 *
 * @module Swissup_BreezeThemeEditor/js/editor/utils/ui/error-handler
 */
define(['jquery', 'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function($, Logger) {
    'use strict';

    var log = Logger.for('utils/ui/error-handler');

    return {
        /**
         * Handle GraphQL error response
         *
         * @param {Error} error - Error object from GraphQL client
         * @param {string} context - Context of where error occurred (e.g., 'publish-draft')
         */
        handle: function(error, context) {
            log.error('[BTE Error] ' + context, error);

            var message = this._getErrorMessage(error);
            this._showError(message, context);
        },

        /**
         * Get user-friendly error message based on error type
         *
         * @private
         * @param {Error} error - Error object
         * @returns {string} User-friendly error message
         */
        _getErrorMessage: function(error) {
            // Network error (no response)
            if (!error.response) {
                return 'Network error. Please check your connection and try again.';
            }

            // HTTP status-based messages
            switch (error.response.status) {
                case 401:
                    return 'Your session has expired. Please refresh the page and log in again.';
                case 403:
                    return 'You do not have permission to perform this action. Please contact your administrator.';
                case 404:
                    return 'The requested resource was not found. Please refresh the page.';
                case 500:
                    return 'Server error occurred. Please try again later or contact support.';
                case 503:
                    return 'Service temporarily unavailable. Please try again in a few moments.';
                default:
                    return error.message || 'An unexpected error occurred. Please try again.';
            }
        },

        /**
         * Show error message to user using Magento's notification system
         *
         * @private
         * @param {string} message - Error message to display
         * @param {string} context - Context of the error
         */
        _showError: function(message, context) {
            // Try to use Magento's alert modal (if available)
            if (window.require) {
                require(['Magento_Ui/js/modal/alert'], function(alert) {
                    alert({
                        title: 'Error',
                        content: message,
                        buttons: [{
                            text: 'OK',
                            class: 'action-primary action-accept',
                            click: function() {
                                this.closeModal(true);
                            }
                        }]
                    });
                });
            } else {
                // Fallback to native alert
                alert('Error: ' + message);
            }
        }
    };
});
