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
         * Detect page type from iframe body CSS classes
         * 
         * Reads body classes from iframe and extracts Magento's full action name.
         * Body classes use format: module-controller-action (dashes)
         * Page types use format: module_controller_action (underscores)
         * 
         * Examples:
         * - <body class="catalog-category-view"> → "catalog_category_view"
         * - <body class="cms-index-index"> → "cms_index_index"
         * - <body class="checkout-cart-index"> → "checkout_cart_index"
         * 
         * @returns {String|null} - Page type (action name) or null if not detected
         */
        detectPageTypeFromBody: function() {
            try {
                var doc = this.getDocument();
                if (!doc || !doc.body) {
                    console.warn('⚠️ Iframe Helper: Cannot detect page type - iframe body not accessible');
                    return null;
                }
                
                var bodyClasses = doc.body.className;
                if (!bodyClasses) {
                    console.warn('⚠️ Iframe Helper: Cannot detect page type - body has no classes');
                    return null;
                }
                
                // Known page type patterns (from PageUrlProvider.php)
                // Order matters: check specific patterns before generic ones
                var pagePatterns = [
                    'checkout-cart-index',        // Shopping cart
                    'checkout-index-index',       // Checkout
                    'customer-account-login',     // Login page
                    'customer-account-index',     // My Account
                    'catalog-category-view',      // Category page
                    'catalog-product-view',       // Product page
                    'catalogsearch-result-index', // Search results
                    'cms-index-index',            // Home page
                    'cms-page-view'               // CMS page
                ];
                
                // Find matching pattern in body classes
                for (var i = 0; i < pagePatterns.length; i++) {
                    var pattern = pagePatterns[i];
                    if (bodyClasses.indexOf(pattern) !== -1) {
                        // Convert dashes to underscores for page type
                        var pageType = pattern.replace(/-/g, '_');
                        console.log('✅ Iframe Helper: Detected page type from body class:', pattern, '→', pageType);
                        return pageType;
                    }
                }
                
                console.warn('⚠️ Iframe Helper: No known page type found in body classes');
                return null;
                
            } catch (e) {
                console.error('❌ Iframe Helper: Failed to detect page type from body:', e.message);
                return null;
            }
        },

        /**
         * Start URL synchronization (both localStorage and parent URL)
         * Also detects page type from body classes and updates page-selector
         * 
         * Checks every 500ms for:
         * - URL changes → saves to localStorage + syncs to parent URL
         * - Page type changes → triggers bte:pageTypeChanged event
         * 
         * Call this once during toolbar initialization
         * 
         * @returns {Number} - Interval ID (can be used to stop with clearInterval)
         */
        startUrlSync: function() {
            var self = this;
            var lastUrl = '';
            var lastPageType = '';
            
            var intervalId = setInterval(function() {
                var currentUrl = self.getCurrentUrl();
                
                if (currentUrl && currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    
                    // Save URL to localStorage
                    self.saveCurrentUrl();
                    
                    // Sync URL to parent window
                    self.syncUrlToParent();
                    
                    // Detect page type from body classes
                    var pageType = self.detectPageTypeFromBody();
                    
                    // Only update if page type changed and is valid
                    if (pageType && pageType !== lastPageType) {
                        lastPageType = pageType;
                        
                        // Save page type to localStorage
                        StorageHelper.setCurrentPageId(pageType);
                        
                        // Trigger event for page-selector to update
                        $(document).trigger('bte:pageTypeChanged', {
                            url: self.extractPath(currentUrl),
                            pageType: pageType
                        });
                        
                        console.log('🔄 Iframe Helper: Page type changed to:', pageType);
                    }
                }
            }, 500);
            
            console.log('🔄 Iframe Helper: URL sync started (interval:', intervalId + ')');
            return intervalId;
        }
    };
});
