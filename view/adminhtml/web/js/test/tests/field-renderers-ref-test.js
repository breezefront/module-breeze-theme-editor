/**
 * BaseFieldRenderer — Ref Field Tests
 *
 * Covers:
 *   — prepareData uses originalSectionCode for PanelState lookup
 *   — prepareData sets originalSectionCode in returned data
 *   — prepareData returns null originalSectionCode for normal fields
 *   — buildDataAttributes includes data-original-section for ref fields
 *   — buildDataAttributes omits data-original-section for normal fields
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state'
], function (TestFramework, BaseRenderer, PanelState) {
    'use strict';

    function makeField(overrides) {
        return Object.assign({
            code:       'primary_color',
            label:      'Primary Color',
            type:       'COLOR',
            property:   '--color-primary',
            value:      null,
            default:    '#1979c3',
            isModified: false,
            params:     {}
        }, overrides);
    }

    return TestFramework.suite('BaseFieldRenderer — ref fields', {

        // ── prepareData ───────────────────────────────────────────────────────

        'prepareData: uses originalSectionCode for PanelState lookup': function () {
            // Seed PanelState with state under original key 'general.primary_color'
            PanelState.init({
                sections: [{
                    code:   'general',
                    label:  'General',
                    fields: [{
                        code:       'primary_color',
                        type:       'color',
                        label:      'Primary Color',
                        value:      '#ff0000',
                        default:    '#1979c3',
                        property:   '--color-primary',
                        isModified: true,
                        validation: {},
                        params:     {}
                    }]
                }]
            });

            var field = makeField({ originalSectionCode: 'general' });
            var data  = BaseRenderer.prepareData(field, 'typography');

            // value must come from general.primary_color state, not field.value (null)
            this.assertEquals(data.value,      '#ff0000', 'value from original section state');
            this.assertEquals(data.isModified, true,      'isModified from original section state');

            PanelState.clear();
        },

        'prepareData: sets originalSectionCode in returned data for ref field': function () {
            var field = makeField({ originalSectionCode: 'general' });
            var data  = BaseRenderer.prepareData(field, 'typography');

            this.assertEquals(
                data.originalSectionCode,
                'general',
                'originalSectionCode must be forwarded to template data'
            );
        },

        'prepareData: originalSectionCode is null for normal (non-ref) field': function () {
            var field = makeField();
            var data  = BaseRenderer.prepareData(field, 'general');

            this.assertEquals(
                data.originalSectionCode,
                null,
                'originalSectionCode must be null for normal field'
            );
        },

        // ── buildDataAttributes ───────────────────────────────────────────────

        'buildDataAttributes: includes data-original-section for ref field': function () {
            var field  = makeField({ originalSectionCode: 'general' });
            var attrs  = BaseRenderer.buildDataAttributes(field, 'typography');

            this.assertTrue(
                attrs.indexOf('data-original-section="general"') !== -1,
                'data-original-section attribute must be present for ref field'
            );
        },

        'buildDataAttributes: omits data-original-section for normal field': function () {
            var field = makeField();
            var attrs = BaseRenderer.buildDataAttributes(field, 'general');

            this.assertEquals(
                attrs.indexOf('data-original-section'),
                -1,
                'data-original-section must be absent for normal field'
            );
        }

    });
});
