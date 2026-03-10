define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetPresets($scope: BreezeThemeEditorScope, $scopeId: Int!) {
            breezeThemeEditorPresets(scope: $scope, scopeId: $scopeId) {
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
            scope:   scope || 'stores',
            scopeId: scopeId
        }, 'GetPresets');
    };
});
