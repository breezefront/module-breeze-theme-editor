define([
    'jquery'
], function ($) {
    'use strict';

    /**
     * Lightweight GraphQL client
     */
    var GraphQLClient = {
        endpoint: '/graphql',

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
                url: this.endpoint,
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
         */
        _getHeaders: function() {
            var headers = {
                'Content-Type': 'application/json'
            };

            // Add store header if available
            var storeCode = window.BREEZE_EDITOR_CONFIG?.storeCode;
            if (storeCode) {
                headers['Store'] = storeCode;
            }

            // Add X-Requested-With for AJAX detection
            headers['X-Requested-With'] = 'XMLHttpRequest';

            return headers;
        },

        /**
         * Handle successful response
         */
        _handleSuccess: function(response) {
            if (response.errors && response.errors.length > 0) {
                console.error('GraphQL Errors:', response.errors);

                var errorMessage = response.errors
                    .map(function(err) { return err.message; })
                    .join(', ');

                throw new Error('GraphQL Error: ' + errorMessage);
            }

            return response.data;
        },

        /**
         * Handle AJAX error
         */
        _handleError: function(xhr, status, error) {
            console.error('GraphQL Request Failed:', {
                status: status,
                error: error,
                response: xhr.responseText
            });

            var message = 'Network error';

            try {
                var response = JSON.parse(xhr.responseText);
                if (response.errors && response.errors.length > 0) {
                    message = response.errors[0].message;
                }
            } catch (e) {
                message = error || status;
            }

            throw new Error(message);
        }
    };

    return GraphQLClient;
});
