define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/base'
], function ($, BaseHandler) {
    'use strict';

    /**
     * Color Field Handler
     *
     * Handles sync between color picker and text input
     */
    return {
        /**
         * Initialize color field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            var self = this;

            // Color picker → text input sync
            $element.on('change', '.bte-color-picker', function(e) {
                var $picker = $(e.currentTarget);
                var $textInput = $picker.siblings('.bte-color-input');

                // Sync value
                $textInput.val($picker.val());

                // Handle change (only once, from picker)
                BaseHandler.handleChange($picker, callback);
            });

            // Color text input → picker sync (with validation)
            $element.on('input', '.bte-color-input', function(e) {
                var $textInput = $(e.currentTarget);
                var value = $textInput.val();

                // Validate HEX format
                if (self.isValidHex(value)) {
                    var $picker = $textInput.siblings('.bte-color-picker');
                    $picker.val(value);

                    // Handle change
                    BaseHandler.handleChange($textInput, callback);
                } else {
                    console.log('⏳ Waiting for valid HEX:', value);
                }
            });

            console.log('✅ Color field handler initialized');
        },

        /**
         * Validate HEX color format
         *
         * @param {String} value
         * @returns {Boolean}
         */
        isValidHex: function(value) {
            return /^#[0-9A-Fa-f]{6}$/.test(value);
        },

        /**
         * Destroy handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            $element.off('change', '.bte-color-picker');
            $element.off('input', '.bte-color-input');
        }
    };
});
