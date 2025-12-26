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

            try {
                var response = JSON.parse(xhr.responseText);
                if (response.errors && response.errors.length > 0) {
                    var firstError = response.errors[0];
                    message = firstError.message;

                    // Parse extensions with debugMessage
                    if (firstError.extensions) {
                        extensions = firstError.extensions;
                    }
                }
            } catch (e) {
                message = error || status;
            }

            // Create error object with extensions
            var errorObj = new Error(message);
            errorObj.extensions = extensions;

            throw errorObj;
        }
    };

    return GraphQLClient;
});
