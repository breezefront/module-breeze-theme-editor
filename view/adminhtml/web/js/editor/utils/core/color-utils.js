define(['Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function (Logger) {
    'use strict';

    var log = Logger.for('utils/core/color-utils');

    /**
     * Color Utilities for Admin Area
     * 
     * Minimal utility for RGB↔HEX and oklch()→HEX conversion in adminhtml color field renderer.
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
        },

        /**
         * Check if string is a CSS oklch() color
         *
         * Returns true for:
         * - "oklch(53% 0.15 150)"
         * - "oklch(0.268 0.007 34.298)"
         * - "oklch(70% 0.1 250deg / 50%)"
         *
         * @param {String} value - Color string to check
         * @returns {Boolean} true if oklch() format
         */
        isOklchColor: function(value) {
            return parseOklch(value) !== null;
        },

        /**
         * Convert CSS oklch() color to HEX
         *
         * Colors outside the sRGB gamut are clipped per channel. A non-opaque
         * alpha produces 8-digit HEX (#rrggbbaa).
         *
         * Examples:
         * - "oklch(53% 0.15 150)" → "#008238"
         * - "oklch(0% 0 0 / 50%)" → "#00000080"
         *
         * @param {String} oklch - oklch() color
         * @returns {String} HEX color, "#000000" if the value is not valid oklch()
         */
        oklchToHex: function(oklch) {
            var parsed = parseOklch(oklch);
            if (!parsed) {
                log.warn('ColorUtils.oklchToHex: Invalid oklch format: ' + oklch);
                return '#000000';
            }

            // OKLCH → OKLab
            var hue = parsed.h * Math.PI / 180;
            var a = parsed.c * Math.cos(hue);
            var b = parsed.c * Math.sin(hue);

            // OKLab → LMS (cubed)
            var l = Math.pow(parsed.l + 0.3963377774 * a + 0.2158037573 * b, 3);
            var m = Math.pow(parsed.l - 0.1055613458 * a - 0.0638541728 * b, 3);
            var s = Math.pow(parsed.l - 0.0894841775 * a - 1.2914855480 * b, 3);

            // LMS → linear sRGB → 2-digit HEX
            var toHex = function(linear) {
                linear = Math.max(0, Math.min(1, linear));
                var srgb = linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
                var hex = Math.round(srgb * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };

            var hex = '#' +
                toHex(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) +
                toHex(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) +
                toHex(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);

            if (parsed.alpha < 1) {
                var alphaHex = Math.round(parsed.alpha * 255).toString(16);
                hex += alphaHex.length === 1 ? '0' + alphaHex : alphaHex;
            }

            return hex;
        }
    };

    /**
     * Parse oklch() into lightness (0-1), chroma, hue (degrees) and alpha (0-1)
     *
     * Lightness and alpha accept numbers or percentages, chroma accepts a
     * number or a percentage of 0.4, hue accepts a number or "deg" angle.
     * Any component may be "none", which counts as 0.
     *
     * @param {String} value
     * @returns {Object|null} {l, c, h, alpha} or null if not valid oklch()
     */
    function parseOklch(value) {
        if (!value || typeof value !== 'string') {
            return null;
        }

        var number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
        var pattern = new RegExp(
            '^oklch\\(\\s*(' + number + '%?|none)\\s+(' + number + '%?|none)\\s+(' +
            number + '(?:deg)?|none)\\s*(?:/\\s*(' + number + '%?|none)\\s*)?\\)$',
            'i'
        );
        var match = value.trim().match(pattern);
        if (!match) {
            return null;
        }

        var component = function(raw, percentScale) {
            if (raw.toLowerCase() === 'none') {
                return 0;
            }
            if (raw.slice(-1) === '%') {
                return parseFloat(raw) / 100 * percentScale;
            }
            return parseFloat(raw);
        };

        var alpha = match[4] !== undefined ? component(match[4], 1) : 1;

        return {
            l: component(match[1], 1),
            c: component(match[2], 0.4),
            h: component(match[3], 1),
            alpha: Math.max(0, Math.min(1, alpha))
        };
    }
});
