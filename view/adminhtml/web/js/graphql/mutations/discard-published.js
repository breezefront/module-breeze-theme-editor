define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation DiscardPublished($storeId: Int!, $themeId: Int) {
            discardBreezeThemeEditorPublished(
                storeId: $storeId
                themeId: $themeId
            ) {
                success
                message
                discardedCount
            }
        }
    `;

    /**
     * Reset all published customizations to theme defaults
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @returns {Promise}
     */
    return function discardPublished(storeId, themeId) {
        return client.execute(mutation, {
            storeId: storeId,
            themeId: themeId || null
        }, 'DiscardPublished');
    };
});
