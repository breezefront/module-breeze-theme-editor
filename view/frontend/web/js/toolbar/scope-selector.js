define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/scope-selector.html'
], function ($, widget, mageTemplate, scopeSelectorTemplate) {
    'use strict';

    $.widget('swissup.breezeScopeSelector', {
        options: {
            currentScope: 'Default Store View'
        },

        _create: function () {
            this.template = mageTemplate(scopeSelectorTemplate);
            this._render();
            this._bind();
        },

        _render: function () {
            var html = this.template({
                data: {
                    label: $.mage.__('Scope:'),
                    currentScope: this.options.currentScope
                }
            });

            this.element.html(html);
            this.$button = this.element.find('.toolbar-select');
        },

        _bind: function () {
            this.$button.on('click', $.proxy(this._showDropdown, this));
        },

        _showDropdown: function () {
            // TODO: Implement dropdown with scope list
            console.log('Scope selector clicked');
            this.element.trigger('scopeSelectorOpened');
        }
    });

    return $.swissup.breezeScopeSelector;
});
