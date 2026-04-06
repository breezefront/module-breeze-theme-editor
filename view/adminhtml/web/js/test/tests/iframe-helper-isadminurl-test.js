/**
 * iframe-helper.js — isAdminUrl() unit tests
 *
 * Tests the isAdminUrl() method introduced/updated in commits 00347c1 / 9ba5b13
 * to support custom admin frontName (e.g. /tryit2531/ on sandbox) and to always
 * treat the breeze_editor proxy route as an admin URL.
 *
 * isAdminUrl(path) must:
 *  1. Return true  when path starts with adminBasePath from configManager
 *  2. Return true  when path contains 'breeze_editor/'
 *  3. Return false for normal frontend paths
 *  4. Fall back to '/admin/' when adminBasePath is not set in config
 *  5. Return false for null / empty input
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager'
], function(TestFramework, IframeHelper, configManager) {
    'use strict';

    return TestFramework.suite('iframe-helper isAdminUrl', {

        // =====================================================================
        // Standard /admin/ install
        // =====================================================================

        'isAdminUrl("/admin/dashboard") should return true (standard install)': function() {
            configManager.set({ adminBasePath: '/admin/' });
            this.assertTrue(IframeHelper.isAdminUrl('/admin/dashboard'),
                'Path starting with /admin/ must be detected as admin URL');
            configManager.clear();
        },

        'isAdminUrl("/admin/breeze_editor/editor/index/") should return true': function() {
            configManager.set({ adminBasePath: '/admin/' });
            this.assertTrue(IframeHelper.isAdminUrl('/admin/breeze_editor/editor/index/'),
                'Admin editor proxy URL must be detected as admin URL');
            configManager.clear();
        },

        // =====================================================================
        // Custom frontName install (/tryit2531/)
        // =====================================================================

        'isAdminUrl("/tryit2531/dashboard") should return true (custom frontName)': function() {
            configManager.set({ adminBasePath: '/tryit2531/' });
            this.assertTrue(IframeHelper.isAdminUrl('/tryit2531/dashboard'),
                'Path starting with custom adminBasePath must be detected as admin URL');
            configManager.clear();
        },

        'isAdminUrl("/tryit2531/breeze_editor/editor/iframe/...") should return true': function() {
            configManager.set({ adminBasePath: '/tryit2531/' });
            this.assertTrue(
                IframeHelper.isAdminUrl('/tryit2531/breeze_editor/editor/iframe/store/6/url/Lw~~/'),
                'Iframe proxy URL under custom frontName must be admin URL'
            );
            configManager.clear();
        },

        // =====================================================================
        // breeze_editor route (always admin regardless of prefix)
        // =====================================================================

        'isAdminUrl with "breeze_editor/" in path should always return true': function() {
            // Even without adminBasePath set, breeze_editor/ path must be detected
            configManager.clear();
            this.assertTrue(IframeHelper.isAdminUrl('/some/prefix/breeze_editor/editor/index'),
                'Any path containing "breeze_editor/" must be treated as admin URL');
        },

        // =====================================================================
        // Frontend paths — must return false
        // =====================================================================

        'isAdminUrl("/catalog/category") should return false': function() {
            configManager.set({ adminBasePath: '/admin/' });
            this.assertFalse(IframeHelper.isAdminUrl('/catalog/category'),
                'Frontend category URL must not be detected as admin');
            configManager.clear();
        },

        'isAdminUrl("/headphones.html") should return false': function() {
            configManager.set({ adminBasePath: '/admin/' });
            this.assertFalse(IframeHelper.isAdminUrl('/headphones.html'),
                'URL-rewrite path must not be detected as admin');
            configManager.clear();
        },

        'isAdminUrl("/") should return false': function() {
            configManager.set({ adminBasePath: '/admin/' });
            this.assertFalse(IframeHelper.isAdminUrl('/'),
                'Homepage path must not be detected as admin');
            configManager.clear();
        },

        // =====================================================================
        // Edge cases
        // =====================================================================

        'isAdminUrl(null) should return false': function() {
            this.assertFalse(IframeHelper.isAdminUrl(null),
                'null must return false without throwing');
        },

        'isAdminUrl("") should return false': function() {
            this.assertFalse(IframeHelper.isAdminUrl(''),
                'empty string must return false');
        },

        'isAdminUrl falls back to "/admin/" when adminBasePath not in config': function() {
            configManager.clear();
            this.assertTrue(IframeHelper.isAdminUrl('/admin/dashboard'),
                'Without config, must fall back to /admin/ detection');
            this.assertFalse(IframeHelper.isAdminUrl('/catalog/category'),
                'Without config, frontend path must not be detected as admin');
        }
    });
});
