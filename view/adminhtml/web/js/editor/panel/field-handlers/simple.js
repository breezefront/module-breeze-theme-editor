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
                // Mirror selected font-family onto the <select> itself
                $select[0].style.fontFamily = val;
                BaseHandler.handleChange($select, callback);
            });

            // Toggle (checkbox)
            $element.on('change', '.bte-toggle-input', function(e) {
                BaseHandler.handleChange($(e.currentTarget), callback);
            });

            // Social links
            $element.on('input', '.bte-social-link-input', function(e) {
                BaseHandler.handleChange($(e.currentTarget), callback);
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
            $element.off('change', '.bte-toggle-input');
            $element.off('input', '.bte-social-link-input');
        }
    };
});
