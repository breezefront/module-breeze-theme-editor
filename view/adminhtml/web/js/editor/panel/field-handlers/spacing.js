define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base'
], function ($, BaseHandler) {
    'use strict';

    /**
     * Spacing Field Handler
     *
     * Handles spacing field with linked/unlinked sides
     */
    return {
        /**
         * Initialize spacing field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            var self = this;

            // Handle value changes in spacing inputs
            $element.on('input', '.bte-spacing-value', function(e) {
                var $input = $(e.currentTarget);
                var $wrapper = $input.closest('.bte-spacing-wrapper');
                var $linkToggle = $wrapper.find('.bte-spacing-link-toggle');
                var isLinked = $linkToggle.hasClass('bte-linked');

                if (isLinked) {
                    // Update all sides to same value
                    var value = $input.val();
                    $wrapper.find('.bte-spacing-value').val(value);
                }

                self.updateHiddenField($wrapper, callback);
            });

            // Handle unit change
            $element.on('change', '.bte-spacing-unit', function(e) {
                var $select = $(e.currentTarget);
                var $wrapper = $select.closest('.bte-spacing-wrapper');
                
                self.updateHiddenField($wrapper, callback);
            });

            // Handle link/unlink toggle
            $element.on('click', '.bte-spacing-link-toggle', function(e) {
                e.preventDefault();
                var $toggle = $(e.currentTarget);
                var $wrapper = $toggle.closest('.bte-spacing-wrapper');
                var isLinked = $toggle.hasClass('bte-linked');

                if (isLinked) {
                    // Unlink
                    $toggle.removeClass('bte-linked');
                    $toggle.attr('data-linked', '0');
                    $toggle.attr('title', 'Link all sides');
                } else {
                    // Link and sync all values to top
                    $toggle.addClass('bte-linked');
                    $toggle.attr('data-linked', '1');
                    $toggle.attr('title', 'Unlink sides');
                    
                    var topValue = $wrapper.find('[data-side="top"]').val();
                    $wrapper.find('.bte-spacing-value').val(topValue);
                }

                self.updateHiddenField($wrapper, callback);
            });

            console.log('✅ Spacing field handler initialized');
        },

        /**
         * Update hidden field with current spacing values
         *
         * @param {jQuery} $wrapper - Spacing wrapper element
         * @param {Function} callback - Change callback
         */
        updateHiddenField: function($wrapper, callback) {
            var $hiddenInput = $wrapper.find('.bte-spacing-hidden');
            var $linkToggle = $wrapper.find('.bte-spacing-link-toggle');
            var $unitSelect = $wrapper.find('.bte-spacing-unit');

            var spacing = {
                top: parseFloat($wrapper.find('[data-side="top"]').val()) || 0,
                right: parseFloat($wrapper.find('[data-side="right"]').val()) || 0,
                bottom: parseFloat($wrapper.find('[data-side="bottom"]').val()) || 0,
                left: parseFloat($wrapper.find('[data-side="left"]').val()) || 0,
                unit: $unitSelect.val() || 'px',
                linked: $linkToggle.hasClass('bte-linked')
            };

            // Update hidden input
            $hiddenInput.val(JSON.stringify(spacing));

            // Trigger change
            BaseHandler.handleChange($hiddenInput, callback);
        },

        /**
         * Destroy handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            $element.off('input', '.bte-spacing-value');
            $element.off('change', '.bte-spacing-unit');
            $element.off('click', '.bte-spacing-link-toggle');
        }
    };
});
