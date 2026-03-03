/**
 * FontPaletteManager Tests
 *
 * Covers: init(), getPalette(), getOptions(), getFonts(), getRole(),
 *         isPaletteRole(), getStylesheetMap(), resolveValue()
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/font-palette-manager'
], function (TestFramework, FontPaletteManager) {
    'use strict';

    /**
     * Build a minimal font palette array accepted by FontPaletteManager.init().
     */
    function makePalettes(overrides) {
        var defaults = [{
            id: 'default',
            label: 'Default',
            options: [
                { value: 'system-ui, -apple-system, sans-serif', label: 'System UI' },
                { value: "'Roboto', sans-serif", label: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto' },
                { value: "'Open Sans', sans-serif", label: 'Open Sans', url: 'https://fonts.googleapis.com/css2?family=Open+Sans' }
            ],
            fonts: [
                { id: 'primary',   label: 'Primary',   property: '--primary-font',   'default': 'system-ui, -apple-system, sans-serif' },
                { id: 'secondary', label: 'Secondary', property: '--secondary-font',  'default': "'Roboto', sans-serif" },
                { id: 'utility',   label: 'Utility',   property: '--utility-font',    'default': 'system-ui, -apple-system, sans-serif' }
            ]
        }];
        return overrides || defaults;
    }

    /**
     * Reset FontPaletteManager to a clean state before each test.
     * We do this by calling init() with a fresh set of palettes.
     */
    function initFresh() {
        FontPaletteManager.init(makePalettes());
    }

    return TestFramework.suite('FontPaletteManager', {

        // ─── init() ─────────────────────────────────────────────────────────

        'init: accepts empty array without throwing': function () {
            FontPaletteManager.init([]);
            this.assertNull(FontPaletteManager.getPalette('default'),
                'After empty init, getPalette should return null');
        },

        'init: accepts null without throwing': function () {
            FontPaletteManager.init(null);
            this.assertNull(FontPaletteManager.getPalette('default'),
                'After null init, getPalette should return null');
        },

        'init: registers palette by id': function () {
            initFresh();
            var p = FontPaletteManager.getPalette('default');
            this.assertNotNull(p, 'Palette should be registered');
            this.assertEqual('default', p.id, 'Palette id should match');
        },

        // ─── getPalette() ────────────────────────────────────────────────────

        'getPalette: returns null for unknown id': function () {
            initFresh();
            this.assertNull(FontPaletteManager.getPalette('nonexistent'),
                'Unknown palette id should return null');
        },

        'getPalette: returns correct palette object': function () {
            initFresh();
            var p = FontPaletteManager.getPalette('default');
            this.assertEqual('Default', p.label, 'Label should match');
        },

        // ─── getOptions() ────────────────────────────────────────────────────

        'getOptions: returns empty array for unknown palette': function () {
            initFresh();
            var opts = FontPaletteManager.getOptions('nonexistent');
            this.assertEqual(0, opts.length, 'Unknown palette should return empty array');
        },

        'getOptions: returns all options for known palette': function () {
            initFresh();
            var opts = FontPaletteManager.getOptions('default');
            this.assertEqual(3, opts.length, 'Should return all 3 options');
            this.assertEqual('System UI', opts[0].label, 'First option label should match');
        },

        // ─── getFonts() ──────────────────────────────────────────────────────

        'getFonts: returns empty array for unknown palette': function () {
            initFresh();
            var fonts = FontPaletteManager.getFonts('nonexistent');
            this.assertEqual(0, fonts.length, 'Unknown palette should return empty array');
        },

        'getFonts: returns all font roles': function () {
            initFresh();
            var fonts = FontPaletteManager.getFonts('default');
            this.assertEqual(3, fonts.length, 'Should return 3 font roles');
            this.assertEqual('primary', fonts[0].id, 'First role id should be "primary"');
        },

        // ─── getRole() ───────────────────────────────────────────────────────

        'getRole: returns null for unknown property': function () {
            initFresh();
            this.assertNull(FontPaletteManager.getRole('--unknown-font'),
                'Unknown property should return null');
        },

        'getRole: returns correct role for known property': function () {
            initFresh();
            var role = FontPaletteManager.getRole('--primary-font');
            this.assertNotNull(role, 'Should find --primary-font role');
            this.assertEqual('primary', role.id, 'Role id should be "primary"');
            this.assertEqual('Primary', role.label, 'Role label should be "Primary"');
        },

        'getRole: returns null after re-init with empty': function () {
            initFresh();
            FontPaletteManager.init([]);
            this.assertNull(FontPaletteManager.getRole('--primary-font'),
                'After empty re-init, role lookup should return null');
        },

        // ─── isPaletteRole() ─────────────────────────────────────────────────

        'isPaletteRole: returns false for unknown palette': function () {
            initFresh();
            this.assertFalse(FontPaletteManager.isPaletteRole('nonexistent', '--primary-font'),
                'Unknown palette should return false');
        },

        'isPaletteRole: returns true for role property in palette': function () {
            initFresh();
            this.assertTrue(FontPaletteManager.isPaletteRole('default', '--primary-font'),
                '--primary-font is a role in the default palette');
        },

        'isPaletteRole: returns true for all three role properties': function () {
            initFresh();
            this.assertTrue(FontPaletteManager.isPaletteRole('default', '--secondary-font'),
                '--secondary-font is a role');
            this.assertTrue(FontPaletteManager.isPaletteRole('default', '--utility-font'),
                '--utility-font is a role');
        },

        'isPaletteRole: returns false for non-role property in palette': function () {
            initFresh();
            this.assertFalse(FontPaletteManager.isPaletteRole('default', '--base-font-family'),
                '--base-font-family is not a role property');
        },

        // ─── getStylesheetMap() ──────────────────────────────────────────────

        'getStylesheetMap: returns empty object for unknown palette': function () {
            initFresh();
            var map = FontPaletteManager.getStylesheetMap('nonexistent');
            this.assertEqual(0, Object.keys(map).length,
                'Unknown palette should return empty map');
        },

        'getStylesheetMap: only includes options with url': function () {
            initFresh();
            var map = FontPaletteManager.getStylesheetMap('default');
            // System UI has no url, Roboto and Open Sans do
            this.assertFalse(
                map.hasOwnProperty('system-ui, -apple-system, sans-serif'),
                'System UI (no url) should not appear in map'
            );
            this.assertTrue(
                map.hasOwnProperty("'Roboto', sans-serif"),
                'Roboto should appear in map'
            );
            this.assertTrue(
                map.hasOwnProperty("'Open Sans', sans-serif"),
                'Open Sans should appear in map'
            );
        },

        'getStylesheetMap: maps value to url': function () {
            initFresh();
            var map = FontPaletteManager.getStylesheetMap('default');
            this.assertEqual(
                'https://fonts.googleapis.com/css2?family=Roboto',
                map["'Roboto', sans-serif"],
                'Roboto url should match'
            );
        },

        // ─── resolveValue() ──────────────────────────────────────────────────

        'resolveValue: returns value unchanged for non-role string': function () {
            initFresh();
            var v = "'Roboto', sans-serif";
            this.assertEqual(v, FontPaletteManager.resolveValue(v),
                'Non-role value should pass through unchanged');
        },

        'resolveValue: returns value unchanged for unknown -- reference': function () {
            initFresh();
            this.assertEqual('--unknown-font', FontPaletteManager.resolveValue('--unknown-font'),
                'Unknown CSS-var ref should be returned as-is');
        },

        'resolveValue: resolves known role reference to default font': function () {
            initFresh();
            var resolved = FontPaletteManager.resolveValue('--secondary-font');
            this.assertEqual("'Roboto', sans-serif", resolved,
                '--secondary-font should resolve to its default font stack');
        },

        'resolveValue: resolves primary font role': function () {
            initFresh();
            var resolved = FontPaletteManager.resolveValue('--primary-font');
            this.assertEqual('system-ui, -apple-system, sans-serif', resolved,
                '--primary-font should resolve to system-ui stack');
        },

        // ─── setCurrentValue() / getCurrentValue() ───────────────────────────

        'setCurrentValue: resolveValue returns live value instead of role.default': function () {
            initFresh();
            // Override --secondary-font (default: "'Roboto', sans-serif") with Open Sans
            FontPaletteManager.setCurrentValue('--secondary-font', "'Open Sans', sans-serif");
            var resolved = FontPaletteManager.resolveValue('--secondary-font');
            this.assertEqual("'Open Sans', sans-serif", resolved,
                'resolveValue should return the live current value, not role.default');
        },

        'setCurrentValue: getCurrentValue returns stored value': function () {
            initFresh();
            FontPaletteManager.setCurrentValue('--primary-font', "'Lato', sans-serif");
            this.assertEqual(
                "'Lato', sans-serif",
                FontPaletteManager.getCurrentValue('--primary-font'),
                'getCurrentValue should return the value set by setCurrentValue'
            );
        },

        'getCurrentValue: falls back to role.default when no current value is set': function () {
            initFresh();
            // --utility-font default is 'system-ui, -apple-system, sans-serif'
            this.assertEqual(
                'system-ui, -apple-system, sans-serif',
                FontPaletteManager.getCurrentValue('--utility-font'),
                'getCurrentValue should fall back to role.default when no current value has been set'
            );
        },

        'getCurrentValue: returns empty string for unknown property': function () {
            initFresh();
            this.assertEqual(
                '',
                FontPaletteManager.getCurrentValue('--unknown-font'),
                'getCurrentValue should return empty string for a property with no role and no stored value'
            );
        },

        'init: clears current values set before re-init': function () {
            initFresh();
            FontPaletteManager.setCurrentValue('--primary-font', "'Lato', sans-serif");
            // Re-initialise with fresh palettes — _currentValues must be wiped
            initFresh();
            var resolved = FontPaletteManager.resolveValue('--primary-font');
            this.assertEqual(
                'system-ui, -apple-system, sans-serif',
                resolved,
                'After re-init, resolveValue should return role.default, not the previously stored live value'
            );
        }
    });
});
