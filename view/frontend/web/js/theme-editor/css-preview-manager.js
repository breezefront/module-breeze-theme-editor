define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/toolbar/device-frame'
], function ($, DeviceFrame) {
    'use strict';

    var changes = {};
    var $styleElement = null;
    var iframeDocument = null;

    return {
        /**
         * Initialize preview manager
         */
        init:  function() {
            iframeDocument = DeviceFrame.getDocument();

            if (!iframeDocument) {
                console.warn('⚠️ CSS Preview Manager:  iframe not initialized');
                return false;
            }

            this._createStyleElement();
            console.log('✅ CSS Preview Manager initialized');
            return true;
        },

        /**
         * Create <style> element in iframe head
         */
        _createStyleElement: function() {
            if (!iframeDocument) {
                return;
            }

            // Remove previous style element if exists
            var $prevStyle = $(iframeDocument).find('#bte-live-preview');
            if ($prevStyle.length) {
                $prevStyle.remove();
            }

            $styleElement = $('<style>', {
                id: 'bte-live-preview',
                type: 'text/css'
            });

            // Robust head detection for both jQuery and native DOM
            var $head = $(iframeDocument).find('head');
            if ($head.length === 0 && iframeDocument.head) {
                $head = $(iframeDocument.head);
            }
            if ($head.length === 0) {
                console.error('❌ Cannot find <head> in iframe!');
                return;
            }

            $head.append($styleElement);
            console.log('📝 Live preview <style> element created');
        },

        /**
         * ✅ Set CSS variable (with automatic format conversion)
         *
         * @param {String} varName - CSS variable name (--brand-color)
         * @param {String} value - Value (HEX, number, etc.)
         * @param {String} fieldType - Field type from GraphQL (COLOR, RANGE, NUMBER, etc.)
         */
        setVariable: function(varName, value, fieldType) {
            if (!iframeDocument || !$styleElement) {
                if (!this.init()) {
                    return false;
                }
            }

            // ✅ Auto-format based on field type
            var formattedValue = this._formatValue(value, fieldType);

            changes[varName] = formattedValue;
            this._updateStyles();

            console.log('🎨 CSS variable updated:', varName, '=', formattedValue, '(type:', fieldType, ')');
            return true;
        },

        /**
         * ✅ Format value based on field type
         *
         * @param {String} value
         * @param {String} fieldType - COLOR, RANGE, NUMBER, etc.
         * @returns {String}
         */
        _formatValue: function(value, fieldType) {
            if (!fieldType || ! value) {
                return value;
            }

            switch (fieldType) {
                case 'COLOR':
                    // Breeze uses RGB format:  "255, 255, 255"
                    return this._hexToRgb(value);

                case 'RANGE':
                case 'NUMBER':
                    // May already have unit (16px, 0.8), return as-is
                    return value;

                case 'FONT_PICKER':
                    // Font family names
                    return value;

                case 'TOGGLE':
                case 'CHECKBOX':
                    // Boolean values
                    return value ?  '1' : '0';

                default:
                    return value;
            }
        },

        /**
         * Convert HEX → RGB (Breeze format:  "255, 255, 255")
         *
         * @param {String} hex - #1979c3
         * @returns {String} - "25, 121, 195"
         */
        _hexToRgb:  function(hex) {
            if (!hex || ! hex.startsWith('#')) {
                return hex; // Not HEX, return as-is
            }

            hex = hex.replace('#', '');

            // Support 3-char hex (#F00 → #FF0000)
            if (hex.length === 3) {
                hex = hex.split('').map(function(c) {
                    return c + c;
                }).join('');
            }

            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);

            return r + ', ' + g + ', ' + b;
        },

        /**
         * Convert RGB → HEX (for color picker display)
         *
         * @param {String} rgb - "255, 255, 255" or "rgb(255, 255, 255)"
         * @returns {String} - "#ffffff"
         */
        _rgbToHex: function(rgb) {
            var parts = rgb.match(/\d+/g);

            if (!parts || parts.length < 3) {
                return '#000000';
            }

            var r = parseInt(parts[0]);
            var g = parseInt(parts[1]);
            var b = parseInt(parts[2]);

            var toHex = function(n) {
                var hex = n.toString(16);
                return hex.length === 1 ?  '0' + hex : hex;
            };

            return '#' + toHex(r) + toHex(g) + toHex(b);
        },

        /**
         * Get current CSS variable value from iframe
         */
        getVariable: function(varName) {
            if (!iframeDocument) {
                return null;
            }

            // Use iframeDocument.documentElement instead of iframeDocument.documentElement (fix extra space)
            var value = getComputedStyle(iframeDocument.documentElement)
                .getPropertyValue(varName)
                .trim();

            return value || null;
        },

        /**
         * Update styles in iframe
         */
        _updateStyles: function() {
            if (!$styleElement) {
                console.error('❌ $styleElement is null!');
                return;
            }

            var css = ':root {\n';

            Object.keys(changes).forEach(function(varName) {
                css += '    ' + varName + ': ' + changes[varName] + ';\n';
            });

            css += '}';

            $styleElement.text(css);

            // Debug: verify applied
            if (console.groupCollapsed) {
                console.groupCollapsed('📝 CSS Preview updated');
                console.log('Variables:', Object.keys(changes).length);
                console.log('CSS:', css);
                console.groupEnd();
            }
        },

        /**
         * Get all changes
         */
        getChanges: function() {
            return $.extend({}, changes);
        },

        /**
         * Check if has changes
         */
        hasChanges: function() {
            return Object.keys(changes).length > 0;
        },

        /**
         * Reset all changes
         */
        reset: function() {
            changes = {};

            if ($styleElement) {
                $styleElement.text('');
            }

            console.log('↺ CSS Preview reset');
            return true;
        },

        /**
         * Reset specific variable
         */
        resetVariable:  function(varName) {
            if (changes[varName]) {
                delete changes[varName];
                this._updateStyles();
                console.log('↺ CSS variable reset:', varName);
                return true;
            }
            return false;
        },

        /**
         * Load saved settings
         */
        load: function(settings) {
            if (!settings || typeof settings !== 'object') {
                return false;
            }

            changes = $.extend({}, settings);
            this._updateStyles();

            console.log('📥 CSS Preview loaded', Object.keys(changes).length, 'variables');
            return true;
        },

        /**
         * Mark as saved (for future use)
         */
        markAsSaved: function() {
            // Future:  could save to localStorage or track saved state
            console.log('✅ CSS Preview marked as saved');
        },

        /**
         * Public helpers
         */
        hexToRgb: function(hex) {
            return this._hexToRgb(hex);
        },

        rgbToHex: function(rgb) {
            return this._rgbToHex(rgb);
        },

        /**
         * Destroy
         */
        destroy: function() {
            if ($styleElement) {
                $styleElement.remove();
                $styleElement = null;
            }

            changes = {};
            iframeDocument = null;

            console.log('🗑️ CSS Preview Manager destroyed');
        }
    };
});
