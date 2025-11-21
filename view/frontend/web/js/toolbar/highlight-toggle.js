define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/highlight-toggle.html'
], function ($, widget, mageTemplate, highlightToggleTemplate) {
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
            $('body').toggleClass('breeze-editor-highlight-mode');  // ← додати!

            console.log('Highlight mode:', !isActive ? 'enabled' : 'disabled');
            this.element.trigger('highlightToggled', [!isActive]);
        }
    });

    return $.swissup.breezeHighlightToggle;
});
