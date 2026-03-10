/**
 * Config Manager Utility
 * 
 * Centralizes access to toolbar configuration stored in jQuery.data().
 * Provides type-safe getters and eliminates repeated config access patterns.
 * 
 * This eliminates code duplication where multiple widgets access config via:
 * var toolbarConfig = $('body').data('bte-admin-config');
 */
define(['jquery', 'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function($, Logger) {
    'use strict';

    var log = Logger.for('utils/core/config-manager');
    
    /**
     * Key used to store config in jQuery.data()
     */
    var CONFIG_KEY = 'bte-admin-config';
    
    /**
     * Default config values
     */
    var DEFAULTS = {
        scope: 'stores',
        scopeId: null,
        storeCode: 'default',
        themeId: null,
        graphqlEndpoint: '/graphql'
    };
    
    return {
        /**
         * Get entire toolbar configuration
         * 
         * @returns {Object} Configuration object with all properties
         */
        get: function() {
            var config = $('body').data(CONFIG_KEY);
            return config || DEFAULTS;
        },
        
        /**
         * Set entire toolbar configuration
         * 
         * @param {Object} config - Configuration object
         * @param {string} config.scope    - 'default', 'websites', or 'stores'
         * @param {number} config.scopeId  - Scope ID (0 for default, website/store ID otherwise)
         * @param {string} config.storeCode - Store code (for iframe URL / cookie)
         * @param {number} config.themeId  - Theme ID (kept for CSS-manager / storage scoping)
         * @param {string} config.graphqlEndpoint - GraphQL endpoint URL
         */
        set: function(config) {
            if (!config || typeof config !== 'object') {
                log.error('Config must be an object');
                return;
            }
            
            $('body').data(CONFIG_KEY, config);
            log.info('Toolbar config set:', config);
        },
        
        /**
         * Update specific config properties
         * Merges with existing config instead of replacing
         * 
         * @param {Object} updates - Properties to update
         */
        update: function(updates) {
            if (!updates || typeof updates !== 'object') {
                log.error('Updates must be an object');
                return;
            }
            
            var current = this.get();
            var newConfig = $.extend({}, current, updates);
            $('body').data(CONFIG_KEY, newConfig);
            log.info('Toolbar config updated:', updates);
        },
        
        /**
         * Get scope ('default', 'websites', or 'stores') with optional fallback
         * 
         * @param {string} fallback
         * @returns {string}
         */
        getScope: function(fallback) {
            var config = this.get();
            return config.scope || fallback || DEFAULTS.scope;
        },

        /**
         * Get scope ID with optional fallback
         * 
         * @param {number|null} fallback
         * @returns {number|null}
         */
        getScopeId: function(fallback) {
            var config = this.get();
            return config.scopeId !== null && config.scopeId !== undefined
                ? config.scopeId
                : (fallback !== undefined ? fallback : null);
        },

        /**
         * Get store code with optional fallback
         * 
         * @param {string} fallback - Fallback value if not set
         * @returns {string} Store code
         */
        getStoreCode: function(fallback) {
            var config = this.get();
            return config.storeCode || fallback || DEFAULTS.storeCode;
        },
        
        /**
         * Get theme ID with optional fallback
         * 
         * @param {number|null} fallback - Fallback value if not set
         * @returns {number|null} Theme ID
         */
        getThemeId: function(fallback) {
            var config = this.get();
            return config.themeId !== null && config.themeId !== undefined
                ? config.themeId
                : (fallback || null);
        },
        
        /**
         * Get GraphQL endpoint URL with optional fallback
         * 
         * @param {string} fallback - Fallback value if not set
         * @returns {string} GraphQL endpoint URL
         */
        getGraphqlEndpoint: function(fallback) {
            var config = this.get();
            return config.graphqlEndpoint || fallback || DEFAULTS.graphqlEndpoint;
        },

        /**
         * Set scope (convenience method)
         * 
         * @param {string} scope
         */
        setScope: function(scope) {
            this.update({ scope: scope });
        },

        /**
         * Set scope ID (convenience method)
         * 
         * @param {number} scopeId
         */
        setScopeId: function(scopeId) {
            this.update({ scopeId: scopeId });
        },
        
        /**
         * Set store code (convenience method)
         * 
         * @param {string} storeCode - New store code
         */
        setStoreCode: function(storeCode) {
            this.update({ storeCode: storeCode });
        },
        
        /**
         * Set theme ID (convenience method)
         * 
         * @param {number} themeId - New theme ID
         */
        setThemeId: function(themeId) {
            this.update({ themeId: themeId });
        },
        
        /**
         * Check if config exists
         * 
         * @returns {boolean} true if config is set
         */
        exists: function() {
            return $('body').data(CONFIG_KEY) !== undefined;
        },
        
        /**
         * Clear config (for testing or reset)
         */
        clear: function() {
            $('body').removeData(CONFIG_KEY);
            log.info('Toolbar config cleared');
        }
    };
});
