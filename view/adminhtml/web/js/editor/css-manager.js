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
    'Swissup_BreezeThemeEditor/js/editor/preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/publication-state'
], function($, getCss, previewManager, configManager, Logger, Constants, PublicationState) {
    'use strict';

    var log = Logger.for('css-manager');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;
    
    var currentPublicationId = null;
    var iframeId = null;
    
    var manager = {
        /**
         * Initialize CSS Manager
         *
         * @param {Object} config - Configuration object
         * @param {String} config.scope - Scope ('default'|'websites'|'stores'); written to
         *                                configManager if not already set (first-init fallback)
         * @param {Number} config.scopeId - Scope ID (same fallback)
         * @param {Number} config.themeId - Theme ID (same fallback)
         * @param {String} config.iframeId - Preview iframe ID
         * @param {Number} retries - Internal retry counter (for iframe load waiting)
         * @returns {Boolean}
         */
        init: function(config, retries) {
            retries = retries || 0;
            var self = this;

            // Bootstrap configManager if it hasn't been initialised yet
            // (publication-selector is the canonical first initialiser, but
            //  editor/css-manager may be the entry point in some flows).
            if (!configManager.exists()) {
                configManager.set({
                    scope:   config.scope   || 'stores',
                    scopeId: config.scopeId,
                    themeId: config.themeId || null
                });
            }

            iframeId = config.iframeId || 'bte-iframe';

            // Register BEFORE the retry loop so scope changes during iframe loading
            // are never missed. off+on prevents duplicates on subsequent init() calls.
            $(document).off('scopeChanged.cssManager').on('scopeChanged.cssManager', function () {
                // configManager already updated by scope-selector.js before this event fires.
                manager.reinit(null, true);
            });

            // Validate parameters
            if (!configManager.getScopeId() && configManager.getScope() !== 'default') {
                log.error('CSS Manager: Invalid scopeId for scope=' + configManager.getScope());
                return false;
            }
            
            // Get iframe element
            var $iframe = $('#' + iframeId);
            if (!$iframe.length) {
                log.error('CSS Manager: iframe not found: ' + iframeId);
                return false;
            }
            
            // Get iframe document (with retry logic for async load)
            var iframe = $iframe[0];
            var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            if (!iframeDoc || !iframeDoc.body) {
                if (retries < 20) {
                    log.info('CSS Manager: iframe not ready, retry ' + (retries + 1));
                    setTimeout(function() {
                        self.init(config, retries + 1);
                    }, 200);
                    return false;
                }
                log.error('CSS Manager: iframe not ready after 20 retries');
                return false;
            }
            
            // Find existing published style from PHP template
            var $publishedStyle = $(iframeDoc).find('#bte-theme-css-variables');
            
            if (!$publishedStyle.length) {
                if (retries < 20) {
                    log.info('CSS Manager: #bte-theme-css-variables not ready, retry ' + (retries + 1));
                    setTimeout(function() {
                        self.init(config, retries + 1);
                    }, 200);
                    return false;
                }
                // No published styles yet (no CSS changes saved) - create empty placeholder
                log.info('CSS Manager: #bte-theme-css-variables not found - creating empty placeholder');
                $publishedStyle = $('<style>', {
                    id: 'bte-theme-css-variables',
                    type: 'text/css',
                    'data-status': 'published',
                    media: 'all'
                }).text(':root {}');
                $(iframeDoc.head).append($publishedStyle);
            }
            
            // Draft CSS will be created dynamically when switching to DRAFT
            // No need to check for it in init()
            
            log.info('CSS Manager initialized scope=' + configManager.getScope() + ':' + configManager.getScopeId() + ' iframeId=' + iframeId + ' publishedStyleFound=true');
            
            // Trigger ready event for other components (e.g. css-preview-manager).
            // Pass iframeDoc so listeners can initialize without re-querying the iframe.
            $(document).trigger('bte:cssManagerReady', { iframeDocument: iframeDoc });

            return true;
        },
        
        /**
         * Check if CSS Manager is ready
         * @returns {Boolean}
         */
        isReady: function() {
            return !!(configManager.getScopeId() !== null && this._getCurrentIframeDoc());
        },
        
        /**
         * Get iframe element (always fresh)
         * @private
         * @returns {HTMLIFrameElement|null}
         */
        _getIframe: function() {
            if (!iframeId) {
                return null;
            }
            return document.getElementById(iframeId);
        },
        
        /**
         * Get current iframe document (always fresh)
         * Important: After navigation iframe gets a new document,
         * so we always get it dynamically instead of caching
         * @private
         * @returns {Document|null}
         */
        _getCurrentIframeDoc: function() {
            var iframe = this._getIframe();
            
            if (!iframe) {
                log.warn('Iframe not found: ' + iframeId);
                return null;
            }
            
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            
            if (!doc) {
                log.warn('Cannot access iframe document');
                return null;
            }
            
            return doc;
        },
        
        /**
         * Enable style element (make it active)
         * @private
         */
        _enableStyle: function($style) {
            if (!$style || !$style.length) return;
            
            // Use native DOM API instead of jQuery for reliable iframe manipulation
            var style = $style[0]; // Get native DOM element
            
            // Set disabled first
            style.disabled = false;
            
            // Then set media (order matters!)
            style.media = 'all';
            
            // Force reflow to ensure changes are applied
            var doc = this._getCurrentIframeDoc();
            if (doc && doc.body) {
                doc.body.offsetHeight; // Trigger reflow
            }
            
            log.debug('Enabled style: ' + style.id + ' | media: ' + style.media + ' | disabled: ' + style.disabled);
        },
        
        /**
         * Disable style element (make it inactive)
         * @private
         */
        _disableStyle: function($style) {
            if (!$style || !$style.length) return;
            
            // Use native DOM API instead of jQuery for reliable iframe manipulation
            var style = $style[0]; // Get native DOM element
            
            // Set disabled first
            style.disabled = true;
            
            // Then set media (order matters!)
            style.media = 'not all';
            
            // Force reflow to ensure changes are applied
            var doc = this._getCurrentIframeDoc();
            if (doc && doc.body) {
                doc.body.offsetHeight; // Trigger reflow
            }
            
            log.debug('Disabled style: ' + style.id + ' | media: ' + style.media + ' | disabled: ' + style.disabled);
        },
        
        /**
         * Get or create style element
         * @private
         * @param {String} styleId - Style element ID
         * @returns {jQuery}
         */
        _getOrCreateStyle: function(styleId) {
            var doc = this._getCurrentIframeDoc();
            
            if (!doc) {
                log.error('CSS Manager: iframe document not available');
                return null;
            }
            
            var $style = $(doc).find('#' + styleId);
            
            // If not exists - create it
            if (!$style.length) {
                $style = $('<style>', {
                    id: styleId,
                    type: 'text/css',
                    media: 'not all',
                    disabled: true
                });
                
                // Insert after published style (correct priority order)
                var $publishedStyle = $(doc).find('#bte-theme-css-variables');
                if ($publishedStyle.length) {
                    $publishedStyle.after($style);
                    log.info('Created style element: ' + styleId);
                } else {
                    // Fallback - append to head
                    $(doc.head).append($style);
                    log.info('Created style element (in head): ' + styleId);
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
                log.info('Updated style content: ' + styleId + ' (' + css.length + ' chars)');
            }
        },
        
        /**
         * Switch to a different status (DRAFT, PUBLISHED) or load specific publication
         * 
         * @param {String} status - DRAFT | PUBLISHED | PUBLICATION
         * @param {Number} publicationId - Publication ID (required for PUBLICATION status)
         * @param {Object} [ctx] - Optional scope context { scope, scopeId }.
         *                         Falls back to module-level vars when omitted.
         * @returns {Promise}
         */
        switchTo: function(status, publicationId, ctx) {
            log.info('CSS Manager: Switching to ' + status + ' ' + (publicationId || ''));
            
            var doc = this._getCurrentIframeDoc();
            
            if ((!configManager.getScopeId() && configManager.getScope() !== 'default') || !doc) {
                log.error('CSS Manager not initialized or iframe document not available');
                return Promise.reject(new Error('CSS Manager not initialized'));
            }
            
            PublicationState.set(status);
            currentPublicationId = publicationId || null;

            // Capture scope context at call time — caller may pass explicit ctx,
            // otherwise fall back to configManager (single source of truth).
            // Captured values are used throughout the async chain so that a scope
            // change arriving while a GraphQL request is in-flight does not corrupt
            // the result (stale-closure guard below).
            var effectiveScope   = (ctx && ctx.scope)   || configManager.getScope();
            var effectiveScopeId = (ctx && ctx.scopeId != null) ? ctx.scopeId : configManager.getScopeId();
            
            // Get style elements from current iframe document
            var $publishedStyle = $(doc).find('#bte-theme-css-variables');
            var $draftStyle = $(doc).find('#bte-theme-css-variables-draft');
            var $publicationStyle = $(doc).find('#bte-publication-css-' + publicationId);
            
            var self = this;
            
            switch (status) {
                case PUBLICATION_STATUS.DRAFT:
                    // Load draft CSS via GraphQL and create style dynamically
                    return getCss(effectiveScope, effectiveScopeId, PUBLICATION_STATUS.DRAFT, null)
                        .then(function(response) {
                            // Stale-response guard: scope may have changed while the
                            // request was in-flight — discard result if so.
                            if (effectiveScopeId !== configManager.getScopeId()) {
                                log.warn('CSS Manager: DRAFT response for scopeId=' + effectiveScopeId +
                                    ' discarded — current scope is now ' + configManager.getScopeId());
                                return { status: PUBLICATION_STATUS.DRAFT, success: false, stale: true };
                            }

                            if (response && response.getThemeEditorCss) {
                                var css = response.getThemeEditorCss.css || '';

                                // ALWAYS create/update draft style dynamically (not from PHP)
                                self._updateStyleContent('bte-theme-css-variables-draft', css);
                                $draftStyle = self._getOrCreateStyle('bte-theme-css-variables-draft');
                                if ($draftStyle && $draftStyle.length) {
                                    $draftStyle.attr('data-scope-id', effectiveScopeId);
                                    $draftStyle.attr('data-created-by', 'editor/css-manager');
                                }
                                
                                // Enable draft; published stays enabled (draft is inserted after it in DOM,
                                // so CSS cascade gives draft priority without disabling published)
                                self._enableStyle($draftStyle);
                                
                                // Disable all publications using native DOM
                                var currentDoc = self._getCurrentIframeDoc();
                                var publicationStyles = currentDoc.querySelectorAll('style[id^="bte-publication-css-"]');
                                log.debug('Found ' + publicationStyles.length + ' publication styles to disable');
                                Array.prototype.forEach.call(publicationStyles, function(styleElement) {
                                    self._disableStyle($(styleElement));
                                });

                                // Re-create live preview style after iframe navigation.
                                require(['Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'], function(CssPreviewManager) {
                                    CssPreviewManager.recreateLivePreviewStyle();
                                });

                                log.info('CSS Manager: Showing DRAFT (created dynamically)');
                                return {status: PUBLICATION_STATUS.DRAFT, success: true};
                            } else {
                                throw new Error('Invalid response from GraphQL');
                            }
                        })
                        .catch(function(error) {
                            log.error('Failed to load DRAFT CSS: ' + error);
                            return Promise.reject(error);
                        });
                        
                case PUBLICATION_STATUS.PUBLISHED:
                    // Use existing published style from PHP template
                    self._enableStyle($publishedStyle);
                    self._disableStyle($draftStyle);
                    
                    // Disable all publications using native DOM
                    var publishedDoc = this._getCurrentIframeDoc();
                    var publicationStyles = publishedDoc.querySelectorAll('style[id^="bte-publication-css-"]');
                    log.debug('Found ' + publicationStyles.length + ' publication styles to disable');
                    Array.prototype.forEach.call(publicationStyles, function(styleElement) {
                        self._disableStyle($(styleElement));
                    });
                    
                    log.info('CSS Manager: Showing PUBLISHED');
                    return Promise.resolve({status: PUBLICATION_STATUS.PUBLISHED, success: true});
                    
                case PUBLICATION_STATUS.PUBLICATION:
                    if (!publicationId) {
                        log.error('Publication ID required');
                        return Promise.reject(new Error('Publication ID required'));
                    }
                    
                    // Load publication CSS via GraphQL
                    return getCss(effectiveScope, effectiveScopeId, PUBLICATION_STATUS.PUBLICATION, publicationId)
                        .then(function(response) {
                            // Stale-response guard
                            if (effectiveScopeId !== configManager.getScopeId()) {
                                log.warn('CSS Manager: PUBLICATION response for scopeId=' + effectiveScopeId +
                                    ' discarded — current scope is now ' + configManager.getScopeId());
                                return { status: PUBLICATION_STATUS.PUBLICATION, success: false, stale: true };
                            }

                            if (response && response.getThemeEditorCss) {
                                var css = response.getThemeEditorCss.css || '';
                                var publicationStyleId = 'bte-publication-css-' + publicationId;
                                
                                // Create/update publication style
                                self._updateStyleContent(publicationStyleId, css);
                                $publicationStyle = self._getOrCreateStyle(publicationStyleId);
                                
                                // Disable others; published stays enabled (publication style is inserted after it,
                                // so CSS cascade gives publication priority without disabling published)
                                self._disableStyle($draftStyle);
                                
                                // Disable other publications, enable current using native DOM
                                var publicationDoc = self._getCurrentIframeDoc();
                                var publicationStyles = publicationDoc.querySelectorAll('style[id^="bte-publication-css-"]');
                                log.debug('Found ' + publicationStyles.length + ' publication styles');
                                
                                Array.prototype.forEach.call(publicationStyles, function(styleElement) {
                                    var $style = $(styleElement);
                                    if (styleElement.id === publicationStyleId) {
                                        self._enableStyle($style);
                                        log.debug('Enabled publication: ' + styleElement.id);
                                    } else {
                                        self._disableStyle($style);
                                    }
                                });
                                
                                log.info('CSS Manager: Showing PUBLICATION ' + publicationId);
                                return {
                                    status: PUBLICATION_STATUS.PUBLICATION, 
                                    publicationId: publicationId, 
                                    success: true
                                };
                            } else {
                                throw new Error('Invalid response from GraphQL');
                            }
                        })
                        .catch(function(error) {
                            log.error('Failed to load PUBLICATION CSS: ' + error);
                            return Promise.reject(error);
                        });
                        
                default:
                    log.error('Invalid status: ' + status);
                    return Promise.reject(new Error('Invalid status: ' + status));
            }
        },
        
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
                case PUBLICATION_STATUS.DRAFT:
                    return 'bte-theme-css-variables-draft';
                case PUBLICATION_STATUS.PUBLISHED:
                    return 'bte-theme-css-variables';
                case PUBLICATION_STATUS.PUBLICATION:
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
            log.info('CSS Manager: Refreshing current status');
            return this.switchTo(PublicationState.get(), currentPublicationId);
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
            return currentStatus === PUBLICATION_STATUS.DRAFT;
        },
        
        /**
         * Update iframe ID (if iframe changes)
         * 
         * @param {String} newIframeId
         */
        setIframeId: function(newIframeId) {
            iframeId = newIframeId;
            log.info('CSS Manager: iframe ID updated to ' + iframeId);
        },

        /**
         * Re-initialize and optionally reset status vars.
         *
         * Unlike panel/css-manager, this module does not cache DOM refs —
         * switchTo() always reads _getCurrentIframeDoc() fresh. So flush=true
         * only needs to reset the status/publication tracking vars so that
         * the next switchTo() call starts from a clean state for the new scope.
         *
         * scope/scopeId/themeId are always read from configManager (single source of truth).
         *
         * @param {Object|null} _config - Ignored (kept for call-site compatibility); scope is
         *                                read from configManager.
         * @param {Boolean}     flush   - if true, reset currentStatus and currentPublicationId
         */
        reinit: function(_config, flush) {
            if (flush) {
                currentStatus        = PUBLICATION_STATUS.DRAFT;
                currentPublicationId = null;
            }
            log.info('CSS Manager: reinit scope=' + configManager.getScope() + ':' + configManager.getScopeId() + ' flush=' + !!flush);
        }
    };

    return manager;
});
