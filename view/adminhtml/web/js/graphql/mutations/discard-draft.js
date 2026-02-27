define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation DiscardDraft($storeId: Int!, $themeId: Int, $sectionCodes: [String!], $fieldCodes: [String!]) {
            discardBreezeThemeEditorDraft(
                storeId: $storeId
                themeId: $themeId
                sectionCodes: $sectionCodes
                fieldCodes: $fieldCodes
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
     * @param {Number} themeId      - Optional
     * @param {Array}  sectionCodes - Optional (discard only specific sections)
     * @param {Array}  fieldCodes   - Optional (discard only specific fields within the given sections)
     * @returns {Promise}
     */
    return function discardDraft(storeId, themeId, sectionCodes, fieldCodes) {
        return client.execute(mutation, {
            storeId: storeId,
            themeId: themeId || null,
            sectionCodes: sectionCodes || null,
            fieldCodes: fieldCodes || null
        }, 'DiscardDraft');
    };
});
