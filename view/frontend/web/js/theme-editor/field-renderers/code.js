define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/code-editor.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var CodeRenderer = Object.create(BaseFieldRenderer);
    CodeRenderer.templateString = template;

    CodeRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Ensure value is string (fix: avoid value=0 or false being replaced by default)
        if (data.value === undefined || data.value === null) {
            data.value = data.default || '';
        } else {
            data.value = String(data.value);
        }

        return data;
    };

    return CodeRenderer;
});
