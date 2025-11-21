define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/version-selector.html'
], function ($, widget, mageTemplate, versionSelectorTemplate) {
    'use strict';

    $.widget('swissup.breezeVersionSelector', {
        options: {
            currentVersion: '1.0.',
            published: false
        },

        _create: function () {
            this.template = mageTemplate(versionSelectorTemplate);
            this._render();
            this._bind();
        },

        _render: function () {
            var html = this.template({
                data: {
                    label: $.mage.__('Version %1').replace('%1', this.options.currentVersion),
                    published: this.options.published,
                    statusText: $.mage.__('(not published)')
                }
            });

            this.element.html(html);
            this.$button = this.element.find('.toolbar-select');
        },

        _bind: function () {
            this.$button.on('click', $.proxy(this._showDropdown, this));
        },

        _showDropdown: function () {
            // TODO: Implement dropdown with version list
            console.log('Version selector clicked');
            this.element.trigger('versionSelectorOpened');
        }
    });

    return $.swissup.breezeVersionSelector;
});
