define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/color.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/color-utils',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function(BaseFieldRenderer, template, ColorUtils, Logger, PaletteManager, Constants) {
    'use strict';

    var log = Logger.for('panel/field-renderers/color');

    var ColorRenderer = Object.create(BaseFieldRenderer);
    ColorRenderer.templateString = template;

    ColorRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        var value = field.value;
        
        // Check if value is a palette reference (--color-brand-*)
        if (typeof value === 'string' && value.startsWith(Constants.CSS_VAR_PREFIXES.COLOR)) {
            // This is a palette reference - resolve via PaletteManager mapping
            data.paletteRef = value;
            data.value = this._getPaletteHexFromMapping(value, data.default);
            data.hexValue = data.value;
            log.debug('Resolved palette reference: ' + value + ' \u2192 ' + data.value);
        } else {
            // Regular HEX color or RGB fallback
            if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) {
                // Value is not HEX - check if it's RGB
                if (ColorUtils.isRgbColor(value)) {
                    data.value = ColorUtils.rgbToHex(value);
                    log.debug('Converted RGB to HEX: ' + value + ' \u2192 ' + data.value);
                } else if (typeof data.default === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(data.default)) {
                    // Try default as HEX
                    data.value = data.default;
                } else if (ColorUtils.isRgbColor(data.default)) {
                    // Try default as RGB
                    data.value = ColorUtils.rgbToHex(data.default);
                    log.debug('Using default RGB as HEX: ' + data.default + ' \u2192 ' + data.value);
                } else {
                    // Ultimate fallback
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
        if (!PaletteManager || !PaletteManager.palettes) {
            log.warn('PaletteManager not initialized');
            return fallbackDefault || '#000000';
        }

        // Look up in flat index: PaletteManager.palettes['--color-brand-amber-dark']
        var color = PaletteManager.palettes[paletteRef];

        if (!color) {
            log.warn('Palette color not found: ' + paletteRef + ' - using fallback: ' + (fallbackDefault || '#000000'));
            return fallbackDefault || '#000000';
        }

        // Return HEX value (already in HEX format in Breeze 3.0)
        if (color.hex) {
            log.debug('Resolved palette ref: ' + paletteRef + ' \u2192 ' + color.hex);
            return color.hex;
        }

        // Fallback to value (also HEX in Breeze 3.0)
        if (color.value) {
            log.debug('Using palette value: ' + paletteRef + ' \u2192 ' + color.value);
            return color.value;
        }

        // Fallback to default if available
        if (color.default && color.default.startsWith('#')) {
            log.debug('Using palette default: ' + paletteRef + ' \u2192 ' + color.default);
            return color.default;
        }

        log.warn('No valid color value found for: ' + paletteRef);
        return fallbackDefault || '#000000';
    };

    return ColorRenderer;
});
