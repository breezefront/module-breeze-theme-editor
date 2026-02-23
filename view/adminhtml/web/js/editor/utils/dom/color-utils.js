define(['Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function (Logger) {
    'use strict';

    var log = Logger.for('utils/dom/color-utils');

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
            
            var hexStr = hex.toString().trim();
            
            // If already RGB format (e.g., "255, 0, 0"), return as-is
            if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(hexStr)) {
                return hexStr;
            }
            
            // Handle rgb() format: rgb(255, 0, 0) → "255, 0, 0"
            if (hexStr.startsWith('rgb')) {
                var match = hexStr.match(/\d+/g);
                if (match && match.length >= 3) {
                    return match[0] + ', ' + match[1] + ', ' + match[2];
                }
                log.warn('ColorUtils.hexToRgb: Invalid RGB format: ' + hex);
                return '0, 0, 0';
            }
            
            // Remove # if present
            hexStr = hexStr.replace(/^#/, '');
            
            // Support shorthand: #fff → #ffffff
            if (hexStr.length === 3) {
                hexStr = hexStr[0] + hexStr[0] + hexStr[1] + hexStr[1] + hexStr[2] + hexStr[2];
            }
            
            // Validate format
            if (!hexStr.match(/^[0-9A-Fa-f]{6}$/)) {
                log.warn('ColorUtils.hexToRgb: Invalid HEX format: ' + hex);
                return '0, 0, 0';
            }

            // Parse hex components
            var r = parseInt(hexStr.substring(0, 2), 16);
            var g = parseInt(hexStr.substring(2, 4), 16);
            var b = parseInt(hexStr.substring(4, 6), 16);

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
            
            // Extract numbers using regex (handles any whitespace/format and negatives)
            var parts = rgb.toString().match(/-?\d+/g);
            if (!parts || parts.length < 3) {
                log.warn('ColorUtils.rgbToHex: Invalid RGB format: ' + rgb);
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
        },

        /**
         * Normalize HEX color format
         * 
         * Ensures consistent format for comparison and storage:
         * - Adds # prefix if missing: "1979c3" → "#1979c3"
         * - Converts to lowercase: "#1979C3" → "#1979c3"
         * - Expands shorthand: "#fff" → "#ffffff"
         * - Trims whitespace: " #1979c3 " → "#1979c3"
         * 
         * @param {String} hex - HEX color in any format
         * @returns {String} Normalized HEX (e.g., "#1979c3")
         */
        normalizeHex: function(hex) {
            if (!hex || typeof hex !== 'string') {
                return '';
            }
            
            // Trim and lowercase
            hex = hex.trim().toLowerCase();
            
            // Add # prefix if missing
            if (!hex.startsWith('#')) {
                hex = '#' + hex;
            }
            
            // Expand shorthand: #fff → #ffffff
            if (hex.length === 4) {
                hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            }
            
            // Validate format
            if (!hex.match(/^#[0-9a-f]{6}$/)) {
                log.warn('ColorUtils.normalizeHex: Invalid HEX format: ' + hex);
                return '';
            }
            
            return hex;
        },

        /**
         * Check if string is a valid HEX color
         * 
         * Returns true for:
         * - "#1979c3" (6-digit with #)
         * - "1979c3" (6-digit without #)
         * - "#fff" (3-digit shorthand)
         * - "#FFF" (uppercase)
         * 
         * Returns false for:
         * - "25, 121, 195" (RGB format)
         * - "rgb(25, 121, 195)" (CSS rgb())
         * - Invalid strings
         * 
         * @param {String} value - Color string to check
         * @returns {Boolean} true if valid HEX color
         */
        isHexColor: function(value) {
            if (!value || typeof value !== 'string') {
                return false;
            }
            
            var str = value.trim();
            
            // Remove # if present for validation
            if (str.startsWith('#')) {
                str = str.substring(1);
            }
            
            // Check if 3 or 6 hex digits
            return /^[0-9a-fA-F]{3}$/.test(str) || /^[0-9a-fA-F]{6}$/.test(str);
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
