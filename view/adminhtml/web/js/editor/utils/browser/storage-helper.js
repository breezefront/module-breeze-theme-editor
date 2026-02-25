/**
 * Storage Helper - Centralized localStorage management with store/theme scoping
 */
define(['Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function (Logger) {
    'use strict';

    var log = Logger.for('storage-helper');

    var currentStoreId = null;
    var currentThemeId = null;

    return {
        /**
         * Initialize storage helper with store/theme context
         * @param {Number} storeId
         * @param {Number} themeId
         */
        init: function(storeId, themeId) {
            currentStoreId = storeId;
            currentThemeId = themeId;
            log.info('Storage Helper initialized: storeId=' + storeId + ' themeId=' + themeId);
        },

        /**
         * Get storage key with store/theme prefix
         * @private
         */
        _getKey: function(key) {
            if (currentStoreId && currentThemeId) {
                return 'bte_' + currentStoreId + '_' + currentThemeId + '_' + key;
            }
            return 'bte_' + key;
        },

        /**
         * Get value from localStorage with fallback to old key format
         * @param {String} key - Key name (without bte_ prefix)
         * @returns {String|null}
         */
        getItem: function(key) {
            try {
                var scopedKey = this._getKey(key);
                var value = localStorage.getItem(scopedKey);

                // Try old key format for backwards compatibility
                if (value === null) {
                    var oldKey = 'bte_' + key;
                    value = localStorage.getItem(oldKey);

                    // Migrate to new format
                    if (value !== null && currentStoreId && currentThemeId) {
                        log.info('Migrating ' + oldKey + ' -> ' + scopedKey);
                        localStorage.setItem(scopedKey, value);
                    }
                }

                return value;
            } catch (e) {
                log.error('Storage read error: ' + e);
                return null;
            }
        },

        /**
         * Set value in localStorage with store/theme scoping
         * @param {String} key - Key name (without bte_ prefix)
         * @param {String} value
         */
        setItem: function(key, value) {
            try {
                localStorage.setItem(this._getKey(key), value);
            } catch (e) {
                log.error('Storage write error: ' + e);
            }
        },

        /**
         * Remove value from localStorage
         * @param {String} key - Key name (without bte_ prefix)
         */
        removeItem: function(key) {
            try {
                localStorage.removeItem(this._getKey(key));
                // Also remove old key for cleanup
                localStorage.removeItem('bte_' + key);
            } catch (e) {
                log.error('Storage remove error: ' + e);
            }
        },

        // -------------------------------------------------------------------------
        // Editor state
        // -------------------------------------------------------------------------

        getCurrentStatus: function() {
            return this.getItem('current_status') || 'DRAFT';
        },
        setCurrentStatus: function(status) {
            this.setItem('current_status', status);
        },

        getCurrentPublicationId: function() {
            var id = this.getItem('current_publication_id');
            return id ? parseInt(id, 10) : null;
        },
        setCurrentPublicationId: function(publicationId) {
            this.setItem('current_publication_id', String(publicationId));
        },

        getCurrentPublicationTitle: function() {
            return this.getItem('current_publication_title');
        },
        setCurrentPublicationTitle: function(title) {
            this.setItem('current_publication_title', title);
        },

        clearCurrentPublication: function() {
            this.removeItem('current_publication_id');
            this.removeItem('current_publication_title');
        },

        getCurrentUrl: function() {
            return this.getItem('current_url') || '/';
        },
        setCurrentUrl: function(url) {
            this.setItem('current_url', url);
        },

        getCurrentPageId: function() {
            return this.getItem('current_page_id') || 'cms_index_index';
        },
        setCurrentPageId: function(pageId) {
            this.setItem('current_page_id', pageId);
        },

        // -------------------------------------------------------------------------
        // UI state
        // -------------------------------------------------------------------------

        /**
         * Get open accordion section codes
         * @returns {Array}
         */
        getOpenSections: function() {
            try {
                var value = this.getItem('open_sections');
                return value ? JSON.parse(value) : [];
            } catch (e) {
                return [];
            }
        },

        /**
         * Set open accordion section codes
         * @param {Array} sections
         */
        setOpenSections: function(sections) {
            this.setItem('open_sections', JSON.stringify(sections));
        },

        // -------------------------------------------------------------------------
        // Live preview changes
        // -------------------------------------------------------------------------

        /**
         * Get unsaved CSS variable changes for live preview
         * @returns {Object}
         */
        getLivePreviewChanges: function() {
            try {
                var value = this.getItem('live_preview_changes');
                return value ? JSON.parse(value) : {};
            } catch (e) {
                return {};
            }
        },

        /**
         * Set unsaved CSS variable changes for live preview
         * @param {Object} changes
         */
        setLivePreviewChanges: function(changes) {
            this.setItem('live_preview_changes', JSON.stringify(changes));
        },

        /**
         * Clear unsaved CSS variable changes
         */
        clearLivePreviewChanges: function() {
            this.removeItem('live_preview_changes');
        }
    };
});
