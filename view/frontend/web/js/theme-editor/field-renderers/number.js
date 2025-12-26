define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/number-input.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var NumberRenderer = Object.create(BaseFieldRenderer);
    NumberRenderer.templateString = template;

    NumberRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Ensure numeric value
        if (data.value !== null && data.value !== '') {
            data.value = Number(data.value);
        }

        return data;
    };

    return NumberRenderer;
});
