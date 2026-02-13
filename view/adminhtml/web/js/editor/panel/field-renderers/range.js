define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/range.html'
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
        data.min = data.params.min !== undefined ? data.params.min :  0;
        data.max = data.params.max !== undefined ? data.params.max : 100;
        data.step = data.params.step || 1;
        data.unit = data.params.unit || '';

        // Parse value if it contains unit (e.g., "16px" -> 16)
        var numericValue = data.value;
        if (typeof numericValue === 'string' && data.unit) {
            // Remove unit from value if present
            numericValue = numericValue.replace(data.unit, '').trim();
        }

        // Ensure value is within range
        if (numericValue === null || numericValue === '') {
            numericValue = data.default !== null ? data.default : data.min;
        }

        // Parse default value too
        if (typeof numericValue === 'string' && data.unit) {
            numericValue = numericValue.replace(data.unit, '').trim();
        }

        data.value = Math.max(data.min, Math.min(data.max, Number(numericValue)));
        data.displayValue = data.value + data.unit;

        // ✅ Add fieldCode for backward compatibility (if needed)
        data.fieldCode = data.code;

        return data;
    };

    return RangeRenderer;
});
