/**
 * Error Handler Utility for Breeze Theme Editor
 * 
 * Handles GraphQL errors and displays user-friendly messages.
 * Provides consistent error handling across all components.
 * 
 * @module Swissup_BreezeThemeEditor/js/editor/utils/ui/error-handler
 */
define(['jquery'], function($) {
    'use strict';
    
    return {
        /**
         * Handle GraphQL error response
         * 
         * @param {Error} error - Error object from GraphQL client
         * @param {string} context - Context of where error occurred (e.g., 'publish-draft')
         */
        handle: function(error, context) {
            console.error('[BTE Error]', context, error);
            
            var message = this._getErrorMessage(error);
            this._showError(message, context);
            
            // Log to server if critical
            if (this._isCritical(error)) {
                this._logToServer(error, context);
            }
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
        },
        
        /**
         * Check if error is critical (5xx server errors)
         * 
         * @private
         * @param {Error} error - Error object
         * @returns {boolean} True if error is critical
         */
        _isCritical: function(error) {
            return error.response && error.response.status >= 500;
        },
        
        /**
         * Log error to server for monitoring
         * 
         * @private
         * @param {Error} error - Error object
         * @param {string} context - Context of the error
         */
        _logToServer: function(error, context) {
            // TODO: Implement server-side error logging endpoint
            // For now, just log to console
            console.log('Would log to server:', {
                context: context,
                error: error.message,
                status: error.response ? error.response.status : null,
                timestamp: new Date().toISOString()
            });
        }
    };
});
