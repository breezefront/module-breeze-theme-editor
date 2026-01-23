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
            // This is a palette reference
            data.paletteRef = value;
            data.value = this._resolvePaletteColor(value, field.palette, field.default);
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
     * Resolve palette reference to actual HEX color
     * Uses multiple sources with fallback chain:
     * 1. CSS variables (live values from :root)
     * 2. PaletteManager config (GraphQL data)
     * 3. Field default value
     * 4. Black (#000000)
     * 
     * @param {String} paletteRef - CSS variable name (e.g., "--color-brand-amber-dark")
     * @param {String} paletteId - Palette ID from field config (e.g., "default")
     * @param {String} fallback - Fallback color if resolution fails
     * @returns {String} HEX color
     */
    ColorRenderer._resolvePaletteColor = function(paletteRef, paletteId, fallback) {
        // Strategy 1: Try CSS variables (most reliable for live values)
        var hexFromCss = this._resolvePaletteColorFromCss(paletteRef);
        if (hexFromCss && hexFromCss !== '#000000') {
            console.log('✅ Resolved from CSS:', paletteRef, '→', hexFromCss);
            return hexFromCss;
        }
        
        // Strategy 2: Try PaletteManager (GraphQL config)
        var hexFromConfig = this._resolvePaletteColorFromConfig(paletteRef, paletteId);
        if (hexFromConfig && hexFromConfig !== '#000000') {
            console.log('✅ Resolved from config:', paletteRef, '→', hexFromConfig);
            return hexFromConfig;
        }
        
        // Strategy 3: Use field default if it's a valid HEX
        if (fallback && /^#[0-9A-Fa-f]{6}$/.test(fallback)) {
            console.log('⚠️ Using fallback:', paletteRef, '→', fallback);
            return fallback;
        }
        
        // Strategy 4: Last resort - black
        console.warn('⚠️ Could not resolve palette color, using black:', paletteRef);
        return '#000000';
    };

    /**
     * Resolve palette color from CSS variables
     * @param {String} paletteRef - CSS variable name
     * @returns {String|null} HEX color or null
     */
    ColorRenderer._resolvePaletteColorFromCss = function(paletteRef) {
        try {
            var rootStyle = getComputedStyle(document.documentElement);
            var rgbValue = rootStyle.getPropertyValue(paletteRef).trim();
            
            if (rgbValue) {
                // CSS variable format: "234, 179, 8" → convert to HEX
                var parts = rgbValue.split(',').map(function(p) {
                    return parseInt(p.trim(), 10);
                });
                
                if (parts.length === 3 && parts.every(function(n) { 
                    return !isNaN(n) && n >= 0 && n <= 255; 
                })) {
                    return '#' + parts.map(function(n) {
                        return ('0' + n.toString(16)).slice(-2);
                    }).join('');
                }
            }
        } catch (e) {
            console.warn('⚠️ Error reading CSS variable:', paletteRef, e);
        }
        
        return null;
    };

    /**
     * Resolve palette color from PaletteManager config
     * @param {String} paletteRef - CSS variable name
     * @param {String} paletteId - Palette ID (optional)
     * @returns {String|null} HEX color or null
     */
    ColorRenderer._resolvePaletteColorFromConfig = function(paletteRef, paletteId) {
        // Check if require is available
        if (typeof require === 'undefined') {
            return null;
        }
        
        try {
            var PaletteManager = require('Swissup_BreezeThemeEditor/js/theme-editor/palette-manager');
            
            if (!PaletteManager || !PaletteManager.palettes) {
                console.warn('⚠️ PaletteManager not initialized');
                return null;
            }
            
            // Look up color in indexed palette
            var color = PaletteManager.palettes[paletteRef];
            
            if (color) {
                // Return current value or default as HEX
                if (color.hex) {
                    return color.hex;
                }
                
                // If stored as RGB, convert to HEX
                if (color.value) {
                    return PaletteManager.rgbToHex(color.value);
                }
                
                // Fallback to default
                if (color.default) {
                    return color.default.startsWith('#') 
                        ? color.default 
                        : PaletteManager.rgbToHex(color.default);
                }
            }
        } catch (e) {
            console.warn('⚠️ Error accessing PaletteManager:', e);
        }
        
        return null;
    };

    return ColorRenderer;
});
