define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation SavePaletteValue($input: SaveBreezeThemeEditorPaletteValueInput!) {
            saveBreezeThemeEditorPaletteValue(input: $input) {
                success
                message
                affectedFields
            }
        }
    `;

    /**
     * Save palette color value
     *
     * @param {Number} storeId
     * @param {Number} themeId
     * @param {String} cssVar - CSS variable name (e.g., "--color-brand-primary")
     * @param {String} value - RGB value (e.g., "25, 121, 195")
     * @returns {Promise}
     */
    return function savePaletteValue(storeId, themeId, cssVar, value) {
        return client.execute(mutation, {
            input: {
                storeId: storeId,
                themeId: themeId,
                cssVar: cssVar,
                value: value
            }
        }, 'SavePaletteValue');
    };
});
