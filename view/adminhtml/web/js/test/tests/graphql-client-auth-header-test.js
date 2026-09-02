/**
 * GraphQL Client — auth header selection tests
 *
 * The Bearer token is sent in the header named by config.authHeader.
 * Default is 'Authorization'; sites behind HTTP Basic Auth configure a custom
 * name (e.g. 'X-Bte-Authorization') so the web server does not swallow it.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper'
], function (TestFramework, GraphQLClient, ConfigManager, StorageHelper) {
    'use strict';

    var TOKEN = 'test-token-value';

    function withConfig(config) {
        ConfigManager.clear();
        if (config) {
            ConfigManager.set(config);
        }
        StorageHelper.setGlobalItem('admin_token', TOKEN);

        return GraphQLClient._getHeaders();
    }

    return TestFramework.suite('GraphQL Client — auth header', {

        'defaults to Authorization when config is empty': function () {
            var headers = withConfig(null);

            this.assertEquals(headers['Authorization'], 'Bearer ' + TOKEN, 'Token goes to Authorization');
        },

        'uses Authorization when explicitly configured': function () {
            var headers = withConfig({ authHeader: 'Authorization' });

            this.assertEquals(headers['Authorization'], 'Bearer ' + TOKEN, 'Token goes to Authorization');
        },

        'uses the configured custom header': function () {
            var headers = withConfig({ authHeader: 'X-Bte-Authorization' });

            this.assertEquals(
                headers['X-Bte-Authorization'],
                'Bearer ' + TOKEN,
                'Token goes to the custom header'
            );
        },

        'does not send Authorization when a custom header is configured': function () {
            var headers = withConfig({ authHeader: 'X-Bte-Authorization' });

            this.assertFalse(
                Object.prototype.hasOwnProperty.call(headers, 'Authorization'),
                'Authorization must be absent, otherwise Basic Auth still intercepts it'
            );
        },

        'falls back to Authorization when authHeader is empty': function () {
            var headers = withConfig({ authHeader: '' });

            this.assertEquals(headers['Authorization'], 'Bearer ' + TOKEN, 'Empty value falls back');
        },

        'no auth header is sent without a token': function () {
            ConfigManager.clear();
            ConfigManager.set({ authHeader: 'X-Bte-Authorization' });
            StorageHelper.removeGlobalItem('admin_token');

            var headers = GraphQLClient._getHeaders();

            this.assertFalse(
                Object.prototype.hasOwnProperty.call(headers, 'X-Bte-Authorization'),
                'Custom header must be absent when there is no token'
            );
            this.assertFalse(
                Object.prototype.hasOwnProperty.call(headers, 'Authorization'),
                'Authorization must be absent when there is no token'
            );
        }
    });
});
