define([], function() {
    'use strict';

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
         * Initialize state with config
         *
         * @param {Object} config - Theme config from GraphQL
         */
        init: function(config) {
            this.config = config;
            this.values = {};
            this.fieldsMap = {};

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

            console.log('📊 State initialized:', Object. keys(this.values).length, 'values');
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
            return this. fieldsMap[key] || null;
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

            if (!state) {
                console.warn('⚠️ Field not found:', key);
                return;
            }

            // Update value
            state.value = newValue;

            // Mark as dirty if different from saved value
            state.isDirty = (newValue !== state.savedValue);

            console.log('📝 Value updated:', {
                key: key,
                value: newValue,
                savedValue: state.savedValue,
                isDirty: state.isDirty,
                isModified: state. isModified
            });
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
                    fieldCode: change. fieldCode,
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

            console.log('↺ All dirty changes reset to saved values');
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
                        state. value = state.savedValue;
                        state.isDirty = false;
                        resetCount++;
                    }
                }
            }.bind(this));

            console.log('↺ Section reset:', sectionCode, '(' + resetCount + ' fields)');
        },

        /**
         * Reset to defaults (all fields)
         */
        resetToDefaults: function() {
            Object.keys(this. values).forEach(function(key) {
                var state = this. values[key];
                state.value = state.defaultValue;
                state.isDirty = (state.defaultValue !== state.savedValue);
            }.bind(this));

            console.log('↺ All fields reset to defaults');
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

            console.log('✅ All changes marked as saved');
        },

        /**
         * Clear all state
         */
        clear:  function() {
            this.config = null;
            this.values = {};
            this.fieldsMap = {};
            console. log('🗑️ State cleared');
        }
    };

    return PanelState;
});
