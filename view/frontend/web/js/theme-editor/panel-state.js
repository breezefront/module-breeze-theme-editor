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
         * Current values {sectionCode.fieldCode: value}
         */
        values: {},

        /**
         * Changed values {sectionCode.fieldCode: {old, new}}
         */
        changes: {},

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
            this.changes = {};
            this.fieldsMap = {};

            // Build values map and fields lookup
            if (config && config.sections) {
                config.sections.forEach(function(section) {
                    section.fields.forEach(function(field) {
                        var key = section.code + '.' + field.code;

                        // Store current value
                        this.values[key] = field.value || field.default;

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

            console.log('📊 State initialized:', Object.keys(this.values).length, 'values');
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
         * Get current value
         *
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {String|null}
         */
        getValue: function(sectionCode, fieldCode) {
            var key = sectionCode + '.' + fieldCode;
            return this.values[key] !== undefined ? this.values[key] : null;
        },

        /**
         * Set value and track change
         *
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @param {String} newValue
         */
        setValue: function(sectionCode, fieldCode, newValue) {
            var key = sectionCode + '.' + fieldCode;
            var oldValue = this.values[key];
            var field = this.fieldsMap[key];

            if (!field) {
                console.warn('Field not found:', key);
                return;
            }

            // Update value
            this.values[key] = newValue;

            // Track change
            var defaultValue = field.default;

            if (newValue !== defaultValue) {
                // Value is different from default
                this.changes[key] = {
                    sectionCode: sectionCode,
                    fieldCode: fieldCode,
                    oldValue: oldValue,
                    newValue: newValue,
                    cssVar: field.cssVar
                };
            } else {
                // Value restored to default - remove from changes
                delete this.changes[key];
            }

            console.log('📝 Value updated:', key, '=', newValue, '(changes:', Object.keys(this.changes).length, ')');
        },

        /**
         * Get all changes
         *
         * @returns {Object} - {key: {sectionCode, fieldCode, oldValue, newValue}}
         */
        getChanges: function() {
            return this.changes;
        },

        /**
         * Get changes formatted for GraphQL mutation
         *
         * @returns {Array} - [{sectionCode, fieldCode, value}]
         */
        getChangesForSave: function() {
            var result = [];

            Object.keys(this.changes).forEach(function(key) {
                var change = this.changes[key];
                result.push({
                    sectionCode: change.sectionCode,
                    fieldCode: change.fieldCode,
                    value: change.newValue
                });
            }.bind(this));

            return result;
        },

        /**
         * Check if there are unsaved changes
         *
         * @returns {Boolean}
         */
        hasChanges: function() {
            return Object.keys(this.changes).length > 0;
        },

        /**
         * Get changes count
         *
         * @returns {Number}
         */
        getChangesCount: function() {
            return Object.keys(this.changes).length;
        },

        /**
         * Reset all changes to defaults
         */
        reset: function() {
            var self = this;

            Object.keys(this.changes).forEach(function(key) {
                var field = self.fieldsMap[key];
                if (field) {
                    self.values[key] = field.default;
                }
            });

            this.changes = {};
            console.log('↺ State reset to defaults');
        },

        /**
         * Reset specific section
         *
         * @param {String} sectionCode
         */
        resetSection: function(sectionCode) {
            var self = this;
            var resetCount = 0;

            Object.keys(this.changes).forEach(function(key) {
                if (key.startsWith(sectionCode + '.')) {
                    var field = self.fieldsMap[key];
                    if (field) {
                        self.values[key] = field.default;
                        delete self.changes[key];
                        resetCount++;
                    }
                }
            });

            console.log('↺ Section reset:', sectionCode, '(' + resetCount + ' fields)');
        },

        /**
         * Mark changes as saved (clear changes but keep values)
         */
        markAsSaved: function() {
            this.changes = {};
            console.log('✅ Changes marked as saved');
        },

        /**
         * Clear all state
         */
        clear: function() {
            this.config = null;
            this.values = {};
            this.changes = {};
            this.fieldsMap = {};
            console.log('🗑️ State cleared');
        }
    };

    return PanelState;
});
