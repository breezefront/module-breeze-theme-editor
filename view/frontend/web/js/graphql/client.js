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

            return $.ajax({
                url: this._getEndpoint(),
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify(payload),
                headers: this._getHeaders()
            }).then(
                this._handleSuccess.bind(this),
                this._handleError.bind(this)
            );
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
         * @param {Object} xhr
         * @param {String} status
         * @param {String} error
         */
        _handleError: function(xhr, status, error) {
            console.error('GraphQL Request Failed:', {
                status: status,
                error:  error,
                response: xhr.responseText
            });

            var message = 'Network error';
            var extensions = null;
            var graphqlErrors = [];

            // GUARD: Check if responseText exists and is not empty
            if (xhr && xhr.responseText) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    
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
                    message = error || status || 'Network error';
                }
            } else {
                // No response body - likely network issue
                message = error || status || 'Network error';
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
