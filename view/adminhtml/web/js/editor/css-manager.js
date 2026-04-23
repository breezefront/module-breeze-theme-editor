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
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/publication-state',
    'Swissup_BreezeThemeEditor/js/editor/utils/bsync'
], function($, getCss, previewManager, configManager, scopeManager, StorageHelper, Logger, Constants, PublicationState, Bsync) {
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
         * the second call resolves immediately without re-initializing.
         *
         * Returns a Promise that resolves to `true` on success or `false` on
         * unrecoverable failure (bad scope, missing iframe).
         * Rejects only when waitForElement times out (iframe never became ready).
         *
         * @param {Object} config - Configuration object
         * @param {String} config.scope    - Scope ('default'|'websites'|'stores')
         * @param {Number} config.scopeId  - Scope ID
         * @param {Number} config.themeId  - Theme ID
         * @param {String} config.iframeId - Preview iframe ID
         * @returns {Promise<Boolean>}
         */
        init: function(config) {
            // Support legacy call: init(scopeId, themeId) → treat as no-op config
            if (typeof config === 'number' || typeof config === 'string') {
                config = {};
            }
            config = config || {};
            var self = this;

            // Idempotent guard: toolbar inits first, panel resolves immediately if ready.
            if (this.isReady()) {
                log.info('CSS Manager already initialized, skipping');
                return Promise.resolve(true);
            }

            // Bootstrap scopeManager if it hasn't been initialised yet
            // (toolbar.js is the canonical first initialiser, but
            //  editor/css-manager may be the entry point in some flows).
            if (!scopeManager.initialized() && (config.scopeId != null || config.scope)) {
                scopeManager.init({
                    scope:   config.scope   || 'stores',
                    scopeId: config.scopeId != null ? config.scopeId : null,
                    themeId: config.themeId || null
                });
            }

            iframeId = config.iframeId || iframeId || 'bte-iframe';

            // Initialize StorageHelper with current scope/theme context
            StorageHelper.init(scopeManager.getScopeId(), scopeManager.getThemeId());

            // Register scope-change listener BEFORE async waiting so scope changes
            // during iframe loading are never missed.
            // off+on prevents duplicates on subsequent init() calls.
            $(document).off('scopeChanged.cssManager').on('scopeChanged.cssManager', function () {
                // scopeManager already updated by scope-selector.js before this event fires.
                manager.reinit(null, true);
            });

            // Validate parameters
            if (!scopeManager.getScopeId() && scopeManager.getScope() !== 'default') {
                log.error('CSS Manager: Invalid scopeId for scope=' + scopeManager.getScope());
                return Promise.resolve(false);
            }

            // Get iframe element
            var $iframe = $('#' + iframeId);
            if (!$iframe.length) {
                log.error('CSS Manager: iframe not found: ' + iframeId);
                return Promise.resolve(false);
            }

            var iframeDoc = $iframe[0].contentDocument || $iframe[0].contentWindow.document;

            // --- 8.1: wait for iframe body ---
            var bodyReady = (iframeDoc && iframeDoc.body)
                ? Promise.resolve(iframeDoc.body)
                : Bsync.waitForElement('body', iframeDoc, 4000);

            return bodyReady
                .then(function () {
                    // Re-read iframeDoc after body is ready (navigation may have replaced it)
                    iframeDoc = $iframe[0].contentDocument || $iframe[0].contentWindow.document;

                    // --- 8.2: wait for #bte-theme-css-variables ---
                    var $publishedStyle = $(iframeDoc).find('#bte-theme-css-variables');
                    if ($publishedStyle.length) {
                        return $publishedStyle[0];
                    }
                    log.info('CSS Manager: waiting for #bte-theme-css-variables');
                    return Bsync.waitForElement('#bte-theme-css-variables', iframeDoc, 4000);
                })
                .catch(function () {
                    // waitForElement timed out — create empty placeholder (same behaviour
                    // as the old retry loop after 20 attempts).
                    log.info('CSS Manager: #bte-theme-css-variables not found - creating empty placeholder');
                    iframeDoc = $iframe[0].contentDocument || $iframe[0].contentWindow.document;
                    var placeholder = $('<style>', {
                        id: 'bte-theme-css-variables',
                        type: 'text/css',
                        'data-status': 'published',
                        media: 'all'
                    }).text(':root {}');
                    $(iframeDoc.head).append(placeholder);
                    return placeholder[0];
                })
                .then(function () {
                    log.info('CSS Manager initialized scope=' + scopeManager.getScope() + ':' + scopeManager.getScopeId() + ' iframeId=' + iframeId);

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
                });
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
            
            if ((!scopeManager.getScopeId() && scopeManager.getScope() !== 'default') || !doc) {
                log.error('CSS Manager not initialized or iframe document not available');
                return Promise.reject(new Error('CSS Manager not initialized'));
            }
            
            PublicationState.set(status);
            currentPublicationId = publicationId || null;

            // Capture scope context at call time — caller may pass explicit ctx,
            // otherwise fall back to scopeManager (single source of truth).
            // Captured values are used throughout the async chain so that a scope
            // change arriving while a GraphQL request is in-flight does not corrupt
            // the result (stale-closure guard below).
            var effectiveScope   = (ctx && ctx.scope)   || scopeManager.getScope();
            var effectiveScopeId = (ctx && ctx.scopeId != null) ? ctx.scopeId : scopeManager.getScopeId();
            
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
                            if (effectiveScopeId !== scopeManager.getScopeId()) {
                                log.warn('CSS Manager: DRAFT response for scopeId=' + effectiveScopeId +
                                    ' discarded — current scope is now ' + scopeManager.getScopeId());
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
                            if (effectiveScopeId !== scopeManager.getScopeId()) {
                                log.warn('CSS Manager: PUBLICATION response for scopeId=' + effectiveScopeId +
                                    ' discarded — current scope is now ' + scopeManager.getScopeId());
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

            return getCss(scopeManager.getScope(), scopeManager.getScopeId(), PUBLICATION_STATUS.PUBLISHED, null)
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

            return getCss(scopeManager.getScope(), scopeManager.getScopeId(), PUBLICATION_STATUS.DRAFT, null)
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
         * scope/scopeId/themeId are always read from scopeManager (single source of truth).
         *
         * @param {Object|null} _config - Ignored (kept for call-site compatibility); scope is
         *                                read from scopeManager.
         * @param {Boolean}     flush   - if true, reset PublicationState and currentPublicationId
         */
        reinit: function(_config, flush) {
            if (flush) {
                PublicationState.reset();
                currentPublicationId = null;
            }
            log.info('CSS Manager: reinit scope=' + scopeManager.getScope() + ':' + scopeManager.getScopeId() + ' flush=' + !!flush);
        }
    };

    return manager;
});
