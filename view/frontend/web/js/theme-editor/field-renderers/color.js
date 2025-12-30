define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/color.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var ColorRenderer = Object.create(BaseFieldRenderer);
    ColorRenderer.templateString = template;

    ColorRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Ensure value is a valid HEX string (do not override 0/false)
        if (typeof data.value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(data.value)) {
            if (typeof data.default === 'string' && /^#[0-9A-Fa-f]{6}$/.test(data.default)) {
                data.value = data.default;
            } else {
                data.value = '#000000';
            }
        }

        return data;
    };

    return ColorRenderer;
});
