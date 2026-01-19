/**
 * Authentication Manager
 *
 * Manages access token storage and retrieval.
 * Solves the problem where editor disappears when navigating to checkout/account
 * because token is lost during Magento redirects.
 *
 * Strategy:
 * 1. Check URL parameter first (initial load or direct link)
 * 2. Store token in localStorage for persistence
 * 3. Fallback to localStorage if URL parameter is missing (after navigation)
 * 4. Never append token back to URL if it came from localStorage (avoid clutter)
 */
define([], function () {
    'use strict';

    var STORAGE_KEY = 'bte_access_token';
    var URL_PARAM = 'breeze_theme_editor_access_token';

    return {
        /**
         * Initialize auth manager and store token if present
         *
         * @return {string|null} - The access token or null
         */
        init: function () {
            var tokenFromUrl = this.getTokenFromUrl();
            var tokenFromStorage = this.getTokenFromStorage();

            if (tokenFromUrl) {
                console.log('🔑 Access token found in URL');
                this.saveToken(tokenFromUrl);
                return tokenFromUrl;
            }

            if (tokenFromStorage) {
                console.log('🔑 Access token restored from localStorage');
                return tokenFromStorage;
            }

            console.warn('⚠️ No access token found');
            return null;
        },

        /**
         * Get token from URL parameter
         *
         * @return {string|null}
         */
        getTokenFromUrl: function () {
            var urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(URL_PARAM);
        },

        /**
         * Get token from localStorage
         *
         * @return {string|null}
         */
        getTokenFromStorage: function () {
            try {
                return localStorage.getItem(STORAGE_KEY);
            } catch (e) {
                console.error('❌ Failed to read token from localStorage:', e);
                return null;
            }
        },

        /**
         * Get current access token (from URL or localStorage)
         *
         * @return {string|null}
         */
        getToken: function () {
            return this.getTokenFromUrl() || this.getTokenFromStorage();
        },

        /**
         * Save token to localStorage
         *
         * @param {string} token
         * @return {boolean} - Success status
         */
        saveToken: function (token) {
            if (!token) {
                console.warn('⚠️ Cannot save empty token');
                return false;
            }

            try {
                localStorage.setItem(STORAGE_KEY, token);
                console.log('✅ Access token saved to localStorage');
                return true;
            } catch (e) {
                console.error('❌ Failed to save token to localStorage:', e);
                return false;
            }
        },

        /**
         * Clear token from localStorage
         *
         * @return {boolean} - Success status
         */
        clearToken: function () {
            try {
                localStorage.removeItem(STORAGE_KEY);
                console.log('🗑️ Access token cleared from localStorage');
                return true;
            } catch (e) {
                console.error('❌ Failed to clear token from localStorage:', e);
                return false;
            }
        },

        /**
         * Add access token to URL
         *
         * @param {string} url - Target URL
         * @return {string} - URL with token parameter
         */
        addTokenToUrl: function (url) {
            var token = this.getToken();

            if (!token) {
                console.warn('⚠️ No token available to add to URL');
                return url;
            }

            try {
                var urlObj = new URL(url, window.location.origin);
                urlObj.searchParams.set(URL_PARAM, token);
                return urlObj.toString();
            } catch (e) {
                console.error('❌ Failed to add token to URL:', e);
                // Fallback: simple string concatenation
                var separator = url.indexOf('?') !== -1 ? '&' : '?';
                return url + separator + URL_PARAM + '=' + encodeURIComponent(token);
            }
        },

        /**
         * Check if token exists
         *
         * @return {boolean}
         */
        hasToken: function () {
            return !!this.getToken();
        }
    };
});
