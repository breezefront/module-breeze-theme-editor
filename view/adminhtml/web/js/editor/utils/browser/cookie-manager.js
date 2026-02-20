/**
 * Cookie Manager Utility
 * 
 * Centralizes all cookie management for Magento navigation.
 * Handles both store selection and theme preview cookies.
 * 
 * This eliminates code duplication between scope-selector.js and page-selector.js
 * where identical cookie management methods were previously defined.
 */
define(['Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function(Logger) {
    'use strict';

    var log = Logger.for('utils/browser/cookie-manager');
    
    /**
     * Cookie names used by Magento
     */
    var COOKIE_NAMES = {
        STORE: 'store',
        THEME_PREVIEW: 'preview_theme'
    };
    
    /**
     * Default cookie options
     */
    var COOKIE_OPTIONS = {
        path: '/',
        sameSite: 'Lax'
    };
    
    return {
        /**
         * Set Magento store cookie
         * 
         * Magento uses 'store' cookie to determine current store view.
         * This ensures correct store is used even after redirects (login, checkout, etc.)
         * 
         * @param {string} storeCode - Store code (e.g. 'breeze_evolution', 'default')
         * @returns {boolean} true if cookie was set, false otherwise
         */
        setStoreCookie: function(storeCode) {
            if (!storeCode) {
                log.warn('⚠️ Cannot set store cookie: storeCode is empty');
                return false;
            }
            
            try {
                var cookieString = COOKIE_NAMES.STORE + '=' + storeCode + 
                                 '; path=' + COOKIE_OPTIONS.path + 
                                 '; SameSite=' + COOKIE_OPTIONS.sameSite;
                
                document.cookie = cookieString;
                log.info('🏪 Set store cookie:', storeCode);
                return true;
            } catch (e) {
                log.error('❌ Failed to set store cookie:', e);
                return false;
            }
        },
        
        /**
         * Set Magento theme preview cookie
         * 
         * Magento uses 'preview_theme' cookie to override store's default theme.
         * This ensures iframe displays correct theme when navigating.
         * 
         * @param {number|string} themeId - Theme ID
         * @returns {boolean} true if cookie was set, false otherwise
         */
        setThemePreviewCookie: function(themeId) {
            if (!themeId) {
                log.warn('⚠️ Cannot set theme preview cookie: themeId is empty');
                return false;
            }
            
            try {
                var cookieString = COOKIE_NAMES.THEME_PREVIEW + '=' + themeId + 
                                 '; path=' + COOKIE_OPTIONS.path + 
                                 '; SameSite=' + COOKIE_OPTIONS.sameSite;
                
                document.cookie = cookieString;
                log.info('🎨 Set preview_theme cookie:', themeId);
                return true;
            } catch (e) {
                log.error('❌ Failed to set theme preview cookie:', e);
                return false;
            }
        },
        
        /**
         * Set both store and theme cookies at once
         * 
         * Convenience method for navigation that requires both cookies.
         * Should be called before any iframe navigation.
         * 
         * @param {string} storeCode - Store code
         * @param {number|string} themeId - Theme ID
         * @returns {boolean} true if both cookies were set successfully
         */
        setNavigationCookies: function(storeCode, themeId) {
            var storeSuccess = this.setStoreCookie(storeCode);
            var themeSuccess = this.setThemePreviewCookie(themeId);
            
            return storeSuccess && themeSuccess;
        },
        
        /**
         * Get cookie value by name
         * 
         * @param {string} name - Cookie name
         * @returns {string|null} Cookie value or null if not found
         */
        getCookie: function(name) {
            var nameEQ = name + "=";
            var cookies = document.cookie.split(';');
            
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i];
                while (cookie.charAt(0) === ' ') {
                    cookie = cookie.substring(1, cookie.length);
                }
                if (cookie.indexOf(nameEQ) === 0) {
                    return cookie.substring(nameEQ.length, cookie.length);
                }
            }
            return null;
        },
        
        /**
         * Get current store code from cookie
         * 
         * @returns {string|null} Store code or null if not set
         */
        getStoreCookie: function() {
            return this.getCookie(COOKIE_NAMES.STORE);
        },
        
        /**
         * Get current theme preview ID from cookie
         * 
         * @returns {string|null} Theme ID or null if not set
         */
        getThemePreviewCookie: function() {
            return this.getCookie(COOKIE_NAMES.THEME_PREVIEW);
        },
        
        /**
         * Set generic cookie with options
         * 
         * @param {string} name - Cookie name
         * @param {string|number} value - Cookie value
         * @param {Object} options - Cookie options (path, maxAge, sameSite)
         * @returns {boolean} true if cookie was set
         */
        setCookie: function(name, value, options) {
            if (!name || value === undefined || value === null) {
                log.warn('⚠️ Cannot set cookie: name or value is empty');
                return false;
            }
            
            options = options || {};
            
            try {
                var cookieString = name + '=' + encodeURIComponent(value);
                
                if (options.path) {
                    cookieString += '; path=' + options.path;
                }
                
                if (options.maxAge) {
                    cookieString += '; max-age=' + options.maxAge;
                }
                
                if (options.sameSite) {
                    cookieString += '; SameSite=' + options.sameSite;
                }
                
                document.cookie = cookieString;
                log.info('🍪 Set cookie: ' + name + ' = ' + value);
                return true;
            } catch (e) {
                log.error('❌ Failed to set cookie: ' + name, e);
                return false;
            }
        },
        
        /**
         * Delete cookie by name
         * 
         * @param {string} name - Cookie name
         */
        deleteCookie: function(name) {
            document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        },
        
        /**
         * Delete store cookie
         */
        deleteStoreCookie: function() {
            this.deleteCookie(COOKIE_NAMES.STORE);
            log.info('🗑️  Deleted store cookie');
        },
        
        /**
         * Delete theme preview cookie
         */
        deleteThemePreviewCookie: function() {
            this.deleteCookie(COOKIE_NAMES.THEME_PREVIEW);
            log.info('🗑️  Deleted theme preview cookie');
        }
    };
});
