define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/color-scheme.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var ColorSchemeRenderer = Object.create(BaseFieldRenderer);
    ColorSchemeRenderer.templateString = template;

    ColorSchemeRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Default schemes
        var schemes = data.params.schemes || [
            {
                value: 'light',
                label: 'Light',
                colors: ['#ffffff', '#f5f5f5', '#e0e0e0'],
                description: 'Light color scheme'
            },
            {
                value: 'dark',
                label: 'Dark',
                colors: ['#1a1a1a', '#2d2d2d', '#404040'],
                description: 'Dark color scheme'
            },
            {
                value: 'auto',
                label: 'Auto',
                colors: ['#ffffff', '#1a1a1a', '#666666'],
                description: 'Automatic based on system'
            }
        ];

        data.schemes = schemes.map(function(scheme) {
            return {
                value:  scheme.value,
                label: scheme.label,
                colors: scheme.colors,
                description: scheme.description,
                checked: scheme.value === data.value,
                active: scheme.value === data.value
            };
        });

        return data;
    };

    return ColorSchemeRenderer;
});
