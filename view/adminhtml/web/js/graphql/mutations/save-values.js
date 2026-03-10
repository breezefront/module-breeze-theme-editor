define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation SaveMultipleValues($input: SaveBreezeThemeEditorValuesInput!) {
            saveBreezeThemeEditorValues(input: $input) {
                success
                message
                values {
                    sectionCode
                    fieldCode
                    value
                    isModified
                    updatedAt
                }
                validation_errors {
                    fieldCode
                    message
                }
            }
        }
    `;

    /**
     * Save multiple values at once
     *
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @param {String} status
     * @param {Array} values - [{sectionCode, fieldCode, value}]
     * @param {Boolean} autoPublish
     * @param {String} publicationTitle - Required if autoPublish
     * @returns {Promise}
     */
    return function saveValues(scope, scopeId, status, values, autoPublish, publicationTitle) {
        return client.execute(mutation, {
            input: {
                scope:            scope || 'stores',
                scopeId:          scopeId,
                status:           status || 'DRAFT',
                values:           values,
                autoPublish:      autoPublish || false,
                publicationTitle: publicationTitle || null
            }
        }, 'SaveMultipleValues');
    };
});
