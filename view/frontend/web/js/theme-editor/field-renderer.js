define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/color-picker.html',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/range-slider.html',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/select.html',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/text-input.html',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/textarea.html',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/toggle.html'
], function(
    $,
    mageTemplate,
    colorPickerTpl,
    rangeSliderTpl,
    selectTpl,
    textInputTpl,
    textareaTpl,
    toggleTpl
) {
    'use strict';

    /**
     * Field renderer
     * Dynamically renders field UI based on type
     */
    var FieldRenderer = {
        /**
         * Templates cache
         */
        templates: {},

        /**
         * Initialize templates
         */
        init: function() {
            this.templates = {
                COLOR:  mageTemplate(colorPickerTpl),
                RANGE: mageTemplate(rangeSliderTpl),
                NUMBER: mageTemplate(rangeSliderTpl), // Same as RANGE
                SELECT: mageTemplate(selectTpl),
                TEXT:  mageTemplate(textInputTpl),
                TEXTAREA: mageTemplate(textareaTpl),
                TOGGLE: mageTemplate(toggleTpl),
                CHECKBOX: mageTemplate(toggleTpl) // Same as TOGGLE
            };
        },

        /**
         * Render field HTML
         *
         * @param {Object} field - Field config from GraphQL
         * @param {String} sectionCode
         * @returns {String} HTML
         */
        render: function(field, sectionCode) {
            var template = this.templates[field.type];

            if (!template) {
                console.warn('No template for field type:', field.type);
                return this._renderUnsupported(field, sectionCode);
            }

            var data = this._prepareFieldData(field, sectionCode);

            try {
                return template({ data: data });
            } catch (e) {
                console.error('Failed to render field:', field.code, e);
                return this._renderError(field, sectionCode);
            }
        },

        /**
         * Render section with fields
         *
         * @param {Object} section - Section config from GraphQL
         * @returns {String} HTML
         */
        renderSection: function(section) {
            var html = '<div class="bte-accordion-content" data-section="' + section.code + '">';

            section.fields.forEach(function(field) {
                html += '<div class="bte-field-wrapper" data-field="' + field.code + '">';
                html += this.render(field, section.code);
                html += '</div>';
            }.bind(this));

            html += '</div>';
            return html;
        },

        /**
         * Prepare field data for template
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {Object}
         */
        _prepareFieldData: function(field, sectionCode) {
            var value = field.value || field.default || '';
            var params = field.params || {};

            return {
                sectionCode: sectionCode,
                fieldCode: field.code,
                label: field.label,
                description: field.description || '',
                helpText: field.helpText || '',
                value: value,
                default: field.default || '',
                cssVar: field.cssVar || '',
                placeholder: field.placeholder || '',
                required: field.required || false,
                isModified: field.isModified || false,
                validation: field.validation || {},
                min: params.min || 0,
                max: params.max || 100,
                step: params.step || 1,
                unit: params.unit || '',
                options: params.options || [],
                language: params.language || 'css',
                hasOptions: params.options && params.options.length > 0,
                showValue: field.type === 'RANGE' || field.type === 'NUMBER',
                dataAttributes: this._buildDataAttributes(field, sectionCode)
            };
        },

        /**
         * Build data attributes string
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {String}
         */
        _buildDataAttributes: function(field, sectionCode) {
            var attrs = [];

            attrs.push('data-section="' + sectionCode + '"');
            attrs.push('data-field="' + field.code + '"');
            attrs.push('data-type="' + field.type + '"');

            if (field.cssVar) {
                attrs.push('data-css-var="' + field.cssVar + '"');
            }

            if (field.validation) {
                if (field.validation.min !== undefined) {
                    attrs.push('data-min="' + field.validation.min + '"');
                }
                if (field.validation.max !== undefined) {
                    attrs.push('data-max="' + field.validation.max + '"');
                }
                if (field.validation.pattern) {
                    attrs.push('data-pattern="' + field.validation.pattern + '"');
                }
            }

            return attrs.join(' ');
        },

        /**
         * Render unsupported field type
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {String}
         */
        _renderUnsupported: function(field, sectionCode) {
            return '<div class="bte-field bte-field-unsupported" data-section="' + sectionCode + '" data-field="' + field.code + '">' +
                '<label>' + field.label + '</label>' +
                '<div class="bte-field-message">Field type "' + field.type + '" is not supported yet</div>' +
                '</div>';
        },

        /**
         * Render error placeholder
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {String}
         */
        _renderError: function(field, sectionCode) {
            return '<div class="bte-field bte-field-error" data-section="' + sectionCode + '" data-field="' + field.code + '">' +
                '<label>' + field.label + '</label>' +
                '<div class="bte-field-message bte-error">Failed to render field</div>' +
                '</div>';
        }
    };

    // Initialize templates
    FieldRenderer.init();

    return FieldRenderer;
});
