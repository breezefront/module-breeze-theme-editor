define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/color',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/text',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/number',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/range',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/select',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/toggle',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/textarea',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/font-picker',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/color-scheme',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/code',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/icon-set-picker',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/social-links',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/image-upload',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/spacing',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/repeater',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function(
    BaseFieldRenderer,
    ColorRenderer,
    TextRenderer,
    NumberRenderer,
    RangeRenderer,
    SelectRenderer,
    ToggleRenderer,
    TextareaRenderer,
    FontPickerRenderer,
    ColorSchemeRenderer,
    CodeRenderer,
    IconSetPickerRenderer,
    SocialLinksRenderer,
    ImageUploadRenderer,
    SpacingRenderer,
    RepeaterRenderer,
    Logger
) {
    'use strict';

    var log = Logger.for('panel/field-renderer');

    /**
     * Field Renderer - Main Orchestrator
     * Routes field types to appropriate renderers
     */
    var FieldRenderer = {
        /**
         * Renderer registry
         */
        renderers: {
            'COLOR': ColorRenderer,
            'TEXT': TextRenderer,
            'NUMBER': NumberRenderer,
            'RANGE': RangeRenderer,
            'SELECT': SelectRenderer,
            'TOGGLE': ToggleRenderer,
            'CHECKBOX': ToggleRenderer,
            'TEXTAREA': TextareaRenderer,
            'FONT_PICKER': FontPickerRenderer,
            'COLOR_SCHEME':  ColorSchemeRenderer,
            'CODE': CodeRenderer,
            'ICON_SET_PICKER':  IconSetPickerRenderer,
            'SOCIAL_LINKS': SocialLinksRenderer,
            'IMAGE_UPLOAD': ImageUploadRenderer,
            'SPACING': SpacingRenderer,
            'REPEATER': RepeaterRenderer
        },

        /**
         * Register custom renderer
         *
         * @param {String} type
         * @param {Object} renderer
         */
        register: function(type, renderer) {
            this.renderers[type] = renderer;
            log.debug('Registered custom renderer: ' + type);
        },

        /**
         * Render single field
         *
         * @param {Object} field - Field config from GraphQL
         * @param {String} sectionCode
         * @returns {String} HTML
         */
        render: function(field, sectionCode) {
            // Validate field structure
            if (!field.code) {
                log.error('Field missing "code" property');
            }
            if (!field.type) {
                log.error('Field missing "type" property');
            }

            var renderer = this.renderers[field.type];

            if (!renderer) {
                log.warn('No renderer for field type: ' + field.type + ' - Using fallback');
                return this._renderUnsupported(field, sectionCode);
            }

            try {
                return renderer.render(field, sectionCode);
            } catch (e) {
                log.error('Failed to render field: ' + (field.code || 'unknown') + ' ' + e);
                log.error('Field data: ' + JSON.stringify(field));
                return this._renderError(field, sectionCode, e);
            }
        },

        /**
         * Render section with all fields
         *
         * @param {Object} section - Section config from GraphQL
         * @returns {String} HTML
         */
        renderSection: function(section) {
            var self = this;
            var html = '<div class="bte-accordion-content" data-section="' + section.code + '">';

            log.debug('Rendering section: ' + section.code + ' with ' + section.fields.length + ' fields');

            section.fields.forEach(function(field) {
                // Validate each field
                if (!field.code) {
                    log.error('Field missing code in section: ' + section.code);
                }

                html += '<div class="bte-field-wrapper" data-field="' + (field.code || 'unknown') + '">';
                html += self.render(field, section.code);
                html += '</div>';
            });

            html += '</div>';

            log.debug('Rendered section: ' + section.code + ' (' + section.fields.length + ' fields)');
            return html;
        },

        /**
         * Render unsupported field type
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {String}
         */
        _renderUnsupported:  function(field, sectionCode) {
            var fieldCode = field.code || 'unknown';
            var fieldLabel = field.label || 'Unnamed Field';
            var fieldType = field.type || 'unknown';
            var fieldDescription = field.description || '';

            return '<div class="bte-field-group bte-field-unsupported" ' +
                'data-section="' + sectionCode + '" ' +
                'data-field="' + fieldCode + '">' +
                '<label class="bte-field-label">' + fieldLabel + '</label>' +
                '<div class="bte-field-message bte-warning">' +
                '<span class="bte-icon">⚠️</span>' +
                'Field type "<strong>' + fieldType + '</strong>" is not yet supported.' +
                '</div>' +
                (fieldDescription ? '<p class="bte-field-description">' + fieldDescription + '</p>' : '') +
                '</div>';
        },

        /**
         * Render error placeholder
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @param {Error} error
         * @returns {String}
         */
        _renderError:  function(field, sectionCode, error) {
            var fieldCode = field.code || 'unknown';
            var fieldLabel = field.label || 'Unnamed Field';
            var errorMessage = error.message || 'Unknown error';

            return '<div class="bte-field-group bte-field-error" ' +
                'data-section="' + sectionCode + '" ' +
                'data-field="' + fieldCode + '">' +
                '<label class="bte-field-label">' + fieldLabel + '</label>' +
                '<div class="bte-field-message bte-error">' +
                '<span class="bte-icon">❌</span>' +
                'Failed to render field: ' + errorMessage +
                '</div>' +
                '</div>';
        }
    };

    return FieldRenderer;
});
