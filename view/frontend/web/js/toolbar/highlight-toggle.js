define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/highlight-toggle.html',
    'Swissup_BreezeThemeEditor/js/toolbar/device-frame'
], function ($, widget, mageTemplate, highlightToggleTemplate, DeviceFrame) {
    'use strict';

    $.widget('swissup.breezeHighlightToggle', {
        _create: function () {
            this.template = mageTemplate(highlightToggleTemplate);
            this._render();
            this._bind();
        },

        _render: function () {
            var html = this.template({
                data: {
                    label: $.mage.__('Highlight')
                }
            });

            this.element.html(html);
            this.$button = this.element.find('#breeze-editor-toggle-highlight');
        },

        _bind: function () {
            this.$button.on('click', $.proxy(this._toggleHighlight, this));
        },

        _toggleHighlight: function () {
            var isActive = this.$button.hasClass('active');

            this.$button.toggleClass('active');

            // Застосувати до iframe body через DeviceFrame API
            var toggleResult = DeviceFrame.toggleBodyClass('breeze-editor-highlight-mode');

            if (toggleResult !== false) {
                console.log('Highlight mode:', !isActive ? 'enabled' : 'disabled');
                this.element.trigger('highlightToggled', [!isActive]);
            } else {
                console.warn('Failed to toggle highlight - iframe not available');
            }
        }
    });

    return $.swissup.breezeHighlightToggle;
});
