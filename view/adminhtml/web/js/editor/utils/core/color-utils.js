define([], function () {
    'use strict';

    /**
     * Color Utilities for Admin Area
     * 
     * Minimal utility for RGB↔HEX conversion in adminhtml color field renderer.
     * Based on frontend version but includes only the functions needed for admin.
     * 
     * @module Swissup_BreezeThemeEditor/js/editor/utils/core/color-utils
     */
    return {
        /**
         * Convert RGB string to HEX color format
         * 
         * Supports:
         * - With spaces: "25, 121, 195" → "#1979c3"
         * - Without spaces: "25,121,195" → "#1979c3"
         * - Extra whitespace: " 25 , 121 , 195 " → "#1979c3"
         * - rgb() wrapper: "rgb(25, 121, 195)" → "#1979c3"
         * 
         * @param {String} rgb - RGB format (e.g., "25, 121, 195" or "rgb(25, 121, 195)")
         * @returns {String} HEX color (e.g., "#1979c3")
         */
        rgbToHex: function(rgb) {
            if (!rgb) {
                return '#000000';
            }
            
            // Strip rgb() or rgba() wrapper if present
            var normalized = rgb.toString().trim().replace(/^rgba?\((.+)\)$/i, '$1');
            
            // Extract numbers using regex (handles any whitespace/format)
            var parts = normalized.match(/-?\d+/g);
            if (!parts || parts.length < 3) {
                console.warn('⚠️ ColorUtils.rgbToHex: Invalid RGB format:', rgb);
                return '#000000';
            }

            var r = parseInt(parts[0]);
            var g = parseInt(parts[1]);
            var b = parseInt(parts[2]);

            // Convert single component to HEX (with clamping 0-255)
            var toHex = function(n) {
                n = Math.max(0, Math.min(255, n));
                var hex = n.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };

            return '#' + toHex(r) + toHex(g) + toHex(b);
        },

        /**
         * Check if string is RGB format
         * 
         * Returns true for:
         * - "25, 121, 195"
         * - "25,121,195"
         * - " 25 , 121 , 195 "
         * - "rgb(25, 121, 195)"
         * - "rgba(25, 121, 195, 0.5)"
         * 
         * @param {String} value - Color string to check
         * @returns {Boolean} true if RGB format
         */
        isRgbColor: function(value) {
            if (!value || typeof value !== 'string') {
                return false;
            }
            
            // Strip rgb() or rgba() wrapper if present
            var normalized = value.trim().replace(/^rgba?\((.+)\)$/i, '$1');
            
            // Check if it's valid RGB format (optionally with alpha)
            return /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+)?\s*$/.test(normalized);
        }
    };
});
