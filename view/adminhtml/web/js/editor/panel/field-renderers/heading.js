define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/heading.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var HeadingRenderer = Object.create(BaseFieldRenderer);
    HeadingRenderer.templateString = template;

    return HeadingRenderer;
});
