/**
 * CSS Manager for Admin Area
 * 
 * Manages CSS switching between Draft, Published, and Publication states.
 * Simplified version for admin - works with preview-manager to inject CSS into iframe.
 * 
 * @module Swissup_BreezeThemeEditor/js/editor/css-manager
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-css',
    'Swissup_BreezeThemeEditor/js/editor/preview-manager'
], function($, getCss, previewManager) {
    'use strict';
    
    var currentStatus = 'DRAFT';
    var currentPublicationId = null;
    var storeId = null;
    var themeId = null;
    var iframeId = null;
    var currentIframeDoc = null;
    
    return {
        /**
         * Initialize CSS Manager
         * 
         * @param {Object} config - Configuration object
         * @param {Number} config.storeId - Store ID
         * @param {Number} config.themeId - Theme ID
         * @param {String} config.iframeId - Preview iframe ID
         * @param {Number} retries - Internal retry counter (for iframe load waiting)
         * @returns {Boolean}
         */
        init: function(config, retries) {
            retries = retries || 0;
            var self = this;
            
            storeId = config.storeId;
            themeId = config.themeId;
            iframeId = config.iframeId || 'bte-iframe';
            
            // Validate parameters
            if (!storeId || !themeId) {
                console.error('❌ CSS Manager: Invalid storeId or themeId', {
                    storeId: storeId, 
                    themeId: themeId
                });
                return false;
            }
            
            // Get iframe element
            var $iframe = $('#' + iframeId);
            if (!$iframe.length) {
                console.error('❌ CSS Manager: iframe not found:', iframeId);
                return false;
            }
            
            // Get iframe document (with retry logic for async load)
            var iframe = $iframe[0];
            var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            if (!iframeDoc || !iframeDoc.body) {
                if (retries < 20) {
                    console.log('⏳ CSS Manager: iframe not ready, retry', retries + 1);
                    setTimeout(function() {
                        self.init(config, retries + 1);
                    }, 200);
                    return false;
                }
                console.error('❌ CSS Manager: iframe not ready after 20 retries');
                return false;
            }
            
            // Find existing published style from PHP template
            var $publishedStyle = $(iframeDoc).find('#bte-theme-css-variables');
            
            if (!$publishedStyle.length) {
                if (retries < 20) {
                    console.log('⏳ CSS Manager: CSS elements not ready, retry', retries + 1);
                    setTimeout(function() {
                        self.init(config, retries + 1);
                    }, 200);
                    return false;
                }
                console.error('❌ CSS Manager: #bte-theme-css-variables not found after retries!');
                return false;
            }
            
            // Store iframe document reference
            currentIframeDoc = iframeDoc;
            
            console.log('✅ CSS Manager initialized', {
                storeId: storeId,
                themeId: themeId,
                iframeId: iframeId,
                publishedStyleFound: true
            });
            
            // Trigger ready event for other components
            $(document).trigger('bte:cssManagerReady');
            
            return true;
        },
        
        /**
         * Check if CSS Manager is ready
         * @returns {Boolean}
         */
        isReady: function() {
            return !!(storeId && currentIframeDoc);
        },
        
        /**
         * Enable style element (make it active)
         * @private
         */
        _enableStyle: function($style) {
            if (!$style || !$style.length) return;
            
            // Use native DOM API instead of jQuery for reliable iframe manipulation
            var style = $style[0]; // Get native DOM element
            style.disabled = false;
            style.media = 'all';
            
            console.log('✅ Enabled style:', style.id, '| media:', style.media, '| disabled:', style.disabled);
        },
        
        /**
         * Disable style element (make it inactive)
         * @private
         */
        _disableStyle: function($style) {
            if (!$style || !$style.length) return;
            
            // Use native DOM API instead of jQuery for reliable iframe manipulation
            var style = $style[0]; // Get native DOM element
            style.disabled = true;
            style.media = ''; // Clear media attribute
            
            console.log('🚫 Disabled style:', style.id, '| media:', style.media, '| disabled:', style.disabled);
        },
        
        /**
         * Get or create style element in iframe
         * @private
         * @param {String} styleId - Style element ID
         * @returns {jQuery}
         */
        _getOrCreateStyle: function(styleId) {
            if (!currentIframeDoc) {
                console.error('❌ CSS Manager: iframe document not initialized');
                return null;
            }
            
            var $style = $(currentIframeDoc).find('#' + styleId);
            
            // If not exists - create it
            if (!$style.length) {
                $style = $('<style>', {
                    id: styleId,
                    type: 'text/css',
                    media: 'not all',
                    disabled: true
                });
                
                // Insert after published style (correct priority order)
                var $publishedStyle = $(currentIframeDoc).find('#bte-theme-css-variables');
                if ($publishedStyle.length) {
                    $publishedStyle.after($style);
                    console.log('📝 Created style element:', styleId);
                } else {
                    // Fallback - append to head
                    $(currentIframeDoc.head).append($style);
                    console.log('📝 Created style element (in head):', styleId);
                }
            }
            
            return $style;
        },
        
        /**
         * Update style element content
         * @private
         * @param {String} styleId - Style element ID
         * @param {String} css - CSS content
         */
        _updateStyleContent: function(styleId, css) {
            var $style = this._getOrCreateStyle(styleId);
            if ($style && $style.length) {
                $style.text(css);
                console.log('✅ Updated style content:', styleId, '(' + css.length + ' chars)');
            }
        },
        
        /**
         * Switch to a different status (DRAFT, PUBLISHED) or load specific publication
         * 
         * @param {String} status - DRAFT | PUBLISHED | PUBLICATION
         * @param {Number} publicationId - Publication ID (required for PUBLICATION status)
         * @returns {Promise}
         */
        switchTo: function(status, publicationId) {
            console.log('🔄 CSS Manager: Switching to', status, publicationId || '');
            
            if (!storeId || !currentIframeDoc) {
                console.error('❌ CSS Manager not initialized');
                return Promise.reject(new Error('CSS Manager not initialized'));
            }
            
            currentStatus = status;
            currentPublicationId = publicationId || null;
            
            // Get style elements
            var $publishedStyle = $(currentIframeDoc).find('#bte-theme-css-variables');
            var $draftStyle = $(currentIframeDoc).find('#bte-theme-css-variables-draft');
            var $publicationStyle = $(currentIframeDoc).find('#bte-publication-css-' + publicationId);
            
            var self = this;
            
            switch (status) {
                case 'DRAFT':
                    // Load draft CSS via GraphQL
                    return getCss(storeId, themeId, 'DRAFT', null)
                        .then(function(response) {
                            if (response && response.getThemeEditorCss) {
                                var css = response.getThemeEditorCss.css || '';
                                
                                // Create/update draft style
                                self._updateStyleContent('bte-theme-css-variables-draft', css);
                                $draftStyle = self._getOrCreateStyle('bte-theme-css-variables-draft');
                                
                                // Enable draft, disable others
                                self._enableStyle($draftStyle);
                                self._disableStyle($publishedStyle);
                                
                                // Disable all publications using native DOM
                                var publicationStyles = currentIframeDoc.querySelectorAll('style[id^="bte-publication-css-"]');
                                console.log('🔍 Found', publicationStyles.length, 'publication styles to disable');
                                Array.prototype.forEach.call(publicationStyles, function(styleElement) {
                                    self._disableStyle($(styleElement));
                                });
                                
                                console.log('📗 CSS Manager: Showing DRAFT');
                                return {status: 'DRAFT', success: true};
                            } else {
                                throw new Error('Invalid response from GraphQL');
                            }
                        })
                        .catch(function(error) {
                            console.error('❌ Failed to load DRAFT CSS:', error);
                            return Promise.reject(error);
                        });
                        
                case 'PUBLISHED':
                    // Use existing published style from PHP template
                    self._enableStyle($publishedStyle);
                    self._disableStyle($draftStyle);
                    
                    // Disable all publications using native DOM
                    var publicationStyles = currentIframeDoc.querySelectorAll('style[id^="bte-publication-css-"]');
                    console.log('🔍 Found', publicationStyles.length, 'publication styles to disable');
                    Array.prototype.forEach.call(publicationStyles, function(styleElement) {
                        self._disableStyle($(styleElement));
                    });
                    
                    console.log('📕 CSS Manager: Showing PUBLISHED');
                    return Promise.resolve({status: 'PUBLISHED', success: true});
                    
                case 'PUBLICATION':
                    if (!publicationId) {
                        console.error('❌ Publication ID required');
                        return Promise.reject(new Error('Publication ID required'));
                    }
                    
                    // Load publication CSS via GraphQL
                    return getCss(storeId, themeId, 'PUBLICATION', publicationId)
                        .then(function(response) {
                            if (response && response.getThemeEditorCss) {
                                var css = response.getThemeEditorCss.css || '';
                                var publicationStyleId = 'bte-publication-css-' + publicationId;
                                
                                // Create/update publication style
                                self._updateStyleContent(publicationStyleId, css);
                                $publicationStyle = self._getOrCreateStyle(publicationStyleId);
                                
                                // Disable others
                                self._disableStyle($publishedStyle);
                                self._disableStyle($draftStyle);
                                
                                // Disable other publications, enable current using native DOM
                                var publicationStyles = currentIframeDoc.querySelectorAll('style[id^="bte-publication-css-"]');
                                console.log('🔍 Found', publicationStyles.length, 'publication styles');
                                
                                Array.prototype.forEach.call(publicationStyles, function(styleElement) {
                                    var $style = $(styleElement);
                                    if (styleElement.id === publicationStyleId) {
                                        self._enableStyle($style);
                                        console.log('✅ Enabled publication:', styleElement.id);
                                    } else {
                                        self._disableStyle($style);
                                    }
                                });
                                
                                console.log('📙 CSS Manager: Showing PUBLICATION', publicationId);
                                return {
                                    status: 'PUBLICATION', 
                                    publicationId: publicationId, 
                                    success: true
                                };
                            } else {
                                throw new Error('Invalid response from GraphQL');
                            }
                        })
                        .catch(function(error) {
                            console.error('❌ Failed to load PUBLICATION CSS:', error);
                            return Promise.reject(error);
                        });
                        
                default:
                    console.error('❌ Invalid status:', status);
                    return Promise.reject(new Error('Invalid status: ' + status));
            }
        },
        
        /* 
         * DEPRECATED: Old method using preview-manager.injectCSS()
         * Now we work directly with iframe DOM and use correct IDs
         * 
         * Kept for historical reference - can be removed later
         *
        _loadAndInjectCSS: function(status, publicationId) {
            var self = this;
            
            console.log('📥 Loading CSS:', status, publicationId || '');
            
            // Load CSS using getCss function (it handles GraphQL internally)
            return getCss(
                parseInt(storeId),
                parseInt(themeId) || null,
                status,
                publicationId ? parseInt(publicationId) : null
            )
                .then(function(response) {
                    if (response && response.getThemeEditorCss) {
                        var result = response.getThemeEditorCss;
                        var css = result.css;
                        var css = result.css;
                        
                        if (css && css.trim()) {
                            // Inject CSS into iframe
                            var styleId = self._getStyleId(status, publicationId);
                            previewManager.injectCSS(iframeId, css, styleId);
                            
                            console.log('✅ CSS loaded and injected:', status, '(' + css.length + ' chars)');
                            
                            return {
                                status: status,
                                publicationId: publicationId,
                                css: css,
                                success: true
                            };
                        } else {
                            console.log('ℹ️ No CSS returned for status:', status);
                            
                            // Remove existing CSS if no CSS returned
                            previewManager.removeCSS(iframeId, self._getStyleId(status, publicationId));
                            
                            return {
                                status: status,
                                publicationId: publicationId,
                                css: '',
                                success: true
                            };
                        }
                    } else {
                        console.error('❌ Invalid GraphQL response:', response);
                        return Promise.reject(new Error('Invalid response'));
                    }
                })
                .catch(function(error) {
                    console.error('❌ Failed to load CSS:', error);
                    return Promise.reject(error);
                });
        },
        */
        
        /**
         * Get style element ID based on status
         * 
         * @private
         * @param {String} status
         * @param {Number|null} publicationId
         * @returns {String}
         */
        _getStyleId: function(status, publicationId) {
            switch (status) {
                case 'DRAFT':
                    return 'bte-theme-css-variables-draft';
                case 'PUBLISHED':
                    return 'bte-theme-css-variables';
                case 'PUBLICATION':
                    return 'bte-publication-css-' + publicationId;
                default:
                    return 'bte-css';
            }
        },
        
        /**
         * Refresh current status (reload CSS)
         * 
         * @returns {Promise}
         */
        refresh: function() {
            console.log('🔄 CSS Manager: Refreshing current status');
            return this.switchTo(currentStatus, currentPublicationId);
        },
        
        /**
         * Get current status
         * 
         * @returns {String}
         */
        getCurrentStatus: function() {
            return currentStatus;
        },
        
        /**
         * Get current publication ID
         * 
         * @returns {Number|null}
         */
        getCurrentPublicationId: function() {
            return currentPublicationId;
        },
        
        /**
         * Check if current mode is editable
         * Only DRAFT mode allows editing
         * 
         * @returns {Boolean}
         */
        isEditable: function() {
            return currentStatus === 'DRAFT';
        },
        
        /**
         * Update iframe ID (if iframe changes)
         * 
         * @param {String} newIframeId
         */
        setIframeId: function(newIframeId) {
            iframeId = newIframeId;
            console.log('🔄 CSS Manager: iframe ID updated to', iframeId);
        }
    };
});
