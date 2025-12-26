define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/textarea.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var TextareaRenderer = Object.create(BaseFieldRenderer);
    TextareaRenderer.templateString = template;

    // No custom prepareData needed - uses base class logic

    return TextareaRenderer;
});
