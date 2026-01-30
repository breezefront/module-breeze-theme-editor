define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/toolbar/device-frame',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-css',
    'Swissup_BreezeThemeEditor/js/theme-editor/storage-helper'
], function ($, DeviceFrame, getCss, StorageHelper) {
    'use strict';

    var iframeDocument = null;
    var $publishedStyle = null;
    var $draftStyle = null;
    var $livePreviewStyle = null;
    var $publicationStyle = null;
    var currentStatus = null;
    var storeId = null;
    var themeId = null;

    /**
     * Reset live preview changes (lazy loaded to avoid circular dependency)
     * css-manager.js ↔ css-preview-manager.js have circular dependency,
     * so we load CssPreviewManager dynamically only when needed
     */
    function resetLivePreview() {
        require(['Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager'], function(CssPreviewManager) {
            CssPreviewManager.reset();
            console.log('↺ Live preview reset via lazy loading');
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
                console.error('❌ CSS Manager: Invalid storeId or themeId', {storeId: storeId, themeId: themeId});
                return false;
            }
            
            iframeDocument = DeviceFrame.getDocument();
            if (!iframeDocument) {
                if (retries < 20) {
                    console.log('⏳ CSS Manager: iframe not ready, retry', retries + 1);
                    setTimeout(function() {
                        self.init(store, theme, retries + 1);
                    }, 200);
                    return false;
                }
                console.warn('⚠️ CSS Manager: iframe not initialized after retries');
                return false;
            }

            // Find existing CSS elements
            $publishedStyle = $(iframeDocument).find('#bte-theme-css-variables');
            $draftStyle = $(iframeDocument).find('#bte-theme-css-variables-draft');
            $livePreviewStyle = $(iframeDocument).find('#bte-live-preview');

            if (!$publishedStyle.length) {
                if (retries < 20) {
                    console.log('⏳ CSS Manager: CSS elements not ready, retry', retries + 1);
                    setTimeout(function() {
                        self.init(store, theme, retries + 1);
                    }, 200);
                    return false;
                }
                console.error('❌ CSS Manager: #bte-theme-css-variables not found after retries!');
                return false;
            }

            // Check localStorage for current status
            currentStatus = this._getStoredStatus();
            
            // Apply initial CSS based on stored status
            this._applyStoredState();

            console.log('✅ CSS Manager initialized (status:', currentStatus + ')');
            return true;
        },

        /**
         * Get current status from localStorage
         * @private
         */
        _getStoredStatus: function() {
            var status = StorageHelper.getCurrentStatus();
            console.log('🔍 Getting stored status from localStorage:', status);
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
            $style.attr('media', 'all');        // Primary method (HTML5 standard)
            $style.prop('disabled', false);     // Fallback for older browsers
        },

        /**
         * Disable style element (make it inactive)
         * @private
         */
        _disableStyle: function($style) {
            if (!$style || !$style.length) return;
            $style.attr('media', 'not all');    // Primary method (HTML5 standard)
            $style.prop('disabled', true);      // Fallback for older browsers
        },

        /**
         * Apply CSS state based on localStorage
         * @private
         */
        _applyStoredState: function() {
            var status = this._getStoredStatus();
            var publicationId = this._getStoredPublicationId();

            console.log('📋 Applying stored CSS state:', status, publicationId);

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
                        console.warn('⚠️ PUBLICATION status but no ID, falling back to DRAFT');
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
                $publishedStyle = $(iframeDocument).find('#bte-theme-css-variables');
            }
            if (!$draftStyle || !$draftStyle.length) {
                $draftStyle = $(iframeDocument).find('#bte-theme-css-variables-draft');
            }
            if (!$livePreviewStyle || !$livePreviewStyle.length) {
                $livePreviewStyle = $(iframeDocument).find('#bte-live-preview');
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
            console.log('📘 CSS Manager: Showing PUBLISHED (read-only mode)');
            // console.trace('📘 showPublished() call stack');
            
            // ✅ Trigger event to notify panel about status change
            $(document).trigger('publicationStatusChanged', {status: 'PUBLISHED'});
            
            return true;
        },

        /**
         * Show DRAFT CSS (enable draft and live-preview, remove publication)
         * Editable mode - editing allowed
         */
        showDraft: function() {
            // Refresh style references (may appear later)
            if (!$publishedStyle || !$publishedStyle.length) {
                $publishedStyle = $(iframeDocument).find('#bte-theme-css-variables');
            }
            if (!$draftStyle || !$draftStyle.length) {
                $draftStyle = $(iframeDocument).find('#bte-theme-css-variables-draft');
            }
            if (!$livePreviewStyle || !$livePreviewStyle.length) {
                $livePreviewStyle = $(iframeDocument).find('#bte-live-preview');
            }

            if (!$draftStyle || !$draftStyle.length) {
                console.warn('⚠️ CSS Manager: Draft CSS not available');
                return false;
            }

            // Enable published CSS (base)
            this._enableStyle($publishedStyle);

            // Enable draft CSS
            this._enableStyle($draftStyle);

            // Enable live preview (editable in DRAFT mode)
            this._enableStyle($livePreviewStyle);

            // Remove publication CSS
            this._removePublicationStyle();

            currentStatus = 'DRAFT';
            console.log('📗 CSS Manager: Showing DRAFT (editable mode)');
            // console.trace('📗 showDraft() call stack');
            
            // ✅ Trigger event to notify panel about status change
            $(document).trigger('publicationStatusChanged', {status: 'DRAFT'});
            
            return true;
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
                console.error('❌ CSS Manager: publicationId required');
                return Promise.reject('publicationId required');
            }

            console.log('📦 Fetching publication CSS:', publicationId);

            // Refresh style references (may appear later)
            if (!$publishedStyle || !$publishedStyle.length) {
                $publishedStyle = $(iframeDocument).find('#bte-theme-css-variables');
            }
            if (!$draftStyle || !$draftStyle.length) {
                $draftStyle = $(iframeDocument).find('#bte-theme-css-variables-draft');
            }
            if (!$livePreviewStyle || !$livePreviewStyle.length) {
                $livePreviewStyle = $(iframeDocument).find('#bte-live-preview');
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
                        console.warn('⚠️ Publication CSS is empty');
                        return false;
                    }

                    // Inject publication CSS as <style> element
                    self._injectPublicationStyle(result.css);

                    currentStatus = 'PUBLICATION';
                    console.log('📙 CSS Manager: Showing PUBLICATION', publicationId, '(read-only mode)');
                    
                    // ✅ Trigger event to notify panel about status change
                    $(document).trigger('publicationStatusChanged', {
                        status: 'PUBLICATION',
                        publicationId: publicationId
                    });
                    
                    return true;
                })
                .catch(function(error) {
                    console.error('❌ Failed to load publication CSS:', error);
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
            var $livePreview = $(iframeDocument).find('#bte-live-preview');
            
            if ($livePreview && $livePreview.length) {
                // Insert before live-preview (щоб live-preview мав найвищий пріоритет)
                $livePreview.before($publicationStyle);
                console.log('📝 Publication CSS injected before #bte-live-preview');
            } else if ($draftStyle && $draftStyle.length) {
                // Fallback: insert after draft
                $draftStyle.after($publicationStyle);
                console.log('📝 Publication CSS injected after draft (live-preview not found)');
            } else if ($publishedStyle && $publishedStyle.length) {
                // Fallback: insert after published
                $publishedStyle.after($publicationStyle);
                console.log('📝 Publication CSS injected after published');
            } else {
                console.error('❌ Cannot find insertion point for publication CSS!');
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
                console.log('🗑️ Publication CSS removed');
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
            console.log('🔄 CSS Manager: Switching to', status, publicationId || '');

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
                    console.error('❌ Invalid status:', status);
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
         */
        refreshIframeDocument: function() {
            iframeDocument = DeviceFrame.getDocument();
            
            if (!iframeDocument) {
                console.error('❌ CSS Manager: Cannot refresh - iframe document not available');
                return false;
            }
            
            // Update style element references
            $publishedStyle = $(iframeDocument).find('#bte-theme-css-variables');
            $draftStyle = $(iframeDocument).find('#bte-theme-css-variables-draft');
            $livePreviewStyle = $(iframeDocument).find('#bte-live-preview');
            $publicationStyle = null; // Reset publication style
            
            console.log('🔄 CSS Manager: iframe document refreshed');
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
         * Destroy CSS manager
         */
        destroy: function() {
            this._removePublicationStyle();
            $publishedStyle = null;
            $draftStyle = null;
            $livePreviewStyle = null;
            iframeDocument = null;
            currentStatus = null;
            console.log('🗑️ CSS Manager destroyed');
        }
    };
});
