/**
 * Preview Manager for Breeze Theme Editor
 * 
 * Manages CSS injection into the preview iframe.
 * Loads draft CSS from GraphQL and injects it into the iframe document.
 * 
 * @module Swissup_BreezeThemeEditor/js/editor/preview-manager
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-css'
], function($, graphqlClient, getCssQuery) {
    'use strict';
    
    return {
        /**
         * Inject draft CSS into preview iframe
         * 
         * @param {string} iframeId - ID of the iframe element
         * @param {number} storeId - Store ID
         * @param {number} themeId - Theme ID (optional, can be null)
         */
        injectDraftCSS: function(iframeId, storeId, themeId) {
            var self = this;
            var $iframe = $('#' + iframeId);
            
            if (!$iframe.length) {
                console.error('Preview iframe not found:', iframeId);
                return;
            }
            
            console.log('🎨 Loading draft CSS for store', storeId, 'theme', themeId);
            
            // Load CSS from GraphQL
            graphqlClient.query(getCssQuery, {
                storeId: parseInt(storeId),
                status: 'DRAFT'
            }).then(function(response) {
                if (response.data && response.data.getThemeEditorCss) {
                    var css = response.data.getThemeEditorCss.css;
                    
                    if (css && css.trim()) {
                        self._injectCSS($iframe[0], css);
                        console.log('✅ Draft CSS injected into preview (' + css.length + ' chars)');
                    } else {
                        console.log('ℹ️ No draft CSS to inject');
                    }
                }
            }).catch(function(error) {
                console.error('Failed to load draft CSS:', error);
                // Don't show error to user - preview will show published CSS instead
            });
        },
        
        /**
         * Inject CSS into iframe document
         * 
         * @private
         * @param {HTMLIFrameElement} iframe - Iframe DOM element
         * @param {string} css - CSS content to inject
         */
        _injectCSS: function(iframe, css) {
            try {
                var doc = iframe.contentDocument || iframe.contentWindow.document;
                
                if (!doc) {
                    console.error('Cannot access iframe document');
                    return;
                }
                
                // Remove existing injected style
                var existingStyle = doc.getElementById('bte-draft-css');
                if (existingStyle) {
                    existingStyle.remove();
                }
                
                // Create new style element
                var style = doc.createElement('style');
                style.id = 'bte-draft-css';
                style.type = 'text/css';
                style.textContent = css;
                
                // Append to head
                if (doc.head) {
                    doc.head.appendChild(style);
                    console.log('✅ CSS injected into iframe head');
                } else {
                    console.error('Iframe document has no head element');
                }
                
            } catch (e) {
                console.error('Failed to inject CSS into iframe:', e);
                
                // Check for CORS error
                if (e.name === 'SecurityError') {
                    console.error('CORS Error: Cannot access iframe content. Check same-origin policy.');
                }
            }
        },
        
        /**
         * Refresh preview CSS
         * 
         * Reloads and re-injects the draft CSS.
         * 
         * @param {string} iframeId - ID of the iframe element
         * @param {number} storeId - Store ID
         * @param {number} themeId - Theme ID (optional)
         */
        refresh: function(iframeId, storeId, themeId) {
            console.log('🔄 Refreshing preview CSS...');
            this.injectDraftCSS(iframeId, storeId, themeId);
        },
        
        /**
         * Remove draft CSS from iframe
         * 
         * @param {string} iframeId - ID of the iframe element
         */
        removeDraftCSS: function(iframeId) {
            var $iframe = $('#' + iframeId);
            
            if (!$iframe.length) {
                console.error('Preview iframe not found:', iframeId);
                return;
            }
            
            try {
                var iframe = $iframe[0];
                var doc = iframe.contentDocument || iframe.contentWindow.document;
                
                if (doc) {
                    var existingStyle = doc.getElementById('bte-draft-css');
                    if (existingStyle) {
                        existingStyle.remove();
                        console.log('✅ Draft CSS removed from preview');
                    }
                }
            } catch (e) {
                console.error('Failed to remove CSS from iframe:', e);
            }
        },
        
        /**
         * Check if iframe is accessible (same-origin)
         * 
         * @param {string} iframeId - ID of the iframe element
         * @returns {boolean} True if iframe is accessible
         */
        isIframeAccessible: function(iframeId) {
            var $iframe = $('#' + iframeId);
            
            if (!$iframe.length) {
                return false;
            }
            
            try {
                var iframe = $iframe[0];
                var doc = iframe.contentDocument || iframe.contentWindow.document;
                return !!doc;
            } catch (e) {
                return false;
            }
        }
    };
});
