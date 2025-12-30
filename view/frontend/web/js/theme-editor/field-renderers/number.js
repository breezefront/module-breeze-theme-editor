define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/number.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var NumberRenderer = Object.create(BaseFieldRenderer);
    NumberRenderer.templateString = template;

    NumberRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Ensure numeric value
        if (data.value !== null && data.value !== '' && data.value !== undefined) {
            data.value = Number(data.value);
        } else if (data.default !== null && data.default !== undefined) {
            data.value = Number(data.default);
        } else {
            data.value = data.params && data.params.min !== undefined ?  data.params.min : 0;
        }

        // Validate min/max
        if (data.params) {
            if (data.params.min !== undefined && data.value < data.params.min) {
                data.value = data.params.min;
            }
            if (data.params.max !== undefined && data.value > data.params.max) {
                data.value = data.params.max;
            }
        }

        return data;
    };

    return NumberRenderer;
});
