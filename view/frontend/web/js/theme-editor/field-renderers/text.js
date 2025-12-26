define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/text-input.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var TextRenderer = Object.create(BaseFieldRenderer);
    TextRenderer.templateString = template;

    // No custom prepareData needed - uses base class logic

    return TextRenderer;
});
