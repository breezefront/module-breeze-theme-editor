define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation SaveSingleValue($input: SaveBreezeThemeEditorValueInput!) {
            saveBreezeThemeEditorValue(input: $input) {
                success
                message
                value {
                    sectionCode
                    fieldCode
                    value
                    isModified
                    updatedAt
                }
            }
        }
    `;

    /**
     * Save single value (for live preview)
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @param {String} status
     * @param {String} sectionCode
     * @param {String} fieldCode
     * @param {String} value - JSON string
     * @returns {Promise}
     */
    return function saveValue(storeId, themeId, status, sectionCode, fieldCode, value) {
        return client.execute(mutation, {
            input: {
                storeId: storeId,
                themeId: themeId || null,
                status: status || 'DRAFT',
                sectionCode: sectionCode,
                fieldCode: fieldCode,
                value: value
            }
        }, 'SaveSingleValue');
    };
});
