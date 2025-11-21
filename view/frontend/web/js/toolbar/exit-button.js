define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/exit-button.html'
], function ($, widget, mageTemplate, exitButtonTemplate) {
    'use strict';

    $.widget('swissup.breezeExitButton', {
        options: {
            exitUrl: ''
        },

        _create: function () {
            this.template = mageTemplate(exitButtonTemplate);
            this._render();
        },

        _render: function () {
            var html = this.template({
                data: {
                    exitUrl: this.options.exitUrl,
                    label: $.mage.__('Exit')
                }
            });

            this.element.html(html);
        }
    });

    return $.swissup.breezeExitButton;
});
