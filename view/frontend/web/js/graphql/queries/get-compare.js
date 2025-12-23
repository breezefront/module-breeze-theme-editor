define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query CompareChanges($storeId: Int!, $themeId: Int) {
            breezeThemeEditorCompare(storeId: $storeId, themeId: $themeId) {
                hasChanges
                changesCount
                changes {
                    sectionCode
                    sectionLabel
                    fieldCode
                    fieldLabel
                    publishedValue
                    draftValue
                    changeType
                }
            }
        }
    `;

    /**
     * Compare draft vs published changes
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @returns {Promise}
     */
    return function getCompare(storeId, themeId) {
        return client.execute(query, {
            storeId: storeId,
            themeId: themeId || null
        }, 'CompareChanges');
    };
});
