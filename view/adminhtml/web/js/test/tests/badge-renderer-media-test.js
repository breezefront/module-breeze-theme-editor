/**
 * BadgeRenderer — media device badge tests
 *
 * Covers:
 *   isKnownMediaAlias(alias)  — true for mobile/tablet/desktop, false otherwise
 *   renderMediaBadge(alias)   — returns <span.bte-badge-media><img ...></span> or ''
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/badge-renderer'
], function (TestFramework, BadgeRenderer) {
    'use strict';

    return TestFramework.suite('BadgeRenderer — media device badge', {

        // ── isKnownMediaAlias ─────────────────────────────────────────────────

        'isKnownMediaAlias: true for mobile': function () {
            this.assertTrue(BadgeRenderer.isKnownMediaAlias('mobile'), 'mobile is known');
        },

        'isKnownMediaAlias: true for tablet': function () {
            this.assertTrue(BadgeRenderer.isKnownMediaAlias('tablet'), 'tablet is known');
        },

        'isKnownMediaAlias: true for desktop': function () {
            this.assertTrue(BadgeRenderer.isKnownMediaAlias('desktop'), 'desktop is known');
        },

        'isKnownMediaAlias: false for raw query': function () {
            this.assertFalse(BadgeRenderer.isKnownMediaAlias('(max-width: 768px)'), 'raw query not known');
        },

        'isKnownMediaAlias: false for null': function () {
            this.assertFalse(BadgeRenderer.isKnownMediaAlias(null), 'null not known');
        },

        'isKnownMediaAlias: false for empty string': function () {
            this.assertFalse(BadgeRenderer.isKnownMediaAlias(''), 'empty string not known');
        },

        'isKnownMediaAlias: false for unknown string': function () {
            this.assertFalse(BadgeRenderer.isKnownMediaAlias('widescreen'), 'unknown alias not known');
        },

        // ── renderMediaBadge ──────────────────────────────────────────────────

        'renderMediaBadge: returns empty string for null': function () {
            this.assertEquals(BadgeRenderer.renderMediaBadge(null), '', 'null → empty');
        },

        'renderMediaBadge: returns empty string for raw query': function () {
            this.assertEquals(BadgeRenderer.renderMediaBadge('(max-width: 768px)'), '', 'raw query → empty');
        },

        'renderMediaBadge: returns empty string for unknown alias': function () {
            this.assertEquals(BadgeRenderer.renderMediaBadge('widescreen'), '', 'unknown → empty');
        },

        'renderMediaBadge: mobile — has bte-badge-media class': function () {
            var html = BadgeRenderer.renderMediaBadge('mobile');
            this.assertTrue(html.indexOf('bte-badge-media') !== -1, 'badge class present');
        },

        'renderMediaBadge: mobile — has img element': function () {
            var html = BadgeRenderer.renderMediaBadge('mobile');
            this.assertTrue(html.indexOf('<img') !== -1, 'img element present');
        },

        'renderMediaBadge: mobile — has title="Mobile"': function () {
            var html = BadgeRenderer.renderMediaBadge('mobile');
            this.assertTrue(html.indexOf('title="Mobile"') !== -1, 'title attribute present');
        },

        'renderMediaBadge: mobile — img src contains Phone.svg': function () {
            var html = BadgeRenderer.renderMediaBadge('mobile');
            this.assertTrue(html.indexOf('Phone.svg') !== -1, 'Phone.svg in src');
        },

        'renderMediaBadge: tablet — img src contains Tablet.svg': function () {
            var html = BadgeRenderer.renderMediaBadge('tablet');
            this.assertTrue(html.indexOf('Tablet.svg') !== -1, 'Tablet.svg in src');
        },

        'renderMediaBadge: desktop — img src contains Desktop.svg': function () {
            var html = BadgeRenderer.renderMediaBadge('desktop');
            this.assertTrue(html.indexOf('Desktop.svg') !== -1, 'Desktop.svg in src');
        },

        'renderMediaBadge: mobile — has alt=""': function () {
            var html = BadgeRenderer.renderMediaBadge('mobile');
            this.assertTrue(html.indexOf('alt=""') !== -1, 'alt is empty string');
        },

        'renderMediaBadge: mobile — label text visible next to icon': function () {
            var html = BadgeRenderer.renderMediaBadge('mobile');
            this.assertTrue(html.indexOf('Mobile') !== -1, 'label text present');
            this.assertTrue(html.indexOf('<img') !== -1, 'icon present alongside text');
        },

        'renderMediaBadge: has width and height 12': function () {
            var html = BadgeRenderer.renderMediaBadge('tablet');
            this.assertTrue(html.indexOf('width="12"') !== -1, 'width=12 present');
            this.assertTrue(html.indexOf('height="12"') !== -1, 'height=12 present');
        },

    });
});
