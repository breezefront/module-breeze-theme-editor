define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, BaseHandler, Logger) {
    'use strict';

    var log = Logger.for('panel/field-handlers/range');

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

                // Update fill gradient
                self.updateFill($slider);

                // Update output
                self.updateOutput($slider);

                // Handle change with custom getValue to append unit
                BaseHandler.handleChange($slider, callback, {
                    getValue: function($input) {
                        var value = $input.val();
                        var unit = self.getUnit($input);
                        return unit ? value + unit : value;
                    }
                });
            });

            // Set initial fill for all sliders already rendered in the panel
            $element.find('.bte-range-slider').each(function() {
                self.updateFill($(this));
            });

            log.info('Range field handler initialized');
        },

        /**
         * Update --range-fill CSS custom property on the slider element.
         * Used by the light-theme linear-gradient track to show filled portion.
         *
         * @param {jQuery} $slider
         */
        updateFill: function($slider) {
            var min = parseFloat($slider.attr('min')) || 0;
            var max = parseFloat($slider.attr('max')) || 100;
            var val = parseFloat($slider.val()) || 0;
            var pct = max > min ? ((val - min) / (max - min)) * 100 : 0;

            $slider[0].style.setProperty('--range-fill', pct.toFixed(2) + '%');
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
         * Get unit for field
         *
         * @param {jQuery} $input
         * @returns {String}
         */
        getUnit: function($input) {
            // Try to get unit from sibling output element
            var $output = $input.siblings('.bte-range-value');
            if ($output.length > 0) {
                var text = $output.text();
                var unit = text.replace(/[\d.\-]/g, '').trim();
                if (unit) return unit;
            }

            // Try to get unit from data attribute
            var unit = $input.data('unit');
            if (unit) return unit;

            // Try to find unit in field wrapper
            var $wrapper = $input.closest('.bte-field');
            var $unitSpan = $wrapper.find('.bte-range-unit, .bte-number-unit');
            if ($unitSpan.length > 0) {
                return $unitSpan.text().trim();
            }

            return '';
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
