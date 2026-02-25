/**
 * Storage Helper Test Suite
 *
 * Tests for new JSON-based methods added to StorageHelper:
 * - getOpenSections() / setOpenSections()
 * - getLivePreviewChanges() / setLivePreviewChanges() / clearLivePreviewChanges()
 *
 * The core infrastructure (key scoping, migration, isolation) is already
 * covered by url-navigation-persistence-test.js.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper'
], function ($, TestFramework, StorageHelper) {
    'use strict';

    var STORE = 99;
    var THEME = 99;
    var KEY_SECTIONS = 'bte_' + STORE + '_' + THEME + '_open_sections';
    var KEY_PREVIEW  = 'bte_' + STORE + '_' + THEME + '_live_preview_changes';

    function setup() {
        StorageHelper.init(STORE, THEME);
        localStorage.removeItem(KEY_SECTIONS);
        localStorage.removeItem(KEY_PREVIEW);
        // Also remove old unscoped keys — getItem() falls back to these via migration logic
        localStorage.removeItem('bte_open_sections');
        localStorage.removeItem('bte_live_preview_changes');
    }

    return TestFramework.suite('Storage Helper — JSON methods', {

        // ====================================================================
        // GROUP 1: getOpenSections / setOpenSections (5 tests)
        // ====================================================================

        'getOpenSections() should return empty array when not set': function () {
            setup();

            var result = StorageHelper.getOpenSections();

            this.assertTrue(Array.isArray(result), 'Should return an array');
            this.assertEquals(result.length, 0, 'Array should be empty');

            console.log('✅ getOpenSections() returns [] when not set');
        },

        'setOpenSections() + getOpenSections() round-trip preserves array': function () {
            setup();

            var sections = ['typography', 'colors', 'spacing'];
            StorageHelper.setOpenSections(sections);
            var result = StorageHelper.getOpenSections();

            this.assertEquals(result.length, 3, 'Should have 3 sections');
            this.assertEquals(result[0], 'typography', 'First element should match');
            this.assertEquals(result[1], 'colors',     'Second element should match');
            this.assertEquals(result[2], 'spacing',    'Third element should match');

            console.log('✅ setOpenSections() + getOpenSections() round-trip works');
        },

        'setOpenSections() stores under scoped key': function () {
            setup();

            StorageHelper.setOpenSections(['typography']);
            var raw = localStorage.getItem(KEY_SECTIONS);

            this.assertNotNull(raw, 'Scoped key should exist in localStorage');
            this.assertEquals(raw, '["typography"]', 'Raw value should be JSON string');

            console.log('✅ setOpenSections() uses scoped key: ' + KEY_SECTIONS);
        },

        'setOpenSections([]) saves empty state, getOpenSections() returns []': function () {
            setup();

            StorageHelper.setOpenSections(['typography']);
            StorageHelper.setOpenSections([]);
            var result = StorageHelper.getOpenSections();

            this.assertTrue(Array.isArray(result), 'Should still return an array');
            this.assertEquals(result.length, 0, 'Array should be empty after clearing');

            console.log('✅ setOpenSections([]) correctly stores empty state');
        },

        'getOpenSections() returns [] when localStorage contains corrupted JSON': function () {
            setup();
            localStorage.setItem(KEY_SECTIONS, 'not-valid-json{{');

            var result = StorageHelper.getOpenSections();

            this.assertTrue(Array.isArray(result), 'Should return array on parse error');
            this.assertEquals(result.length, 0, 'Should return empty array on parse error');

            console.log('✅ getOpenSections() handles corrupted JSON gracefully');
        },

        // ====================================================================
        // GROUP 2: getLivePreviewChanges / setLivePreviewChanges /
        //          clearLivePreviewChanges (6 tests)
        // ====================================================================

        'getLivePreviewChanges() should return empty object when not set': function () {
            setup();

            var result = StorageHelper.getLivePreviewChanges();

            this.assertNotNull(result, 'Should not return null');
            this.assertEquals(typeof result, 'object', 'Should return an object');
            this.assertEquals(Object.keys(result).length, 0, 'Object should be empty');

            console.log('✅ getLivePreviewChanges() returns {} when not set');
        },

        'setLivePreviewChanges() + getLivePreviewChanges() round-trip preserves object': function () {
            setup();

            var changes = {
                '--color-primary': '#ff0000',
                '--font-size-base': '16px'
            };
            StorageHelper.setLivePreviewChanges(changes);
            var result = StorageHelper.getLivePreviewChanges();

            this.assertEquals(result['--color-primary'], '#ff0000', 'Color value should match');
            this.assertEquals(result['--font-size-base'], '16px',   'Font size should match');
            this.assertEquals(Object.keys(result).length, 2,        'Should have 2 keys');

            console.log('✅ setLivePreviewChanges() + getLivePreviewChanges() round-trip works');
        },

        'setLivePreviewChanges() stores under scoped key': function () {
            setup();

            StorageHelper.setLivePreviewChanges({'--color-primary': '#abc'});
            var raw = localStorage.getItem(KEY_PREVIEW);

            this.assertNotNull(raw, 'Scoped key should exist in localStorage');
            this.assertStringContains(raw, '--color-primary', 'Raw JSON should contain the variable name');

            console.log('✅ setLivePreviewChanges() uses scoped key: ' + KEY_PREVIEW);
        },

        'clearLivePreviewChanges() removes key from localStorage': function () {
            setup();

            StorageHelper.setLivePreviewChanges({'--color-primary': '#abc'});
            StorageHelper.clearLivePreviewChanges();

            var raw = localStorage.getItem(KEY_PREVIEW);
            var result = StorageHelper.getLivePreviewChanges();

            this.assertNull(raw, 'Scoped key should be removed from localStorage');
            this.assertEquals(Object.keys(result).length, 0, 'getLivePreviewChanges() should return {} after clear');

            console.log('✅ clearLivePreviewChanges() removes key and returns {} afterwards');
        },

        'getLivePreviewChanges() returns {} when localStorage contains corrupted JSON': function () {
            setup();
            localStorage.setItem(KEY_PREVIEW, '{broken::json}');

            var result = StorageHelper.getLivePreviewChanges();

            this.assertEquals(typeof result, 'object', 'Should return object on parse error');
            this.assertEquals(Object.keys(result).length, 0, 'Should return empty object on parse error');

            console.log('✅ getLivePreviewChanges() handles corrupted JSON gracefully');
        },

        'live_preview_changes are isolated between themes': function () {
            // Theme A — store 1, theme 10
            StorageHelper.init(1, 10);
            localStorage.removeItem('bte_1_10_live_preview_changes');
            StorageHelper.setLivePreviewChanges({'--color-primary': 'red'});

            // Theme B — store 1, theme 20
            StorageHelper.init(1, 20);
            localStorage.removeItem('bte_1_20_live_preview_changes');
            StorageHelper.setLivePreviewChanges({'--color-primary': 'blue'});

            // Verify theme A value is unchanged
            StorageHelper.init(1, 10);
            var themeAChanges = StorageHelper.getLivePreviewChanges();

            // Verify theme B value is independent
            StorageHelper.init(1, 20);
            var themeBChanges = StorageHelper.getLivePreviewChanges();

            this.assertEquals(themeAChanges['--color-primary'], 'red',  'Theme A value should be "red"');
            this.assertEquals(themeBChanges['--color-primary'], 'blue', 'Theme B value should be "blue"');

            // Cleanup
            localStorage.removeItem('bte_1_10_live_preview_changes');
            localStorage.removeItem('bte_1_20_live_preview_changes');

            console.log('✅ live_preview_changes are isolated between themes');
        }
    });
});
