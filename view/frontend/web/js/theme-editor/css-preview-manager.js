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
         * Ініціалізувати preview manager
         */
        init: function() {
            iframeDocument = DeviceFrame.getDocument();

            if (!iframeDocument) {
                console.warn('⚠️ CSS Preview Manager: iframe not initialized');
                return false;
            }

            // Створити <style> елемент для live preview
            this._createStyleElement();

            console.log('✅ CSS Preview Manager initialized');
            return true;
        },

        /**
         * Створити <style> елемент в iframe head
         */
        _createStyleElement: function() {
            if (!iframeDocument) {
                return;
            }

            // Видалити існуючий
            $(iframeDocument).find('#bte-live-preview').remove();

            // Створити новий
            $styleElement = $('<style>', {
                id: 'bte-live-preview',
                type: 'text/css'
            });

            $(iframeDocument.head).append($styleElement);

            console.log('📝 Live preview <style> element created');
        },

        /**
         * Встановити CSS змінну
         * @param {string} varName - Назва змінної (--brand-color)
         * @param {string} value - Значення (може бути HEX, RGB, px, etc.)
         * @param {string} format - Формат: 'color-rgb', 'color-hex', 'size', 'number'
         */
        setVariable: function(varName, value, format) {
            if (!iframeDocument || !$styleElement) {
                if (!this.init()) {
                    return false;
                }
            }

            // Форматувати значення
            var formattedValue = this._formatValue(value, format);

            // Зберегти зміну
            changes[varName] = formattedValue;

            // Оновити CSS
            this._updateStyles();

            console.log('🎨 CSS variable updated:', varName, '=', formattedValue);
            return true;
        },

        /**
         * Отримати поточне значення змінної
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
         * Форматувати значення залежно від типу
         */
        _formatValue: function(value, format) {
            if (!format) {
                return value;
            }

            switch (format) {
                case 'color-rgb':
                    return this._hexToRgb(value);

                case 'color-hex':
                    return value;

                case 'size':
                    // Якщо число без одиниць — додати px
                    return /^\d+$/.test(value) ? value + 'px' : value;

                case 'number':
                    return parseFloat(value);

                default:
                    return value;
            }
        },

        /**
         * Конвертувати HEX в RGB (без rgb(), тільки числа через кому)
         * Breeze використовує формат: --brand-color: 25, 121, 195;
         */
        _hexToRgb: function(hex) {
            // Видалити #
            hex = hex.replace('#', '');

            // Парсити 3 або 6 символів
            if (hex.length === 3) {
                hex = hex.split('').map(function(char) {
                    return char + char;
                }).join('');
            }

            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);

            // Повернути формат "255, 255, 255"
            return r + ', ' + g + ', ' + b;
        },

        /**
         * Конвертувати RGB в HEX (для відображення в color picker)
         */
        _rgbToHex: function(rgb) {
            // rgb може бути "255, 255, 255" або "rgb(255, 255, 255)"
            var parts = rgb.match(/\d+/g);

            if (!parts || parts.length < 3) {
                return '#000000';
            }

            var r = parseInt(parts[0]);
            var g = parseInt(parts[1]);
            var b = parseInt(parts[2]);

            var toHex = function(n) {
                var hex = n.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };

            return '#' + toHex(r) + toHex(g) + toHex(b);
        },

        /**
         * Оновити стилі в iframe
         */
        _updateStyles: function() {
            if (!$styleElement) {
                return;
            }

            var css = ':root {\n';

            Object.keys(changes).forEach(function(varName) {
                css += '    ' + varName + ': ' + changes[varName] + ';\n';
            });

            css += '}';

            $styleElement.text(css);
        },

        /**
         * Отримати всі зміни
         */
        getChanges: function() {
            return $.extend({}, changes);
        },

        /**
         * Перевірити чи є зміни
         */
        hasChanges: function() {
            return Object.keys(changes).length > 0;
        },

        /**
         * Скинути всі зміни
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
         * Скинути конкретну змінну
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
         * Завантажити збережені налаштування
         * @param {object} settings - Об'єкт з CSS змінними
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
         * Helper: Конвертувати HEX → RGB для експорту
         */
        hexToRgb: function(hex) {
            return this._hexToRgb(hex);
        },

        /**
         * Helper: Конвертувати RGB → HEX для color picker
         */
        rgbToHex: function(rgb) {
            return this._rgbToHex(rgb);
        },

        /**
         * Знищити preview manager
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
