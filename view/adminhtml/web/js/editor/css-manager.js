/**
 * CSS Manager (Unified)
 *
 * Single CSS manager for the entire editor — used by both toolbar (css-state-restorer)
 * and panel (settings-editor, css-preview-manager).
 *
 * Manages all CSS layers in the preview iframe:
 *   #bte-theme-css-variables          ← published (always in DOM, from PHP)
 *   #bte-theme-css-variables-draft    ← draft (created dynamically on first DRAFT)
 *   #bte-publication-css              ← historical publication preview (single element)
 *   #bte-live-preview                 ← unsaved draft preview (owned by css-preview-manager)
 *
 * Fully stateless DOM access: _getCurrentIframeDoc() on every call — no cached refs,
 * no stale elements after iframe navigation.
 *
 * @module Swissup_BreezeThemeEditor/js/editor/css-manager
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-css',
    'Swissup_BreezeThemeEditor/js/editor/preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/publication-state'
], function($, getCss, previewManager, configManager, StorageHelper, Logger, Constants, PublicationState) {
    'use strict';

    var log = Logger.for('css-manager');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;
    
    var currentPublicationId = null;
    var iframeId = null;
    
    var manager = {
        /**
         * Initialize CSS Manager.
         *
         * Idempotent: if already ready (called by toolbar first, then by panel),
         * the second call is a no-op — StorageHelper and state are already set.
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
            // Support legacy call: init(scopeId, themeId) → treat as no-op config
            if (typeof config === 'number' || typeof config === 'string') {
                retries = 0;
                config = {};
            }
            config = config || {};
            retries = retries || 0;
            var self = this;

            // Idempotent guard: toolbar inits first, panel skips if already ready.
            if (retries === 0 && this.isReady()) {
                log.info('CSS Manager already initialized, skipping');
                return true;
            }

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

            iframeId = config.iframeId || iframeId || 'bte-iframe';

            // Initialize StorageHelper with current scope/theme context
            StorageHelper.init(configManager.getScopeId(), configManager.getThemeId());

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

            log.info('CSS Manager initialized scope=' + configManager.getScope() + ':' + configManager.getScopeId() + ' iframeId=' + iframeId);

            // NOTE: _applyStoredState() is intentionally NOT called here.
            // Responsibility for the first switchTo() belongs to css-state-restorer.js
            // (toolbar flow). Calling it here would cause a duplicate GraphQL request:
            //   init() → _applyStoredState() → switchTo(DRAFT) [request #1]
            //   setupCssStateRestoration() → restoreCssState() → switchTo(DRAFT) [request #2]
            // this._applyStoredState();

            // Trigger ready event for other components (e.g. css-preview-manager).
            // Pass iframeDoc so listeners can initialize without re-querying the iframe.
            $(document).trigger('bte:cssManagerReady', { iframeDocument: iframeDoc });

            return true;
        },
        
        /**
         * Check if CSS Manager is ready.
         * Stateless check: looks for #bte-theme-css-variables in the live iframe document.
         * @returns {Boolean}
         */
        isReady: function() {
            var doc = this._getCurrentIframeDoc();
            return !!(doc && $(doc).find('#bte-theme-css-variables').length);
        },
        
        /**
         * Apply CSS state based on localStorage.
         * Called once during init() to restore the last known status.
         * @private
         */
        _applyStoredState: function() {
            var status = StorageHelper.getCurrentStatus();
            var publicationId = StorageHelper.getCurrentPublicationId();

            log.info('CSS Manager: Applying stored state: ' + status + ' ' + (publicationId || ''));

            switch (status) {
                case PUBLICATION_STATUS.PUBLISHED:
                    this.switchTo(PUBLICATION_STATUS.PUBLISHED);
                    break;
                case PUBLICATION_STATUS.PUBLICATION:
                    if (publicationId) {
                        this.switchTo(PUBLICATION_STATUS.PUBLICATION, publicationId);
                    } else {
                        log.warn('CSS Manager: PUBLICATION status but no ID, falling back to DRAFT');
                        this.switchTo(PUBLICATION_STATUS.DRAFT);
                    }
                    break;
                case PUBLICATION_STATUS.DRAFT:
                default:
                    this.switchTo(PUBLICATION_STATUS.DRAFT);
            }
        },

        /**
         * Destroy CSS manager and clean up.
         * Removes publication style, resets state, unbinds listeners.
         */
        destroy: function() {
            this._removePublicationStyle();
            PublicationState.reset();
            currentPublicationId = null;
            $(document).off('scopeChanged.cssManager');
            log.info('CSS Manager destroyed');
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
         * Reset live preview changes.
         * Lazy-requires css-preview-manager to avoid circular AMD dependency:
         *   css-manager ← css-preview-manager ← css-manager
         * @private
         */
        _resetLivePreview: function() {
            require(['Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'], function(pm) {
                pm.reset();
            });
        },

        /**
         * Re-create live preview style element after iframe navigation.
         * Lazy-requires css-preview-manager (same circular dep reason as _resetLivePreview).
         * @private
         */
        _recreateLivePreviewStyle: function() {
            require(['Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'], function(pm) {
                pm.recreateLivePreviewStyle();
            });
        },

        /**
         * Inject publication CSS as <style id="bte-publication-css"> element.
         * Single-element strategy: always remove previous and insert fresh.
         * Inserted AFTER draft but BEFORE live-preview to maintain cascade order:
         *   published < draft < publication < live-preview
         * @private
         * @param {String} css
         */
        _injectPublicationStyle: function(css) {
            var doc = this._getCurrentIframeDoc();
            if (!doc) {
                log.error('CSS Manager: iframe document not available');
                return;
            }

            // Remove existing publication style first
            this._removePublicationStyle();

            var $publicationStyle = $('<style>', {
                id: 'bte-publication-css',
                type: 'text/css',
                media: 'all'
            }).text(css);

            // Insert BEFORE live-preview (highest priority) if it exists,
            // otherwise AFTER draft, otherwise AFTER published.
            var $livePreview = $(doc).find('#bte-live-preview');
            var $draftStyle  = $(doc).find('#bte-theme-css-variables-draft');
            var $publishedStyle = $(doc).find('#bte-theme-css-variables');

            if ($livePreview.length) {
                $livePreview.before($publicationStyle);
                log.info('CSS Manager: Publication CSS injected before #bte-live-preview');
            } else if ($draftStyle.length) {
                $draftStyle.after($publicationStyle);
                log.info('CSS Manager: Publication CSS injected after draft');
            } else if ($publishedStyle.length) {
                $publishedStyle.after($publicationStyle);
                log.info('CSS Manager: Publication CSS injected after published');
            } else {
                $(doc.head).append($publicationStyle);
                log.warn('CSS Manager: Publication CSS appended to head (no anchor found)');
            }
        },

        /**
         * Remove publication CSS element from iframe DOM.
         * @private
         */
        _removePublicationStyle: function() {
            var doc = this._getCurrentIframeDoc();
            if (doc) {
                $(doc).find('#bte-publication-css').remove();
                log.info('CSS Manager: Publication CSS removed');
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

                                // Create or update draft style element directly
                                $draftStyle = $(self._getCurrentIframeDoc()).find('#bte-theme-css-variables-draft');
                                if (!$draftStyle.length) {
                                    $draftStyle = $('<style>', {
                                        id: 'bte-theme-css-variables-draft',
                                        type: 'text/css',
                                        media: 'not all',
                                        disabled: true
                                    });
                                    var $anchor = $(self._getCurrentIframeDoc()).find('#bte-theme-css-variables');
                                    if ($anchor.length) {
                                        $anchor.after($draftStyle);
                                    } else {
                                        $(self._getCurrentIframeDoc().head).append($draftStyle);
                                    }
                                }
                                $draftStyle.text(css);
                                $draftStyle.attr('data-scope-id', effectiveScopeId);
                                $draftStyle.attr('data-created-by', 'editor/css-manager');
                                
                                // Enable draft; published stays enabled (draft is inserted after it in DOM,
                                // so CSS cascade gives draft priority without disabling published)
                                self._enableStyle($draftStyle);

                                // Remove publication CSS
                                self._removePublicationStyle();

                                // Re-create live preview style after iframe navigation.
                                self._recreateLivePreviewStyle();

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

                    // Disable live preview and clear unsaved changes
                    self._disableStyle($(doc).find('#bte-live-preview'));
                    self._resetLivePreview();

                    // Remove publication CSS
                    self._removePublicationStyle();

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

                                // Disable draft; published stays enabled (cascade order)
                                self._disableStyle($draftStyle);

                                // Disable live preview and clear unsaved changes
                                self._disableStyle($(self._getCurrentIframeDoc()).find('#bte-live-preview'));
                                self._resetLivePreview();

                                // Inject publication CSS (single-element strategy, removes previous)
                                self._injectPublicationStyle(css);

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
         * Refresh current status (reload CSS)
         * 
         * @returns {Promise}
         */
        refresh: function() {
            log.info('CSS Manager: Refreshing current status');
            return this.switchTo(PublicationState.get(), currentPublicationId);
        },

        /**
         * Show PUBLISHED CSS.
         * Alias for switchTo(PUBLISHED) — used by settings-editor on bte:publishedDiscarded.
         *
         * @returns {Promise}
         */
        showPublished: function() {
            return this.switchTo(PUBLICATION_STATUS.PUBLISHED);
        },

        /**
         * Refresh published CSS layer from the server.
         *
         * Called after discardBreezeThemeEditorPublished succeeds so the iframe
         * immediately reflects the new published state without a full page reload.
         *
         * @returns {Promise}
         */
        refreshPublishedCss: function() {
            var self = this;

            return getCss(configManager.getScope(), configManager.getScopeId(), PUBLICATION_STATUS.PUBLISHED, null)
                .then(function(response) {
                    var css = (response &&
                               response.getThemeEditorCss &&
                               response.getThemeEditorCss.css) || '';

                    var doc = self._getCurrentIframeDoc();
                    var $publishedStyle = doc ? $(doc).find('#bte-theme-css-variables') : null;

                    if ($publishedStyle && $publishedStyle.length) {
                        $publishedStyle.text(css || ':root {}');
                        log.info('CSS Manager: Published CSS refreshed in iframe');
                    } else {
                        log.warn('CSS Manager: #bte-theme-css-variables not found, cannot refresh');
                    }

                    return true;
                })
                .catch(function(error) {
                    log.error('CSS Manager: Failed to refresh published CSS: ' + error);
                    return false;
                });
        },

        /**
         * Refresh draft CSS in the iframe after discardDraft succeeds.
         *
         * Fetches the current DRAFT CSS from GraphQL and writes it into the existing
         * #bte-theme-css-variables-draft element. If the element is gone (e.g. after
         * an iframe navigation) it falls back to switchTo(DRAFT) which recreates it.
         *
         * @returns {Promise}
         */
        refreshDraftCss: function() {
            var self = this;

            return getCss(configManager.getScope(), configManager.getScopeId(), PUBLICATION_STATUS.DRAFT, null)
                .then(function(response) {
                    var css = (response &&
                               response.getThemeEditorCss &&
                               response.getThemeEditorCss.css) || '';

                    var doc = self._getCurrentIframeDoc();
                    var $draftStyle = doc ? $(doc).find('#bte-theme-css-variables-draft') : null;

                    if ($draftStyle && $draftStyle.length) {
                        $draftStyle.text(css || ':root {}');
                        log.info('CSS Manager: Draft CSS refreshed in iframe after discard');
                    } else {
                        log.info('CSS Manager: #bte-theme-css-variables-draft not found, falling back to switchTo(DRAFT)');
                        return self.switchTo(PUBLICATION_STATUS.DRAFT);
                    }

                    return true;
                })
                .catch(function(error) {
                    log.error('CSS Manager: Failed to refresh draft CSS: ' + error);
                    return false;
                });
        },
        
        /**
         * Get current status
         * 
         * @returns {String}
         */
        getCurrentStatus: function() {
            return PublicationState.get();
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
            return PublicationState.isEditable();
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
         * Fully stateless: no DOM refs to clear. flush=true only resets
         * PublicationState and currentPublicationId so that the next switchTo()
         * starts from a clean state for the new scope.
         *
         * scope/scopeId/themeId are always read from configManager (single source of truth).
         *
         * @param {Object|null} _config - Ignored (kept for call-site compatibility); scope is
         *                                read from configManager.
         * @param {Boolean}     flush   - if true, reset PublicationState and currentPublicationId
         */
        reinit: function(_config, flush) {
            if (flush) {
                PublicationState.reset();
                currentPublicationId = null;
            }
            log.info('CSS Manager: reinit scope=' + configManager.getScope() + ':' + configManager.getScopeId() + ' flush=' + !!flush);
        }
    };

    return manager;
});
