define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/toolbar/device-frame',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-css'
], function ($, DeviceFrame, getCss) {
    'use strict';

    var iframeDocument = null;
    var $publishedStyle = null;
    var $draftStyle = null;
    var $publicationStyle = null;
    var currentStatus = null;
    var storeId = null;
    var themeId = null;

    return {
        /**
         * Initialize CSS manager
         * 
         * @param {Number} store - Store ID
         * @param {Number} theme - Theme ID
         */
        init: function(store, theme) {
            storeId = store;
            themeId = theme;
            
            iframeDocument = DeviceFrame.getDocument();
            if (!iframeDocument) {
                console.warn('⚠️ CSS Manager: iframe not initialized');
                return false;
            }

            // Find existing CSS elements
            $publishedStyle = $(iframeDocument).find('#bte-theme-css-variables');
            $draftStyle = $(iframeDocument).find('#bte-theme-css-variables-draft');

            if (!$publishedStyle.length) {
                console.error('❌ CSS Manager: #bte-theme-css-variables not found!');
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
            try {
                return localStorage.getItem('bte_current_status') || 'DRAFT';
            } catch (e) {
                return 'DRAFT';
            }
        },

        /**
         * Get current publication ID from localStorage
         * @private
         */
        _getStoredPublicationId: function() {
            try {
                var id = localStorage.getItem('bte_current_publication_id');
                return id ? parseInt(id, 10) : null;
            } catch (e) {
                return null;
            }
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
         * Show PUBLISHED CSS (disable draft, remove publication)
         */
        showPublished: function() {
            if (!$publishedStyle || !$publishedStyle.length) {
                return false;
            }

            // Disable draft CSS
            if ($draftStyle && $draftStyle.length) {
                $draftStyle.prop('disabled', true);
            }

            // Remove publication CSS
            this._removePublicationStyle();

            currentStatus = 'PUBLISHED';
            console.log('📘 CSS Manager: Showing PUBLISHED');
            return true;
        },

        /**
         * Show DRAFT CSS (enable draft, remove publication)
         */
        showDraft: function() {
            if (!$draftStyle || !$draftStyle.length) {
                console.warn('⚠️ CSS Manager: Draft CSS not available');
                return false;
            }

            // Enable draft CSS
            $draftStyle.prop('disabled', false);

            // Remove publication CSS
            this._removePublicationStyle();

            currentStatus = 'DRAFT';
            console.log('📗 CSS Manager: Showing DRAFT');
            return true;
        },

        /**
         * Show PUBLICATION CSS (fetch via GraphQL, inject as live style)
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

            // Disable draft CSS first
            if ($draftStyle && $draftStyle.length) {
                $draftStyle.prop('disabled', true);
            }

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
                    console.log('📙 CSS Manager: Showing PUBLICATION', publicationId);
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
         * @private
         */
        _injectPublicationStyle: function(css) {
            // Remove existing publication style
            this._removePublicationStyle();

            // Create new style element
            $publicationStyle = $('<style>', {
                id: 'bte-publication-css',
                type: 'text/css'
            }).text(css);

            // Insert after draft style (or published if draft doesn't exist)
            if ($draftStyle && $draftStyle.length) {
                $draftStyle.after($publicationStyle);
            } else if ($publishedStyle && $publishedStyle.length) {
                $publishedStyle.after($publicationStyle);
            }

            console.log('📝 Publication CSS injected');
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
         * Get current status
         */
        getCurrentStatus: function() {
            return currentStatus;
        },

        /**
         * Destroy CSS manager
         */
        destroy: function() {
            this._removePublicationStyle();
            $publishedStyle = null;
            $draftStyle = null;
            iframeDocument = null;
            currentStatus = null;
            console.log('🗑️ CSS Manager destroyed');
        }
    };
});
