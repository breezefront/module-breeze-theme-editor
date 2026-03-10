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
     * @param {String} scope
     * @param {Number} scopeId
     * @param {String} presetId
     * @param {String} status
     * @param {Boolean} overwriteExisting
     * @returns {Promise}
     */
    return function applyPreset(scope, scopeId, presetId, status, overwriteExisting) {
        return client.execute(mutation, {
            input: {
                scope: scope || 'stores',
                scopeId: parseInt(scopeId) || 0,
                presetId: presetId,
                status: status || 'DRAFT',
                overwriteExisting: overwriteExisting !== false
            }
        }, 'ApplyPreset');
    };
});
