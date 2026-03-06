/**
 * Icon Registry — renders section icons using Phosphor Icons webfont.
 *
 * Supported icon formats (value of the "icon" field in settings.json):
 *
 *   Named (Phosphor icon name):
 *     "typography"  →  <i class="bte-section-icon ph ph-typography" …>
 *
 *   Raw inline SVG:
 *     "<svg>…</svg>"  →  wrapped in <span class="bte-section-icon">
 *
 *   Base64 data URI (supports currentColor):
 *     "data:image/svg+xml;base64,…"  →  decoded and inlined as SVG
 *
 *   Plain data URI:
 *     "data:image/svg+xml,…"  →  <img class="bte-section-icon" src="…">
 */
define([], function () {
    'use strict';

    var CDN_URL = 'https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css';
    var _cssLoaded = false;

    /**
     * Inject Phosphor regular stylesheet once.
     */
    function ensureCss() {
        if (_cssLoaded) {
            return;
        }

        if (!document.querySelector('link[href="' + CDN_URL + '"]')) {
            var link = document.createElement('link');

            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = CDN_URL;
            document.head.appendChild(link);
        }

        _cssLoaded = true;
    }

    return {
        /**
         * Render an icon element for the given icon value.
         *
         * @param {string|undefined} icon
         * @returns {string} HTML string, or '' when icon is falsy
         */
        render: function (icon) {
            if (!icon) {
                return '';
            }

            // C: raw inline SVG
            if (icon.charAt(0) === '<') {
                return '<span class="bte-section-icon">' + icon + '</span>';
            }

            // B: base64 data URI → decode → inline SVG (supports currentColor)
            if (icon.indexOf('data:') === 0 && icon.indexOf('base64,') !== -1) {
                try {
                    return '<span class="bte-section-icon">' +
                        atob(icon.split('base64,')[1]) +
                        '</span>';
                } catch (e) {
                    return '';
                }
            }

            // A: plain data URI → <img>
            if (icon.indexOf('data:') === 0) {
                return '<img class="bte-section-icon" src="' + icon + '" alt="" aria-hidden="true">';
            }

            // Named Phosphor icon
            ensureCss();

            return '<i class="bte-section-icon ph ph-' + icon + '" aria-hidden="true"></i>';
        }
    };
});
