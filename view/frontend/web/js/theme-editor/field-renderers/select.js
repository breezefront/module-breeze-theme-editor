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

        // Options with selected flag
        data.options = (data.params.options || []).map(function(opt) {
            return {
                value: opt.value,
                label: opt.label,
                icon: opt.icon || null,
                selected: opt.value === data.value
            };
        });

        data.hasOptions = data.options.length > 0;

        return data;
    };

    return SelectRenderer;
});
