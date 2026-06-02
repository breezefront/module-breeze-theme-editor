/**
 * PHP Preview Manager
 *
 * Handles live preview for settings that have no `property` (CSS variable).
 * These settings are consumed by PHP templates via $breezeThemeEditor->get().
 *
 * Because PHP renders the iframe HTML before it is loaded, a CSS injection
 * cannot update these values. Instead this module:
 *
 *   1. Accumulates pending changes in memory.
 *   2. Writes them as JSON to the `bte_php_preview` cookie (JS-writable,
 *      SameSite=Lax) so PHP can read them on the next request.
 *   3. Debounces 800 ms (Shopify-style) then soft-reloads the iframe.
 *   4. Shows a spinner overlay on the iframe during the reload.
 *   5. After the iframe loads, hides the spinner and asks
 *      CssPreviewManager to recreate the live-preview <style> so CSS-var
 *      changes made in the same session are re-applied on top.
 *
 * Called from:
 *   field-handlers/base.js — when fieldData.property is empty
 *
 * reset() is called from settings-editor.js on:
 *   discard-draft, publish, reset (discard all), panel close / destroy.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/bsync',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, IframeHelper, Bsync, Logger) {
    'use strict';

    var log = Logger.for('panel/php-preview-manager');

    var COOKIE_NAME   = 'bte_php_preview';
    var DEBOUNCE_MS   = 800;
    var SPINNER_ID    = 'bte-php-preview-spinner';
    var IFRAME_SEL    = '#bte-iframe';

    var pendingChanges = {};   // { 'section/field': 'value', ... }
    var debounceTimer  = null;
    var reloading      = false;

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Write all pending overrides into the JS-writable cookie.
     * @private
     */
    function writeCookie() {
        var json = JSON.stringify(pendingChanges);
        document.cookie =
            COOKIE_NAME + '=' + encodeURIComponent(json) +
            '; path=/; SameSite=Lax';
        log.debug('bte_php_preview cookie written: ' + json);
    }

    /**
     * Remove the cookie (max-age=0).
     * @private
     */
    function clearCookie() {
        document.cookie = COOKIE_NAME + '=; path=/; max-age=0; SameSite=Lax';
        log.debug('bte_php_preview cookie cleared');
    }

    /**
     * Ensure the spinner overlay element exists and return it.
     * @returns {jQuery}
     * @private
     */
    function getSpinner() {
        var $existing = $('#' + SPINNER_ID);
        if ($existing.length) {
            return $existing;
        }

        var $spinner = $('<div>', { id: SPINNER_ID, 'class': 'bte-php-preview-spinner' });
        $(IFRAME_SEL).after($spinner);
        return $spinner;
    }

    function showSpinner() {
        getSpinner().addClass('bte-php-preview-spinner--visible');
    }

    function hideSpinner() {
        var $spinner = $('#' + SPINNER_ID);
        if ($spinner.length) {
            $spinner.removeClass('bte-php-preview-spinner--visible');
        }
    }

    /**
     * Perform the actual iframe reload.
     * @private
     */
    function executeReload() {
        var iframeWin = IframeHelper.getWindow();

        if (!iframeWin) {
            log.warn('PhpPreviewManager: iframe window not available, skipping reload');
            hideSpinner();
            reloading = false;
            return;
        }

        var currentUrl = iframeWin.location.href;
        log.info('PhpPreviewManager: reloading iframe for PHP preview — ' + currentUrl);

        reloading = true;

        // One-time load handler: hide spinner + restore CSS-var live preview
        $(IFRAME_SEL).one('load.bte-php-preview', function () {
            // Give css-manager time to fire bte:cssManagerReady and reinject
            // the draft <style> before we recreate the live-preview <style> on top.
            Bsync.delay(300).then(function () {
                require([
                    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'
                ], function (CssPreviewManager) {
                    CssPreviewManager.recreateLivePreviewStyle();
                    log.debug('PhpPreviewManager: CSS live-preview restored after reload');
                });
                hideSpinner();
                reloading = false;
            });
        });

        // Trigger the reload
        iframeWin.location.href = currentUrl;
    }

    // ─── Public API ─────────────────────────────────────────────────────────

    return {
        /**
         * Schedule a debounced iframe reload for a PHP-only field change.
         *
         * @param {string} sectionCode
         * @param {string} fieldCode
         * @param {string} value
         */
        scheduleReload: function (sectionCode, fieldCode, value) {
            var path = sectionCode + '/' + fieldCode;
            pendingChanges[path] = value;
            log.debug('PhpPreviewManager.scheduleReload: ' + path + ' = ' + value);

            writeCookie();
            showSpinner();

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(executeReload, DEBOUNCE_MS);
        },

        /**
         * Returns true while an iframe reload is in progress.
         *
         * @returns {boolean}
         */
        isReloading: function () {
            return reloading;
        },

        /**
         * Clear all pending PHP preview overrides.
         *
         * Called by settings-editor.js on: discard-draft, publish,
         * reset (discard all changes), panel close / destroy.
         */
        reset: function () {
            log.info('PhpPreviewManager.reset: clearing pending changes and cookie');
            clearTimeout(debounceTimer);
            pendingChanges = {};
            reloading      = false;
            clearCookie();
            hideSpinner();
            $(IFRAME_SEL).off('load.bte-php-preview');
        }
    };
});
