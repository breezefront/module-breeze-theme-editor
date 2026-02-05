/**
 * Exit Button Widget
 * 
 * Renders exit link to return to the page without editor.
 */
define([
    'jquery',
    'mage/template',
    'jquery-ui-modules/widget',
    'text!Swissup_BreezeThemeEditor/template/editor/exit-button.html'
], function ($, mageTemplate, widget, exitTemplate) {
    'use strict';

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
            console.log('🎨 Initializing exit button');
            this._render();
            console.log('✅ Exit button initialized');
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
