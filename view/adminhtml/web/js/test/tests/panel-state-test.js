/**
 * PanelState Tests
 *
 * Covers:
 *   — init() resets hiddenFields to {}
 *   — getDirtyChanges() excludes fields listed in hiddenFields
 *   — getDirtyChanges() includes dirty fields NOT in hiddenFields
 *   — bte:field-visibility-changed event updates hiddenFields
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state'
], function ($, TestFramework, PanelState) {
    'use strict';

    // ── Minimal config factory ───────────────────────────────────────────────

    /**
     * Build a minimal GraphQL-style config with one section and given fields.
     *
     * @param {Array}  fields   Array of { code, value, default, property }
     * @param {String} [sectionCode]
     * @returns {Object}
     */
    function makeConfig(fields, sectionCode) {
        sectionCode = sectionCode || 'general';
        return {
            sections: [{
                code:   sectionCode,
                label:  'General',
                fields: fields.map(function (f) {
                    return {
                        code:       f.code,
                        type:       f.type       || 'text',
                        label:      f.label      || f.code,
                        value:      f.value      !== undefined ? f.value      : null,
                        default:    f.default    !== undefined ? f.default    : null,
                        property:   f.property   || '--' + f.code,
                        isModified: !!f.isModified,
                        validation: {},
                        params:     {}
                    };
                })
            }]
        };
    }

    // ── Suite ────────────────────────────────────────────────────────────────

    return TestFramework.suite('PanelState — hiddenFields & getDirtyChanges filtering', {

        // ─── init() resets hiddenFields ───────────────────────────────────────

        'init: resets hiddenFields to empty object': function () {
            PanelState.hiddenFields = { stale_field: true };

            PanelState.init(makeConfig([{ code: 'font_size', value: '16px' }]));

            this.assertEquals(
                Object.keys(PanelState.hiddenFields).length,
                0,
                'hiddenFields must be empty after init()'
            );
        },

        'init: does not reset listeners': function () {
            var called = false;
            var cb = function () { called = true; };

            PanelState.init(makeConfig([{ code: 'f1', value: 'a' }]));
            PanelState.addListener(cb);

            // Second init — listeners must survive
            PanelState.init(makeConfig([{ code: 'f1', value: 'a' }]));

            PanelState.notifyListeners('test', {});

            this.assertTrue(called, 'Listeners must persist across init() calls');

            // cleanup
            PanelState.removeListener(cb);
        },

        // ─── getDirtyChanges() includes / excludes ────────────────────────────

        'getDirtyChanges: includes dirty field when not in hiddenFields': function () {
            PanelState.init(makeConfig([
                { code: 'font_size',   value: '16px' },
                { code: 'custom_font', value: 'Arial' }
            ]));

            // Make font_size dirty
            PanelState.setValue('general', 'font_size', '18px');

            var changes = PanelState.getDirtyChanges();
            var codes = changes.map(function (c) { return c.fieldCode; });

            this.assertTrue(
                codes.indexOf('font_size') !== -1,
                'Dirty visible field must be included in getDirtyChanges()'
            );
        },

        'getDirtyChanges: excludes dirty field when it is in hiddenFields': function () {
            PanelState.init(makeConfig([
                { code: 'font_size',   value: '16px' },
                { code: 'custom_font', value: 'Arial' }
            ]));

            // Make custom_font dirty
            PanelState.setValue('general', 'custom_font', 'Georgia');

            // Simulate DependsEvaluator hiding it
            PanelState.hiddenFields['custom_font'] = true;

            var changes = PanelState.getDirtyChanges();
            var codes = changes.map(function (c) { return c.fieldCode; });

            this.assertEquals(
                codes.indexOf('custom_font'),
                -1,
                'Hidden dirty field must be excluded from getDirtyChanges()'
            );
        },

        'getDirtyChanges: returns empty array when all dirty fields are hidden': function () {
            PanelState.init(makeConfig([
                { code: 'custom_font', value: 'Arial' }
            ]));

            PanelState.setValue('general', 'custom_font', 'Georgia');
            PanelState.hiddenFields['custom_font'] = true;

            var changes = PanelState.getDirtyChanges();

            this.assertEquals(changes.length, 0, 'No changes expected when every dirty field is hidden');
        },

        // ─── bte:field-visibility-changed event integration ───────────────────

        'bte:field-visibility-changed: adds fieldCode to hiddenFields when hidden=true': function () {
            PanelState.init(makeConfig([{ code: 'custom_font', value: 'Arial' }]));

            $(document).trigger('bte:field-visibility-changed', [{ fieldCode: 'custom_font', hidden: true }]);

            this.assertEquals(
                PanelState.hiddenFields['custom_font'],
                true,
                'hiddenFields must contain fieldCode after visibility-changed hidden=true'
            );
        },

        'bte:field-visibility-changed: removes fieldCode from hiddenFields when hidden=false': function () {
            PanelState.init(makeConfig([{ code: 'custom_font', value: 'Arial' }]));
            PanelState.hiddenFields['custom_font'] = true;

            $(document).trigger('bte:field-visibility-changed', [{ fieldCode: 'custom_font', hidden: false }]);

            this.assertEquals(
                PanelState.hiddenFields['custom_font'],
                undefined,
                'hiddenFields must NOT contain fieldCode after visibility-changed hidden=false'
            );
        }

    });
});
