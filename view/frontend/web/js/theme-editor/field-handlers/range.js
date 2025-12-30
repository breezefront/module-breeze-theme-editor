define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/base'
], function ($, BaseHandler) {
    'use strict';

    /**
     * Range Field Handler
     *
     * Handles range slider with live output update
     */
    return {
        /**
         * Initialize range field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            var self = this;

            $element.on('input', '.bte-range-slider', function(e) {
                var $slider = $(e.currentTarget);

                // Update output
                self.updateOutput($slider);

                // Handle change
                BaseHandler.handleChange($slider, callback);
            });

            console.log('✅ Range field handler initialized');
        },

        /**
         * Update output element
         *
         * @param {jQuery} $slider
         */
        updateOutput: function($slider) {
            var $output = $slider.siblings('.bte-range-value');
            if ($output.length === 0) return;

            var value = $slider.val();

            // Extract unit from current output text
            var currentText = $output.text();
            var unit = currentText.replace(/[\d.\-]/g, '').trim();

            $output.text(value + (unit ? unit : ''));
        },

        /**
         * Destroy handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            $element.off('input', '.bte-range-slider');
        }
    };
});
