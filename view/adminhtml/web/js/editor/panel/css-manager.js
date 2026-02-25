define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-css',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, IframeHelper, getCss, StorageHelper, Logger) {
    'use strict';

    var log = Logger.for('panel/css-manager');

    var $publishedStyle = null;
    var $draftStyle = null;
    var $livePreviewStyle = null;
    var $publicationStyle = null;
    var currentStatus = null;
    var storeId = null;
    var themeId = null;

    /**
     * Get current iframe document (always fresh from IframeHelper)
     * @returns {Document|null}
     */
    function getIframeDocument() {
        return IframeHelper.getDocument();
    }

    /**
     * Reset live preview changes (lazy loaded to avoid circular dependency)
     * css-manager.js ↔ css-preview-manager.js have circular dependency,
     * so we load CssPreviewManager dynamically only when needed
     */
    function resetLivePreview() {
        require(['Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'], function(CssPreviewManager) {
            CssPreviewManager.reset();
            log.info('Live preview reset via lazy loading');
        });
    }

    return {
        /**
         * Initialize CSS manager
         * 
         * @param {Number} store - Store ID
         * @param {Number} theme - Theme ID
         * @param {Number} retries - Internal retry counter
         */
        init: function(store, theme, retries) {
            retries = retries || 0;
            var self = this;
            
            storeId = store;
            themeId = theme;
            
            // Initialize storage helper with store/theme context
            StorageHelper.init(store, theme);
            
            // Validate parameters
            if (!storeId || !themeId) {
                log.error('CSS Manager: Invalid storeId or themeId storeId=' + storeId + ' themeId=' + themeId);
                return false;
            }
            
            if (!getIframeDocument()) {
                if (retries < 20) {
                    log.info('CSS Manager: iframe not ready, retry ' + (retries + 1));
                    setTimeout(function() {
                        self.init(store, theme, retries + 1);
                    }, 200);
                    return false;
                }
                log.warn('CSS Manager: iframe not initialized after retries');
                return false;
            }

            // Find existing CSS elements
            $publishedStyle = $(getIframeDocument()).find('#bte-theme-css-variables');
            $draftStyle = $(getIframeDocument()).find('#bte-theme-css-variables-draft');
            $livePreviewStyle = $(getIframeDocument()).find('#bte-live-preview');

            if (!$publishedStyle.length) {
                if (retries < 20) {
                    log.info('CSS Manager: #bte-theme-css-variables not ready, retry ' + (retries + 1));
                    setTimeout(function() {
                        self.init(store, theme, retries + 1);
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
                $(getIframeDocument().head).append($publishedStyle);
            }
            
            // Draft CSS will be created dynamically when switching to DRAFT
            if (!$draftStyle.length) {
                log.info('Draft CSS not in DOM - will be created dynamically when needed');
            }

            // Check localStorage for current status
            currentStatus = this._getStoredStatus();
            
            // Apply initial CSS based on stored status
            this._applyStoredState();

            // Listen for publication status changes to keep currentStatus in sync
            // This ensures isEditable() returns correct value when status changes
            $(document).on('publicationStatusChanged', function(e, data) {
                if (data && data.status) {
                    currentStatus = data.status;
                    log.info('CSS Manager: currentStatus updated to: ' + currentStatus);
                }
            });

            log.info('CSS Manager initialized (status: ' + currentStatus + ')');
            return true;
        },

        /**
         * Get current status from localStorage
         * @private
         */
        _getStoredStatus: function() {
            var status = StorageHelper.getCurrentStatus();
            log.debug('Getting stored status from localStorage: ' + status);
            return status;
        },

        /**
         * Get current publication ID from localStorage
         * @private
         */
        _getStoredPublicationId: function() {
            return StorageHelper.getCurrentPublicationId();
        },

        /**
         * Enable style element (make it active)
         * @private
         */
        _enableStyle: function($style) {
            if (!$style || !$style.length) return;
            
            // Set attributes in correct order
            $style.prop('disabled', false);      // Set disabled first
            $style.attr('media', 'all');         // Then media attribute
            
            // Force reflow to ensure changes are applied
            if (getIframeDocument() && getIframeDocument().body) {
                getIframeDocument().body.offsetHeight; // Trigger reflow
            }
        },

        /**
         * Disable style element (make it inactive)
         * @private
         */
        _disableStyle: function($style) {
            if (!$style || !$style.length) return;
            
            // Set attributes in correct order
            $style.prop('disabled', true);       // Set disabled first
            $style.attr('media', 'not all');     // Then media attribute
            
            // Force reflow to ensure changes are applied
            if (getIframeDocument() && getIframeDocument().body) {
                getIframeDocument().body.offsetHeight; // Trigger reflow
            }
        },

        /**
         * Apply CSS state based on localStorage
         * @private
         */
        _applyStoredState: function() {
            var status = this._getStoredStatus();
            var publicationId = this._getStoredPublicationId();

            log.info('Applying stored CSS state: ' + status + ' ' + publicationId);

            switch (status) {
                case 'PUBLISHED':
                    this.showPublished();
                    break;
                case 'DRAFT':
                    this.showDraft();
                    break;
                case 'PUBLICATION':
                    if (publicationId) {
                        this.showPublication(publicationId);
                    } else {
                        log.warn('PUBLICATION status but no ID, falling back to DRAFT');
                        this.showDraft();
                    }
                    break;
                default:
                    this.showDraft();
            }
        },

        /**
         * Show PUBLISHED CSS (disable draft and live-preview, remove publication)
         * Read-only mode - editing NOT allowed
         */
        showPublished: function() {
            // Refresh style references (may appear later)
            if (!$publishedStyle || !$publishedStyle.length) {
                $publishedStyle = $(getIframeDocument()).find('#bte-theme-css-variables');
            }
            if (!$draftStyle || !$draftStyle.length) {
                $draftStyle = $(getIframeDocument()).find('#bte-theme-css-variables-draft');
            }
            if (!$livePreviewStyle || !$livePreviewStyle.length) {
                $livePreviewStyle = $(getIframeDocument()).find('#bte-live-preview');
            }

            if (!$publishedStyle || !$publishedStyle.length) {
                return false;
            }

            // Enable published CSS
            this._enableStyle($publishedStyle);

            // Disable draft CSS
            this._disableStyle($draftStyle);

            // Disable live preview (NOT editable in PUBLISHED mode)
            this._disableStyle($livePreviewStyle);
            
            // Clear live preview changes (unsaved changes should not persist)
            resetLivePreview();

            // Remove publication CSS
            this._removePublicationStyle();

            currentStatus = 'PUBLISHED';
            log.info('CSS Manager: Showing PUBLISHED (read-only mode)');
            
            // ✅ Trigger event to notify panel about status change
            $(document).trigger('publicationStatusChanged', {status: 'PUBLISHED'});
            
            return true;
        },

        /**
         * Show DRAFT CSS (enable draft and live-preview, remove publication)
         * Editable mode - editing allowed
         * Draft CSS is loaded from GraphQL and created dynamically
         */
        showDraft: function() {
            var self = this;
            
            // Refresh style references (may appear later)
            if (!$publishedStyle || !$publishedStyle.length) {
                $publishedStyle = $(getIframeDocument()).find('#bte-theme-css-variables');
            }
            if (!$draftStyle || !$draftStyle.length) {
                $draftStyle = $(getIframeDocument()).find('#bte-theme-css-variables-draft');
            }
            if (!$livePreviewStyle || !$livePreviewStyle.length) {
                $livePreviewStyle = $(getIframeDocument()).find('#bte-live-preview');
            }

            // Load draft CSS from GraphQL if not in DOM
            if (!$draftStyle || !$draftStyle.length) {
                log.info('Loading draft CSS from GraphQL...');
                
                return getCss(storeId, themeId, 'DRAFT', null)
                    .then(function(response) {
                        if (response && response.getThemeEditorCss) {
                            var css = response.getThemeEditorCss.css || '';
                            
                            // Create draft style element
                            $draftStyle = $('<style>', {
                                id: 'bte-theme-css-variables-draft',
                                type: 'text/css',
                                media: 'all'
                            }).text(css);
                            
                            // Insert after published style
                            if ($publishedStyle && $publishedStyle.length) {
                                $publishedStyle.after($draftStyle);
                                log.info('Draft CSS created dynamically');
                            } else {
                                $(getIframeDocument().head).append($draftStyle);
                                log.info('Draft CSS created in head');
                            }
                            
                            // Enable published CSS (base)
                            self._enableStyle($publishedStyle);

                            // Enable draft CSS
                            self._enableStyle($draftStyle);

                            // Enable live preview (editable in DRAFT mode)
                            self._enableStyle($livePreviewStyle);

                            // Remove publication CSS
                            self._removePublicationStyle();

                            currentStatus = 'DRAFT';
                            log.info('CSS Manager: Showing DRAFT (editable mode, created dynamically)');
                            
                            // Trigger event to notify panel about status change
                            $(document).trigger('publicationStatusChanged', {status: 'DRAFT'});
                            
                            return true;
                        }
                    })
                    .catch(function(error) {
                        log.error('Failed to load draft CSS: ' + error);
                        return false;
                    });
            }

            // Draft already exists - just enable it
            // Enable published CSS (base)
            this._enableStyle($publishedStyle);

            // Enable draft CSS
            this._enableStyle($draftStyle);

            // Enable live preview (editable in DRAFT mode)
            this._enableStyle($livePreviewStyle);

            // Remove publication CSS
            this._removePublicationStyle();

            currentStatus = 'DRAFT';
            log.info('CSS Manager: Showing DRAFT (editable mode)');
            
            // Trigger event to notify panel about status change
            $(document).trigger('publicationStatusChanged', {status: 'DRAFT'});
            
            return Promise.resolve(true);
        },

        /**
         * Show PUBLICATION CSS (fetch via GraphQL, inject as live style)
         * Read-only mode - viewing historical version
         * 
         * @param {Number} publicationId
         * @returns {Promise}
         */
        showPublication: function(publicationId) {
            var self = this;

            if (!publicationId) {
                log.error('CSS Manager: publicationId required');
                return Promise.reject('publicationId required');
            }

            log.info('Fetching publication CSS: ' + publicationId);

            // Refresh style references (may appear later)
            if (!$publishedStyle || !$publishedStyle.length) {
                $publishedStyle = $(getIframeDocument()).find('#bte-theme-css-variables');
            }
            if (!$draftStyle || !$draftStyle.length) {
                $draftStyle = $(getIframeDocument()).find('#bte-theme-css-variables-draft');
            }
            if (!$livePreviewStyle || !$livePreviewStyle.length) {
                $livePreviewStyle = $(getIframeDocument()).find('#bte-live-preview');
            }

            // Disable published CSS
            this._disableStyle($publishedStyle);

            // Disable draft CSS
            this._disableStyle($draftStyle);

            // Disable live preview (NOT editable in PUBLICATION mode)
            this._disableStyle($livePreviewStyle);
            
            // Clear live preview changes (unsaved changes should not persist)
            resetLivePreview();

            // Fetch publication CSS via GraphQL
            return getCss(storeId, themeId, 'PUBLICATION', publicationId)
                .then(function(response) {
                    // GraphQL client returns response.data, so response = {getThemeEditorCss: {...}}
                    if (!response || !response.getThemeEditorCss) {
                        throw new Error('Invalid response from GraphQL');
                    }

                    var result = response.getThemeEditorCss;

                    if (!result.hasContent || !result.css) {
                        log.warn('Publication CSS is empty');
                        return false;
                    }

                    // Inject publication CSS as <style> element
                    self._injectPublicationStyle(result.css);

                    currentStatus = 'PUBLICATION';
                    log.info('CSS Manager: Showing PUBLICATION ' + publicationId + ' (read-only mode)');
                    
                    // ✅ Trigger event to notify panel about status change
                    $(document).trigger('publicationStatusChanged', {
                        status: 'PUBLICATION',
                        publicationId: publicationId
                    });
                    
                    return true;
                })
                .catch(function(error) {
                    log.error('Failed to load publication CSS: ' + error);
                    // Fallback to draft
                    self.showDraft();
                    throw error;
                });
        },

        /**
         * Inject publication CSS as <style> element
         * Insert AFTER draft but BEFORE live-preview (correct priority order)
         * @private
         */
        _injectPublicationStyle: function(css) {
            // Remove existing publication style
            this._removePublicationStyle();

            // Create new style element
            $publicationStyle = $('<style>', {
                id: 'bte-publication-css',
                type: 'text/css',
                media: 'all'
            }).text(css);

            // Insert AFTER draft but BEFORE live-preview (правильний порядок пріоритету)
            var $livePreview = $(getIframeDocument()).find('#bte-live-preview');
            
            if ($livePreview && $livePreview.length) {
                // Insert before live-preview (щоб live-preview мав найвищий пріоритет)
                $livePreview.before($publicationStyle);
                log.info('Publication CSS injected before #bte-live-preview');
            } else if ($draftStyle && $draftStyle.length) {
                // Fallback: insert after draft
                $draftStyle.after($publicationStyle);
                log.info('Publication CSS injected after draft (live-preview not found)');
            } else if ($publishedStyle && $publishedStyle.length) {
                // Fallback: insert after published
                $publishedStyle.after($publicationStyle);
                log.info('Publication CSS injected after published');
            } else {
                log.error('Cannot find insertion point for publication CSS!');
                return;
            }
        },

        /**
         * Remove publication CSS element
         * @private
         */
        _removePublicationStyle: function() {
            if ($publicationStyle && $publicationStyle.length) {
                $publicationStyle.remove();
                $publicationStyle = null;
                log.info('Publication CSS removed');
            }
        },

        /**
         * Switch to status (PUBLISHED, DRAFT, PUBLICATION)
         * 
         * @param {String} status
         * @param {Number} publicationId - Required for PUBLICATION
         * @returns {Promise}
         */
        switchTo: function(status, publicationId) {
            log.info('CSS Manager: Switching to ' + status + ' ' + (publicationId || ''));

            switch (status) {
                case 'PUBLISHED':
                    this.showPublished();
                    return Promise.resolve(true);
                case 'DRAFT':
                    this.showDraft();
                    return Promise.resolve(true);
                case 'PUBLICATION':
                    return this.showPublication(publicationId);
                default:
                    log.error('Invalid status: ' + status);
                    return Promise.reject('Invalid status');
            }
        },

        /**
         * Refresh current status (re-fetch if PUBLICATION)
         */
        refresh: function() {
            if (currentStatus === 'PUBLICATION') {
                var publicationId = this._getStoredPublicationId();
                if (publicationId) {
                    return this.showPublication(publicationId);
                }
            }
            // For PUBLISHED/DRAFT, no refresh needed (already in DOM)
            return Promise.resolve(true);
        },

        /**
         * Refresh iframe document reference after navigation
         * This must be called when iframe loads a new page
         * NOTE: With IframeHelper.getDocument() we always get fresh document,
         * so this method just updates cached jQuery references
         */
        refreshIframeDocument: function() {
            if (!getIframeDocument()) {
                log.error('CSS Manager: Cannot refresh - iframe document not available');
                return false;
            }
            
            // Update style element references
            $publishedStyle = $(getIframeDocument()).find('#bte-theme-css-variables');
            $draftStyle = $(getIframeDocument()).find('#bte-theme-css-variables-draft');
            $livePreviewStyle = $(getIframeDocument()).find('#bte-live-preview');
            $publicationStyle = null; // Reset publication style
            
            log.info('CSS Manager: iframe document refreshed');
            return true;
        },

        /**
         * Get current status
         */
        getCurrentStatus: function() {
            return currentStatus;
        },

        /**
         * Check if editing is allowed in current mode
         * Only DRAFT mode allows editing
         * 
         * @returns {Boolean}
         */
        isEditable: function() {
            return currentStatus === 'DRAFT';
        },

        /**
         * Destroy CSS manager and clean up
         */
        destroy: function() {
            this._removePublicationStyle();
            $publishedStyle = null;
            $draftStyle = null;
            $livePreviewStyle = null;
            currentStatus = null;
            log.info('CSS Manager destroyed');
        }
    };
});
