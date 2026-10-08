/**
 * Palette Section Permissions Tests
 *
 * Palette colors are saved straight to the published state, which the server
 * only allows with the publish permission. Without it the palette section must
 * stay read-only even in DRAFT mode.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/palette-section-renderer'
], function ($, TestFramework, configManager) {
    'use strict';

    function buildFixture() {
        var $el = $('<div>').appendTo(document.body);
        $el.paletteSection({ palettes: [] });
        return $el;
    }

    function tearDown($el) {
        try { $el.paletteSection('destroy'); } catch (e) {}
        $el.remove();
    }

    function isDisabled($el) {
        return $el.data('swissupPaletteSection').$content.hasClass('bte-field-disabled');
    }

    return TestFramework.suite('paletteSection permissions', {

        'stays read-only in DRAFT mode without the publish permission': function () {
            var previous = configManager.get();
            configManager.set($.extend({}, previous, { permissions: { canEdit: true, canPublish: false } }));
            var $el = buildFixture();

            try {
                $(document).trigger('bte:editabilityChanged', { isEditable: true });

                this.assertTrue(isDisabled($el), 'palette must be disabled without canPublish');
            } finally {
                tearDown($el);
                configManager.set(previous);
            }
        },

        'is editable in DRAFT mode with the publish permission': function () {
            var previous = configManager.get();
            configManager.set($.extend({}, previous, { permissions: { canEdit: true, canPublish: true } }));
            var $el = buildFixture();

            try {
                $(document).trigger('bte:editabilityChanged', { isEditable: true });

                this.assertFalse(isDisabled($el), 'palette must be enabled with canPublish');
            } finally {
                tearDown($el);
                configManager.set(previous);
            }
        },

        'stays read-only when the status is not DRAFT even with the publish permission': function () {
            var previous = configManager.get();
            configManager.set($.extend({}, previous, { permissions: { canEdit: true, canPublish: true } }));
            var $el = buildFixture();

            try {
                $(document).trigger('bte:editabilityChanged', { isEditable: false });

                this.assertTrue(isDisabled($el), 'palette must be disabled in PUBLISHED mode');
            } finally {
                tearDown($el);
                configManager.set(previous);
            }
        }
    });
});
