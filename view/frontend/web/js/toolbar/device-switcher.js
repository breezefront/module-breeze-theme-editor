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
                    height: 16,
                    frameWidth: '100%',
                    viewport: 'width=device-width, initial-scale=1' // ← ДОДАНО
                },
                tablet: {
                    icon: 'Swissup_BreezeThemeEditor/images/device-tablet.svg',
                    width: 18,
                    height: 20,
                    frameWidth: '768px',
                    viewport: 'width=768' // ← ДОДАНО
                },
                mobile: {
                    icon: 'Swissup_BreezeThemeEditor/images/device-mobile.svg',
                    width: 10,
                    height: 18,
                    frameWidth: '375px',
                    viewport: 'width=375' // ← ДОДАНО
                }
            }
        },

        _create: function () {
            this.currentDevice = this.options.activeDevice;
            this.originalViewport = null; // ← ДОДАНО
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
            this.element.find('.device-button').removeClass(this.options.activeClass);
            $button.addClass(this.options.activeClass);

            // Apply device mode
            this._applyDeviceMode(device);

            this.element.trigger('deviceChanged', [device]);
            console.log('Device switched to:', device); // ← ДОДАНО лог
        },

        _applyDeviceMode: function(device) {
            var config = this.options.deviceConfig[device];
            var $body = $('body');
            var isDesktop = device === 'desktop';

            // Update viewport meta tag для media queries ← ДОДАНО
            this._setViewport(config.viewport);

            // Update body class
            $body
                .removeClass('breeze-device-mode breeze-device-desktop breeze-device-tablet breeze-device-mobile')
                .addClass('breeze-device-' + device);

            if (!isDesktop) {
                $body.addClass('breeze-device-mode');
            }

            // Set CSS variable for frame width
            document.documentElement.style.setProperty('--device-frame-width', config.frameWidth);

            console.log('Applied device mode:', device, '| Frame width:', config.frameWidth, '| Viewport:', config.viewport); // ← ДОДАНО
        },

        // ← ДОДАНО метод
        _setViewport: function(content) {
            var $viewport = $('meta[name="viewport"]');

            // Save original viewport on first change
            if (!this.originalViewport && $viewport.length) {
                this.originalViewport = $viewport.attr('content');
            }

            if (!$viewport.length) {
                $('head').append('<meta name="viewport" content="' + content + '">');
            } else {
                $viewport.attr('content', content);
            }

            console.log('Viewport changed to:', content);
        },

        // ← ДОДАНО destroy для cleanup
        _destroy: function() {
            // Restore original viewport
            if (this.originalViewport) {
                $('meta[name="viewport"]').attr('content', this.originalViewport);
            }
            this._super();
        }
    });

    return $.swissup.breezeDeviceSwitcher;
});
