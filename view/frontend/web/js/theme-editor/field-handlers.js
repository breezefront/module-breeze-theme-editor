define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/color',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/range',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/number',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/radio',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/simple',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/image-upload',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/spacing',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/repeater',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base'
], function (BaseHandler, ColorHandler, RangeHandler, NumberHandler, RadioHandler, SimpleHandler, ImageUploadHandler, SpacingHandler, RepeaterHandler, BaseRenderer) {
    'use strict';

    /**
     * Field Change Handler Orchestrator
     *
     * Initializes all specific field handlers
     */
    return {
        /**
         * Handler registry - maps field types to their handlers
         * Used for specialized operations like reset, validation, etc.
         */
        handlersByType: {
            'COLOR': ColorHandler,
            'RANGE': RangeHandler,
            'NUMBER': NumberHandler,
            'RADIO': RadioHandler,
            'TEXT': SimpleHandler,
            'TEXTAREA': SimpleHandler,
            'SELECT': SimpleHandler,
            'TOGGLE': SimpleHandler,
            'CHECKBOX': SimpleHandler,
            'IMAGE_UPLOAD': ImageUploadHandler,
            'SPACING': SpacingHandler,
            'REPEATER': RepeaterHandler,
            'FONT_PICKER': SimpleHandler,
            'COLOR_SCHEME': SimpleHandler,
            'CODE': SimpleHandler,
            'ICON_SET_PICKER': SimpleHandler,
            'SOCIAL_LINKS': SimpleHandler
        },

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
            NumberHandler.init($element, callback);
            RadioHandler.init($element, callback);
            SimpleHandler.init($element, callback);
            ImageUploadHandler.init($element, callback);
            SpacingHandler.init($element, callback);
            RepeaterHandler.init($element, callback);

            // Attach reset button handlers with registry for smart dispatching
            BaseHandler.attachResetHandler($element, this.handlersByType);

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
            NumberHandler.destroy($element);
            RadioHandler.destroy($element);
            SimpleHandler.destroy($element);
            ImageUploadHandler.destroy($element);
            SpacingHandler.destroy($element);
            RepeaterHandler.destroy($element);

            console.log('🗑️ All field handlers destroyed');
        },

        /**
         * Update field badges in DOM
         *
         * @param {jQuery} $element - Panel element
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {Boolean} Success
         */
        updateBadges: function($element, sectionCode, fieldCode) {
            return BaseRenderer.updateFieldBadges($element, sectionCode, fieldCode);
        },

        // Expose base handler for custom use
        base: BaseHandler
    };
});
