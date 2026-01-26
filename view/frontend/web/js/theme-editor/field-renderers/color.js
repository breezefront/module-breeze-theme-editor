define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/color.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var ColorRenderer = Object.create(BaseFieldRenderer);
    ColorRenderer.templateString = template;

    ColorRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        var value = field.value;
        
        // Check if value is a palette reference (--color-brand-*)
        if (typeof value === 'string' && value.startsWith('--color-')) {
            // This is a palette reference - resolve via PaletteManager mapping
            data.paletteRef = value;
            data.value = this._getPaletteHexFromMapping(value);
            data.hexValue = data.value;
            console.log('🎨 Resolved palette reference:', value, '→', data.value);
        } else {
            // Regular HEX color or fallback
            if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
                if (typeof data.default === 'string' && /^#[0-9A-Fa-f]{6}$/.test(data.default)) {
                    data.value = data.default;
                } else {
                    data.value = '#000000';
                }
            }
            data.hexValue = data.value;
        }

        // Pass palette configuration for Quick Select
        data.palette = field.palette || null;
        data.paletteId = field.palette || null;

        return data;
    };

    /**
     * Resolve palette reference to HEX color using PaletteManager's flat index
     * Simple and reliable - just looks up the color in the pre-built palette mapping
     * 
     * @param {String} paletteRef - CSS variable name (e.g., "--color-brand-amber-dark")
     * @returns {String} HEX color (defaults to #000000 if not found)
     */
    ColorRenderer._getPaletteHexFromMapping = function(paletteRef) {
        // Check if require is available
        if (typeof require === 'undefined') {
            console.warn('⚠️ require not available for palette resolution');
            return '#000000';
        }
        
        try {
            var PaletteManager = require('Swissup_BreezeThemeEditor/js/theme-editor/palette-manager');
            
            if (!PaletteManager || !PaletteManager.palettes) {
                console.warn('⚠️ PaletteManager not initialized');
                return '#000000';
            }
            
            // Look up in flat index: PaletteManager.palettes['--color-brand-amber-dark']
            var color = PaletteManager.palettes[paletteRef];
            
            if (!color) {
                console.warn('⚠️ Palette color not found:', paletteRef);
                return '#000000';
            }
            
            // Return HEX value (created in PaletteManager from rgbToHex conversion)
            if (color.hex) {
                console.log('✅ Resolved palette ref:', paletteRef, '→', color.hex);
                return color.hex;
            }
            
            // Fallback to default if hex not available
            if (color.default && color.default.startsWith('#')) {
                console.log('✅ Using palette default:', paletteRef, '→', color.default);
                return color.default;
            }
            
            // Last resort: convert RGB value to HEX
            if (color.value) {
                var hex = PaletteManager.rgbToHex(color.value);
                console.log('✅ Converted RGB to HEX:', paletteRef, '→', hex);
                return hex;
            }
            
            console.warn('⚠️ No valid color value found for:', paletteRef);
            return '#000000';
            
        } catch (e) {
            console.error('❌ Error accessing PaletteManager:', e);
            return '#000000';
        }
    };

    return ColorRenderer;
});
