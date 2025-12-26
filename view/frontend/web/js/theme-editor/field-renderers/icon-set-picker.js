define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/icon-set-picker.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var IconSetPickerRenderer = Object.create(BaseFieldRenderer);
    IconSetPickerRenderer.templateString = template;

    IconSetPickerRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Default icon sets
        var iconSets = data.params.options || [
            {
                value: 'material',
                label: 'Material Icons',
                preview: '★',
                description: 'Google Material Design icons'
            },
            {
                value: 'fontawesome',
                label: 'Font Awesome',
                preview: '',
                description: 'Font Awesome icon library'
            },
            {
                value: 'feather',
                label: 'Feather Icons',
                preview: '⚡',
                description: 'Simple and clean icons'
            }
        ];

        data.iconSets = iconSets.map(function(set) {
            return {
                value: set.value,
                label: set.label,
                preview: set.preview,
                description: set.description,
                checked: set.value === data.value,
                active: set.value === data.value
            };
        });

        return data;
    };

    return IconSetPickerRenderer;
});
