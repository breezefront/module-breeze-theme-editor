define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation ApplyPreset($input: ApplyBreezeThemeEditorPresetInput!) {
            applyBreezeThemeEditorPreset(input: $input) {
                success
                message
                values {
                    sectionCode
                    fieldCode
                    value
                }
                appliedCount
            }
        }
    `;

    /**
     * Apply preset to draft
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @param {String} presetId
     * @param {String} status
     * @param {Boolean} overwriteExisting
     * @returns {Promise}
     */
    return function applyPreset(storeId, themeId, presetId, status, overwriteExisting) {
        return client.execute(mutation, {
            input: {
                storeId: storeId,
                themeId: themeId || null,
                presetId: presetId,
                status: status || 'DRAFT',
                overwriteExisting: overwriteExisting !== false
            }
        }, 'ApplyPreset');
    };
});
