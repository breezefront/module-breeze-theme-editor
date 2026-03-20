/**
 * Cookie Manager Utility Test Suite
 *
 * Tests for utils/browser/cookie-manager.js:
 * - setCookie() / getCookie()          — generic read/write
 * - setStoreCookie() / getStoreCookie() — store cookie shorthand
 * - setThemePreviewCookie() / getThemePreviewCookie() — theme cookie shorthand
 * - setNavigationCookies()             — sets both at once
 * - deleteCookie() / deleteStoreCookie() / deleteThemePreviewCookie() — removal
 *
 * NOTE: Tests manipulate real document.cookie for the current page origin.
 * Each test cleans up after itself.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/cookie-manager'
], function (TestFramework, CookieManager) {
    'use strict';

    /** Remove a cookie by name so tests start clean */
    function removeCookie(name) {
        document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    return TestFramework.suite('Cookie Manager Utility', {

        // ====================================================================
        // GROUP 1: setCookie() / getCookie() — generic API (5 tests)
        // ====================================================================

        'getCookie() returns null when cookie does not exist': function () {
            removeCookie('bte_test_absent');

            var result = CookieManager.getCookie('bte_test_absent');

            this.assertNull(result, 'Should return null for missing cookie');

            console.log('✅ getCookie() returns null for missing cookie');
        },

        'setCookie() + getCookie() round-trip preserves value': function () {
            var name  = 'bte_test_generic';
            var value = 'hello_world';
            removeCookie(name);

            var ok = CookieManager.setCookie(name, value, { path: '/' });
            var got = CookieManager.getCookie(name);

            this.assertTrue(ok, 'setCookie() should return true on success');
            this.assertEquals(got, encodeURIComponent(value), 'getCookie() should return encoded value');

            removeCookie(name);
            console.log('✅ setCookie() + getCookie() round-trip works');
        },

        'setCookie() returns false when name is empty': function () {
            var result = CookieManager.setCookie('', 'value', {});

            this.assertFalse(result, 'Should return false for empty name');

            console.log('✅ setCookie() returns false for empty name');
        },

        'setCookie() returns false when value is null': function () {
            var result = CookieManager.setCookie('bte_test_null', null, {});

            this.assertFalse(result, 'Should return false for null value');

            console.log('✅ setCookie() returns false for null value');
        },

        'deleteCookie() removes the cookie': function () {
            var name = 'bte_test_delete';
            CookieManager.setCookie(name, 'to_delete', { path: '/' });

            CookieManager.deleteCookie(name);

            var result = CookieManager.getCookie(name);
            this.assertNull(result, 'Cookie should be null after deleteCookie()');

            console.log('✅ deleteCookie() removes the cookie');
        },

        // ====================================================================
        // GROUP 2: setStoreCookie() / getStoreCookie() (3 tests)
        // ====================================================================

        'setStoreCookie() returns false for empty storeCode': function () {
            var result = CookieManager.setStoreCookie('');

            this.assertFalse(result, 'Should return false for empty storeCode');

            console.log('✅ setStoreCookie() returns false for empty storeCode');
        },

        'setStoreCookie() + getStoreCookie() round-trip': function () {
            removeCookie('store');

            var ok  = CookieManager.setStoreCookie('breeze_evolution');
            var got = CookieManager.getStoreCookie();

            this.assertTrue(ok,  'setStoreCookie() should return true');
            this.assertEquals(got, 'breeze_evolution', 'getStoreCookie() should return the set value');

            removeCookie('store');
            console.log('✅ setStoreCookie() + getStoreCookie() round-trip works');
        },

        'deleteStoreCookie() removes the store cookie': function () {
            CookieManager.setStoreCookie('breeze_evolution');
            CookieManager.deleteStoreCookie();

            var result = CookieManager.getStoreCookie();
            this.assertNull(result, 'Store cookie should be null after deleteStoreCookie()');

            console.log('✅ deleteStoreCookie() removes the store cookie');
        },

        // ====================================================================
        // GROUP 3: setThemePreviewCookie() / getThemePreviewCookie() (3 tests)
        // ====================================================================

        'setThemePreviewCookie() returns false for empty themeId': function () {
            var result = CookieManager.setThemePreviewCookie('');

            this.assertFalse(result, 'Should return false for empty themeId');

            console.log('✅ setThemePreviewCookie() returns false for empty themeId');
        },

        'setThemePreviewCookie() + getThemePreviewCookie() round-trip': function () {
            removeCookie('preview_theme');

            var ok  = CookieManager.setThemePreviewCookie(42);
            var got = CookieManager.getThemePreviewCookie();

            this.assertTrue(ok, 'setThemePreviewCookie() should return true');
            this.assertEquals(got, '42', 'getThemePreviewCookie() should return stringified themeId');

            removeCookie('preview_theme');
            console.log('✅ setThemePreviewCookie() + getThemePreviewCookie() round-trip works');
        },

        'deleteThemePreviewCookie() removes the theme preview cookie': function () {
            CookieManager.setThemePreviewCookie(42);
            CookieManager.deleteThemePreviewCookie();

            var result = CookieManager.getThemePreviewCookie();
            this.assertNull(result, 'Theme preview cookie should be null after delete');

            console.log('✅ deleteThemePreviewCookie() removes the cookie');
        },

        // ====================================================================
        // GROUP 4: setNavigationCookies() — 2 tests
        // ====================================================================

        'setNavigationCookies() sets both store and theme cookies': function () {
            removeCookie('store');
            removeCookie('preview_theme');

            var ok = CookieManager.setNavigationCookies('default', 7);

            this.assertTrue(ok, 'setNavigationCookies() should return true when both succeed');
            this.assertEquals(CookieManager.getStoreCookie(), 'default', 'Store cookie should be set');
            this.assertEquals(CookieManager.getThemePreviewCookie(), '7', 'Theme cookie should be set');

            removeCookie('store');
            removeCookie('preview_theme');
            console.log('✅ setNavigationCookies() sets both cookies');
        },

        'setNavigationCookies() returns false when storeCode is empty': function () {
            removeCookie('store');
            removeCookie('preview_theme');

            var ok = CookieManager.setNavigationCookies('', 7);

            this.assertFalse(ok, 'Should return false when storeCode is empty');

            removeCookie('preview_theme');
            console.log('✅ setNavigationCookies() returns false for empty storeCode');
        }
    });
});
