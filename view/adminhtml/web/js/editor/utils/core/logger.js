/**
 * BteLogger — Breeze Theme Editor levelled console logger
 *
 * Levels (lowest → highest verbosity):
 *   ERROR  — unexpected failures that need attention
 *   WARN   — recoverable problems / unusual conditions
 *   INFO   — significant flow events (default)
 *   DEBUG  — detailed trace information (hidden by default)
 *
 * Runtime override (persist across reloads):
 *   localStorage.setItem('bte-log-level', 'DEBUG')
 *   localStorage.setItem('bte-log-level', 'INFO')  // back to default
 *   localStorage.removeItem('bte-log-level')        // reset to default
 *
 * Usage:
 *   define(['Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function(Logger) {
 *       Logger.info ('my-module', 'Widget initialized');
 *       Logger.debug('my-module', 'Detailed state', { foo: 1 });
 *       Logger.warn ('my-module', 'Unexpected condition', data);
 *       Logger.error('my-module', 'Something broke', err);
 *   });
 */
define([], function () {
    'use strict';

    var LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    var LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    var DEFAULT_LEVEL = LEVELS.INFO;

    /**
     * Read level from localStorage (non-fatal: silently falls back to default)
     *
     * @returns {Number}
     */
    function readStoredLevel() {
        try {
            var stored = localStorage.getItem('bte-log-level');
            if (stored) {
                var n = LEVELS[stored.toUpperCase()];
                if (n !== undefined) {
                    return n;
                }
            }
        } catch (e) { /* localStorage not available */ }
        return DEFAULT_LEVEL;
    }

    var currentLevel = readStoredLevel();

    /**
     * Internal log dispatcher
     *
     * @param {Number}  level   - numeric level of this message
     * @param {String}  module  - short module / component name
     * @param {String}  msg     - human-readable message
     * @param {*}       [data]  - optional extra data (object, string, …)
     */
    function log(level, module, msg, data) {
        if (level < currentLevel) {
            return;
        }

        var prefix = '[bte:' + module + '] ' + msg;
        var hasDump = data !== undefined;

        switch (level) {
            case LEVELS.DEBUG:
                // console.debug is hidden in DevTools by default (Verbose filter)
                if (hasDump) { console.debug(prefix, data); }
                else         { console.debug(prefix); }
                break;
            case LEVELS.WARN:
                if (hasDump) { console.warn(prefix, data); }
                else         { console.warn(prefix); }
                break;
            case LEVELS.ERROR:
                if (hasDump) { console.error(prefix, data); }
                else         { console.error(prefix); }
                break;
            default: // INFO
                if (hasDump) { console.log(prefix, data); }
                else         { console.log(prefix); }
        }
    }

    var Logger = {
        /**
         * Change the active log level at runtime
         *
         * @param {String} levelName  - 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
         */
        setLevel: function (levelName) {
            var n = LEVELS[(levelName || '').toUpperCase()];
            if (n !== undefined) {
                currentLevel = n;
                try { localStorage.setItem('bte-log-level', levelName.toUpperCase()); } catch (e) {}
            }
        },

        /** @returns {String} current level name */
        getLevel: function () {
            return LEVEL_NAMES[currentLevel] || 'INFO';
        },

        /**
         * Detailed trace — hidden by default (requires DevTools "Verbose" or DEBUG level)
         * @param {String} module
         * @param {String} msg
         * @param {*}      [data]
         */
        debug: function (module, msg, data) { log(LEVELS.DEBUG, module, msg, data); },

        /**
         * Normal operational events
         * @param {String} module
         * @param {String} msg
         * @param {*}      [data]
         */
        info: function (module, msg, data) { log(LEVELS.INFO, module, msg, data); },

        /**
         * Recoverable or unexpected conditions
         * @param {String} module
         * @param {String} msg
         * @param {*}      [data]
         */
        warn: function (module, msg, data) { log(LEVELS.WARN, module, msg, data); },

        /**
         * Failures that likely break functionality
         * @param {String} module
         * @param {String} msg
         * @param {*}      [data]
         */
        error: function (module, msg, data) { log(LEVELS.ERROR, module, msg, data); }
    };

    return Logger;
});
