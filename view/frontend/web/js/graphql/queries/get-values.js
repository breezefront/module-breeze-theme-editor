define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetValues($storeId: Int!, $themeId: Int, $status: BreezeThemeEditorStatusCode, $sectionCodes: [String! ]) {
            breezeThemeEditorValues(
                storeId: $storeId
                themeId: $themeId
                status: $status
                sectionCodes: $sectionCodes
            ) {
                sectionCode
                fieldCode
                value
                isModified
                updatedAt
            }
        }
    `;

    /**
     * Get theme values only (without config)
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @param {String} status - DRAFT or PUBLISHED
     * @param {Array} sectionCodes - Optional filter
     * @returns {Promise}
     */
    return function getValues(storeId, themeId, status, sectionCodes) {
        return client.execute(query, {
            storeId: storeId,
            themeId: themeId || null,
            status: status || 'DRAFT',
            sectionCodes: sectionCodes || null
        }, 'GetValues');
    };
});
