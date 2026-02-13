/**
 * Storage Helper - Centralized localStorage management with store/theme scoping
 * Admin version
 */
define([], function () {
    'use strict';

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
            console.log('🗄️ Storage Helper initialized:', {storeId: storeId, themeId: themeId});
        },

        /**
         * Get storage key with store/theme prefix
         * @private
         */
        _getKey: function(key) {
            if (currentStoreId && currentThemeId) {
                return 'bte_' + currentStoreId + '_' + currentThemeId + '_' + key;
            }
            // Fallback to old key format
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
                        console.log('📦 Migrating', oldKey, 'to', scopedKey);
                        localStorage.setItem(scopedKey, value);
                        // Keep old key for other stores that might still use it
                    }
                }
                
                return value;
            } catch (e) {
                console.error('❌ Storage error:', e);
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
                var scopedKey = this._getKey(key);
                localStorage.setItem(scopedKey, value);
                console.log('💾 Stored:', scopedKey, '=', value);
            } catch (e) {
                console.error('❌ Storage error:', e);
            }
        },

        /**
         * Remove value from localStorage
         * @param {String} key - Key name (without bte_ prefix)
         */
        removeItem: function(key) {
            try {
                var scopedKey = this._getKey(key);
                localStorage.removeItem(scopedKey);
                
                // Also remove old key for cleanup
                var oldKey = 'bte_' + key;
                localStorage.removeItem(oldKey);
                
                console.log('🗑️ Removed:', scopedKey);
            } catch (e) {
                console.error('❌ Storage error:', e);
            }
        },

        /**
         * Get current status
         * @returns {String}
         */
        getCurrentStatus: function() {
            return this.getItem('current_status') || 'DRAFT';
        },

        /**
         * Set current status
         * @param {String} status
         */
        setCurrentStatus: function(status) {
            this.setItem('current_status', status);
        },

        /**
         * Get current publication ID
         * @returns {Number|null}
         */
        getCurrentPublicationId: function() {
            var id = this.getItem('current_publication_id');
            return id ? parseInt(id, 10) : null;
        },

        /**
         * Set current publication ID
         * @param {Number} publicationId
         */
        setCurrentPublicationId: function(publicationId) {
            this.setItem('current_publication_id', String(publicationId));
        },

        /**
         * Get current publication title
         * @returns {String|null}
         */
        getCurrentPublicationTitle: function() {
            return this.getItem('current_publication_title');
        },

        /**
         * Set current publication title
         * @param {String} title
         */
        setCurrentPublicationTitle: function(title) {
            this.setItem('current_publication_title', title);
        },

        /**
         * Clear current publication data
         */
        clearCurrentPublication: function() {
            this.removeItem('current_publication_id');
            this.removeItem('current_publication_title');
        }
    };
});
