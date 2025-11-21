define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/device-switcher.html'
], function ($, widget, mageTemplate, deviceSwitcherTemplate) {
    'use strict';

    $.widget('swissup.breezeDeviceSwitcher', {
        options: {
            activeClass: 'active',
            devices: ['desktop', 'tablet', 'mobile'],
            activeDevice: 'desktop',
            deviceConfig: {
                desktop: {
                    icon: 'Swissup_BreezeThemeEditor/images/device-desktop.svg',
                    width: 20,
                    height: 16
                },
                tablet: {
                    icon: 'Swissup_BreezeThemeEditor/images/device-tablet.svg',
                    width: 18,
                    height: 20
                },
                mobile: {
                    icon: 'Swissup_BreezeThemeEditor/images/device-mobile.svg',
                    width: 10,
                    height: 18
                }
            }
        },

        _create: function () {
            this.currentDevice = this.options.activeDevice;
            this.template = mageTemplate(deviceSwitcherTemplate);
            this._render();
            this._bind();
        },

        _render: function () {
            var self = this;
            var devices = this.options.devices.map(function(deviceName) {
                var config = self.options.deviceConfig[deviceName];
                return {
                    name: deviceName,
                    title: $.mage.__(deviceName.charAt(0).toUpperCase() + deviceName.slice(1)),
                    active: deviceName === self.options.activeDevice,
                    icon: require.toUrl(config.icon),
                    width: config.width,
                    height: config.height
                };
            });

            var html = this.template({
                data: {
                    label: $.mage.__('Devices:'),
                    devices: devices
                }
            });

            this.element.html(html);
        },

        _bind: function () {
            this.element.on('click', '.device-button', $.proxy(this._switchDevice, this));
        },

        _switchDevice: function (event) {
            var $button = $(event.currentTarget);
            var device = $button.data('device');

            if (device === this.currentDevice) {
                return;
            }

            this.currentDevice = device;

            // Update buttons
            this.element.find('.device-button')
                .removeClass(this.options.activeClass);
            $button.addClass(this.options.activeClass);

            // Update body classes (OLD FORMAT for CSS compatibility)
            $('body')
                .removeClass('device-desktop device-tablet device-mobile')
                .addClass('device-' + device);

            this.element.trigger('deviceChanged', [device]);
            console.log('Device switched to:', device);
        }
    });

    return $.swissup.breezeDeviceSwitcher;
});
