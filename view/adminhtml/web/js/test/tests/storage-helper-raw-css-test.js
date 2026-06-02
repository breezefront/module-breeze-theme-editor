/**
 * Storage Helper — getRawCssBlocks / setRawCssBlocks / clearRawCssBlocks
 *
 * Mirrors the existing "getLivePreviewChanges" group in storage-helper-test.js.
 * All reads/writes use the same scoped "bte" JSON object under key "raw_css_blocks".
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper'
], function ($, TestFramework, StorageHelper) {
    'use strict';

    var STORE = 99;
    var THEME = 99;

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
        try {
            var obj = JSON.parse(localStorage.getItem('bte')) || {};
            if (obj[String(STORE)] && obj[String(STORE)][String(THEME)]) {
                delete obj[String(STORE)][String(THEME)]['raw_css_blocks'];
                localStorage.setItem('bte', JSON.stringify(obj));
            }
        } catch (e) { /* ignore */ }
    }

    return TestFramework.suite('Storage Helper — getRawCssBlocks / setRawCssBlocks / clearRawCssBlocks', {

        'getRawCssBlocks() returns {} when not set': function () {
            setup();

            var result = StorageHelper.getRawCssBlocks();

            this.assertEquals(typeof result, 'object', 'Should return an object');
            this.assertEquals(Object.keys(result).length, 0, 'Object should be empty');

            console.log('✅ getRawCssBlocks() returns {} when not set');
        },

        'setRawCssBlocks() + getRawCssBlocks() round-trip preserves object': function () {
            setup();

            var blocks = {
                'additional_styles_additional_css': '.bte-test-hello { color: green; }',
                'custom_header_css': '.header { display: flex; }'
            };
            StorageHelper.setRawCssBlocks(blocks);
            var result = StorageHelper.getRawCssBlocks();

            this.assertEquals(Object.keys(result).length, 2, 'Should have 2 keys');
            this.assertEquals(
                result['additional_styles_additional_css'],
                '.bte-test-hello { color: green; }',
                'First block should match'
            );
            this.assertEquals(
                result['custom_header_css'],
                '.header { display: flex; }',
                'Second block should match'
            );

            console.log('✅ setRawCssBlocks() + getRawCssBlocks() round-trip works');
        },

        'setRawCssBlocks() stores under scoped key raw_css_blocks': function () {
            setup();

            StorageHelper.setRawCssBlocks({'additional_styles_additional_css': '.x { color: red; }'});
            var raw = readRaw(STORE, THEME, 'raw_css_blocks');

            this.assertNotNull(raw, 'Scoped key should exist in bte object');
            this.assertStringContains(raw, 'additional_styles_additional_css', 'Raw JSON should contain the block id');

            console.log('✅ setRawCssBlocks() uses scoped key: bte.' + STORE + '.' + THEME + '.raw_css_blocks');
        },

        'clearRawCssBlocks() removes key from localStorage': function () {
            setup();

            StorageHelper.setRawCssBlocks({'additional_styles_additional_css': '.x { color: red; }'});
            StorageHelper.clearRawCssBlocks();

            var raw    = readRaw(STORE, THEME, 'raw_css_blocks');
            var result = StorageHelper.getRawCssBlocks();

            this.assertNull(raw, 'Scoped key should be removed from bte object');
            this.assertEquals(Object.keys(result).length, 0, 'getRawCssBlocks() should return {} after clear');

            console.log('✅ clearRawCssBlocks() removes key and returns {} afterwards');
        },

        'getRawCssBlocks() returns {} when localStorage contains corrupted JSON': function () {
            setup();

            try {
                var obj = JSON.parse(localStorage.getItem('bte')) || {};
                if (!obj[String(STORE)]) obj[String(STORE)] = {};
                if (!obj[String(STORE)][String(THEME)]) obj[String(STORE)][String(THEME)] = {};
                obj[String(STORE)][String(THEME)]['raw_css_blocks'] = '{broken::json}';
                localStorage.setItem('bte', JSON.stringify(obj));
            } catch (e) { /* ignore */ }

            var result = StorageHelper.getRawCssBlocks();

            this.assertEquals(typeof result, 'object', 'Should return object on parse error');
            this.assertEquals(Object.keys(result).length, 0, 'Should return empty object on parse error');

            console.log('✅ getRawCssBlocks() handles corrupted JSON gracefully');
        },

        'raw_css_blocks are isolated between themes': function () {
            // Theme A — store 1, theme 10
            StorageHelper.init(1, 10);
            StorageHelper.clearRawCssBlocks();
            StorageHelper.setRawCssBlocks({'additional_styles_additional_css': '.hero { color: red; }'});

            // Theme B — store 1, theme 20
            StorageHelper.init(1, 20);
            StorageHelper.clearRawCssBlocks();
            StorageHelper.setRawCssBlocks({'additional_styles_additional_css': '.hero { color: blue; }'});

            // Verify theme A value is unchanged
            StorageHelper.init(1, 10);
            var themeA = StorageHelper.getRawCssBlocks();

            // Verify theme B value is independent
            StorageHelper.init(1, 20);
            var themeB = StorageHelper.getRawCssBlocks();

            this.assertEquals(
                themeA['additional_styles_additional_css'],
                '.hero { color: red; }',
                'Theme A raw CSS should be "red"'
            );
            this.assertEquals(
                themeB['additional_styles_additional_css'],
                '.hero { color: blue; }',
                'Theme B raw CSS should be "blue"'
            );

            // Cleanup
            StorageHelper.init(1, 10);
            StorageHelper.clearRawCssBlocks();
            StorageHelper.init(1, 20);
            StorageHelper.clearRawCssBlocks();

            console.log('✅ raw_css_blocks are isolated between themes');
        }
    });
});
