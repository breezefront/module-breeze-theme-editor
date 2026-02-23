define([
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function(Logger) {
    'use strict';

    var log = Logger.for('panel/panel-state');

    /**
     * Panel state manager
     * Tracks config, values, and changes
     */
    var PanelState = {
        /**
         * Theme configuration from GraphQL
         */
        config: null,

        /**
         * Current values {sectionCode.fieldCode: {value, savedValue, defaultValue, isModified, isDirty}}
         */
        values: {},

        /**
         * Field metadata map for quick lookup
         */
        fieldsMap: {},

        /**
         * Event listeners
         */
        listeners: [],

        /**
         * Initialize state with config
         *
         * @param {Object} config - Theme config from GraphQL
         */
        init: function(config) {
            this.config = config;
            this.values = {};
            this.fieldsMap = {};
            // Don't reset listeners - they should persist across config reloads

            // Build values map and fields lookup
            if (config && config.sections) {
                config.sections.forEach(function(section) {
                    section.fields.forEach(function(field) {
                        var key = section.code + '.' + field.code;
                        var currentValue = field.value !== null && field.value !== undefined
                            ? field.value
                            : field.default;

                        // Store field state
                        this.values[key] = {
                            value: currentValue,           // Current (unsaved) value
                            savedValue: currentValue,      // Last saved value
                            defaultValue:  field.default,   // Default from config
                            isModified: !!field.isModified, // Saved value !== default (from DB)
                            isDirty: false                  // Current !== saved
                        };

                        // Store field metadata for quick access
                        this.fieldsMap[key] = {
                            sectionCode: section.code,
                            sectionLabel: section.label,
                            fieldCode: field.code,
                            fieldLabel: field.label,
                            fieldType: field.type,
                            cssVar: field.cssVar,
                            default: field.default,
                            validation: field.validation,
                            params: field.params
                        };
                    }.bind(this));
                }.bind(this));
            }

            log.info('State initialized: ' + Object.keys(this.values).length + ' values');
        },

        /**
         * Get field metadata
         *
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {Object|null}
         */
        getField: function(sectionCode, fieldCode) {
            var key = sectionCode + '.' + fieldCode;
            return this.fieldsMap[key] || null;
        },

        /**
         * Get field state (value, savedValue, isDirty, isModified)
         *
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {Object|null}
         */
        getFieldState: function(sectionCode, fieldCode) {
            var key = sectionCode + '.' + fieldCode;
            return this.values[key] || null;
        },

        /**
         * Get current value
         *
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {String|null}
         */
        getValue: function(sectionCode, fieldCode) {
            var state = this.getFieldState(sectionCode, fieldCode);
            return state ? state.value : null;
        },

        /**
         * Set value and track dirty state
         *
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @param {*} newValue
         */
        setValue:  function(sectionCode, fieldCode, newValue) {
            var key = sectionCode + '.' + fieldCode;
            var state = this.values[key];

            log.debug('setValue called: ' + key + ' newValue: ' + newValue);
            // console.trace('🐛 Call stack:');

            if (!state) {
                log.warn('Field not found: ' + key);
                return;
            }

            // Update value
            state.value = newValue;

            // Mark as dirty if different from saved value
            state.isDirty = (newValue !== state.savedValue);

            log.debug('Value updated: key=' + key + ' value=' + newValue + ' savedValue=' + state.savedValue + ' isDirty=' + state.isDirty + ' isModified=' + state.isModified);
        },

        /**
         * Get all dirty (unsaved) changes
         *
         * @returns {Array} - [{sectionCode, fieldCode, value, savedValue}]
         */
        getDirtyChanges: function() {
            var changes = [];

            Object.keys(this.values).forEach(function(key) {
                var state = this.values[key];
                var field = this.fieldsMap[key];

                if (state.isDirty) {
                    changes.push({
                        sectionCode: field.sectionCode,
                        fieldCode: field.fieldCode,
                        value: state.value,
                        savedValue: state.savedValue,
                        cssVar: field.cssVar
                    });
                }
            }.bind(this));

            return changes;
        },

        /**
         * Get changes formatted for GraphQL mutation
         *
         * @returns {Array} - [{sectionCode, fieldCode, value}]
         */
        getChangesForSave: function() {
            return this.getDirtyChanges().map(function(change) {
                return {
                    sectionCode: change.sectionCode,
                    fieldCode: change.fieldCode,
                    value:  change.value
                };
            });
        },

        /**
         * Check if there are unsaved changes
         *
         * @returns {Boolean}
         */
        hasChanges: function() {
            return this.getDirtyChanges().length > 0;
        },

        /**
         * Get changes count
         *
         * @returns {Number}
         */
        getChangesCount: function() {
            return this.getDirtyChanges().length;
        },

        /**
         * Get count of fields that are saved but differ from their default value
         * (isModified = true). Used for the publication selector draft badge.
         *
         * @returns {Number}
         */
        getModifiedCount: function() {
            return Object.keys(this.values).filter(function(key) {
                return this.values[key].isModified;
            }.bind(this)).length;
        },

        /**
         * Reset dirty changes to saved values
         */
        reset: function() {
            Object.keys(this.values).forEach(function(key) {
                var state = this.values[key];
                if (state.isDirty) {
                    state.value = state.savedValue;
                    state.isDirty = false;
                }
            }.bind(this));

            log.info('All dirty changes reset to saved values');
        },

        /**
         * Reset specific section to saved values
         *
         * @param {String} sectionCode
         */
        resetSection: function(sectionCode) {
            var resetCount = 0;

            Object.keys(this.values).forEach(function(key) {
                if (key.startsWith(sectionCode + '.')) {
                    var state = this.values[key];
                    if (state.isDirty) {
                        state.value = state.savedValue;
                        state.isDirty = false;
                        resetCount++;
                    }
                }
            }.bind(this));

            log.info('Section reset: ' + sectionCode + ' (' + resetCount + ' fields)');
        },

        /**
         * Reset to defaults (all fields)
         */
        resetToDefaults: function() {
            Object.keys(this.values).forEach(function(key) {
                var state = this.values[key];
                state.value = state.defaultValue;
                state.isDirty = (state.defaultValue !== state.savedValue);
            }.bind(this));

            log.info('All fields reset to defaults');
        },

        /**
         * Mark changes as saved
         * Moves current values to savedValues, clears dirty flags
         */
        markAsSaved: function() {
            Object.keys(this.values).forEach(function(key) {
                var state = this.values[key];
                if (state.isDirty) {
                    state.savedValue = state.value;
                    state.isDirty = false;
                    // Update isModified based on default
                    state.isModified = (state.value !== state.defaultValue);
                }
            }.bind(this));

            log.info('All changes marked as saved');
        },

        /**
         * Reset single field to draft value (clear dirty state)
         * 
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {*} Draft value that was restored, or undefined if failed
         */
        resetField: function(sectionCode, fieldCode) {
            var key = sectionCode + '.' + fieldCode;
            var state = this.values[key];
            
            if (!state) {
                log.warn('PanelState: Field not found: ' + key);                return undefined;
            }
            
            // Restore saved value (draft value)
            var draftValue = state.savedValue;
            state.value = draftValue;
            state.isDirty = false;
            
            log.info('PanelState: Field reset: ' + key + ' -> ' + draftValue);
            log.debug('State after reset: value=' + state.value + ' savedValue=' + state.savedValue + ' defaultValue=' + state.defaultValue + ' isDirty=' + state.isDirty + ' isModified=' + state.isModified);
            
            // Notify listeners
            this.notifyListeners('field-reset', {
                sectionCode: sectionCode,
                fieldCode: fieldCode,
                value: draftValue
            });
            
            return draftValue;
        },

        /**
         * Restore single field to its default value
         * Sets value = defaultValue, marks dirty if different from savedValue,
         * and fires 'field-restore' event for settings-editor to handle auto-save.
         *
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {*} Default value that was restored, or undefined if failed
         */
        restoreToDefault: function(sectionCode, fieldCode) {
            var key = sectionCode + '.' + fieldCode;
            var state = this.values[key];

            if (!state) {
                log.warn('PanelState.restoreToDefault: Field not found: ' + key);
                return undefined;
            }

            var defaultValue = state.defaultValue;
            state.value = defaultValue;
            state.isDirty = (defaultValue !== state.savedValue);

            log.info('PanelState.restoreToDefault: ' + key + ' -> ' + defaultValue);
            log.debug('State after restore: value=' + state.value + ' savedValue=' + state.savedValue + ' defaultValue=' + state.defaultValue + ' isDirty=' + state.isDirty + ' isModified=' + state.isModified);

            // Notify listeners — settings-editor will auto-save and call markFieldAsSaved()
            this.notifyListeners('field-restore', {
                sectionCode: sectionCode,
                fieldCode: fieldCode,
                value: defaultValue
            });

            return defaultValue;
        },

        /**
         * Mark single field as saved (after auto-save completes)
         * Moves current value to savedValue, clears dirty flag,
         * updates isModified based on default.
         *
         * @param {String} sectionCode
         * @param {String} fieldCode
         */
        markFieldAsSaved: function(sectionCode, fieldCode) {
            var key = sectionCode + '.' + fieldCode;
            var state = this.values[key];

            if (!state) {
                log.warn('PanelState.markFieldAsSaved: Field not found: ' + key);
                return;
            }

            state.savedValue = state.value;
            state.isDirty = false;
            state.isModified = (state.value !== state.defaultValue);

            log.info('PanelState.markFieldAsSaved: ' + key + ' savedValue=' + state.savedValue + ' isModified=' + state.isModified);
        },

        /**
         * Get draft value for field (savedValue)
         * 
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {*} Draft value or undefined
         */
        getDraftValue: function(sectionCode, fieldCode) {
            var key = sectionCode + '.' + fieldCode;
            var state = this.values[key];
            
            return state ? state.savedValue : undefined;
        },

        /**
         * Clear all state
         */
        clear:  function() {
            this.config = null;
            this.values = {};
            this.fieldsMap = {};
            this.listeners = [];
            log.info('State cleared');
        },

        /**
         * Add event listener
         * 
         * @param {Function} callback - Called with (eventType, data)
         */
        addListener: function(callback) {
            log.debug('addListener called, total listeners: ' + (this.listeners.length + 1));
            this.listeners.push(callback);
        },

        /**
         * Remove event listener
         * 
         * @param {Function} callback
         */
        removeListener: function(callback) {
            var index = this.listeners.indexOf(callback);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
        },

        /**
         * Notify all listeners
         * 
         * @param {String} eventType - Event type (e.g., 'field-reset')
         * @param {Object} data - Event data
         */
        notifyListeners: function(eventType, data) {
            log.debug('notifyListeners called: ' + eventType + ' listeners count: ' + this.listeners.length);
            log.debug('Event data: ' + JSON.stringify(data));
            
            this.listeners.forEach(function(callback) {
                try {
                    callback(eventType, data);
                } catch (err) {
                    log.error('Listener error: ' + err);
                }
            });
        }
    };

    return PanelState;
});
