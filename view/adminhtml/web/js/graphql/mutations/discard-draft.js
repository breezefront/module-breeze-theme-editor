define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation DiscardDraft($storeId: Int!, $themeId: Int, $sectionCodes: [String!]) {
            discardBreezeThemeEditorDraft(
                storeId: $storeId
                themeId: $themeId
                sectionCodes: $sectionCodes
            ) {
                success
                message
                discardedCount
            }
        }
    `;

    /**
     * Discard draft changes
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @param {Array} sectionCodes - Optional (discard only specific sections)
     * @returns {Promise}
     */
    return function discardDraft(storeId, themeId, sectionCodes) {
        return client.execute(mutation, {
            storeId: storeId,
            themeId: themeId || null,
            sectionCodes: sectionCodes || null
        }, 'DiscardDraft');
    };
});
