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
 */
define(['jquery'], function ($) {
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
        }
    };
});
