/**
 * Exit Button Widget
 * 
 * Renders exit link to return to the page without editor.
 */
define([
    'jquery',
    'mage/template',
    'jquery-ui-modules/widget',
    'text!Swissup_BreezeThemeEditor/template/editor/exit-button.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, mageTemplate, widget, exitTemplate, Logger) {
    'use strict';

    var log = Logger.for('toolbar/exit-button');

    $.widget('breeze.breezeExitButton', {
        options: {
            exitUrl: '/',
            label: 'Exit'
        },

        /**
         * Initialize widget
         * @private
         */
        _create: function() {
            log.debug('🎨 Initializing exit button');
            this._render();
            log.info('✅ Exit button initialized');
        },

        /**
         * Render button from template
         * @private
         */
        _render: function() {
            var template = mageTemplate(exitTemplate);
            var html = template({
                data: {
                    exitUrl: this.options.exitUrl,
                    label: this.options.label
                }
            });
            this.element.html(html);
        }
    });

    return $.breeze.breezeExitButton;
});
