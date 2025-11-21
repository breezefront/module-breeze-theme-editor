define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($) {
    'use strict';

    $.widget('swissup.breezeVersionSelector', {
        options: {
            versions: []
        },

        _create: function () {
            this._bind();
        },

        _bind: function () {
            this.element.on('click', $.proxy(this._showDropdown, this));
        },

        _showDropdown: function () {
            // TODO: Implement dropdown with version list
            console.log('Version selector clicked');

            this.element.trigger('versionSelectorOpened');
        }
    });

    return $.swissup.breezeVersionSelector;
});
