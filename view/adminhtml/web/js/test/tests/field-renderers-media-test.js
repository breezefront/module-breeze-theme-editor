/**
 * BaseFieldRenderer — media property tests
 *
 * Covers:
 *   — prepareData sets mediaAttr to 'data-media="..."' when media is present
 *   — prepareData sets mediaAttr to '' when media is absent/null
 *   — buildDataAttributes includes data-media for fields with media
 *   — buildDataAttributes omits data-media for fields without media
 *   — media and selector can coexist (both attrs emitted)
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base'
], function (TestFramework, BaseRenderer) {
    'use strict';

    function makeField(overrides) {
        return Object.assign({
            code:       'font_size',
            label:      'Font Size',
            type:       'RANGE',
            property:   '--font-size',
            value:      null,
            default:    '16px',
            selector:   null,
            media:      null,
            isModified: false,
            params:     {}
        }, overrides);
    }

    return TestFramework.suite('BaseFieldRenderer — media property', {

        // ── prepareData: mediaAttr ────────────────────────────────────────────

        'prepareData: mediaAttr is empty string when media is null': function () {
            var field = makeField({ media: null });
            var data  = BaseRenderer.prepareData(field, 'typography');

            this.assertEquals(data.mediaAttr, '', 'mediaAttr must be empty string when no media');
        },

        'prepareData: mediaAttr contains data-media when media is set': function () {
            var field = makeField({ media: '(max-width: 767px)' });
            var data  = BaseRenderer.prepareData(field, 'typography');

            this.assertEquals(
                data.mediaAttr,
                'data-media="(max-width: 767px)"',
                'mediaAttr must be data-media attribute string'
            );
        },

        'prepareData: mediaAttr correct for tablet media': function () {
            var field = makeField({ media: '(max-width: 1023px)' });
            var data  = BaseRenderer.prepareData(field, 'typography');

            this.assertEquals(
                data.mediaAttr,
                'data-media="(max-width: 1023px)"',
                'tablet media attribute correct'
            );
        },

        'prepareData: mediaAttr correct for desktop media': function () {
            var field = makeField({ media: '(min-width: 1024px)' });
            var data  = BaseRenderer.prepareData(field, 'typography');

            this.assertEquals(
                data.mediaAttr,
                'data-media="(min-width: 1024px)"',
                'desktop media attribute correct'
            );
        },

        // ── prepareData: selector + media coexist ─────────────────────────────

        'prepareData: selectorAttr and mediaAttr both set when both present': function () {
            var field = makeField({
                selector: '.columns-container',
                media:    '(max-width: 767px)'
            });
            var data = BaseRenderer.prepareData(field, 'layout');

            this.assertEquals(
                data.selectorAttr,
                'data-selector=".columns-container"',
                'selectorAttr present'
            );
            this.assertEquals(
                data.mediaAttr,
                'data-media="(max-width: 767px)"',
                'mediaAttr present'
            );
        },

        // ── buildDataAttributes ───────────────────────────────────────────────

        'buildDataAttributes: includes data-media when media is set': function () {
            var field = makeField({ media: '(max-width: 767px)' });
            var attrs = BaseRenderer.buildDataAttributes(field);

            this.assertTrue(
                attrs.indexOf('data-media="(max-width: 767px)"') !== -1,
                'data-media attr present in buildDataAttributes output'
            );
        },

        'buildDataAttributes: omits data-media when media is null': function () {
            var field = makeField({ media: null });
            var attrs = BaseRenderer.buildDataAttributes(field);

            this.assertTrue(
                attrs.indexOf('data-media') === -1,
                'data-media must not appear when media is null'
            );
        },

        'buildDataAttributes: data-selector and data-media both present': function () {
            var field = makeField({
                selector: '.hero',
                media:    '(max-width: 767px)'
            });
            var attrs = BaseRenderer.buildDataAttributes(field);

            this.assertTrue(attrs.indexOf('data-selector=".hero"') !== -1,            'data-selector present');
            this.assertTrue(attrs.indexOf('data-media="(max-width: 767px)"') !== -1,  'data-media present');
        },

    });
});
