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
        init: function() {
            iframeDocument = DeviceFrame.getDocument();
            if (!iframeDocument) {
                console.warn('⚠️ CSS Preview Manager: iframe not initialized');
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

            var $prevStyle = $(iframeDocument).find('#bte-live-preview');
            if ($prevStyle.length) {
                $prevStyle.remove();
            }

            $styleElement = $('<style>', {
                id: 'bte-live-preview',
                type: 'text/css'
            });

            var $publishedStyle = $(iframeDocument).find('#bte-theme-css-variables');

            if ($publishedStyle.length) {
                $publishedStyle.after($styleElement);
                console.log('📝 Live preview <style> inserted after #bte-theme-css-variables');
            } else {
                var $body = $(iframeDocument).find('body');
                if (!$body.length && iframeDocument.body) {
                    $body = $(iframeDocument.body);
                }

                if ($body.length) {
                    $body.append($styleElement);
                    console.warn('⚠️ Fallback: Live preview <style> appended to end of <body>');
                } else {
                    console.error('❌ Cannot find insertion point for live preview styles!');
                    return;
                }
            }
        },

        /**
         * Set CSS variable (with automatic format conversion)
         */
        setVariable: function(varName, value, fieldType) {
            if (!iframeDocument || !$styleElement) {
                if (!this.init()) {
                    return false;
                }
            }
            var formattedValue = this._formatValue(value, fieldType);
            changes[varName] = formattedValue;
            this._updateStyles();
            console.log('🎨 CSS variable updated:', varName, '=', formattedValue, '(type:', fieldType, ')');
            return true;
        },

        /**
         * Format value based on field type
         */
        _formatValue: function(value, fieldType) {
            if (!fieldType || value === null || value === undefined) {
                return String(value);
            }
            fieldType = fieldType.toLowerCase();
            switch (fieldType) {
                case 'color':
                    return this._hexToRgb(value);
                case 'font_picker':
                    return this._formatFont(value);
                case 'toggle':
                case 'checkbox':
                    return (value === true || value === '1' || value === 1) ? '1' : '0';
                case 'textarea':
                    return this._escapeValue(String(value));
                case 'range':
                case 'number':
                case 'text':
                case 'select':
                default:
                    return String(value);
            }
        },

        /**
         * Convert HEX → RGB
         */
        _hexToRgb: function(hex) {
            if (!hex) {
                return hex;
            }
            if (!hex.toString().match(/^#?[0-9A-Fa-f]{3,6}$/)) {
                return String(hex);
            }
            hex = hex.toString().replace('#', '');
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            return r + ', ' + g + ', ' + b;
        },

        /**
         * Format font with quotes and fallback
         */
        _formatFont: function(font) {
            if (!font) {
                return font;
            }
            font = String(font);
            if (font.startsWith('"') || font.startsWith("'")) {
                return font;
            }
            return '"' + font + '", sans-serif';
        },

        /**
         * Escape textarea values to prevent CSS injection
         */
        _escapeValue: function(value) {
            return value.replace(/\/\*/g, '/ *').replace(/\*\//g, '* /');
        },

        /**
         * Convert RGB → HEX
         */
        rgbToHex: function(rgb) {
            if (!rgb) {
                return '#000000';
            }
            var parts = rgb.toString().match(/\d+/g);
            if (!parts || parts.length < 3) {
                return '#000000';
            }
            var r = parseInt(parts[0]);
            var g = parseInt(parts[1]);
            var b = parseInt(parts[2]);
            var toHex = function(n) {
                var hex = Math.max(0, Math.min(255, n)).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
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
            var value = getComputedStyle(iframeDocument.documentElement)
                .getPropertyValue(varName)
                .trim();
            return value || null;
        },

        /**
         * Update :root styles in iframe
         */
        _updateStyles: function() {
            if (!$styleElement) {
                console.error('$styleElement is null!');
                return;
            }
            var css = ':root {\n';
            Object.keys(changes).forEach(function(varName) {
                css += '    ' + varName + ': ' + changes[varName] + ';\n';
            });
            css += '}';
            $styleElement.text(css);
            if (console.groupCollapsed) {
                console.groupCollapsed('📝 CSS Preview updated (' + Object.keys(changes).length + ' vars)');
                console.log(css);
                console.groupEnd();
            }
        },

        /**
         * Get all pending changes
         */
        getChanges: function() {
            return $.extend({}, changes);
        },

        /**
         * Check if has pending changes
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
                $styleElement.text(':root {}');
            }
            console.log('↺ CSS Preview reset');
            return true;
        },

        /**
         * Reset specific variable
         */
        resetVariable: function(varName) {
            if (changes[varName]) {
                delete changes[varName];
                this._updateStyles();
                console.log('↺ CSS variable reset:', varName);
                return true;
            }
            return false;
        },

        /**
         * Load settings object
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
         * Public helper: HEX → RGB
         */
        hexToRgb: function(hex) {
            return this._hexToRgb(hex);
        },

        /**
         * Destroy preview manager
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
