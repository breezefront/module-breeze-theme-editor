define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/range-slider.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var RangeRenderer = Object.create(BaseFieldRenderer);
    RangeRenderer.templateString = template;

    /**
     * Prepare range-specific data
     */
    RangeRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Range params
        data.min = data.params.min !== null ? data.params.min :  0;
        data.max = data.params.max !== null ? data.params.max : 100;
        data.step = data.params.step || 1;
        data.unit = data.params.unit || '';

        // Ensure value is within range
        if (data.value === null || data.value === '') {
            data.value = data.default !== null ? data.default : data.min;
        }

        data.value = Math.max(data.min, Math.min(data.max, Number(data.value)));
        data.displayValue = data.value + data.unit;

        return data;
    };

    return RangeRenderer;
});
