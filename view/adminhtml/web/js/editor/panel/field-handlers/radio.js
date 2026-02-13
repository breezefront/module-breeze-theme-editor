define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base'
], function ($, BaseHandler) {
    'use strict';

    /**
     * Radio Field Handler
     *
     * Handles radio button groups (color-scheme, icon-set)
     */
    return {
        /**
         * Initialize radio field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            var self = this;

            // Color scheme radio
            $element.on('change', '.bte-scheme-input', function(e) {
                self.handleRadioChange($(e.currentTarget), callback);
            });

            // Icon set radio
            $element.on('change', '.bte-icon-set-input', function(e) {
                self.handleRadioChange($(e.currentTarget), callback);
            });

            console.log('✅ Radio field handler initialized');
        },

        /**
         * Handle radio button change
         *
         * @param {jQuery} $radio
         * @param {Function} callback
         */
        handleRadioChange: function($radio, callback) {
            if (!$radio.is(':checked')) {
                // Skip unchecked radios
                return;
            }

            // Update visual state (active class on parent label)
            var $label = $radio.closest('label');
            var $siblings = $label.siblings('label');

            $siblings.removeClass('active');
            $label.addClass('active');

            // Handle change
            BaseHandler.handleChange($radio, callback);
        },

        /**
         * Destroy handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            $element.off('change', '.bte-scheme-input');
            $element.off('change', '.bte-icon-set-input');
        }
    };
});
