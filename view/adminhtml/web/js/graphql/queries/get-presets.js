define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetPresets($scope: BreezeThemeEditorScopeInput) {
            breezeThemeEditorPresets(scope: $scope) {
                id
                name
                description
                preview
            }
        }
    `;

    /**
     * Get available presets
     *
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @returns {Promise}
     */
    return function getPresets(scope, scopeId) {
        return client.execute(query, {
            scope: { type: scope || 'stores', scopeId: scopeId }
        }, 'GetPresets');
    };
});
