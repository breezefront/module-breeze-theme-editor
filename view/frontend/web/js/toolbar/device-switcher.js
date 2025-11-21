define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($) {
    'use strict';

    $.widget('swissup.breezeDeviceSwitcher', {
        options: {
            activeClass: 'active',
            buttonSelector: '.device-button'
        },

        _create: function () {
            this.currentDevice = 'desktop';
            this._bind();
        },

        _bind: function () {
            this.element.on('click', this.options.buttonSelector, $.proxy(this._switchDevice, this));
        },

        _switchDevice: function (event) {
            var $button = $(event.currentTarget),
                device = $button.data('device');

            if (device === this.currentDevice) {
                return;
            }

            this.currentDevice = device;

            // Update button states
            this.element.find(this.options.buttonSelector)
                .removeClass(this.options.activeClass);
            $button.addClass(this.options.activeClass);

            // Update body classes
            $('body')
                .removeClass('device-desktop device-tablet device-mobile')
                .addClass('device-' + device);

            this.element.trigger('deviceChanged', [device]);
        },

        getCurrentDevice: function () {
            return this.currentDevice;
        }
    });

    return $.swissup.breezeDeviceSwitcher;
});
