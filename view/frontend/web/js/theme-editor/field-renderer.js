define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/color',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/text',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/number',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/range',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/select',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/toggle',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/textarea',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/font-picker',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/color-scheme',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/code',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/icon-set-picker',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/social-links'
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
    SocialLinksRenderer
) {
    'use strict';

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
            'CHECKBOX': ToggleRenderer, // Alias for TOGGLE
            'TEXTAREA': TextareaRenderer,
            'FONT_PICKER': FontPickerRenderer,
            'COLOR_SCHEME':  ColorSchemeRenderer,
            'CODE': CodeRenderer,
            'ICON_SET_PICKER':  IconSetPickerRenderer,
            'SOCIAL_LINKS': SocialLinksRenderer
        },

        /**
         * Register custom renderer
         *
         * @param {String} type
         * @param {Object} renderer
         */
        register: function(type, renderer) {
            this.renderers[type] = renderer;
            console.log('✅ Registered custom renderer:', type);
        },

        /**
         * Render single field
         *
         * @param {Object} field - Field config from GraphQL
         * @param {String} sectionCode
         * @returns {String} HTML
         */
        render: function(field, sectionCode) {
            var renderer = this.renderers[field.type];

            if (!renderer) {
                console.warn('⚠️ No renderer for field type:', field.type, '- Using fallback');
                return this._renderUnsupported(field, sectionCode);
            }

            try {
                return renderer.render(field, sectionCode);
            } catch (e) {
                console.error('❌ Failed to render field:', field.code, e);
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

            section.fields.forEach(function(field) {
                html += '<div class="bte-field-wrapper" data-field="' + field.code + '">';
                html += self.render(field, section.code);
                html += '</div>';
            });

            html += '</div>';

            console.log('📋 Rendered section:', section.code, '(' + section.fields.length + ' fields)');
            return html;
        },

        /**
         * Render unsupported field type
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {String}
         */
        _renderUnsupported: function(field, sectionCode) {
            return `
                <div class="bte-field-group bte-field-unsupported"
                     data-section="${sectionCode}"
                     data-field="${field.code}">
                    <label class="bte-field-label">${field.label}</label>
                    <div class="bte-field-message bte-warning">
                        <span class="bte-icon">⚠️</span>
                        Field type "<strong>${field.type}</strong>" is not yet supported.
                    </div>
                    ${field.description ? `<p class="bte-field-description">${field.description}</p>` : ''}
                </div>
            `;
        },

        /**
         * Render error placeholder
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @param {Error} error
         * @returns {String}
         */
        _renderError: function(field, sectionCode, error) {
            return `
                <div class="bte-field-group bte-field-error"
                     data-section="${sectionCode}"
                     data-field="${field.code}">
                    <label class="bte-field-label">${field.label}</label>
                    <div class="bte-field-message bte-error">
                        <span class="bte-icon">❌</span>
                        Failed to render field:  ${error.message}
                    </div>
                </div>
            `;
        }
    };

    return FieldRenderer;
});
