// view/frontend/web/js/theme-editor/field-handlers/simple.js
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, BaseHandler, CssPreviewManager, Logger) {
    'use strict';

    var log = Logger.for('panel/field-handlers/simple');

    /**
     * Simple Field Handler
     *
     * Handles simple fields: text, select, toggle, textarea, code
     * Note: number and range have dedicated handlers
     */
    return {
        /**
         * Initialize simple field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            // Text input
            $element.on('input', '.bte-text-input', function(e) {
                BaseHandler.handleChange($(e.currentTarget), callback);
            });

            // Textarea
            $element.on('input', '.bte-textarea', function(e) {
                BaseHandler.handleChange($(e.currentTarget), callback);
            });

            // Code editor
            $element.on('input', '.bte-code-editor', function(e) {
                BaseHandler.handleChange($(e.currentTarget), callback);
            });

            // Select
            $element.on('change', '.bte-select', function(e) {
                BaseHandler.handleChange($(e.currentTarget), callback);
            });

            // Font picker — load external stylesheet if the selected font requires one
            $element.on('change', '.bte-font-picker', function(e) {
                var $select = $(e.currentTarget);
                var val = $select.val();
                var map = JSON.parse($select.attr('data-font-stylesheets') || '{}');
                var url = map[val];
                if (url) {
                    CssPreviewManager.loadFont(url);
                }
                BaseHandler.handleChange($select, callback);
            });

            // Custom font picker widget — open dropdown
            $element.on('click', '.bte-font-picker-trigger', function(e) {
                var $trigger = $(e.currentTarget);
                var $widget  = $trigger.closest('.bte-font-picker-widget');
                var $dropdown = $widget.find('.bte-font-picker-dropdown');
                var isOpen = !$dropdown.prop('hidden');

                // Close any other open font-picker dropdowns first
                $('.bte-font-picker-dropdown:not([hidden])').each(function() {
                    if (this !== $dropdown[0]) {
                        $(this).prop('hidden', true);
                        $(this).closest('.bte-font-picker-widget')
                            .find('.bte-font-picker-trigger')
                            .attr('aria-expanded', 'false');
                    }
                });

                if (isOpen) {
                    $dropdown.prop('hidden', true);
                    $trigger.attr('aria-expanded', 'false');
                    return;
                }

                // Load ALL font stylesheets into admin document so options render correctly
                var map = JSON.parse($widget.attr('data-font-stylesheets') || '{}');
                $.each(map, function(val, url) {
                    if (url && !$('link[href="' + url + '"]', document).length) {
                        $('<link>', { rel: 'stylesheet', href: url }).appendTo(document.head);
                    }
                });

                $dropdown.prop('hidden', false);
                $trigger.attr('aria-expanded', 'true');

                // Scroll selected option into view
                var $selected = $dropdown.find('.bte-font-picker-option.is-selected');
                if ($selected.length) {
                    $selected[0].scrollIntoView({ block: 'nearest' });
                }
            });

            // Custom font picker widget — select an option
            $element.on('click', '.bte-font-picker-option', function(e) {
                var $option  = $(e.currentTarget);
                var $widget  = $option.closest('.bte-font-picker-widget');
                var $dropdown = $widget.find('.bte-font-picker-dropdown');
                var $trigger  = $widget.find('.bte-font-picker-trigger');
                var val       = $option.data('value');
                var fontFamily = String(val);

                // Update selection state in dropdown
                $dropdown.find('.bte-font-picker-option')
                    .removeClass('is-selected')
                    .attr('aria-selected', 'false');
                $option.addClass('is-selected').attr('aria-selected', 'true');

                // Update trigger label and font
                $trigger.find('.bte-font-picker-trigger-label')
                    .text($option.text().trim())
                    .css('font-family', fontFamily);

                // Close dropdown
                $dropdown.prop('hidden', true);
                $trigger.attr('aria-expanded', 'false');

                // Drive the hidden native select → fires existing change handler
                var selectId = $widget.attr('data-for');
                var $select = $('#' + selectId);
                $select.val(val).trigger('change');
            });

            // Toggle (checkbox)
            $element.on('change', '.bte-toggle-input', function(e) {
                BaseHandler.handleChange($(e.currentTarget), callback);
            });

            // Social links
            $element.on('input', '.bte-social-link-input', function(e) {
                BaseHandler.handleChange($(e.currentTarget), callback);
            });

            // Close font-picker dropdown on outside click
            $(document).on('click.bteFontPicker', function(e) {
                if (!$(e.target).closest('.bte-font-picker-widget').length) {
                    $('.bte-font-picker-dropdown:not([hidden])').each(function() {
                        $(this).prop('hidden', true);
                        $(this).closest('.bte-font-picker-widget')
                            .find('.bte-font-picker-trigger')
                            .attr('aria-expanded', 'false');
                    });
                }
            });

            // Close font-picker dropdown on Escape key
            $(document).on('keydown.bteFontPicker', function(e) {
                if (e.key === 'Escape') {
                    $('.bte-font-picker-dropdown:not([hidden])').each(function() {
                        $(this).prop('hidden', true);
                        $(this).closest('.bte-font-picker-widget')
                            .find('.bte-font-picker-trigger')
                            .attr('aria-expanded', 'false');
                    });
                }
            });

            log.info('Simple field handlers initialized');
        },

        /**
         * Destroy handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            $element.off('input', '.bte-text-input');
            $element.off('input', '.bte-textarea');
            $element.off('input', '.bte-code-editor');
            $element.off('change', '.bte-select');
            $element.off('change', '.bte-font-picker');
            $element.off('click', '.bte-font-picker-trigger');
            $element.off('click', '.bte-font-picker-option');
            $element.off('change', '.bte-toggle-input');
            $element.off('input', '.bte-social-link-input');
            $(document).off('click.bteFontPicker keydown.bteFontPicker');
        }
    };
});
