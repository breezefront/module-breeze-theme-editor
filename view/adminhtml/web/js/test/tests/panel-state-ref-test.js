/**
 * PanelState — Ref Aliases Tests
 *
 * Covers:
 *   — init() builds refAliases from fields with originalSectionCode
 *   — init() does not create duplicate state for ref fields
 *   — getFieldState() works via original key, not display key
 *   — setValue() triggers bte:ref-value-changed for each alias
 *   — setValue() does NOT trigger bte:ref-value-changed when no aliases
 *   — clear() resets refAliases
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state'
], function ($, TestFramework, PanelState) {
    'use strict';

    /**
     * Build config with:
     *   - general.primary_color  (original)
     *   - typography.primary_color (ref — originalSectionCode: 'general')
     */
    function makeRefConfig() {
        return {
            sections: [
                {
                    code:   'general',
                    label:  'General',
                    fields: [
                        {
                            code:        'primary_color',
                            type:        'color',
                            label:       'Primary Color',
                            value:       '#1979c3',
                            default:     '#1979c3',
                            property:    '--color-primary',
                            isModified:  false,
                            validation:  {},
                            params:      {}
                        }
                    ]
                },
                {
                    code:   'typography',
                    label:  'Typography',
                    fields: [
                        {
                            code:                'primary_color',
                            type:                'color',
                            label:               'Brand Color',
                            value:               '#1979c3',
                            default:             '#1979c3',
                            property:            '--color-primary',
                            isModified:          false,
                            originalSectionCode: 'general',
                            validation:          {},
                            params:              {}
                        }
                    ]
                }
            ]
        };
    }

    function makeSimpleConfig() {
        return {
            sections: [{
                code:   'general',
                label:  'General',
                fields: [{
                    code:       'font_size',
                    type:       'range',
                    label:      'Font Size',
                    value:      '16px',
                    default:    '16px',
                    property:   '--font-size',
                    isModified: false,
                    validation: {},
                    params:     {}
                }]
            }]
        };
    }

    return TestFramework.suite('PanelState — ref aliases', {

        // ── init ─────────────────────────────────────────────────────────────

        'init: registers refAliases entry for ref field': function () {
            PanelState.init(makeRefConfig());

            this.assertTrue(
                !!PanelState.refAliases['general.primary_color'],
                'refAliases must have entry for original key'
            );
            this.assertEquals(
                PanelState.refAliases['general.primary_color'][0],
                'typography',
                'alias display section must be typography'
            );
        },

        'init: ref field does not create duplicate state entry': function () {
            PanelState.init(makeRefConfig());

            this.assertEquals(
                PanelState.getFieldState('general', 'primary_color') !== null,
                true,
                'original key state must exist'
            );
            this.assertEquals(
                PanelState.getFieldState('typography', 'primary_color'),
                null,
                'ref display key must NOT have its own state entry'
            );
        },

        'init: resets refAliases on re-init': function () {
            PanelState.init(makeRefConfig());
            PanelState.init(makeSimpleConfig());

            this.assertEquals(
                Object.keys(PanelState.refAliases).length,
                0,
                'refAliases must be empty after init with no ref fields'
            );
        },

        // ── setValue ─────────────────────────────────────────────────────────

        'setValue: triggers bte:ref-value-changed for alias sections': function () {
            PanelState.init(makeRefConfig());

            var events = [];
            $(document).on('bte:ref-value-changed.reftest', function (e, data) {
                events.push(data);
            });

            PanelState.setValue('general', 'primary_color', '#ff0000');

            $(document).off('bte:ref-value-changed.reftest');

            this.assertEquals(events.length, 1, 'one event expected');
            this.assertEquals(events[0].originalSectionCode, 'general');
            this.assertEquals(events[0].displaySectionCode,  'typography');
            this.assertEquals(events[0].fieldCode,           'primary_color');
            this.assertEquals(events[0].value,               '#ff0000');
        },

        'setValue: does NOT trigger bte:ref-value-changed for normal fields': function () {
            PanelState.init(makeSimpleConfig());

            var fired = false;
            $(document).on('bte:ref-value-changed.reftest2', function () {
                fired = true;
            });

            PanelState.setValue('general', 'font_size', '18px');

            $(document).off('bte:ref-value-changed.reftest2');

            this.assertEquals(fired, false, 'event must not fire for non-ref field');
        },

        // ── clear ─────────────────────────────────────────────────────────────

        'clear: resets refAliases to empty object': function () {
            PanelState.init(makeRefConfig());

            this.assertTrue(
                Object.keys(PanelState.refAliases).length > 0,
                'refAliases must be populated before clear'
            );

            PanelState.clear();

            this.assertEquals(
                Object.keys(PanelState.refAliases).length,
                0,
                'refAliases must be empty after clear()'
            );
        }

    });
});
