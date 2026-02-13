define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/font-picker.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var FontPickerRenderer = Object.create(BaseFieldRenderer);
    FontPickerRenderer.templateString = template;

    /**
     * Prepare font picker data
     */
    FontPickerRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Default font list
        var fonts = data.params.options || [
            { value: 'system-ui, -apple-system, sans-serif', label: 'System UI' },
            { value: 'Arial, sans-serif', label:  'Arial' },
            { value: 'Helvetica, sans-serif', label: 'Helvetica' },
            { value: '"Times New Roman", serif', label: 'Times New Roman' },
            { value: 'Georgia, serif', label: 'Georgia' },
            { value: 'Verdana, sans-serif', label: 'Verdana' },
            { value: '"Courier New", monospace', label: 'Courier New' },
            { value: '"Open Sans", sans-serif', label:  'Open Sans' },
            { value: 'Roboto, sans-serif', label:  'Roboto' },
            { value: 'Lato, sans-serif', label:  'Lato' },
            { value: 'Montserrat, sans-serif', label: 'Montserrat' },
            { value: 'Poppins, sans-serif', label: 'Poppins' }
        ];

        data.fonts = fonts.map(function(font) {
            return {
                value: font.value,
                label: font.label,
                selected: font.value === data.value,
                fontFamily: font.value
            };
        });

        return data;
    };

    return FontPickerRenderer;
});
