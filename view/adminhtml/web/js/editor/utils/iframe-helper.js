/**
 * Iframe Helper for Admin Area
 * 
 * Simple utility to access existing #bte-iframe document and window.
 * Unlike frontend DeviceFrame, this does NOT create iframe - it only provides
 * access to existing iframe created by admin layout.
 * 
 * Admin context:
 * - Iframe created via PHP: <iframe id="bte-iframe" src="/admin/breeze_editor/editor/iframe">
 * - Iframe redirects to frontend with store parameters
 * - Frontend renders #bte-theme-css-variables in <head>
 * - This helper provides access to iframe's document for CSS manipulation
 * - URL synchronization: saves current URL to localStorage and parent window
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/storage-helper'
], function ($, StorageHelper) {
    'use strict';

    return {
        /**
         * Get iframe document (always fresh from DOM)
         * Returns null if iframe not found or not accessible
         * 
         * @returns {Document|null}
         */
        getDocument: function() {
            var $iframe = $('#bte-iframe');
            
            if (!$iframe.length) {
                console.warn('⚠️ Iframe Helper: #bte-iframe not found in DOM');
                return null;
            }
            
            try {
                var iframe = $iframe[0];
                var doc = iframe.contentDocument || iframe.contentWindow.document;
                
                if (!doc) {
                    console.warn('⚠️ Iframe Helper: Cannot access iframe document');
                    return null;
                }
                
                return doc;
            } catch (e) {
                console.error('❌ Iframe Helper: Failed to access iframe document:', e.message);
                return null;
            }
        },

        /**
         * Get iframe window
         * Returns null if iframe not found or not accessible
         * 
         * @returns {Window|null}
         */
        getWindow: function() {
            var $iframe = $('#bte-iframe');
            
            if (!$iframe.length) {
                console.warn('⚠️ Iframe Helper: #bte-iframe not found in DOM');
                return null;
            }
            
            try {
                return $iframe[0].contentWindow;
            } catch (e) {
                console.error('❌ Iframe Helper: Failed to access iframe window:', e.message);
                return null;
            }
        },

        /**
         * Get iframe element
         * 
         * @returns {HTMLIFrameElement|null}
         */
        getIframe: function() {
            var $iframe = $('#bte-iframe');
            return $iframe.length ? $iframe[0] : null;
        },

        /**
         * Check if iframe is ready (document accessible)
         * 
         * @returns {Boolean}
         */
        isReady: function() {
            return this.getDocument() !== null;
        },

        /**
         * Get current URL from iframe window
         * Returns full path with query and hash, or null if not accessible
         * 
         * @returns {String|null}
         */
        getCurrentUrl: function() {
            try {
                var iframeWindow = this.getWindow();
                if (!iframeWindow) {
                    return null;
                }
                
                var url = iframeWindow.location.href;
                var urlObj = new URL(url);
                
                // Return path + query + hash
                return urlObj.pathname + urlObj.search + urlObj.hash;
            } catch(e) {
                console.warn('⚠️ Iframe Helper: Cannot get current URL (cross-origin)');
                return null;
            }
        },

        /**
         * Extract clean path from iframe URL (remove system parameters)
         * Removes ___store, preview_theme, jstest parameters
         * 
         * @param {String} url - Full path with query
         * @returns {String}
         */
        extractPath: function(url) {
            if (!url) {
                return '/';
            }
            
            // Remove system parameters
            var cleanUrl = url
                .replace(/[?&]___store=[^&]*/g, '')
                .replace(/[?&]preview_theme=[^&]*/g, '')
                .replace(/[?&]jstest=[^&]*/g, '')
                .replace(/^\?&/, '?')  // Fix leftover &
                .replace(/\?$/, '')    // Remove trailing ?
                .replace(/&$/, '');    // Remove trailing &
            
            return cleanUrl || '/';
        },

        /**
         * Save current iframe URL to localStorage
         * Automatically extracts clean path and stores it
         * 
         * @returns {Boolean} - Success status
         */
        saveCurrentUrl: function() {
            var currentUrl = this.getCurrentUrl();
            
            if (!currentUrl) {
                console.warn('⚠️ Iframe Helper: Cannot save URL (not accessible)');
                return false;
            }
            
            var cleanPath = this.extractPath(currentUrl);
            StorageHelper.setCurrentUrl(cleanPath);
            console.log('💾 Iframe Helper: Saved URL:', cleanPath);
            
            return true;
        },

        /**
         * Sync iframe URL to parent window URL via history.replaceState
         * Updates /url/{path}/ parameter in admin URL
         * 
         * @returns {Boolean} - Success status
         */
        syncUrlToParent: function() {
            var currentUrl = this.getCurrentUrl();
            
            if (!currentUrl) {
                return false;
            }
            
            try {
                var cleanPath = this.extractPath(currentUrl);
                var encodedPath = encodeURIComponent(cleanPath);
                
                // Replace /url/{old}/ with /url/{new}/
                var currentAdminUrl = window.location.href;
                var newAdminUrl = currentAdminUrl.replace(
                    /\/url\/[^\/]+\//,
                    '/url/' + encodedPath + '/'
                );
                
                if (currentAdminUrl !== newAdminUrl) {
                    window.history.replaceState(null, '', newAdminUrl);
                    console.log('🔄 Iframe Helper: Synced URL to parent');
                    return true;
                }
                
                return false;
            } catch(e) {
                console.error('❌ Iframe Helper: Failed to sync URL:', e.message);
                return false;
            }
        },

        /**
         * Start URL synchronization (both localStorage and parent URL)
         * Checks every 500ms for URL changes and syncs automatically
         * Call this once during toolbar initialization
         * 
         * @returns {Number} - Interval ID (can be used to stop with clearInterval)
         */
        startUrlSync: function() {
            var self = this;
            var lastUrl = '';
            
            var intervalId = setInterval(function() {
                var currentUrl = self.getCurrentUrl();
                
                if (currentUrl && currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    
                    // Save to localStorage
                    self.saveCurrentUrl();
                    
                    // Sync to parent URL
                    self.syncUrlToParent();
                }
            }, 500);
            
            console.log('🔄 Iframe Helper: URL sync started (interval:', intervalId + ')');
            return intervalId;
        }
    };
});
