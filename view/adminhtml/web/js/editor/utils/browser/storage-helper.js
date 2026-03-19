/**
 * Storage Helper - Centralized localStorage management with store/theme scoping
 *
 * All data is stored under a single localStorage key "bte" as a nested object:
 *
 *   {
 *     "global": { "token": "..." },
 *     "1": {
 *       "5": { "current_url": "/", "current_page_id": "catalog_product_view" }
 *     },
 *     "21": {
 *       "21": { "open_sections": ["colors"], "current_status": "DRAFT" }
 *     }
 *   }
 *
 * Migration: on first read, if a value is missing from the new structure,
 * the helper looks for legacy flat keys (bte_{storeId}_{themeId}_{key} and
 * bte_{key}), migrates the value into the new structure and removes the old key.
 */
define(['Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function (Logger) {
    'use strict';

    var log = Logger.for('storage-helper');

    /** Top-level localStorage key */
    var STORAGE_KEY = 'bte';

    var currentStoreId = null;
    var currentThemeId = null;

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Read and parse the entire "bte" object from localStorage.
     * Returns {} on any error.
     *
     * @returns {Object}
     */
    function read() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            log.error('Storage read error: ' + e);
            return {};
        }
    }

    /**
     * Serialize and persist the entire "bte" object to localStorage.
     *
     * @param {Object} obj
     */
    function write(obj) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            log.error('Storage write error: ' + e);
        }
    }

    /**
     * Read a scoped value from obj[storeId][themeId][key].
     * Returns undefined when any level is missing.
     *
     * @param {Object} obj
     * @param {String|Number} storeId
     * @param {String|Number} themeId
     * @param {String} key
     * @returns {*}
     */
    function getScopedValue(obj, storeId, themeId, key) {
        var store = obj[String(storeId)];
        if (!store) return undefined;
        var theme = store[String(themeId)];
        if (!theme) return undefined;
        return theme[key];
    }

    /**
     * Write a scoped value to obj[storeId][themeId][key] (mutates obj).
     *
     * @param {Object} obj
     * @param {String|Number} storeId
     * @param {String|Number} themeId
     * @param {String} key
     * @param {*} value
     */
    function setScopedValue(obj, storeId, themeId, key, value) {
        var sid = String(storeId);
        var tid = String(themeId);
        if (!obj[sid]) obj[sid] = {};
        if (!obj[sid][tid]) obj[sid][tid] = {};
        obj[sid][tid][key] = value;
    }

    /**
     * Delete a scoped key from obj[storeId][themeId] (mutates obj).
     *
     * @param {Object} obj
     * @param {String|Number} storeId
     * @param {String|Number} themeId
     * @param {String} key
     */
    function removeScopedValue(obj, storeId, themeId, key) {
        var sid = String(storeId);
        var tid = String(themeId);
        if (obj[sid] && obj[sid][tid]) {
            delete obj[sid][tid][key];
        }
    }

    /**
     * Try to migrate a legacy flat key into the new nested structure.
     * Looks for: bte_{storeId}_{themeId}_{key}  and  bte_{key}
     * Returns the migrated value, or null if nothing was found.
     *
     * @param {Object} obj  - the already-read "bte" object (will be mutated on migration)
     * @param {String} key
     * @returns {String|null}
     */
    function migrateLegacyKey(obj, key) {
        // 1. bte_{storeId}_{themeId}_{key}
        var legacyScoped = 'bte_' + currentStoreId + '_' + currentThemeId + '_' + key;
        var value = localStorage.getItem(legacyScoped);

        if (value === null) {
            // 2. bte_{key}  (oldest format, no scope at all)
            var legacyFlat = 'bte_' + key;
            value = localStorage.getItem(legacyFlat);
            if (value !== null) {
                log.info('Migrating ' + legacyFlat + ' -> bte.' + currentStoreId + '.' + currentThemeId + '.' + key);
                localStorage.removeItem(legacyFlat);
            }
        } else {
            log.info('Migrating ' + legacyScoped + ' -> bte.' + currentStoreId + '.' + currentThemeId + '.' + key);
            localStorage.removeItem(legacyScoped);
        }

        if (value !== null) {
            setScopedValue(obj, currentStoreId, currentThemeId, key, value);
            write(obj);
        }

        return value;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    return {
        /**
         * Initialize storage helper with store/theme context.
         *
         * @param {Number} storeId
         * @param {Number} themeId
         */
        init: function (storeId, themeId) {
            currentStoreId = storeId;
            currentThemeId = themeId;
            log.info('Storage Helper initialized: storeId=' + storeId + ' themeId=' + themeId);
        },

        // -----------------------------------------------------------------------
        // Scoped (per store+theme) API
        // -----------------------------------------------------------------------

        /**
         * Get a scoped value. Automatically migrates legacy flat keys on first read.
         *
         * @param {String} key
         * @returns {String|null}
         */
        getItem: function (key) {
            try {
                var obj = read();

                if (currentStoreId && currentThemeId) {
                    var value = getScopedValue(obj, currentStoreId, currentThemeId, key);

                    if (value === undefined || value === null) {
                        return migrateLegacyKey(obj, key);
                    }

                    return value;
                }

                // No scope yet — fall back to legacy flat key
                return localStorage.getItem('bte_' + key);
            } catch (e) {
                log.error('Storage read error: ' + e);
                return null;
            }
        },

        /**
         * Set a scoped value (read-modify-write).
         *
         * @param {String} key
         * @param {String} value
         */
        setItem: function (key, value) {
            try {
                var obj = read();

                if (currentStoreId && currentThemeId) {
                    setScopedValue(obj, currentStoreId, currentThemeId, key, value);
                } else {
                    // No scope yet — write to legacy flat key
                    obj['_unscoped'] = obj['_unscoped'] || {};
                    obj['_unscoped'][key] = value;
                }

                write(obj);
            } catch (e) {
                log.error('Storage write error: ' + e);
            }
        },

        /**
         * Remove a scoped value (read-modify-write).
         * Also removes any leftover legacy flat key.
         *
         * @param {String} key
         */
        removeItem: function (key) {
            try {
                var obj = read();

                if (currentStoreId && currentThemeId) {
                    removeScopedValue(obj, currentStoreId, currentThemeId, key);
                    write(obj);
                }

                // Always clean up legacy keys if they still exist
                localStorage.removeItem('bte_' + currentStoreId + '_' + currentThemeId + '_' + key);
                localStorage.removeItem('bte_' + key);
            } catch (e) {
                log.error('Storage remove error: ' + e);
            }
        },

        // -----------------------------------------------------------------------
        // Global (not scoped) API — used for token and other cross-scope values
        // -----------------------------------------------------------------------

        /**
         * Get a global (non-scoped) value from bte.global[key].
         * Migrates legacy bte_{key} flat key on first read.
         *
         * @param {String} key
         * @returns {String|null}
         */
        getGlobalItem: function (key) {
            try {
                var obj = read();
                var global = obj['global'] || {};
                var value = global[key];

                if (value === undefined || value === null) {
                    // Migrate legacy bte_{key} (underscore flat key)
                    var legacyKey = 'bte_' + key;
                    var legacy = localStorage.getItem(legacyKey);

                    if (legacy === null) {
                        // Migrate legacy bte-{hyphenated-key} (hyphen flat key, e.g. bte-log-level)
                        var hyphenKey = 'bte-' + key.replace(/_/g, '-');
                        legacy = localStorage.getItem(hyphenKey);
                        if (legacy !== null) {
                            log.info('Migrating ' + hyphenKey + ' -> bte.global.' + key);
                            localStorage.removeItem(hyphenKey);
                        }
                    } else {
                        log.info('Migrating ' + legacyKey + ' -> bte.global.' + key);
                        localStorage.removeItem(legacyKey);
                    }

                    if (legacy !== null) {
                        if (!obj['global']) obj['global'] = {};
                        obj['global'][key] = legacy;
                        write(obj);
                        return legacy;
                    }
                    return null;
                }

                return value;
            } catch (e) {
                log.error('Storage read error: ' + e);
                return null;
            }
        },

        /**
         * Set a global (non-scoped) value in bte.global[key].
         *
         * @param {String} key
         * @param {String} value
         */
        setGlobalItem: function (key, value) {
            try {
                var obj = read();
                if (!obj['global']) obj['global'] = {};
                obj['global'][key] = value;
                write(obj);
            } catch (e) {
                log.error('Storage write error: ' + e);
            }
        },

        /**
         * Remove a global (non-scoped) value from bte.global[key].
         * Also removes any leftover legacy bte_{key} flat key.
         *
         * @param {String} key
         */
        removeGlobalItem: function (key) {
            try {
                var obj = read();
                if (obj['global']) {
                    delete obj['global'][key];
                    write(obj);
                }
                // Clean up legacy keys
                localStorage.removeItem('bte_' + key);
                localStorage.removeItem('bte-' + key.replace(/_/g, '-'));
            } catch (e) {
                log.error('Storage remove error: ' + e);
            }
        },

        // -----------------------------------------------------------------------
        // Editor state — convenience wrappers
        // -----------------------------------------------------------------------

        getCurrentStatus: function () {
            return this.getItem('current_status') || 'DRAFT';
        },
        setCurrentStatus: function (status) {
            this.setItem('current_status', status);
        },

        getCurrentPublicationId: function () {
            var id = this.getItem('current_publication_id');
            return id ? parseInt(id, 10) : null;
        },
        setCurrentPublicationId: function (publicationId) {
            this.setItem('current_publication_id', String(publicationId));
        },

        getCurrentPublicationTitle: function () {
            return this.getItem('current_publication_title');
        },
        setCurrentPublicationTitle: function (title) {
            this.setItem('current_publication_title', title);
        },

        clearCurrentPublication: function () {
            this.removeItem('current_publication_id');
            this.removeItem('current_publication_title');
        },

        getCurrentUrl: function () {
            return this.getItem('current_url') || '/';
        },
        setCurrentUrl: function (url) {
            this.setItem('current_url', url);
        },

        getCurrentPageId: function () {
            return this.getItem('current_page_id') || 'cms_index_index';
        },
        setCurrentPageId: function (pageId) {
            this.setItem('current_page_id', pageId);
        },

        // -----------------------------------------------------------------------
        // UI state
        // -----------------------------------------------------------------------

        /**
         * Get open accordion section codes.
         *
         * @returns {Array}
         */
        getOpenSections: function () {
            try {
                var value = this.getItem('open_sections');
                return value ? JSON.parse(value) : [];
            } catch (e) {
                return [];
            }
        },

        /**
         * Set open accordion section codes.
         *
         * @param {Array} sections
         */
        setOpenSections: function (sections) {
            this.setItem('open_sections', JSON.stringify(sections));
        },

        // -----------------------------------------------------------------------
        // Live preview changes
        // -----------------------------------------------------------------------

        /**
         * Get unsaved CSS variable changes for live preview.
         *
         * @returns {Object}
         */
        getLivePreviewChanges: function () {
            try {
                var value = this.getItem('live_preview_changes');
                return value ? JSON.parse(value) : {};
            } catch (e) {
                return {};
            }
        },

        /**
         * Set unsaved CSS variable changes for live preview.
         *
         * @param {Object} changes
         */
        setLivePreviewChanges: function (changes) {
            this.setItem('live_preview_changes', JSON.stringify(changes));
        },

        /**
         * Clear unsaved CSS variable changes.
         */
        clearLivePreviewChanges: function () {
            this.removeItem('live_preview_changes');
        }
    };
});
