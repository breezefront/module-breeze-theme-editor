/**
 * Scope Manager
 *
 * AMD closure singleton that holds the runtime scope/theme context of the
 * Breeze Theme Editor. State lives in a private closure variable — RequireJS
 * caches the result of define(), so every module receives the same instance.
 *
 * Analogue of Magento\Store\Model\StoreManager: scope, scopeId and themeId
 * are attributes of the current store context and change at runtime when the
 * user switches stores via the scope selector.
 *
 * Lifecycle:
 *   1. toolbar.js calls scopeManager.init() once on page load.
 *   2. scope-selector.js calls scopeManager.update() when the user switches scope.
 *   3. config-loader.js calls scopeManager.update() after GraphQL resolves the
 *      real themeId / themeName for the selected scope.
 *
 * @module Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager
 */
define([
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function (Logger) {
    'use strict';

    var log = Logger.for('utils/core/scope-manager');

    /**
     * Default scope state
     */
    var DEFAULTS = {
        scope:     'stores',
        scopeId:   null,
        storeCode: 'default',
        themeId:   null,
        themeName: null
    };

    /**
     * Private state — lives in AMD closure, never exposed on window or DOM.
     * @type {Object}
     */
    var _scope = {};

    /**
     * Whether init() has been called at least once.
     * @type {boolean}
     */
    var _initialized = false;

    return {
        /**
         * Initialize scope state on toolbar startup.
         * Should be called once by toolbar.js.
         *
         * @param {Object} data
         * @param {string} data.scope      - 'default' | 'websites' | 'stores'
         * @param {number|null} data.scopeId
         * @param {string} data.storeCode
         * @param {number|null} data.themeId
         * @param {string|null} data.themeName
         */
        init: function (data) {
            _scope = Object.assign({}, DEFAULTS, data);
            _initialized = true;
            log.info('ScopeManager initialized: scope=' + _scope.scope +
                ' scopeId=' + _scope.scopeId + ' themeId=' + _scope.themeId);
        },

        /**
         * Partially update scope state.
         * Used by scope-selector.js (on scope switch) and config-loader.js
         * (after GraphQL resolves themeId / themeName).
         *
         * @param {Object} updates - Fields to update
         */
        update: function (updates) {
            if (!updates || typeof updates !== 'object') {
                log.error('ScopeManager.update: updates must be an object');
                return;
            }
            _scope = Object.assign({}, _scope, updates);
            log.info('ScopeManager updated:', updates);
        },

        /**
         * Get entire scope state object.
         *
         * @returns {Object}
         */
        get: function () {
            return Object.assign({}, _initialized ? _scope : DEFAULTS);
        },

        /**
         * Whether init() has been called.
         *
         * @returns {boolean}
         */
        initialized: function () {
            return _initialized;
        },

        /**
         * Reset to uninitialized state.
         * Used in tests and on hard scope flush/reinit.
         */
        clear: function () {
            _scope = {};
            _initialized = false;
            log.info('ScopeManager cleared');
        },

        // ----------------------------------------------------------------
        // Typed getters
        // ----------------------------------------------------------------

        /**
         * Get scope type with optional fallback.
         *
         * @param {string} [fallback]
         * @returns {string} 'default' | 'websites' | 'stores'
         */
        getScope: function (fallback) {
            var s = _initialized ? _scope : DEFAULTS;
            return s.scope || fallback || DEFAULTS.scope;
        },

        /**
         * Get scope ID with optional fallback.
         * NOTE: scopeId=0 is a valid value for scope='default' — do not treat
         * 0 as falsy.
         *
         * @param {number|null} [fallback]
         * @returns {number|null}
         */
        getScopeId: function (fallback) {
            var s = _initialized ? _scope : DEFAULTS;
            return (s.scopeId !== null && s.scopeId !== undefined)
                ? s.scopeId
                : (fallback !== undefined ? fallback : null);
        },

        /**
         * Get store code with optional fallback.
         *
         * @param {string} [fallback]
         * @returns {string}
         */
        getStoreCode: function (fallback) {
            if (!_initialized) {
                return fallback !== undefined ? fallback : DEFAULTS.storeCode;
            }
            return _scope.storeCode || fallback || DEFAULTS.storeCode;
        },

        /**
         * Get theme ID with optional fallback.
         * Returns null when themeId was reset to null after a scope switch
         * (backend will resolve it via GraphQL).
         *
         * @param {number|null} [fallback]
         * @returns {number|null}
         */
        getThemeId: function (fallback) {
            var s = _initialized ? _scope : DEFAULTS;
            return (s.themeId !== null && s.themeId !== undefined)
                ? s.themeId
                : (fallback !== undefined ? fallback : null);
        },

        /**
         * Get theme name with optional fallback.
         *
         * @param {string} [fallback]
         * @returns {string|null}
         */
        getThemeName: function (fallback) {
            var s = _initialized ? _scope : DEFAULTS;
            return s.themeName || fallback || null;
        }
    };
});
