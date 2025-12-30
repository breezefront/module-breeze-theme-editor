define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/select.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var SelectRenderer = Object.create(BaseFieldRenderer);
    SelectRenderer.templateString = template;

    /**
     * Prepare select-specific data
     */
    SelectRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Get options from params
        var options = data.params && data.params.options ?  data.params.options : [];

        // Map options with selected flag
        data.options = options.map(function(opt) {
            return {
                value: opt.value,
                label: opt.label,
                icon: opt.icon || null,
                selected: String(opt.value) === String(data.value)
            };
        });

        data.hasOptions = data.options.length > 0;

        // If no value set, use first option or default
        if (!data.value && data.options.length > 0) {
            data.value = data.default || data.options[0].value;
        }

        return data;
    };

    return SelectRenderer;
});
