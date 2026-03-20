/**
 * Device Switcher Widget Test Suite
 *
 * Tests for toolbar/device-switcher.js:
 * - _prepareDevicesData()   — transforms options.devices into template-ready objects
 * - _switchDevice()         — updates currentDevice, active class, triggers event
 * - getDevice()             — returns currentDevice
 * - setDevice()             — delegates to _switchDevice for known devices
 *
 * These tests initialise the widget against a scratch DOM element so they
 * do NOT depend on the live admin toolbar being present.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/device-switcher'
], function ($, TestFramework, DeviceSwitcherWidget) {
    'use strict';

    /**
     * Build a minimal DOM environment for the widget.
     * Returns { $container, $iframe, widget, cleanup }.
     */
    function makeEnv(id, activeDevice) {
        var containerId = id + '-container';
        var iframeId    = id + '-iframe';

        var $container = $('<div id="' + containerId + '"></div>');
        var $iframe    = $('<div id="' + iframeId + '" style="width:100%"></div>'); // div acts as iframe stand-in

        $('body').append($container).append($iframe);

        $container.breezeDeviceSwitcher({
            activeDevice:    activeDevice || 'desktop',
            iframeSelector:  '#' + iframeId
        });

        var widget = $container.data('swissupBreezeDeviceSwitcher');

        return {
            $container: $container,
            $iframe:    $iframe,
            widget:     widget,
            cleanup: function () {
                $container.remove();
                $iframe.remove();
            }
        };
    }

    return TestFramework.suite('Device Switcher Widget', {

        // ====================================================================
        // GROUP 1: _prepareDevicesData() — 3 tests
        // ====================================================================

        '_prepareDevicesData() returns one entry per device': function () {
            var env = makeEnv('bte-ds-1');

            var data = env.widget._prepareDevicesData();

            this.assertEquals(data.length, 3, 'Should return 3 device entries');

            env.cleanup();
            console.log('✅ _prepareDevicesData() returns 3 entries');
        },

        '_prepareDevicesData() marks only activeDevice as active': function () {
            var env = makeEnv('bte-ds-2', 'tablet');

            var data = env.widget._prepareDevicesData();
            var activeItems = data.filter(function (d) { return d.active; });

            this.assertEquals(activeItems.length, 1,      'Exactly one device should be active');
            this.assertEquals(activeItems[0].name, 'tablet', 'tablet should be the active device');

            env.cleanup();
            console.log('✅ _prepareDevicesData() marks correct device as active');
        },

        '_prepareDevicesData() includes name, title, and icon for each device': function () {
            var env = makeEnv('bte-ds-3');

            var data = env.widget._prepareDevicesData();

            data.forEach(function (d) {
                this.assertNotNull(d.name,  'Device should have name');
                this.assertNotNull(d.title, 'Device should have title');
                this.assertNotNull(d.icon,  'Device should have icon');
            }, this);

            env.cleanup();
            console.log('✅ _prepareDevicesData() provides name/title/icon for all devices');
        },

        // ====================================================================
        // GROUP 2: getDevice() / setDevice() — 3 tests
        // ====================================================================

        'getDevice() returns the initial activeDevice': function () {
            var env = makeEnv('bte-ds-4', 'mobile');

            this.assertEquals(env.widget.getDevice(), 'mobile', 'getDevice() should return initial device');

            env.cleanup();
            console.log('✅ getDevice() returns initial activeDevice');
        },

        'setDevice() changes currentDevice': function () {
            var env = makeEnv('bte-ds-5', 'desktop');

            env.widget.setDevice('tablet');

            this.assertEquals(env.widget.getDevice(), 'tablet', 'getDevice() should reflect new device');

            env.cleanup();
            console.log('✅ setDevice() updates currentDevice');
        },

        'setDevice() with unknown device is a no-op': function () {
            var env = makeEnv('bte-ds-6', 'desktop');

            env.widget.setDevice('smartwatch');

            this.assertEquals(env.widget.getDevice(), 'desktop', 'Unknown device should not change currentDevice');

            env.cleanup();
            console.log('✅ setDevice() ignores unknown devices');
        },

        // ====================================================================
        // GROUP 3: _switchDevice() — DOM and event (3 tests)
        // ====================================================================

        '_switchDevice() adds active class to the correct button': function () {
            var env = makeEnv('bte-ds-7', 'desktop');

            env.widget._switchDevice('mobile');

            var $activeBtn = env.$container.find('[data-device="mobile"]');
            this.assertTrue($activeBtn.hasClass('active'), 'mobile button should have active class');

            var $otherBtn = env.$container.find('[data-device="desktop"]');
            this.assertFalse($otherBtn.hasClass('active'), 'desktop button should not have active class');

            env.cleanup();
            console.log('✅ _switchDevice() updates active class on buttons');
        },

        '_switchDevice() triggers deviceChanged event with device name': function () {
            var env = makeEnv('bte-ds-8', 'desktop');
            var triggered = false;
            var triggeredDevice = null;

            env.$container.on('deviceChanged', function (e, device) {
                triggered = true;
                triggeredDevice = device;
            });

            env.widget._switchDevice('tablet');

            this.assertTrue(triggered,              'deviceChanged event should be triggered');
            this.assertEquals(triggeredDevice, 'tablet', 'Event should carry the new device name');

            env.cleanup();
            console.log('✅ _switchDevice() triggers deviceChanged event');
        },

        '_switchDevice() with unknown device is a no-op': function () {
            var env = makeEnv('bte-ds-9', 'desktop');

            env.widget._switchDevice('fridge');

            this.assertEquals(env.widget.getDevice(), 'desktop', 'Unknown device should not change currentDevice');

            env.cleanup();
            console.log('✅ _switchDevice() ignores unknown device names');
        }
    });
});
