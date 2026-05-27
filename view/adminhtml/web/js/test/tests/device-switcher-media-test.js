/**
 * Device Switcher — media field enable/disable logic tests
 *
 * When device changes, fields with [data-media-device] are:
 *   - enabled   when their device matches active device
 *   - disabled  when their device does not match
 *
 * Fields without [data-media-device] are always enabled (unaffected).
 *
 * CSS class .bte-field-media-inactive is toggled on the parent .bte-field wrapper.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function ($, TestFramework) {
    'use strict';

    // ── Inline device-media sync logic (mirrors production implementation) ──

    var KNOWN_DEVICES = ['desktop', 'tablet', 'mobile'];

    /**
     * Applies device change to a panel element.
     * Mirrors the logic that will live in settings-editor.js.
     *
     * @param {jQuery} $panel
     * @param {String} activeDevice
     */
    function applyDeviceToPanel($panel, activeDevice) {
        $panel.find('[data-media-device]').each(function () {
            var $input  = $(this);
            var $field  = $input.closest('.bte-field');
            var device  = $input.data('media-device');
            var matches = (device === activeDevice);

            $input.prop('disabled', !matches);
            $field.toggleClass('bte-field-media-inactive', !matches);
        });
    }

    // ── DOM factory ──────────────────────────────────────────────────────────

    function makePanel(fields) {
        var $panel = $('<div class="bte-settings-panel"></div>');

        fields.forEach(function (f) {
            var $field = $('<div class="bte-field"></div>');
            var $input = $('<input type="range">');

            if (f.mediaDevice) {
                $input.attr('data-media-device', f.mediaDevice);
            }
            $input.attr('data-field', f.id);
            $field.append($input);
            $panel.append($field);
        });

        return $panel;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    return TestFramework.suite('DeviceSwitcher — media field enable/disable', function (t) {

        // ------------------------------------------------------------------
        // 1. Fields without data-media-device are never touched
        // ------------------------------------------------------------------
        t.test('field without data-media-device is always enabled', function () {
            var $panel = makePanel([{ id: 'font_size' }]);

            applyDeviceToPanel($panel, 'mobile');

            var $input = $panel.find('[data-field="font_size"]');
            t.assertFalse($input.prop('disabled'), 'no-media field stays enabled');
            t.assertFalse($input.closest('.bte-field').hasClass('bte-field-media-inactive'), 'no inactive class');
        });

        // ------------------------------------------------------------------
        // 2. Mobile field: enabled on mobile, disabled on others
        // ------------------------------------------------------------------
        t.test('mobile field enabled only when active device is mobile', function () {
            var $panel = makePanel([{ id: 'font_size_mobile', mediaDevice: 'mobile' }]);
            var $input = $panel.find('[data-field="font_size_mobile"]');
            var $field = $input.closest('.bte-field');

            applyDeviceToPanel($panel, 'mobile');
            t.assertFalse($input.prop('disabled'), 'enabled on mobile');
            t.assertFalse($field.hasClass('bte-field-media-inactive'), 'no inactive on mobile');

            applyDeviceToPanel($panel, 'desktop');
            t.assertTrue($input.prop('disabled'), 'disabled on desktop');
            t.assertTrue($field.hasClass('bte-field-media-inactive'), 'inactive on desktop');

            applyDeviceToPanel($panel, 'tablet');
            t.assertTrue($input.prop('disabled'), 'disabled on tablet');
        });

        // ------------------------------------------------------------------
        // 3. Tablet field: enabled only on tablet
        // ------------------------------------------------------------------
        t.test('tablet field enabled only when active device is tablet', function () {
            var $panel = makePanel([{ id: 'font_size_tablet', mediaDevice: 'tablet' }]);
            var $input = $panel.find('[data-field="font_size_tablet"]');

            applyDeviceToPanel($panel, 'tablet');
            t.assertFalse($input.prop('disabled'), 'enabled on tablet');

            applyDeviceToPanel($panel, 'desktop');
            t.assertTrue($input.prop('disabled'), 'disabled on desktop');

            applyDeviceToPanel($panel, 'mobile');
            t.assertTrue($input.prop('disabled'), 'disabled on mobile');
        });

        // ------------------------------------------------------------------
        // 4. Desktop field: enabled only on desktop
        // ------------------------------------------------------------------
        t.test('desktop field enabled only when active device is desktop', function () {
            var $panel = makePanel([{ id: 'font_size_desktop', mediaDevice: 'desktop' }]);
            var $input = $panel.find('[data-field="font_size_desktop"]');

            applyDeviceToPanel($panel, 'desktop');
            t.assertFalse($input.prop('disabled'), 'enabled on desktop');

            applyDeviceToPanel($panel, 'tablet');
            t.assertTrue($input.prop('disabled'), 'disabled on tablet');

            applyDeviceToPanel($panel, 'mobile');
            t.assertTrue($input.prop('disabled'), 'disabled on mobile');
        });

        // ------------------------------------------------------------------
        // 5. Mixed panel: correct fields enabled/disabled per device
        // ------------------------------------------------------------------
        t.test('mixed panel: correct state per device', function () {
            var $panel = makePanel([
                { id: 'base' },                                    // no media — always enabled
                { id: 'mobile_size', mediaDevice: 'mobile' },
                { id: 'tablet_size', mediaDevice: 'tablet' },
            ]);

            applyDeviceToPanel($panel, 'mobile');

            t.assertFalse($panel.find('[data-field="base"]').prop('disabled'),         'base always enabled');
            t.assertFalse($panel.find('[data-field="mobile_size"]').prop('disabled'),  'mobile enabled on mobile');
            t.assertTrue( $panel.find('[data-field="tablet_size"]').prop('disabled'),  'tablet disabled on mobile');

            applyDeviceToPanel($panel, 'tablet');

            t.assertFalse($panel.find('[data-field="base"]').prop('disabled'),         'base always enabled');
            t.assertTrue( $panel.find('[data-field="mobile_size"]').prop('disabled'),  'mobile disabled on tablet');
            t.assertFalse($panel.find('[data-field="tablet_size"]').prop('disabled'),  'tablet enabled on tablet');

            applyDeviceToPanel($panel, 'desktop');

            t.assertFalse($panel.find('[data-field="base"]').prop('disabled'),         'base always enabled');
            t.assertTrue( $panel.find('[data-field="mobile_size"]').prop('disabled'),  'mobile disabled on desktop');
            t.assertTrue( $panel.find('[data-field="tablet_size"]').prop('disabled'),  'tablet disabled on desktop');
        });

        // ------------------------------------------------------------------
        // 6. bte-field-media-inactive CSS class toggled correctly
        // ------------------------------------------------------------------
        t.test('bte-field-media-inactive class toggled on field wrapper', function () {
            var $panel = makePanel([{ id: 'size_mobile', mediaDevice: 'mobile' }]);
            var $field = $panel.find('[data-field="size_mobile"]').closest('.bte-field');

            applyDeviceToPanel($panel, 'desktop');
            t.assertTrue($field.hasClass('bte-field-media-inactive'), 'inactive class on desktop');

            applyDeviceToPanel($panel, 'mobile');
            t.assertFalse($field.hasClass('bte-field-media-inactive'), 'inactive class removed on mobile');
        });

        // ------------------------------------------------------------------
        // 7. Re-enabling: disabled → enabled clears prop correctly
        // ------------------------------------------------------------------
        t.test('switching back to correct device re-enables field', function () {
            var $panel = makePanel([{ id: 'size_mobile', mediaDevice: 'mobile' }]);
            var $input = $panel.find('[data-field="size_mobile"]');

            applyDeviceToPanel($panel, 'desktop');
            t.assertTrue($input.prop('disabled'), 'disabled on desktop');

            applyDeviceToPanel($panel, 'mobile');
            t.assertFalse($input.prop('disabled'), 're-enabled on mobile');
        });

    });
});
