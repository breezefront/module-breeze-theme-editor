define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/page-selector.html'
], function ($, widget, mageTemplate, pageSelectorTemplate) {
    'use strict';

    $.widget('swissup.breezePageSelector', {
        options: {
            currentPage: 'Home'
        },

        _create: function () {
            this.template = mageTemplate(pageSelectorTemplate);
            this._render();
            this._bind();
        },

        _render: function () {
            var html = this.template({
                data: {
                    currentPage: this.options.currentPage
                }
            });

            this.element.html(html);
            this.$button = this.element.find('.toolbar-select');
        },

        _bind: function () {
            this.$button.on('click', $.proxy(this._showDropdown, this));
        },

        _showDropdown: function () {
            // TODO: Implement dropdown with page list
            console.log('Page selector clicked');
            this.element.trigger('pageSelectorOpened');
        }
    });

    return $.swissup.breezePageSelector;
});
