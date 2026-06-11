/**
 * GraphQL Client — 401 handling tests
 *
 * Covers two 401 paths in _handleError():
 * - htaccess Basic Auth blocking (WWW-Authenticate: Basic) → cause: 'htaccess'
 * - regular expired/invalid token → generic reload message
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper'
], function (TestFramework, GraphQLClient, StorageHelper) {
    'use strict';

    return TestFramework.suite('GraphQL Client — 401 handling', {

        '_handleError 401 with WWW-Authenticate Basic sets cause htaccess': function () {
            var thrown;

            try {
                GraphQLClient._handleError({
                    status: 401,
                    statusText: 'Unauthorized',
                    responseText: '',
                    wwwAuthenticate: 'Basic realm="Restricted"'
                });
            } catch (e) {
                thrown = e;
            }

            this.assertNotNull(thrown, 'Should throw on 401');
            this.assertEquals(thrown.extensions.cause, 'htaccess', 'cause should be htaccess');
            this.assertEquals(thrown.extensions.category, 'authentication', 'category should be authentication');
            this.assertStringContains(thrown.message, '.htaccess', 'message should mention .htaccess');
        },

        '_handleError 401 with WWW-Authenticate Basic mixed-case detected': function () {
            var thrown;

            try {
                GraphQLClient._handleError({
                    status: 401,
                    statusText: 'Unauthorized',
                    responseText: '',
                    wwwAuthenticate: 'BASIC realm="site"'
                });
            } catch (e) {
                thrown = e;
            }

            this.assertNotNull(thrown, 'Should throw on 401');
            this.assertEquals(thrown.extensions.cause, 'htaccess', 'BASIC uppercase should still be detected');
        },

        '_handleError 401 without WWW-Authenticate is generic auth error': function () {
            var thrown;

            try {
                GraphQLClient._handleError({
                    status: 401,
                    statusText: 'Unauthorized',
                    responseText: '',
                    wwwAuthenticate: ''
                });
            } catch (e) {
                thrown = e;
            }

            this.assertNotNull(thrown, 'Should throw on 401');
            this.assertEquals(thrown.extensions.category, 'authentication', 'category should be authentication');
            this.assertFalse(
                thrown.extensions.cause === 'htaccess',
                'Should not set htaccess cause when no WWW-Authenticate header'
            );
            this.assertStringContains(thrown.message, 'reload', 'Generic error should mention page reload');
        },

        '_handleError 401 with WWW-Authenticate Bearer is generic auth error': function () {
            var thrown;

            try {
                GraphQLClient._handleError({
                    status: 401,
                    statusText: 'Unauthorized',
                    responseText: '',
                    wwwAuthenticate: 'Bearer error="invalid_token"'
                });
            } catch (e) {
                thrown = e;
            }

            this.assertNotNull(thrown, 'Should throw on 401');
            this.assertFalse(
                thrown.extensions.cause === 'htaccess',
                'Bearer WWW-Authenticate should not trigger htaccess path'
            );
            this.assertStringContains(thrown.message, 'reload', 'Generic error should mention page reload');
        },

        '_handleError 401 clears admin_token from storage': function () {
            StorageHelper.setGlobalItem('admin_token', 'test-token-value');

            try {
                GraphQLClient._handleError({
                    status: 401,
                    statusText: 'Unauthorized',
                    responseText: '',
                    wwwAuthenticate: ''
                });
            } catch (e) {
                // expected
            }

            var token = StorageHelper.getGlobalItem('admin_token');
            this.assertNull(token, 'Token should be cleared from storage on 401');
        },

        '_handleError 401 htaccess also clears admin_token from storage': function () {
            StorageHelper.setGlobalItem('admin_token', 'test-token-value');

            try {
                GraphQLClient._handleError({
                    status: 401,
                    statusText: 'Unauthorized',
                    responseText: '',
                    wwwAuthenticate: 'Basic realm="Admin"'
                });
            } catch (e) {
                // expected
            }

            var token = StorageHelper.getGlobalItem('admin_token');
            this.assertNull(token, 'Token should be cleared from storage even on htaccess 401');
        },

        '_handleError 401 error has empty graphqlErrors array': function () {
            var thrown;

            try {
                GraphQLClient._handleError({
                    status: 401,
                    statusText: 'Unauthorized',
                    responseText: '',
                    wwwAuthenticate: 'Basic realm="site"'
                });
            } catch (e) {
                thrown = e;
            }

            this.assertNotNull(thrown, 'Should throw');
            this.assertTrue(Array.isArray(thrown.graphqlErrors), 'graphqlErrors should be array');
            this.assertEquals(thrown.graphqlErrors.length, 0, 'graphqlErrors should be empty');
        }
    });
});
