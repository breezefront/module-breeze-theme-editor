define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($) {
    'use strict';

    $.widget('swissup.breezePageSelector', {
        options: {
            currentPage: 'Home Page'
        },

        _create: function () {
            this._bind();
        },

        _bind: function () {
            this.element.on('click', $.proxy(this._showDropdown, this));
        },

        _showDropdown: function () {
            // TODO: Implement dropdown with page list
            console.log('Page selector clicked:', this.options.currentPage);

            this.element.trigger('pageSelectorOpened');
        }
    });

    return $.swissup.breezePageSelector;
});
