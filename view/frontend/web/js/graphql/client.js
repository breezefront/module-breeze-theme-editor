define([
    'jquery'
], function ($) {
    'use strict';

    /**
     * Lightweight GraphQL client
     */
    var GraphQLClient = {
        /**
         * Get GraphQL endpoint from config
         *
         * @returns {String}
         */
        _getEndpoint: function() {
            var config = $('body').data('breeze-editor-config');
            return config && config.graphqlEndpoint ? config.graphqlEndpoint : '/graphql';
        },

        /**
         * Execute GraphQL query/mutation
         *
         * @param {String} query - GraphQL query string
         * @param {Object} variables - Query variables
         * @param {String} operationName - Optional operation name
         * @returns {Promise}
         */
        execute: function(query, variables, operationName) {
            var payload = {
                query: query,
                variables: variables || {}
            };

            if (operationName) {
                payload.operationName = operationName;
            }

            // Use native XMLHttpRequest to avoid Magento's jQuery AJAX hooks
            var self = this;
            var deferred = $.Deferred();
            var xhr = new XMLHttpRequest();
            
            xhr.open('POST', this._getEndpoint(), true);
            
            // Set headers
            var headers = this._getHeaders();
            for (var key in headers) {
                if (headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, headers[key]);
                }
            }
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        deferred.resolve(self._handleSuccess(response));
                    } catch (e) {
                        deferred.reject(self._handleError({
                            status: xhr.status,
                            statusText: 'JSON Parse Error',
                            responseText: xhr.responseText
                        }));
                    }
                } else {
                    deferred.reject(self._handleError({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText
                    }));
                }
            };
            
            xhr.onerror = function() {
                deferred.reject(self._handleError({
                    status: 0,
                    statusText: 'Network Error',
                    responseText: ''
                }));
            };
            
            xhr.send(JSON.stringify(payload));
            
            return deferred.promise();
        },

        /**
         * Get request headers
         *
         * @returns {Object}
         */
        _getHeaders: function() {
            var headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };

            // Get config from body data
            var config = $('body').data('breeze-editor-config');

            if (config) {
                // Add store header
                if (config.storeCode) {
                    headers['Store'] = config.storeCode;
                }

                // Add access token
                if (config.accessToken) {
                    headers['X-Breeze-Theme-Editor-Token'] = config.accessToken;
                }
            }

            return headers;
        },

        /**
         * Handle successful response
         *
         * @param {Object} response
         * @returns {Object}
         */
        _handleSuccess: function(response) {
            // GUARD: Check if response exists
            if (!response) {
                console.error('❌ GraphQL Response is null or undefined');
                var error = new Error('Empty response from server');
                error.graphqlErrors = [];
                error.extensions = null;
                throw error;
            }

            // Handle GraphQL errors in response
            if (response.errors && response.errors.length > 0) {
                console.error('GraphQL Errors:', response.errors);

                var firstError = response.errors[0];
                var errorMessage = firstError.message;

                // Create error object with full GraphQL error data
                var error = new Error('GraphQL Error: ' + errorMessage);
                error.graphqlErrors = response.errors;
                error.extensions = firstError.extensions || null;

                throw error;
            }

            // GUARD: Check if data exists when no errors
            if (!response.data) {
                console.warn('⚠️ GraphQL response has no data field:', response);
                return null;
            }

            return response.data;
        },

        /**
         * Handle AJAX error
         *
         * @param {Object} xhr - XHR object or error object with {status, statusText, responseText}
         * @param {String} status - Optional status (for jQuery compatibility)
         * @param {String} error - Optional error (for jQuery compatibility)
         */
        _handleError: function(xhr, status, error) {
            // Support both jQuery format (xhr, status, error) and custom format ({status, statusText, responseText})
            var statusCode = xhr.status || 0;
            var statusText = xhr.statusText || status || '';
            var responseText = xhr.responseText || '';
            
            console.error('GraphQL Request Failed:', {
                status: statusCode,
                statusText: statusText,
                error: error || statusText,
                response: responseText
            });

            var message = 'Network error';
            var extensions = null;
            var graphqlErrors = [];

            // GUARD: Check if responseText exists and is not empty
            if (responseText) {
                try {
                    var response = JSON.parse(responseText);
                    
                    // GUARD: Check if response exists after parsing
                    if (response && response.errors && response.errors.length > 0) {
                        var firstError = response.errors[0];
                        message = firstError.message;
                        graphqlErrors = response.errors;

                        // Parse extensions with debugMessage
                        if (firstError.extensions) {
                            extensions = firstError.extensions;
                        }
                    }
                } catch (e) {
                    // JSON parse failed - use status/error as fallback
                    message = error || statusText || 'Network error';
                }
            } else {
                // No response body - likely network issue
                message = error || statusText || 'Network error';
            }

            // Create error object with extensions and graphqlErrors
            var errorObj = new Error(message);
            errorObj.extensions = extensions;
            errorObj.graphqlErrors = graphqlErrors;

            throw errorObj;
        }
    };

    return GraphQLClient;
});
