define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/device-switcher.html',
    'Swissup_BreezeThemeEditor/js/toolbar/device-frame'
], function ($, widget, mageTemplate, deviceSwitcherTemplate, DeviceFrame) {
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
                    frameWidth: '100%'
                },
                tablet: {
                    icon: 'Swissup_BreezeThemeEditor/images/device-tablet.svg',
                    width: 18,
                    height: 20,
                    frameWidth: '768px'
                },
                mobile: {
                    icon: 'Swissup_BreezeThemeEditor/images/device-mobile.svg',
                    width: 10,
                    height: 18,
                    frameWidth: '375px'
                }
            }
        },

        _create: function () {
            this.currentDevice = this.options.activeDevice;
            this.template = mageTemplate(deviceSwitcherTemplate);
            this._render();
            this._bind();

            // Ініціалізувати iframe ПІСЛЯ рендерингу
            var self = this;
            setTimeout(function() {
                self._initFrame();
            }, 200); // Збільшити затримку
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

        /**
         * Ініціалізувати iframe один раз при створенні widget
         */
        _initFrame: function() {
            var config = this.options.deviceConfig[this.currentDevice];

            console.log('🖼️ Initializing device frame...');

            DeviceFrame.init();
            DeviceFrame.setWidth(config.frameWidth, this.currentDevice);

            console.log('✅ Frame initialized with device:', this.currentDevice);
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

            console.log('📱 Device switched to:', device);
        },

        _applyDeviceMode: function(device) {
            var config = this.options.deviceConfig[device];
            var $body = $('body');

            // Змінити ширину frame
            DeviceFrame.setWidth(config.frameWidth, device);

            // Update body classes
            $body
                .removeClass('breeze-device-mode breeze-device-desktop breeze-device-tablet breeze-device-mobile')
                .addClass('breeze-device-' + device);

            if (device !== 'desktop') {
                $body.addClass('breeze-device-mode');
            }

            // Тригерити подію на document
            $(document).trigger('deviceChanged', [device]);

            console.log('Applied device mode:', device, '| Frame:', config.frameWidth);
        },

        _destroy: function() {
            // Знищити device frame
            DeviceFrame.destroy();
            this._super();
        }
    });

    return $.swissup.breezeDeviceSwitcher;
});
