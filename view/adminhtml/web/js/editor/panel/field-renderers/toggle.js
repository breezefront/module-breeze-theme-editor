define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/toggle.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var ToggleRenderer = Object.create(BaseFieldRenderer);
    ToggleRenderer.templateString = template;

    /**
     * Prepare toggle-specific data
     */
    ToggleRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Convert value to boolean
        var value = data.value !== null ? data.value : data.default;
        data.checked = value === true || value === 'true' || value === '1' || value === 1;

        return data;
    };

    return ToggleRenderer;
});
