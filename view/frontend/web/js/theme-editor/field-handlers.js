define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/color',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/range',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/radio',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/simple'
], function (BaseHandler, ColorHandler, RangeHandler, RadioHandler, SimpleHandler) {
    'use strict';

    /**
     * Field Change Handler Orchestrator
     *
     * Initializes all specific field handlers
     */
    return {
        /**
         * Initialize all field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            console.log('🎯 Initializing field change handlers');

            ColorHandler.init($element, callback);
            RangeHandler.init($element, callback);
            RadioHandler.init($element, callback);
            SimpleHandler.init($element, callback);

            console.log('✅ All field handlers initialized');
        },

        /**
         * Destroy all handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            ColorHandler.destroy($element);
            RangeHandler.destroy($element);
            RadioHandler.destroy($element);
            SimpleHandler.destroy($element);

            console.log('🗑️ All field handlers destroyed');
        },

        // Expose base handler for custom use
        base: BaseHandler
    };
});
