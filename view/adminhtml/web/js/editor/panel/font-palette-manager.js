/**
 * FontPaletteManager — font palette system for Breeze Theme Editor
 *
 * Mirrors the subset of PaletteManager API that is needed for font palettes.
 * Font palettes have a different structure from color palettes:
 *
 *   fontPalettes: [
 *     {
 *       id: 'default',
 *       label: 'Default',
 *       options: [ { value, label, url }, ... ],   // available fonts to pick from
 *       fonts:   [ { id, label, property, default }, ... ] // named role definitions
 *     }
 *   ]
 *
 * Role fields (whose property is one of fonts[].property) only show the
 * options[] list — no role swatches to avoid self-referencing.
 *
 * Consumer fields (all other font_picker fields with a font_palette) show
 * role swatches above the options list so the user can pick "Primary font",
 * "Secondary font", etc., storing the CSS variable reference as the value.
 */
define([], function() {
    'use strict';

    /**
     * Map of paletteId → palette object
     * @type {Object}
     */
    var _palettes = {};

    /**
     * Flat map of property → font-role object (across all palettes)
     * Used for fast lookup: "--primary-font" → { id, label, property, default }
     * @type {Object}
     */
    var _rolesByProperty = {};

    var FontPaletteManager = {

        /**
         * Initialise from GraphQL response data
         *
         * @param {Array} fontPalettes  - Array from config.fontPalettes
         */
        init: function(fontPalettes) {
            _palettes = {};
            _rolesByProperty = {};

            if (!fontPalettes || !fontPalettes.length) {
                return;
            }

            fontPalettes.forEach(function(palette) {
                _palettes[palette.id] = palette;

                (palette.fonts || []).forEach(function(role) {
                    _rolesByProperty[role.property] = role;
                });
            });
        },

        /**
         * Get a palette by id
         *
         * @param  {String} paletteId
         * @return {Object|null}
         */
        getPalette: function(paletteId) {
            return _palettes[paletteId] || null;
        },

        /**
         * Get the options[] array for a palette
         *
         * @param  {String} paletteId
         * @return {Array}
         */
        getOptions: function(paletteId) {
            var palette = _palettes[paletteId];
            return palette ? (palette.options || []) : [];
        },

        /**
         * Get the fonts[] (role definitions) for a palette
         *
         * @param  {String} paletteId
         * @return {Array}
         */
        getFonts: function(paletteId) {
            var palette = _palettes[paletteId];
            return palette ? (palette.fonts || []) : [];
        },

        /**
         * Get a single font role by its CSS-variable property name
         *
         * @param  {String} property  e.g. '--primary-font'
         * @return {Object|null}
         */
        getRole: function(property) {
            return _rolesByProperty[property] || null;
        },

        /**
         * Check whether a given CSS property is a palette role definition.
         * Role fields should NOT show swatches (would be self-referencing).
         *
         * @param  {String} paletteId
         * @param  {String} property   CSS variable name of the field
         * @return {Boolean}
         */
        isPaletteRole: function(paletteId, property) {
            var palette = _palettes[paletteId];
            if (!palette) {
                return false;
            }
            return (palette.fonts || []).some(function(role) {
                return role.property === property;
            });
        },

        /**
         * Build a value → URL map for a palette's options (for stylesheet loading)
         *
         * @param  {String} paletteId
         * @return {Object}  { fontValue: stylesheetUrl, ... }
         */
        getStylesheetMap: function(paletteId) {
            var map = {};
            this.getOptions(paletteId).forEach(function(opt) {
                if (opt.url) {
                    map[opt.value] = opt.url;
                }
            });
            return map;
        },

        /**
         * Given a stored value that may be a CSS-var reference (e.g. '--primary-font'),
         * resolve it to the actual font stack from the role's default.
         * Returns the value unchanged if it is not a known role reference.
         *
         * @param  {String} value
         * @return {String}
         */
        resolveValue: function(value) {
            if (typeof value === 'string' && value.startsWith('--')) {
                var role = _rolesByProperty[value];
                if (role) {
                    return role.default;
                }
            }
            return value;
        }
    };

    return FontPaletteManager;
});
