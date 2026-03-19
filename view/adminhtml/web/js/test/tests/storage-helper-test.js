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

    /** Read a scoped value directly from the "bte" object in localStorage */
    function readRaw(storeId, themeId, key) {
        try {
            var obj = JSON.parse(localStorage.getItem('bte')) || {};
            var store = obj[String(storeId)];
            if (!store) return null;
            var theme = store[String(themeId)];
            if (!theme) return null;
            var val = theme[key];
            return val === undefined ? null : val;
        } catch (e) {
            return null;
        }
    }

    function setup() {
        StorageHelper.init(STORE, THEME);

        // Remove our scoped entries from the "bte" object
        try {
            var obj = JSON.parse(localStorage.getItem('bte')) || {};
            if (obj[String(STORE)] && obj[String(STORE)][String(THEME)]) {
                delete obj[String(STORE)][String(THEME)]['open_sections'];
                delete obj[String(STORE)][String(THEME)]['live_preview_changes'];
                localStorage.setItem('bte', JSON.stringify(obj));
            }
        } catch (e) { /* ignore */ }

        // Also remove any leftover legacy keys
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
            var raw = readRaw(STORE, THEME, 'open_sections');

            this.assertNotNull(raw, 'Scoped key should exist in bte object');
            this.assertEquals(raw, '["typography"]', 'Raw value should be JSON string');

            console.log('✅ setOpenSections() uses scoped key: bte.' + STORE + '.' + THEME + '.open_sections');
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
            var raw = readRaw(STORE, THEME, 'live_preview_changes');

            this.assertNotNull(raw, 'Scoped key should exist in bte object');
            this.assertStringContains(raw, '--color-primary', 'Raw JSON should contain the variable name');

            console.log('✅ setLivePreviewChanges() uses scoped key: bte.' + STORE + '.' + THEME + '.live_preview_changes');
        },

        'clearLivePreviewChanges() removes key from localStorage': function () {
            setup();

            StorageHelper.setLivePreviewChanges({'--color-primary': '#abc'});
            StorageHelper.clearLivePreviewChanges();

            var raw = readRaw(STORE, THEME, 'live_preview_changes');
            var result = StorageHelper.getLivePreviewChanges();

            this.assertNull(raw, 'Scoped key should be removed from bte object');
            this.assertEquals(Object.keys(result).length, 0, 'getLivePreviewChanges() should return {} after clear');

            console.log('✅ clearLivePreviewChanges() removes key and returns {} afterwards');
        },

        'getLivePreviewChanges() returns {} when localStorage contains corrupted JSON': function () {
            setup();

            // Write corrupted JSON directly into bte object at the right scope
            try {
                var obj = JSON.parse(localStorage.getItem('bte')) || {};
                if (!obj[String(STORE)]) obj[String(STORE)] = {};
                if (!obj[String(STORE)][String(THEME)]) obj[String(STORE)][String(THEME)] = {};
                obj[String(STORE)][String(THEME)]['live_preview_changes'] = '{broken::json}';
                localStorage.setItem('bte', JSON.stringify(obj));
            } catch (e) { /* ignore */ }

            var result = StorageHelper.getLivePreviewChanges();

            this.assertEquals(typeof result, 'object', 'Should return object on parse error');
            this.assertEquals(Object.keys(result).length, 0, 'Should return empty object on parse error');

            console.log('✅ getLivePreviewChanges() handles corrupted JSON gracefully');
        },

        'live_preview_changes are isolated between themes': function () {
            // Theme A — store 1, theme 10
            StorageHelper.init(1, 10);
            StorageHelper.clearLivePreviewChanges();
            StorageHelper.setLivePreviewChanges({'--color-primary': 'red'});

            // Theme B — store 1, theme 20
            StorageHelper.init(1, 20);
            StorageHelper.clearLivePreviewChanges();
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
            StorageHelper.init(1, 10);
            StorageHelper.clearLivePreviewChanges();
            StorageHelper.init(1, 20);
            StorageHelper.clearLivePreviewChanges();

            console.log('✅ live_preview_changes are isolated between themes');
        }
    });
});
