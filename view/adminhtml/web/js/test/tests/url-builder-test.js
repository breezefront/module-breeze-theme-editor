/**
 * url-builder.js — encodePathParam / decodePathParam unit tests
 *
 * Tests the uenc-style encoding introduced in commit 9ba5b13 to survive
 * Cloudflare's %2F → / decoding when '/' appears in Magento URL path segments.
 *
 * Encoding contract (mirrors PHP strtr(base64_encode($url), '+/=', '-_~')):
 *   '/'  → 'Lw~~'
 *   Output contains only chars from [A-Za-z0-9\-_~]  (no +, /, =)
 *
 * Decoding contract (mirrors PHP base64_decode(strtr($encoded, '-_~', '+/='))):
 *   'Lw~~' → '/'
 *   round-trip: decode(encode(x)) === x
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/url-builder'
], function(TestFramework, urlBuilder) {
    'use strict';

    return TestFramework.suite('url-builder encodePathParam / decodePathParam', {

        // =====================================================================
        // encodePathParam
        // =====================================================================

        'encodePathParam("/") should return "Lw~~"': function() {
            this.assertEquals(urlBuilder.encodePathParam('/'), 'Lw~~',
                '"/" must encode to "Lw~~" (PHP uenc equivalent)');
        },

        'encodePathParam("/catalog/category/view/id/2/") should round-trip correctly': function() {
            var encoded = urlBuilder.encodePathParam('/catalog/category/view/id/2/');
            this.assertEquals(encoded, 'L2NhdGFsb2cvY2F0ZWdvcnkvdmlldy9pZC8yLw~~',
                'Category path must produce expected uenc value');
        },

        'encodePathParam("/headphones.html") should produce correct uenc': function() {
            var encoded = urlBuilder.encodePathParam('/headphones.html');
            this.assertEquals(encoded, 'L2hlYWRwaG9uZXMuaHRtbA~~',
                'URL-rewrite path must produce expected uenc value');
        },

        'encodePathParam output must contain only safe chars [A-Za-z0-9-_~]': function() {
            var paths = [
                '/',
                '/catalog/category/view/id/2/',
                '/headphones.html',
                '/search?q=test&page=2',
                '/caf\u00e9'  // non-ASCII (é)
            ];
            paths.forEach(function(path) {
                var encoded = urlBuilder.encodePathParam(path);
                var unsafe = encoded.match(/[^A-Za-z0-9\-_~]/g);
                this.assertNull(unsafe,
                    'Encoded "' + path + '" → "' + encoded + '" must not contain +, /, or = chars');
            }.bind(this));
        },

        'encodePathParam("") should fall back to "Lw~~" (encoded "/")': function() {
            this.assertEquals(urlBuilder.encodePathParam(''), 'Lw~~',
                'Empty string must fall back to encoding of "/"');
        },

        'encodePathParam(null) should fall back to "Lw~~"': function() {
            this.assertEquals(urlBuilder.encodePathParam(null), 'Lw~~',
                'null must fall back to encoding of "/"');
        },

        // =====================================================================
        // decodePathParam
        // =====================================================================

        'decodePathParam("Lw~~") should return "/"': function() {
            this.assertEquals(urlBuilder.decodePathParam('Lw~~'), '/',
                '"Lw~~" must decode back to "/"');
        },

        'decodePathParam should be the inverse of encodePathParam (round-trip)': function() {
            var paths = [
                '/',
                '/catalog/category/view/id/2/',
                '/headphones.html',
                '/search?q=hello world',
                '/caf\u00e9'
            ];
            paths.forEach(function(original) {
                var encoded = urlBuilder.encodePathParam(original);
                var decoded = urlBuilder.decodePathParam(encoded);
                this.assertEquals(decoded, original,
                    'Round-trip failed for: ' + original);
            }.bind(this));
        },

        'decodePathParam(null) should return "/"': function() {
            this.assertEquals(urlBuilder.decodePathParam(null), '/',
                'null must fall back to "/"');
        },

        'decodePathParam("") should return "/"': function() {
            this.assertEquals(urlBuilder.decodePathParam(''), '/',
                'empty string must fall back to "/"');
        },

        'decodePathParam with invalid base64 should fall back to "/"': function() {
            // '!!!' is not valid base64 → atob throws → catch returns '/'
            this.assertEquals(urlBuilder.decodePathParam('!!!invalid!!!'), '/',
                'Invalid encoded string must fall back to "/"');
        }
    });
});
