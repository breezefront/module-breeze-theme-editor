define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($) {
    'use strict';

    $.widget('swissup.breezeScopeSelector', {
        options: {
            currentScope: 'All Store Views'
        },

        _create: function () {
            this._bind();
        },

        _bind: function () {
            this.element.on('click', $.proxy(this._showDropdown, this));
        },

        _showDropdown: function () {
            // TODO: Implement dropdown with scope list
            console.log('Scope selector clicked:', this.options.currentScope);

            this.element.trigger('scopeSelectorOpened');
        }
    });

    return $.swissup.breezeScopeSelector;
});
