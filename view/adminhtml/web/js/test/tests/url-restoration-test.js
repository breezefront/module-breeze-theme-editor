/**
 * URL Restoration Test Suite
 *
 * Tests for url-restoration.js — the early-boot module that restores the
 * last-visited frontend URL from localStorage and updates the iframe src
 * before the browser fires the first load event.
 *
 * Covers:
 *  1. StorageHelper.init() is called with correct storeId / themeId
 *  2. Skips restoration when a valid ?url= query param is present
 *  3. Corrupted / admin URLs in localStorage are cleared and iframe is not touched
 *  4. Valid saved URL → iframe src is updated with uenc-encoded path
 *  5. Store/theme isolation — different scopes restore independent URLs
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/url-builder',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/url-restoration'
], function ($, TestFramework, StorageHelper, urlBuilder, restoreUrl) {
    'use strict';

    var STORE = 6;
    var THEME = 7;
    var ADMIN_BASE = '/admin/';

    // Default iframe src that mirrors the PHP-generated value.
    // The /url/.../ segment is what url-restoration replaces.
    var DEFAULT_SRC = 'https://example.com/admin/breeze_editor/editor/iframe/store/6/url/Lw~~/?___store=breezeenterprise';

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Set the iframe src to the default value before each test. */
    function resetIframeSrc() {
        $('#bte-iframe').attr('src', DEFAULT_SRC);
    }

    /** Save a URL into the scoped bte localStorage object. */
    function setStoredUrl(storeId, themeId, url) {
        StorageHelper.init(storeId, themeId);
        StorageHelper.setCurrentUrl(url);
    }

    /** Clear stored URL for a given scope. */
    function clearStoredUrl(storeId, themeId) {
        StorageHelper.init(storeId, themeId);
        StorageHelper.setCurrentUrl('/');
    }

    /**
     * Stub window.location.search.
     * Returns a restore function — call it to undo the stub.
     */
    function stubLocationSearch(search) {
        var original = Object.getOwnPropertyDescriptor(window, 'location');

        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: Object.assign({}, window.location, { search: search })
        });

        return function restore() {
            if (original) {
                Object.defineProperty(window, 'location', original);
            } else {
                delete window.location;
            }
        };
    }

    /** Build the minimal boot config used by all tests. */
    function makeConfig(overrides) {
        return Object.assign(
            { storeId: STORE, themeId: THEME, adminBasePath: ADMIN_BASE },
            overrides || {}
        );
    }

    // -------------------------------------------------------------------------

    return TestFramework.suite('URL Restoration', {

        // =====================================================================
        // GROUP 1: StorageHelper.init() wiring (2 tests)
        // =====================================================================

        'init() is called when storeId and themeId are provided': function () {
            var calls = [];
            var originalInit = StorageHelper.init;
            StorageHelper.init = function (storeId, themeId) {
                calls.push({ storeId: storeId, themeId: themeId });
            };

            try {
                restoreUrl(makeConfig());
            } finally {
                StorageHelper.init = originalInit;
            }

            this.assertEquals(calls.length, 1, 'init() should be called once');
            this.assertEquals(calls[0].storeId, STORE, 'storeId should match');
            this.assertEquals(calls[0].themeId, THEME, 'themeId should match');

            console.log('✅ StorageHelper.init() is called with correct storeId / themeId');
        },

        'init() is NOT called when storeId is missing': function () {
            var called = false;
            var originalInit = StorageHelper.init;
            StorageHelper.init = function () { called = true; };

            try {
                restoreUrl({ storeId: 0, themeId: THEME, adminBasePath: ADMIN_BASE });
            } finally {
                StorageHelper.init = originalInit;
            }

            this.assertFalse(called, 'init() should not be called when storeId is falsy');

            console.log('✅ StorageHelper.init() is skipped when storeId is missing');
        },

        // =====================================================================
        // GROUP 2: URL query param takes priority (2 tests)
        // =====================================================================

        'iframe src is NOT changed when ?url= query param is present': function () {
            resetIframeSrc();
            setStoredUrl(STORE, THEME, '/catalog/category');

            var restoreSearch = stubLocationSearch('?url=%2Fcatalog%2Fcategory');

            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
                clearStoredUrl(STORE, THEME);
            }

            var src = $('#bte-iframe').attr('src');
            this.assertEquals(src, DEFAULT_SRC, 'iframe src must not change when ?url= is present');

            console.log('✅ iframe src unchanged when explicit ?url= param is present');
        },

        'iframe src is NOT changed when ?url=/ (default value)': function () {
            resetIframeSrc();
            // Even with a saved URL, ?url=/ means "no explicit url" — but we still
            // restore from storage in this case.  This test checks that the actual
            // restore DOES happen (not blocked by the "/" value).
            setStoredUrl(STORE, THEME, '/about-us');

            var restoreSearch = stubLocationSearch('?url=/');

            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
                clearStoredUrl(STORE, THEME);
            }

            var src = $('#bte-iframe').attr('src');
            // ?url=/ is treated as "no param" — restoration should have updated src
            this.assertFalse(src === DEFAULT_SRC, 'iframe src should be updated when ?url=/ (treated as absent)');

            console.log('✅ ?url=/ is treated as absent — restoration runs normally');
        },

        // =====================================================================
        // GROUP 3: Corrupted / admin URLs are rejected (4 tests)
        // =====================================================================

        'corrupted URL containing adminBasePath is cleared and iframe not changed': function () {
            resetIframeSrc();
            setStoredUrl(STORE, THEME, '/admin/dashboard');

            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
            }

            var src = $('#bte-iframe').attr('src');
            this.assertEquals(src, DEFAULT_SRC, 'iframe src must not change for admin URL');

            // Verify the bad value was cleared
            StorageHelper.init(STORE, THEME);
            var stored = StorageHelper.getCurrentUrl();
            this.assertEquals(stored, '/', 'Corrupted URL should be cleared to "/"');

            console.log('✅ Admin URL in storage is cleared and iframe is not changed');
        },

        'corrupted URL containing %25 (double-encoded slash) is cleared': function () {
            resetIframeSrc();
            setStoredUrl(STORE, THEME, '/catalog%25%2Fcategory');

            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
            }

            var src = $('#bte-iframe').attr('src');
            this.assertEquals(src, DEFAULT_SRC, 'iframe src must not change for double-encoded URL');

            StorageHelper.init(STORE, THEME);
            var stored = StorageHelper.getCurrentUrl();
            this.assertEquals(stored, '/', 'Double-encoded URL should be cleared to "/"');

            console.log('✅ Double-encoded URL (%25) is cleared and iframe is not changed');
        },

        'stored "/" does not update iframe src': function () {
            resetIframeSrc();
            setStoredUrl(STORE, THEME, '/');

            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
            }

            var src = $('#bte-iframe').attr('src');
            this.assertEquals(src, DEFAULT_SRC, 'iframe src must not change when stored URL is "/"');

            console.log('✅ Stored "/" does not trigger iframe src update');
        },

        'missing stored URL does not update iframe src': function () {
            resetIframeSrc();
            clearStoredUrl(STORE, THEME);

            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
            }

            var src = $('#bte-iframe').attr('src');
            this.assertEquals(src, DEFAULT_SRC, 'iframe src must not change when nothing is stored');

            console.log('✅ Missing stored URL does not trigger iframe src update');
        },

        // =====================================================================
        // GROUP 4: Successful URL restoration (3 tests)
        // =====================================================================

        'valid stored URL updates iframe src with uenc-encoded path': function () {
            resetIframeSrc();
            setStoredUrl(STORE, THEME, '/catalog/category/view/id/2');

            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
                clearStoredUrl(STORE, THEME);
            }

            var src = $('#bte-iframe').attr('src');
            var encoded = urlBuilder.encodePathParam('/catalog/category/view/id/2');

            this.assertStringContains(src, '/url/' + encoded + '/', 'iframe src should contain uenc-encoded path');
            this.assertFalse(src === DEFAULT_SRC, 'iframe src should differ from default');

            console.log('✅ Valid stored URL updates iframe src correctly:', src);
        },

        'restored src preserves everything outside the /url/.../ segment': function () {
            resetIframeSrc();
            setStoredUrl(STORE, THEME, '/about-us');

            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
                clearStoredUrl(STORE, THEME);
            }

            var src = $('#bte-iframe').attr('src');
            var encoded = urlBuilder.encodePathParam('/about-us');
            var expected = DEFAULT_SRC.replace(/\/url\/[^/]+\//, '/url/' + encoded + '/');

            this.assertEquals(src, expected, 'Only /url/.../ segment should change');

            console.log('✅ All other parts of iframe src are preserved');
        },

        'home page URL "/" stored from previous session does not restore': function () {
            // Saving "/" explicitly should behave the same as "not set"
            resetIframeSrc();

            StorageHelper.init(STORE, THEME);
            StorageHelper.setCurrentUrl('/');

            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl(makeConfig());
            } finally {
                restoreSearch();
            }

            var src = $('#bte-iframe').attr('src');
            this.assertEquals(src, DEFAULT_SRC, 'Stored "/" should not update iframe src');

            console.log('✅ Stored "/" from previous session is treated as "no saved URL"');
        },

        // =====================================================================
        // GROUP 5: Store / theme isolation (2 tests)
        // =====================================================================

        'different store scopes restore independent URLs': function () {
            // Store A (6/7) has one URL, store B (8/9) has another.
            setStoredUrl(6, 7, '/store-a-category');
            setStoredUrl(8, 9, '/store-b-product');

            // Restore for store A
            resetIframeSrc();
            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl({ storeId: 6, themeId: 7, adminBasePath: ADMIN_BASE });
            } finally {
                restoreSearch();
            }

            var srcA = $('#bte-iframe').attr('src');
            var encodedA = urlBuilder.encodePathParam('/store-a-category');

            this.assertStringContains(srcA, '/url/' + encodedA + '/', 'Store A URL should be restored');

            // Restore for store B
            resetIframeSrc();
            restoreSearch = stubLocationSearch('');
            try {
                restoreUrl({ storeId: 8, themeId: 9, adminBasePath: ADMIN_BASE });
            } finally {
                restoreSearch();
            }

            var srcB = $('#bte-iframe').attr('src');
            var encodedB = urlBuilder.encodePathParam('/store-b-product');

            this.assertStringContains(srcB, '/url/' + encodedB + '/', 'Store B URL should be restored');
            this.assertFalse(srcA === srcB, 'Store A and B should restore different URLs');

            // Cleanup
            clearStoredUrl(6, 7);
            clearStoredUrl(8, 9);

            console.log('✅ Different store scopes restore independent URLs');
        },

        'theme isolation — different themes in same store restore independent URLs': function () {
            setStoredUrl(6, 7,  '/theme-7-page');
            setStoredUrl(6, 11, '/theme-11-page');

            // Theme 7
            resetIframeSrc();
            var restoreSearch = stubLocationSearch('');
            try {
                restoreUrl({ storeId: 6, themeId: 7, adminBasePath: ADMIN_BASE });
            } finally {
                restoreSearch();
            }

            var srcT7 = $('#bte-iframe').attr('src');
            var encodedT7 = urlBuilder.encodePathParam('/theme-7-page');
            this.assertStringContains(srcT7, '/url/' + encodedT7 + '/', 'Theme 7 URL should be restored');

            // Theme 11
            resetIframeSrc();
            restoreSearch = stubLocationSearch('');
            try {
                restoreUrl({ storeId: 6, themeId: 11, adminBasePath: ADMIN_BASE });
            } finally {
                restoreSearch();
            }

            var srcT11 = $('#bte-iframe').attr('src');
            var encodedT11 = urlBuilder.encodePathParam('/theme-11-page');
            this.assertStringContains(srcT11, '/url/' + encodedT11 + '/', 'Theme 11 URL should be restored');

            // Cleanup
            clearStoredUrl(6, 7);
            clearStoredUrl(6, 11);

            console.log('✅ Different themes in the same store restore independent URLs');
        }
    });
});
