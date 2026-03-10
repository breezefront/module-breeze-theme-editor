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
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @param {String} property - CSS variable name (e.g., "--color-brand-primary")
     * @param {String} value - RGB value (e.g., "25, 121, 195")
     * @returns {Promise}
     */
    return function savePaletteValue(scope, scopeId, property, value) {
        return client.execute(mutation, {
            input: {
                scope:    { type: scope || 'stores', scopeId: scopeId },
                property: property,
                value:    value
            }
        }, 'SavePaletteValue');
    };
});
