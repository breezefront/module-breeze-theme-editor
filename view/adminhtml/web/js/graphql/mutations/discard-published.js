define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation DiscardPublished($scope: BreezeThemeEditorScopeInput) {
            discardBreezeThemeEditorPublished(
                scope: $scope
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
            scope: { type: scope || 'stores', scopeId: scopeId }
        }, 'DiscardPublished');
    };
});
