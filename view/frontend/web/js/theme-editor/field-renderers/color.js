define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/color-picker.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var ColorRenderer = Object.create(BaseFieldRenderer);
    ColorRenderer.templateString = template;

    /**
     * Prepare color-specific data
     */
    ColorRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Ensure value is valid hex color
        data.value = data.value || data.default || '#000000';

        // Validate hex format
        if (!/^#[0-9A-F]{6}$/i.test(data.value)) {
            console.warn('Invalid color value:', data.value, '- using default');
            data.value = '#000000';
        }

        return data;
    };

    return ColorRenderer;
});
