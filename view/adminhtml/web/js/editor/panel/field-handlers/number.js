define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base'
], function ($, BaseHandler) {
    'use strict';

    /**
     * Number Field Handler
     *
     * Handles number input with optional unit support
     */
    return {
        /**
         * Initialize number field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            var self = this;

            $element.on('input', '.bte-number-input', function(e) {
                var $input = $(e.currentTarget);

                // Handle change with custom getValue to append unit
                BaseHandler.handleChange($input, callback, {
                    getValue: function($input) {
                        var value = $input.val();
                        var unit = self.getUnit($input);
                        return unit ? value + unit : value;
                    }
                });
            });

            console.log('✅ Number field handler initialized');
        },

        /**
         * Get unit for field
         *
         * @param {jQuery} $input
         * @returns {String}
         */
        getUnit: function($input) {
            // Try to get unit from sibling unit span
            var $unitSpan = $input.siblings('.bte-number-unit');
            if ($unitSpan.length > 0) {
                var unit = $unitSpan.text().trim();
                if (unit) return unit;
            }

            // Try to get unit from data attribute
            var unit = $input.data('unit');
            if (unit) return unit;

            // Try to find unit in field wrapper
            var $wrapper = $input.closest('.bte-field');
            $unitSpan = $wrapper.find('.bte-number-unit');
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
            $element.off('input', '.bte-number-input');
        }
    };
});
