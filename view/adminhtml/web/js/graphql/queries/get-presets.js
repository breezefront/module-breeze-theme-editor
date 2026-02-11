define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetPresets($storeId:  Int!, $themeId: Int) {
            breezeThemeEditorPresets(storeId: $storeId, themeId: $themeId) {
                id
                name
                description
                preview
            }
        }
    `;

    /**
     * Get available presets
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @returns {Promise}
     */
    return function getPresets(storeId, themeId) {
        return client.execute(query, {
            storeId: storeId,
            themeId: themeId || null
        }, 'GetPresets');
    };
});
