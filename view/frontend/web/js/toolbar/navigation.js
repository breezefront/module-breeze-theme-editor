define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/navigation.html'
], function ($, widget, mageTemplate, navigationTemplate) {
    'use strict';

    $.widget('swissup.breezeNavigation', {
        options: {
            items: []
        },

        _create: function () {
            this.template = mageTemplate(navigationTemplate);
            this._render();
            this._bind();
        },

        _render: function () {
            var html = this.template({
                data: {
                    items: this.options.items
                }
            });

            this.element.html(html);
        },

        _bind: function () {
            this.element.on('click', '.nav-item:not(.disabled)', $.proxy(this._onItemClick, this));
        },

        _onItemClick: function (event) {
            var $button = $(event.currentTarget);
            var itemId = $button.data('id');

            // Update active state
            this.element.find('.nav-item').removeClass('active');
            $button.addClass('active');

            this.element.trigger('navItemClicked', [itemId]);
        }
    });

    return $.swissup.breezeNavigation;
});
