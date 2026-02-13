define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/number.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var NumberRenderer = Object.create(BaseFieldRenderer);
    NumberRenderer.templateString = template;

    NumberRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Get unit from params
        var unit = data.params && data.params.unit ? data.params.unit : '';

        // Parse value if it contains unit (e.g., "16px" -> 16)
        var numericValue = data.value;
        if (numericValue !== null && numericValue !== '' && numericValue !== undefined) {
            if (typeof numericValue === 'string' && unit) {
                // Remove unit from value if present
                numericValue = numericValue.replace(unit, '').trim();
            }
            numericValue = Number(numericValue);
        } else if (data.default !== null && data.default !== undefined) {
            var defaultValue = data.default;
            if (typeof defaultValue === 'string' && unit) {
                defaultValue = defaultValue.replace(unit, '').trim();
            }
            numericValue = Number(defaultValue);
        } else {
            numericValue = data.params && data.params.min !== undefined ?  data.params.min : 0;
        }

        // Validate min/max
        if (data.params) {
            if (data.params.min !== undefined && numericValue < data.params.min) {
                numericValue = data.params.min;
            }
            if (data.params.max !== undefined && numericValue > data.params.max) {
                numericValue = data.params.max;
            }
        }

        data.value = numericValue;

        return data;
    };

    return NumberRenderer;
});
