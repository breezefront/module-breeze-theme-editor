define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/color.html'
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
            data.value = this._getPaletteHexFromMapping(value, data.default);
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

        // Pass format for RGB/HEX handling
        data.format = field.format || null;

        return data;
    };

    /**
     * Resolve palette reference to HEX color using PaletteManager's flat index
     * Simple and reliable - just looks up the color in the pre-built palette mapping
     * 
     * @param {String} paletteRef - CSS variable name (e.g., "--color-brand-amber-dark")
     * @param {String} fallbackDefault - Fallback value if palette ref not found (default: #000000)
     * @returns {String} HEX color (defaults to fallbackDefault or #000000 if not found)
     */
    ColorRenderer._getPaletteHexFromMapping = function(paletteRef, fallbackDefault) {
        // Check if require is available
        if (typeof require === 'undefined') {
            console.warn('⚠️ require not available for palette resolution');
            return fallbackDefault || '#000000';
        }
        
        try {
            var PaletteManager = require('Swissup_BreezeThemeEditor/js/editor/panel/palette-manager');
            
            if (!PaletteManager || !PaletteManager.palettes) {
                console.warn('⚠️ PaletteManager not initialized');
                return fallbackDefault || '#000000';
            }
            
            // Look up in flat index: PaletteManager.palettes['--color-brand-amber-dark']
            var color = PaletteManager.palettes[paletteRef];
            
            if (!color) {
                console.warn('⚠️ Palette color not found:', paletteRef, '- using fallback:', fallbackDefault || '#000000');
                return fallbackDefault || '#000000';
            }
            
            // Return HEX value (already in HEX format in Breeze 3.0)
            if (color.hex) {
                console.log('✅ Resolved palette ref:', paletteRef, '→', color.hex);
                return color.hex;
            }
            
            // Fallback to value (also HEX in Breeze 3.0)
            if (color.value) {
                console.log('✅ Using palette value:', paletteRef, '→', color.value);
                return color.value;
            }
            
            // Fallback to default if available
            if (color.default && color.default.startsWith('#')) {
                console.log('✅ Using palette default:', paletteRef, '→', color.default);
                return color.default;
            }
            
            console.warn('⚠️ No valid color value found for:', paletteRef);
            return fallbackDefault || '#000000';
            
        } catch (e) {
            console.error('❌ Error accessing PaletteManager:', e);
            return fallbackDefault || '#000000';
        }
    };

    return ColorRenderer;
});
