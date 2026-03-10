define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query CompareChanges($scope: BreezeThemeEditorScopeInput) {
            breezeThemeEditorCompare(scope: $scope) {
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
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @returns {Promise}
     */
    return function getCompare(scope, scopeId) {
        return client.execute(query, {
            scope: { type: scope || 'stores', scopeId: scopeId }
        }, 'CompareChanges');
    };
});
