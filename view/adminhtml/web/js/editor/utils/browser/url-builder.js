/**
 * URL Builder Utility
 * 
 * Centralizes URL manipulation for Magento navigation.
 * Handles adding store and theme parameters to URLs.
 * 
 * This eliminates code duplication between:
 * - page-selector.js (_buildPageUrlWithParams)
 * - scope-selector.js (_updateUrlStoreParam)
 * - toolbar.js (_buildUrlWithParams)
 */
define([
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function(Logger, Constants) {
    'use strict';
    
    var log = Logger.for('utils/browser/url-builder');
    
    return {
        /**
         * Add navigation parameters (store and theme) to URL
         * 
         * @param {string} url - URL to modify (can be relative or absolute)
         * @param {Object} params - Parameters to add
         * @param {string} params.storeCode - Store code (e.g. 'breeze_evolution')
         * @param {number|string} params.themeId - Theme ID
         * @param {string} params.jstest - Optional jstest parameter
         * @param {string} baseUrl - Base URL for resolving relative URLs (optional)
         * @returns {string} Modified URL with parameters
         */
        addNavigationParams: function(url, params, baseUrl) {
            if (!url) {
                log.error('Cannot build URL: url is empty');
                return url;
            }
            
            try {
                // Parse URL (handles both relative and absolute)
                var urlObj = new URL(url, baseUrl || window.location.origin);
                
                // Add store parameter
                if (params.storeCode) {
                    urlObj.searchParams.set(Constants.URL_PARAMS.STORE, params.storeCode);
                }
                
                // Add theme parameter
                if (params.themeId) {
                    urlObj.searchParams.set(Constants.URL_PARAMS.THEME, params.themeId);
                }
                
                // Add jstest parameter (for debugging)
                if (params.jstest) {
                    urlObj.searchParams.set('jstest', params.jstest);
                }
                
                return urlObj.toString();
            } catch (e) {
                log.error('Failed to build URL: ' + url + ' ' + e);
                return url; // Return original on error
            }
        },
        
        /**
         * Check if URL already has navigation parameters
         * 
         * @param {string} url - URL to check
         * @param {string} baseUrl - Base URL for resolving (optional)
         * @returns {Object} Object with hasStore and hasTheme booleans
         */
        hasNavigationParams: function(url, baseUrl) {
            if (!url) {
                return { hasStore: false, hasTheme: false };
            }
            
            try {
                var urlObj = new URL(url, baseUrl || window.location.origin);
                return {
                    hasStore: urlObj.searchParams.has(Constants.URL_PARAMS.STORE),
                    hasTheme: urlObj.searchParams.has(Constants.URL_PARAMS.THEME)
                };
            } catch (e) {
                log.error('Failed to parse URL: ' + url + ' ' + e);
                return { hasStore: false, hasTheme: false };
            }
        },
        
        /**
         * Check if URL is same-origin
         * Used to determine if we should modify the URL
         * 
         * @param {string} url - URL to check
         * @param {string} originUrl - Origin URL to compare against (optional)
         * @returns {boolean} true if same origin
         */
        isSameOrigin: function(url, originUrl) {
            if (!url) {
                return false;
            }
            
            try {
                var urlObj = new URL(url, window.location.origin);
                var originObj = new URL(originUrl || window.location.origin);
                return urlObj.origin === originObj.origin;
            } catch (e) {
                log.error('Failed to check origin: ' + url + ' ' + e);
                return false;
            }
        },
        
        /**
         * Check if URL should be skipped (not modified)
         * Checks for special protocols and patterns
         * 
         * @param {string} url - URL to check
         * @param {Array<string>} skipPatterns - Patterns to skip (optional)
         * @returns {boolean} true if should skip
         */
        shouldSkipUrl: function(url, skipPatterns) {
            if (!url) {
                return true;
            }
            
            // Default skip patterns
            var defaultPatterns = [
                '#',            // Anchor links
                'javascript:',  // JavaScript pseudo-protocol
                'mailto:',      // Email links
                'tel:',         // Phone links
                'data:',        // Data URIs
                'blob:'         // Blob URLs
            ];
            
            var patterns = skipPatterns || defaultPatterns;
            
            return patterns.some(function(pattern) {
                return url.startsWith(pattern);
            });
        },
        

        /**
         * Encode a frontend path for use in Magento admin URL path segments.
         *
         * Mirrors PHP: strtr(base64_encode($url), '+/=', '-_~')
         *
         * Standard encodeURIComponent() produces %2F for '/' which Cloudflare
         * decodes back to '/' before the request reaches the origin server,
         * breaking Magento's router. This encoding uses only [A-Za-z0-9-_~]
         * which is safe through any proxy or CDN without modification.
         *
         * @param  {string} path - frontend path, e.g. '/' or '/catalog/category/view/id/2/'
         * @returns {string}     - encoded string, e.g. 'Lw~~'
         */
        encodePathParam: function(path) {
            try {
                return btoa(unescape(encodeURIComponent(path || '/')))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '~');
            } catch (e) {
                log.error('encodePathParam failed: ' + e);
                return 'Lw~~'; // fallback: encoded '/'
            }
        },

        /**
         * Decode a uenc-encoded path param back to a frontend path.
         *
         * Mirrors PHP: base64_decode(strtr($encoded, '-_~', '+/='))
         *
         * @param  {string} encoded - e.g. 'Lw~~'
         * @returns {string}        - decoded path, e.g. '/'
         */
        decodePathParam: function(encoded) {
            if (!encoded) {
                return '/';
            }
            try {
                return decodeURIComponent(escape(atob(
                    encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/~/g, '=')
                )));
            } catch (e) {
                log.error('decodePathParam failed: ' + e);
                return '/';
            }
        }
    };
});
