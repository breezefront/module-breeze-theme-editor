define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'Swissup_BreezeThemeEditor/js/editor/panel/font-palette-manager',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/font-picker.html'
], function(BaseFieldRenderer, FontPaletteManager, template) {
    'use strict';

    var FontPickerRenderer = Object.create(BaseFieldRenderer);
    FontPickerRenderer.templateString = template;

    /**
     * Prepare font picker data
     *
     * When the field has `fontPalette` set, the palette options list replaces
     * the inline `options`.  Consumer fields (property NOT in fonts[]) also get
     * role swatches at the top of the dropdown.  Role fields (property IS in
     * fonts[]) get only the options list so there is no self-referencing swatch.
     */
    FontPickerRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        var paletteId   = field.fontPalette || null;  // field, not data — base.prepareData does not copy fontPalette
        var palette     = paletteId ? FontPaletteManager.getPalette(paletteId) : null;
        var isRoleField = paletteId
            ? FontPaletteManager.isPaletteRole(paletteId, data.property)
            : false;

        // ---------------------------------------------------------------
        // Build font options list
        // ---------------------------------------------------------------
        var rawOptions;
        if (palette) {
            rawOptions = palette.options || [];
        } else {
            rawOptions = data.params.options || [
                { value: 'system-ui, -apple-system, sans-serif',       label: 'System UI' },
                { value: 'Arial, sans-serif',                          label: 'Arial' },
                { value: 'Helvetica, sans-serif',                      label: 'Helvetica' },
                { value: 'Tahoma, sans-serif',                         label: 'Tahoma' },
                { value: "'Trebuchet MS', sans-serif",                 label: 'Trebuchet MS' },
                { value: 'Verdana, sans-serif',                        label: 'Verdana' },
                { value: "'Times New Roman', serif",                   label: 'Times New Roman' },
                { value: 'Georgia, serif',                             label: 'Georgia' },
                { value: "'Palatino Linotype', 'Book Antiqua', serif", label: 'Palatino' },
                { value: 'Garamond, serif',                            label: 'Garamond' },
                { value: "'Courier New', monospace",                   label: 'Courier New' },
                { value: "'Lucida Console', monospace",                label: 'Lucida Console' }
            ];
        }

        data.fonts = rawOptions.map(function(font) {
            return {
                value:      font.value,
                label:      font.label,
                selected:   font.value === data.value,
                fontFamily: font.value
            };
        });

        // ---------------------------------------------------------------
        // Role swatches (consumer fields only)
        // ---------------------------------------------------------------
        if (palette && !isRoleField) {
            data.fontRoles = (palette.fonts || []).map(function(role) {
                // Use live current value (what the user has actually selected for this
                // role) so the swatch renders in the correct typeface on initial load.
                // Falls back to schema default when no current value has been set yet.
                var currentFont = FontPaletteManager.getCurrentValue(role.property);
                return {
                    id:         role.id,
                    label:      role.label,
                    property:   role.property,
                    default:    currentFont,
                    // isSelected when the stored value is the CSS-var reference
                    isSelected: data.value === role.property
                };
            });
        } else {
            data.fontRoles = [];
        }

        // ---------------------------------------------------------------
        // Determine trigger label
        // ---------------------------------------------------------------
        // Check role swatches first (value may be a CSS-var reference)
        var selectedRole = data.fontRoles.find(function(r) { return r.isSelected; });
        if (selectedRole) {
            data.selectedLabel    = selectedRole.label;
            data.selectedFontFamily = selectedRole.default;
        } else {
            var selectedFont = data.fonts.find(function(f) { return f.selected; });
            data.selectedLabel      = selectedFont ? selectedFont.label : (data.value || data.default || '');
            data.selectedFontFamily = data.value || data.default || '';
        }

        // ---------------------------------------------------------------
        // Build stylesheet map (value → URL) for external font loading
        // ---------------------------------------------------------------
        if (palette) {
            data.fontStylesheetMap = FontPaletteManager.getStylesheetMap(paletteId);
        } else {
            data.fontStylesheetMap = {};
            (data.params.fontStylesheets || []).forEach(function(s) {
                data.fontStylesheetMap[s.value] = s.url;
            });
        }

        return data;
    };

    return FontPickerRenderer;
});
