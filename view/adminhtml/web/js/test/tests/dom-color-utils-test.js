/**
 * DOM Color Utils Tests (Admin)
 *
 * Tests HEX8 alpha-channel support for utils/dom/color-utils.js:
 * - isHexColor() accepts 8-digit hex values
 * - normalizeHex() preserves hex8 (no expansion, lowercase)
 * - hexToRgb() strips alpha bytes from hex8
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/color-utils'
], function (TestFramework, ColorUtils) {
    'use strict';

    return TestFramework.suite('DomColorUtils - HEX8 Alpha Support', {

        /**
         * Test 1: isHexColor - Should accept 8-digit hex (with and without #)
         */
        'isHexColor should accept 8-digit hex with # prefix': function () {
            this.assertEquals(
                ColorUtils.isHexColor('#1979c380'),
                true,
                'Should accept semi-transparent blue hex8 with # prefix'
            );

            this.assertEquals(
                ColorUtils.isHexColor('#ffffffff'),
                true,
                'Should accept fully opaque white hex8'
            );

            this.assertEquals(
                ColorUtils.isHexColor('#00000000'),
                true,
                'Should accept fully transparent black hex8'
            );

            this.assertEquals(
                ColorUtils.isHexColor('#ff000080'),
                true,
                'Should accept semi-transparent red hex8'
            );
        },

        /**
         * Test 2: isHexColor - Should accept 8-digit hex without # prefix
         */
        'isHexColor should accept 8-digit hex without # prefix': function () {
            this.assertEquals(
                ColorUtils.isHexColor('1979c380'),
                true,
                'Should accept hex8 without # prefix'
            );

            this.assertEquals(
                ColorUtils.isHexColor('ffffffff'),
                true,
                'Should accept fully opaque white hex8 without #'
            );
        },

        /**
         * Test 3: isHexColor - Should still accept standard 6-digit hex (backward compat)
         */
        'isHexColor backward compat with 6-digit hex': function () {
            this.assertEquals(
                ColorUtils.isHexColor('#1979c3'),
                true,
                'Should still accept 6-digit hex with #'
            );

            this.assertEquals(
                ColorUtils.isHexColor('#ffffff'),
                true,
                'Should still accept white 6-digit hex'
            );

            this.assertEquals(
                ColorUtils.isHexColor('#fff'),
                true,
                'Should still accept 3-digit shorthand hex'
            );
        },

        /**
         * Test 4: isHexColor - Should reject invalid hex lengths
         */
        'isHexColor should reject invalid lengths': function () {
            this.assertEquals(
                ColorUtils.isHexColor('#1979c38'),
                false,
                'Should reject 7-digit hex (invalid length)'
            );

            this.assertEquals(
                ColorUtils.isHexColor('#1979c3800'),
                false,
                'Should reject 9-digit hex (invalid length)'
            );

            this.assertEquals(
                ColorUtils.isHexColor('25, 121, 195'),
                false,
                'Should reject RGB string'
            );
        },

        /**
         * Test 5: normalizeHex - Should preserve hex8 (lowercase, with #)
         */
        'normalizeHex should preserve hex8 with lowercase': function () {
            this.assertEquals(
                ColorUtils.normalizeHex('#1979c380'),
                '#1979c380',
                'Should return hex8 unchanged (already lowercase)'
            );

            this.assertEquals(
                ColorUtils.normalizeHex('#1979C380'),
                '#1979c380',
                'Should lowercase hex8'
            );

            this.assertEquals(
                ColorUtils.normalizeHex('#FFFFFFFF'),
                '#ffffffff',
                'Should lowercase fully opaque white hex8'
            );

            this.assertEquals(
                ColorUtils.normalizeHex('#00000000'),
                '#00000000',
                'Should preserve fully transparent black hex8'
            );
        },

        /**
         * Test 6: normalizeHex - Should NOT expand hex8 (it is not 3-digit shorthand)
         */
        'normalizeHex should not expand hex8 as shorthand': function () {
            // Hex8 length=9 with #, so the shorthand expansion (length===4) must NOT trigger
            this.assertEquals(
                ColorUtils.normalizeHex('#ff000080'),
                '#ff000080',
                'Should not expand hex8 as 3-digit shorthand'
            );
        },

        /**
         * Test 7: normalizeHex - Backward compat with 6-digit hex still works
         */
        'normalizeHex backward compat with 6-digit hex': function () {
            this.assertEquals(
                ColorUtils.normalizeHex('#1979c3'),
                '#1979c3',
                'Should still normalize 6-digit hex'
            );

            this.assertEquals(
                ColorUtils.normalizeHex('#1979C3'),
                '#1979c3',
                'Should lowercase 6-digit hex'
            );

            this.assertEquals(
                ColorUtils.normalizeHex('#fff'),
                '#ffffff',
                'Should expand 3-digit shorthand to 6-digit'
            );
        },

        /**
         * Test 8: hexToRgb - Should strip alpha from hex8 and return plain RGB
         */
        'hexToRgb should strip alpha bytes from hex8': function () {
            this.assertEquals(
                ColorUtils.hexToRgb('#1979c380'),
                '25, 121, 195',
                'Should strip alpha from semi-transparent blue hex8'
            );

            this.assertEquals(
                ColorUtils.hexToRgb('#ffffffff'),
                '255, 255, 255',
                'Should strip ff alpha from fully opaque white hex8'
            );

            this.assertEquals(
                ColorUtils.hexToRgb('#00000000'),
                '0, 0, 0',
                'Should strip 00 alpha from fully transparent black hex8'
            );

            this.assertEquals(
                ColorUtils.hexToRgb('#ff000080'),
                '255, 0, 0',
                'Should strip alpha from semi-transparent red hex8'
            );
        },

        /**
         * Test 9: hexToRgb - Backward compat with 6-digit hex
         */
        'hexToRgb backward compat with 6-digit hex': function () {
            this.assertEquals(
                ColorUtils.hexToRgb('#1979c3'),
                '25, 121, 195',
                'Should still convert standard 6-digit hex'
            );

            this.assertEquals(
                ColorUtils.hexToRgb('#ffffff'),
                '255, 255, 255',
                'Should convert white hex6'
            );
        }
    });
});
