define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation DiscardPublished($scope: BreezeThemeEditorScope, $scopeId: Int!) {
            discardBreezeThemeEditorPublished(
                scope: $scope
                scopeId: $scopeId
            ) {
                success
                message
                discardedCount
            }
        }
    `;

    /**
     * Reset all published customizations to theme defaults
     *
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @returns {Promise}
     */
    return function discardPublished(scope, scopeId) {
        return client.execute(mutation, {
            scope:   scope || 'stores',
            scopeId: scopeId
        }, 'DiscardPublished');
    };
});
