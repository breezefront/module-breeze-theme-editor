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
        _compiledTemplate: null,

        /**
         * Get compiled template
         *
         * @returns {Function}
         */
        getTemplate: function() {
            if (! this._compiledTemplate && this.templateString) {
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

            if (! template) {
                console.error('No template for renderer:', this);
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
            return {
                sectionCode: sectionCode,
                code: field.code,
                label: field.label,
                description: field.description || '',
                helpText: field.helpText || '',
                value: field.value !== null ? field.value : field.default,
                default: field.default,
                cssVar: field.cssVar || '',
                placeholder: field.placeholder || '',
                required: field.required || false,
                isModified: field.isModified || false,
                validation: field.validation || {},
                params: field.params || {},
                // Template helpers
                dataAttrs: this.buildDataAttributes(field, sectionCode),
                fieldId: 'field-' + field.code,
                hasDescription: !!field.description,
                hasHelpText: !!field.helpText
            };
        },

        /**
         * Build data attributes string
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {String}
         */
        buildDataAttributes:  function(field, sectionCode) {
            var attrs = [
                'data-section="' + sectionCode + '"',
                'data-field="' + field.code + '"',
                'data-type="' + field.type + '"'
            ];

            if (field.cssVar) {
                attrs.push('data-css-var="' + field.cssVar + '"');
            }

            return attrs.join(' ');
        }
    };

    return BaseFieldRenderer;
});
