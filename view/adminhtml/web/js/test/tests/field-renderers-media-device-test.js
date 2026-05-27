/**
 * BaseFieldRenderer — mediaDeviceAttr + mediaBadgeHtml tests
 *
 * mediaAlias = original value from settings.json ('mobile', 'tablet', 'desktop', raw, null)
 *
 * Rules:
 *   - Known alias (mobile/tablet/desktop) → data-media-device attr + badge
 *   - Raw query string                    → no data-media-device, no badge
 *   - null / absent                       → no data-media-device, no badge
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base'
], function (TestFramework, BaseRenderer) {
    'use strict';

    var KNOWN_ALIASES = ['mobile', 'tablet', 'desktop'];

    function makeField(overrides) {
        return Object.assign({
            code:        'font_size',
            label:       'Font Size',
            type:        'RANGE',
            property:    '--font-size',
            value:       null,
            default:     '16px',
            selector:    null,
            media:       null,
            mediaAlias:  null,
            isModified:  false,
            params:      {}
        }, overrides);
    }

    return TestFramework.suite('BaseFieldRenderer — mediaDeviceAttr + mediaBadgeHtml', {

        // ── mediaDeviceAttr ───────────────────────────────────────────────────

        'mediaDeviceAttr: empty when mediaAlias is null': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: null }), 'typography');
            this.assertEquals(data.mediaDeviceAttr, '', 'no attr when mediaAlias null');
        },

        'mediaDeviceAttr: set for mobile alias': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: 'mobile' }), 'typography');
            this.assertEquals(data.mediaDeviceAttr, 'data-media-device="mobile"', 'mobile attr');
        },

        'mediaDeviceAttr: set for tablet alias': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: 'tablet' }), 'typography');
            this.assertEquals(data.mediaDeviceAttr, 'data-media-device="tablet"', 'tablet attr');
        },

        'mediaDeviceAttr: set for desktop alias': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: 'desktop' }), 'typography');
            this.assertEquals(data.mediaDeviceAttr, 'data-media-device="desktop"', 'desktop attr');
        },

        'mediaDeviceAttr: empty for raw query (not a device alias)': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: '(max-width: 768px)' }), 'typography');
            this.assertEquals(data.mediaDeviceAttr, '', 'no attr for raw query');
        },

        // ── mediaBadgeHtml ────────────────────────────────────────────────────

        'mediaBadgeHtml: empty when mediaAlias is null': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: null }), 'typography');
            this.assertEquals(data.mediaBadgeHtml, '', 'no badge when no media');
        },

        'mediaBadgeHtml: contains mobile label for mobile alias': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: 'mobile' }), 'typography');
            this.assertTrue(data.mediaBadgeHtml.indexOf('bte-badge-media') !== -1, 'badge class present');
            this.assertTrue(data.mediaBadgeHtml.toLowerCase().indexOf('mobile') !== -1, 'mobile label present');
            this.assertTrue(data.mediaBadgeHtml.indexOf('<img') !== -1, 'badge uses img element');
            this.assertTrue(data.mediaBadgeHtml.indexOf('title="Mobile"') !== -1, 'badge has title attribute');
        },

        'mediaBadgeHtml: contains tablet label for tablet alias': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: 'tablet' }), 'typography');
            this.assertTrue(data.mediaBadgeHtml.toLowerCase().indexOf('tablet') !== -1, 'tablet label present');
            this.assertTrue(data.mediaBadgeHtml.indexOf('<img') !== -1, 'badge uses img element');
        },

        'mediaBadgeHtml: contains desktop label for desktop alias': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: 'desktop' }), 'typography');
            this.assertTrue(data.mediaBadgeHtml.toLowerCase().indexOf('desktop') !== -1, 'desktop label present');
            this.assertTrue(data.mediaBadgeHtml.indexOf('<img') !== -1, 'badge uses img element');
        },

        'mediaBadgeHtml: empty for raw query': function () {
            var data = BaseRenderer.prepareData(makeField({ mediaAlias: '(max-width: 768px)' }), 'typography');
            this.assertEquals(data.mediaBadgeHtml, '', 'no badge for raw query');
        },

        // ── buildDataAttributes ───────────────────────────────────────────────

        'buildDataAttributes: includes data-media-device for known alias': function () {
            var field = makeField({ mediaAlias: 'mobile' });
            var attrs = BaseRenderer.buildDataAttributes(field, 'typography');
            this.assertTrue(attrs.indexOf('data-media-device="mobile"') !== -1, 'data-media-device in attrs');
        },

        'buildDataAttributes: omits data-media-device for raw query': function () {
            var field = makeField({ mediaAlias: '(max-width: 768px)' });
            var attrs = BaseRenderer.buildDataAttributes(field, 'typography');
            this.assertTrue(attrs.indexOf('data-media-device') === -1, 'no data-media-device for raw');
        },

        'buildDataAttributes: omits data-media-device when mediaAlias null': function () {
            var field = makeField({ mediaAlias: null });
            var attrs = BaseRenderer.buildDataAttributes(field, 'typography');
            this.assertTrue(attrs.indexOf('data-media-device') === -1, 'no data-media-device when null');
        },

    });
});
