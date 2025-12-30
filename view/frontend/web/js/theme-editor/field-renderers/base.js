define([
    'mage/template'
], function(mageTemplate) {
    'use strict';

    /**
     * Base Field Renderer
     * All field renderers extend this class
     */
    var BaseFieldRenderer = {
        /**
         * Template (set in subclass via text!  plugin)
         */
        templateString: null,

        /**
         * Compiled template cache
         */
        _compiledTemplate:  null,

        /**
         * Get compiled template
         *
         * @returns {Function}
         */
        getTemplate: function() {
            if (!this._compiledTemplate && this.templateString) {
                this._compiledTemplate = mageTemplate(this.templateString);
            }
            return this._compiledTemplate;
        },

        /**
         * Render field HTML
         *
         * @param {Object} field - Field config from GraphQL
         * @param {String} sectionCode
         * @returns {String} HTML
         */
        render: function(field, sectionCode) {
            var data = this.prepareData(field, sectionCode);
            var template = this.getTemplate();

            if (!template) {
                console.error('❌ No template for renderer:', this);
                return '';
            }

            return template({ data: data });
        },

        /**
         * Prepare field data for template
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {Object}
         */
        prepareData: function(field, sectionCode) {
            // Validate required properties
            if (!field.code) {
                console.error('❌ Field missing "code" property:', field);
            }
            if (!sectionCode) {
                console.error('❌ Missing sectionCode for field:', field.code || 'unknown');
            }

            var fieldCode = field.code || 'unknown';

            return {
                sectionCode: sectionCode,
                code: fieldCode,
                label: field.label || 'Unnamed Field',
                description: field.description || '',
                helpText: field.helpText || '',
                value: field.value !== undefined && field.value !== null ? field.value : field.default,
                default: field.default,
                cssVar: field.cssVar || '',
                placeholder: field.placeholder || '',
                required: !!field.required,
                isModified: !!field.isModified,
                validation: field.validation || {},
                params: field.params || {},
                fieldId: 'field-' + fieldCode
            };
        },

        /**
         * Build data attributes string
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {String}
         */
        buildDataAttributes: function(field, sectionCode) {
            var fieldCode = field.code || 'unknown';

            var attrs = [
                'data-section="' + sectionCode + '"',
                'data-field="' + fieldCode + '"',
                'data-type="' + (field.type || 'unknown') + '"'
            ];

            if (field.cssVar) {
                attrs.push('data-css-var="' + field.cssVar + '"');
            }

            return attrs.join(' ');
        }
    };

    return BaseFieldRenderer;
});
