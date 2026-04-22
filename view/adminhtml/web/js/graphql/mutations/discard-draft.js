define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation DiscardDraft($scope: BreezeThemeEditorScopeInput, $sectionCodes: [String!], $fieldCodes: [String!]) {
            discardBreezeThemeEditorDraft(
                scope: $scope
                sectionCodes: $sectionCodes
                fieldCodes: $fieldCodes
            ) {
                success
                message
                discardedCount
                values {
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
     * Discard draft changes
     *
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @param {Array}  sectionCodes - Optional (discard only specific sections)
     * @param {Array}  fieldCodes   - Optional (discard only specific fields within the given sections)
     * @returns {Promise}
     */
    return function discardDraft(scope, scopeId, sectionCodes, fieldCodes) {
        return client.execute(mutation, {
            scope:        { type: scope || 'stores', scopeId: scopeId },
            sectionCodes: sectionCodes || null,
            fieldCodes:   fieldCodes || null
        }, 'DiscardDraft');
    };
});
