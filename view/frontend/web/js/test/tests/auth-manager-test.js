/**
 * Auth Manager Tests
 *
 * Tests token storage and retrieval from localStorage and URL
 */
define([
    'Swissup_BreezeThemeEditor/js/auth-manager'
], function (AuthManager) {
    'use strict';

    return function () {
        var originalLocation = window.location;
        var STORAGE_KEY = 'bte_access_token';
        var testToken = 'test_token_12345';

        return {
            /**
             * Test token retrieval from URL parameter
             */
            'Auth Manager: Should get token from URL parameter': function () {
                // Mock URL with token parameter
                var mockUrl = new URL(window.location.origin + '/test?breeze_theme_editor_access_token=' + testToken);
                delete window.location;
                window.location = mockUrl;

                var token = AuthManager.getTokenFromUrl();

                if (token !== testToken) {
                    throw new Error('Expected token "' + testToken + '" but got "' + token + '"');
                }

                // Restore
                window.location = originalLocation;
            },

            /**
             * Test token storage in localStorage
             */
            'Auth Manager: Should save token to localStorage': function () {
                // Clear any existing token
                localStorage.removeItem(STORAGE_KEY);

                var success = AuthManager.saveToken(testToken);

                if (!success) {
                    throw new Error('Failed to save token');
                }

                var storedToken = localStorage.getItem(STORAGE_KEY);

                if (storedToken !== testToken) {
                    throw new Error('Expected stored token "' + testToken + '" but got "' + storedToken + '"');
                }

                // Cleanup
                localStorage.removeItem(STORAGE_KEY);
            },

            /**
             * Test token retrieval from localStorage
             */
            'Auth Manager: Should get token from localStorage': function () {
                // Store token directly in localStorage
                localStorage.setItem(STORAGE_KEY, testToken);

                var token = AuthManager.getTokenFromStorage();

                if (token !== testToken) {
                    throw new Error('Expected token "' + testToken + '" from localStorage but got "' + token + '"');
                }

                // Cleanup
                localStorage.removeItem(STORAGE_KEY);
            },

            /**
             * Test getToken() method (URL takes priority over localStorage)
             */
            'Auth Manager: Should prioritize URL token over localStorage': function () {
                var urlToken = 'url_token_priority';
                var storageToken = 'storage_token_fallback';

                // Set token in localStorage
                localStorage.setItem(STORAGE_KEY, storageToken);

                // Mock URL with different token
                var mockUrl = new URL(window.location.origin + '/test?breeze_theme_editor_access_token=' + urlToken);
                delete window.location;
                window.location = mockUrl;

                var token = AuthManager.getToken();

                if (token !== urlToken) {
                    throw new Error('Expected URL token "' + urlToken + '" but got "' + token + '"');
                }

                // Restore
                window.location = originalLocation;
                localStorage.removeItem(STORAGE_KEY);
            },

            /**
             * Test getToken() fallback to localStorage when URL has no token
             */
            'Auth Manager: Should fallback to localStorage when URL has no token': function () {
                var storageToken = 'storage_token_fallback';

                // Set token in localStorage
                localStorage.setItem(STORAGE_KEY, storageToken);

                // Mock URL without token
                var mockUrl = new URL(window.location.origin + '/test');
                delete window.location;
                window.location = mockUrl;

                var token = AuthManager.getToken();

                if (token !== storageToken) {
                    throw new Error('Expected localStorage token "' + storageToken + '" but got "' + token + '"');
                }

                // Restore
                window.location = originalLocation;
                localStorage.removeItem(STORAGE_KEY);
            },

            /**
             * Test token clearing
             */
            'Auth Manager: Should clear token from localStorage': function () {
                // Store token
                localStorage.setItem(STORAGE_KEY, testToken);

                var success = AuthManager.clearToken();

                if (!success) {
                    throw new Error('Failed to clear token');
                }

                var token = localStorage.getItem(STORAGE_KEY);

                if (token !== null) {
                    throw new Error('Expected null after clearing but got "' + token + '"');
                }
            },

            /**
             * Test adding token to URL
             */
            'Auth Manager: Should add token to URL': function () {
                // Store token in localStorage
                localStorage.setItem(STORAGE_KEY, testToken);

                var targetUrl = 'https://example.com/checkout';
                var urlWithToken = AuthManager.addTokenToUrl(targetUrl);

                if (urlWithToken.indexOf('breeze_theme_editor_access_token=' + testToken) === -1) {
                    throw new Error('Token not found in URL: ' + urlWithToken);
                }

                // Cleanup
                localStorage.removeItem(STORAGE_KEY);
            },

            /**
             * Test adding token to URL with existing query params
             */
            'Auth Manager: Should add token to URL with existing params': function () {
                localStorage.setItem(STORAGE_KEY, testToken);

                var targetUrl = 'https://example.com/checkout?foo=bar';
                var urlWithToken = AuthManager.addTokenToUrl(targetUrl);

                if (urlWithToken.indexOf('breeze_theme_editor_access_token=' + testToken) === -1) {
                    throw new Error('Token not found in URL with params: ' + urlWithToken);
                }

                if (urlWithToken.indexOf('foo=bar') === -1) {
                    throw new Error('Existing params lost in URL: ' + urlWithToken);
                }

                // Cleanup
                localStorage.removeItem(STORAGE_KEY);
            },

            /**
             * Test hasToken() method
             */
            'Auth Manager: Should correctly check if token exists': function () {
                // Clear token
                localStorage.removeItem(STORAGE_KEY);

                // Mock URL without token
                var mockUrl = new URL(window.location.origin + '/test');
                delete window.location;
                window.location = mockUrl;

                if (AuthManager.hasToken()) {
                    throw new Error('hasToken() should return false when no token exists');
                }

                // Add token to localStorage
                localStorage.setItem(STORAGE_KEY, testToken);

                if (!AuthManager.hasToken()) {
                    throw new Error('hasToken() should return true when token exists in localStorage');
                }

                // Restore
                window.location = originalLocation;
                localStorage.removeItem(STORAGE_KEY);
            },

            /**
             * Test init() method
             */
            'Auth Manager: Should initialize and store token from URL': function () {
                // Clear any existing token
                localStorage.removeItem(STORAGE_KEY);

                // Mock URL with token
                var mockUrl = new URL(window.location.origin + '/test?breeze_theme_editor_access_token=' + testToken);
                delete window.location;
                window.location = mockUrl;

                var token = AuthManager.init();

                if (token !== testToken) {
                    throw new Error('init() should return token from URL: got "' + token + '"');
                }

                var storedToken = localStorage.getItem(STORAGE_KEY);

                if (storedToken !== testToken) {
                    throw new Error('init() should store token in localStorage: got "' + storedToken + '"');
                }

                // Restore
                window.location = originalLocation;
                localStorage.removeItem(STORAGE_KEY);
            }
        };
    };
});
