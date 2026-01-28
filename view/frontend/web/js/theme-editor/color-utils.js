define([], function () {
    'use strict';

    /**
     * Color Utilities - Centralized color conversion & normalization
     * 
     * Replaces duplicate implementations in:
     * - PaletteManager.hexToRgb()
     * - PaletteManager.rgbToHex()
     * - CssPreviewManager._hexToRgb()
     * - CssPreviewManager.rgbToHex()
     * 
     * @module ColorUtils
     */
    return {
        /**
         * Convert HEX color to RGB string format
         * 
         * Supports:
         * - Full format: "#1979c3" → "25, 121, 195"
         * - Without hash: "1979c3" → "25, 121, 195"
         * - Shorthand: "#fff" → "255, 255, 255"
         * 
         * @param {String} hex - HEX color (e.g., "#1979c3" or "1979c3" or "#fff")
         * @returns {String} RGB format (e.g., "25, 121, 195")
         */
        hexToRgb: function(hex) {
            if (!hex) {
                return hex;
            }
            
            // Remove # if present
            hex = hex.toString().replace(/^#/, '');
            
            // Support shorthand: #fff → #ffffff
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            
            // Validate format
            if (!hex.match(/^[0-9A-Fa-f]{6}$/)) {
                console.warn('⚠️ ColorUtils.hexToRgb: Invalid HEX format:', hex);
                return '0, 0, 0';
            }

            // Parse hex components
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);

            // Return RGB format with spaces (Magento convention)
            return r + ', ' + g + ', ' + b;
        },

        /**
         * Convert RGB string to HEX color format
         * 
         * Supports:
         * - With spaces: "25, 121, 195" → "#1979c3"
         * - Without spaces: "25,121,195" → "#1979c3"
         * - Extra whitespace: " 25 , 121 , 195 " → "#1979c3"
         * 
         * @param {String} rgb - RGB format (e.g., "25, 121, 195" or "25,121,195")
         * @returns {String} HEX color (e.g., "#1979c3")
         */
        rgbToHex: function(rgb) {
            if (!rgb) {
                return '#000000';
            }
            
            // Extract numbers using regex (handles any whitespace/format)
            var parts = rgb.toString().match(/\d+/g);
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
         * Normalize RGB string by removing all whitespace
         * 
         * Useful for comparing RGB values from different sources:
         * - Database: "31, 143, 229"
         * - Config: "31,143,229"
         * - User input: " 31 , 143 , 229 "
         * 
         * @param {String} rgb - RGB string in any format
         * @returns {String} Normalized RGB without spaces (e.g., "31,143,229")
         */
        normalizeRgb: function(rgb) {
            if (!rgb) {
                return rgb;
            }
            // Remove ALL whitespace characters
            return rgb.toString().replace(/\s+/g, '');
        },

        /**
         * Compare two RGB strings for equality (ignoring whitespace)
         * 
         * Returns true if colors are equal:
         * - "25, 121, 195" === "25,121,195" → true
         * - " 25 , 121 , 195 " === "25,121,195" → true
         * - "25, 121, 195" === "25, 120, 195" → false
         * 
         * @param {String} rgb1 - First RGB string
         * @param {String} rgb2 - Second RGB string
         * @returns {Boolean} true if colors are equal (after normalization)
         */
        compareRgb: function(rgb1, rgb2) {
            return this.normalizeRgb(rgb1) === this.normalizeRgb(rgb2);
        }
    };
});
