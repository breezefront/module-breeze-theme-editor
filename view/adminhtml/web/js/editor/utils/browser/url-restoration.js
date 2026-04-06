/**
 * URL Restoration
 *
 * Restores the last-visited frontend URL from localStorage and updates the
 * editor iframe src before the browser fires the first load event.
 *
 * Must run early (before x-magento-init / toolbar.js) because the iframe
 * starts loading immediately on page render. The caller passes a minimal
 * boot config object instead of the full toolbar config to avoid duplicating
 * the large JSON blob in the HTML.
 *
 * Usage (from index.phtml):
 *
 *   require(['Swissup_BreezeThemeEditor/js/editor/utils/browser/url-restoration'],
 *   function (restoreUrl) {
 *       restoreUrl({
 *           storeId:       6,
 *           themeId:       7,
 *           adminBasePath: '/admin/'
 *       });
 *   });
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/url-builder'
], function ($, StorageHelper, urlBuilder) {
    'use strict';

    /**
     * @param {Object} config
     * @param {number} config.storeId
     * @param {number} config.themeId
     * @param {string} config.adminBasePath
     */
    return function restoreUrl(config) {
        if (config.storeId && config.themeId) {
            StorageHelper.init(config.storeId, config.themeId);
        }

        // Only restore when no explicit URL was requested via query param
        var urlParams = new URLSearchParams(window.location.search);
        var urlParam = urlParams.get('url');

        if (urlParam && urlParam !== '/') {
            return;
        }

        var savedUrl = StorageHelper.getCurrentUrl();

        // Reject URLs that look like admin/proxy paths or are corrupted
        // (double/triple-encoded slashes indicate a previously saved proxy URL
        // that got URL-encoded recursively).
        var adminBasePath = config.adminBasePath || '/admin/';
        var isCorrupted = !savedUrl
            || savedUrl === '/'
            || savedUrl.indexOf(adminBasePath) !== -1
            || savedUrl.indexOf('%25') !== -1;

        if (isCorrupted && savedUrl && savedUrl !== '/') {
            StorageHelper.setCurrentUrl('/');
            savedUrl = '/';
        }

        if (savedUrl && savedUrl !== '/') {
            // Encode with uenc (mirrors PHP strtr(base64_encode(), '+/=', '-_~'))
            // so slashes in the path survive Cloudflare and Apache without
            // being decoded before reaching Magento's router.
            var $iframe = $('#bte-iframe');
            var currentSrc = $iframe.attr('src');
            var encodedUrl = urlBuilder.encodePathParam(savedUrl);
            var newSrc = currentSrc.replace(/\/url\/[^/]+\//, '/url/' + encodedUrl + '/');

            $iframe.attr('src', newSrc);
        }
    };
});
