define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetValues($scope: BreezeThemeEditorScopeInput, $status: BreezeThemeEditorStatusCode, $sectionCodes: [String! ]) {
            breezeThemeEditorValues(
                scope: $scope
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
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @param {String} status - DRAFT or PUBLISHED
     * @param {Array} sectionCodes - Optional filter
     * @returns {Promise}
     */
    return function getValues(scope, scopeId, status, sectionCodes) {
        return client.execute(query, {
            scope:        { type: scope || 'stores', scopeId: scopeId },
            status:       status || 'DRAFT',
            sectionCodes: sectionCodes || null
        }, 'GetValues');
    };
});
