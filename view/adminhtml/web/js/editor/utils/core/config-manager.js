/**
 * Config Manager
 *
 * AMD closure singleton that holds the static, readonly configuration of the
 * Breeze Theme Editor toolbar. State lives in a private closure variable —
 * RequireJS caches the result of define(), so every module receives the same
 * instance.
 *
 * Analogue of Magento\Framework\App\Config: values are set once at bootstrap
 * (toolbar.js) and never mutated at runtime.
 *
 * For runtime scope/theme state (scope, scopeId, storeCode, themeId, themeName)
 * that changes when the user switches stores, use scope-manager.js instead.
 *
 * @module Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager
 */
define([
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function (Logger) {
    'use strict';

    var log = Logger.for('utils/core/config-manager');

    /**
     * Default config values
     */
    var DEFAULTS = {
        graphqlEndpoint: '/graphql',
        adminUrl:        '/admin',
        adminBasePath:   '/admin/',
        permissions:     {},
        activatePanel:   null
    };

    /**
     * Private config state — lives in AMD closure, never exposed on window or DOM.
     * @type {Object}
     */
    var _config = {};

    return {
        /**
         * Set entire static configuration.
         * Should be called once by toolbar.js on page load.
         *
         * @param {Object} config
         * @param {string} config.graphqlEndpoint
         * @param {string} config.adminUrl
         * @param {string} config.adminBasePath
         * @param {Object} config.permissions
         * @param {string|null} config.activatePanel
         */
        set: function (config) {
            if (!config || typeof config !== 'object') {
                log.error('Config must be an object');
                return;
            }
            _config = config;
            log.info('Config set');
        },

        /**
         * Get entire config object (merged with defaults).
         *
         * @returns {Object}
         */
        get: function () {
            return Object.assign({}, DEFAULTS, _config);
        },

        /**
         * Check if config has been set.
         *
         * @returns {boolean}
         */
        exists: function () {
            return Object.keys(_config).length > 0;
        },

        /**
         * Reset config to empty state.
         * Used in tests.
         */
        clear: function () {
            _config = {};
            log.info('Config cleared');
        },

        // ----------------------------------------------------------------
        // Typed getters
        // ----------------------------------------------------------------

        /**
         * Get GraphQL endpoint URL.
         *
         * @param {string} [fallback]
         * @returns {string}
         */
        getGraphqlEndpoint: function (fallback) {
            return _config.graphqlEndpoint || fallback || DEFAULTS.graphqlEndpoint;
        },

        /**
         * Get admin URL (e.g. '/admin').
         *
         * @param {string} [fallback]
         * @returns {string}
         */
        getAdminUrl: function (fallback) {
            return _config.adminUrl || fallback || DEFAULTS.adminUrl;
        },

        /**
         * Get admin base path used for URL detection (e.g. '/admin/').
         * Required for subfolder installs (e.g. '/tryit2531/admin/').
         *
         * @param {string} [fallback]
         * @returns {string}
         */
        getAdminBasePath: function (fallback) {
            return _config.adminBasePath || fallback || DEFAULTS.adminBasePath;
        },

        /**
         * Get ACL permissions object.
         *
         * @param {Object} [fallback]
         * @returns {Object}
         */
        getPermissions: function (fallback) {
            return _config.permissions || fallback || DEFAULTS.permissions;
        },

        /**
         * Get panel to auto-activate on load (e.g. 'content-builder').
         *
         * @returns {string|null}
         */
        getActivatePanel: function () {
            return _config.activatePanel || DEFAULTS.activatePanel;
        }
    };
});
