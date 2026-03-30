/**
 * Admin Device Switcher Widget
 * 
 * Змінює ширину iframe для симуляції різних пристроїв.
 * На відміну від frontend версії, НЕ використовує DeviceFrame,
 * оскільки працює в iframe контексті.
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/device-switcher.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, widget, mageTemplate, deviceSwitcherTemplate, Logger, Constants) {
    'use strict';

    var log = Logger.for('toolbar/device-switcher');

    $.widget('swissup.breezeDeviceSwitcher', {
        options: {
            activeClass: 'active',
            devices: [Constants.DEVICES.DESKTOP, Constants.DEVICES.TABLET, Constants.DEVICES.MOBILE],
            activeDevice: Constants.DEVICES.DESKTOP,
            iframeSelector: Constants.SELECTORS.IFRAME,
            deviceConfig: {
                desktop: {
                    icon: require.toUrl('Swissup_BreezeThemeEditor/images/Desktop.svg'),
                    width: '100%',
                    title: 'Desktop'
                },
                tablet: {
                    icon: require.toUrl('Swissup_BreezeThemeEditor/images/Tablet.svg'),
                    width: '768px',
                    title: 'Tablet'
                },
                mobile: {
                    icon: require.toUrl('Swissup_BreezeThemeEditor/images/Phone.svg'),
                    width: '375px',
                    title: 'Mobile'
                }
            }
        },

        /**
         * Initialize widget
         */
        _create: function () {
            this.currentDevice = this.options.activeDevice;
            this.template = mageTemplate(deviceSwitcherTemplate);
            
            this._render();
            this._bind();
            this._applyDevice(this.currentDevice);
            
            log.info('📱 Device switcher initialized:', this.currentDevice);
        },

        /**
         * Render device buttons from template
         */
        _render: function () {
            var devices = this._prepareDevicesData();
            var html = this.template({ 
                data: { 
                    devices: devices 
                } 
            });
            
            this.element.html(html);
        },

        /**
         * Prepare devices data for template
         * @returns {Array}
         */
        _prepareDevicesData: function () {
            var self = this;
            
            return this.options.devices.map(function(deviceName) {
                var config = self.options.deviceConfig[deviceName];
                
                return {
                    name: deviceName,
                    title: config.title,
                    icon: config.icon,
                    active: deviceName === self.options.activeDevice
                };
            });
        },

        /**
         * Bind click events
         */
        _bind: function () {
            this.element.on('click', '.device-btn', $.proxy(this._onDeviceClick, this));
        },

        /**
         * Handle device button click
         * @param {Event} event
         */
        _onDeviceClick: function (event) {
            var $button = $(event.currentTarget);
            var device = $button.data('device');

            if (device === this.currentDevice) {
                return; // Already active
            }

            this._switchDevice(device);
        },

        /**
         * Switch to different device
         * @param {String} device - Device name (desktop, tablet, mobile)
         */
        _switchDevice: function (device) {
            if (!this.options.deviceConfig[device]) {
                log.error('❌ Unknown device:', device);
                return;
            }

            this.currentDevice = device;

            // Update button states
            this.element.find('.device-btn')
                .removeClass(this.options.activeClass);
            this.element.find('[data-device="' + device + '"]')
                .addClass(this.options.activeClass);

            // Apply device width to iframe
            this._applyDevice(device);

            // Trigger event for other components
            this.element.trigger(Constants.EVENTS.DEVICE_CHANGED, [device]);
            
            log.info('📱 Device switched to:', device);
        },

        /**
         * Apply device width to iframe
         * @param {String} device
         */
        _applyDevice: function(device) {
            var config = this.options.deviceConfig[device];
            var $iframe = $(this.options.iframeSelector);
            
            if (!$iframe.length) {
                log.warn('⚠️ Iframe not found:', this.options.iframeSelector);
                return;
            }

            // Apply width with smooth transition
            $iframe.css({
                'width': config.width,
                'max-width': '100%',
                'margin': '0 auto',
                'transition': 'width 0.3s ease'
            });
        },

        /**
         * Get current device
         * @returns {String}
         */
        getDevice: function() {
            return this.currentDevice;
        },

        /**
         * Set device programmatically
         * @param {String} device
         */
        setDevice: function(device) {
            if (this.options.deviceConfig[device]) {
                this._switchDevice(device);
            }
        }
    });

    return $.swissup.breezeDeviceSwitcher;
});
