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

        // Default font list — web-safe fonts only, no external loading required
        var fonts = data.params.options || [
            { value: 'system-ui, -apple-system, sans-serif',     label: 'System UI' },
            { value: 'Arial, sans-serif',                        label: 'Arial' },
            { value: 'Helvetica, sans-serif',                    label: 'Helvetica' },
            { value: 'Tahoma, sans-serif',                       label: 'Tahoma' },
            { value: "'Trebuchet MS', sans-serif",               label: 'Trebuchet MS' },
            { value: 'Verdana, sans-serif',                      label: 'Verdana' },
            { value: "'Times New Roman', serif",                 label: 'Times New Roman' },
            { value: 'Georgia, serif',                           label: 'Georgia' },
            { value: "'Palatino Linotype', 'Book Antiqua', serif", label: 'Palatino' },
            { value: 'Garamond, serif',                          label: 'Garamond' },
            { value: "'Courier New', monospace",                 label: 'Courier New' },
            { value: "'Lucida Console', monospace",              label: 'Lucida Console' }
        ];

        data.fonts = fonts.map(function(font) {
            return {
                value: font.value,
                label: font.label,
                selected: font.value === data.value,
                fontFamily: font.value
            };
        });

        // Label shown in the trigger button
        var selectedFont = data.fonts.find(function(f) { return f.selected; });
        data.selectedLabel = selectedFont ? selectedFont.label : (data.value || data.default || '');

        // Build a value → URL map for options that require loading an external stylesheet
        data.fontStylesheetMap = {};
        (data.params.fontStylesheets || []).forEach(function(s) {
            data.fontStylesheetMap[s.value] = s.url;
        });

        return data;
    };

    return FontPickerRenderer;
});
