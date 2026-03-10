define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetThemeEditorCss($scope: BreezeThemeEditorScopeInput, $status: BreezeThemeEditorCssStatusCode, $publicationId: Int) {
            getThemeEditorCss(scope: $scope, status: $status, publicationId: $publicationId) {
                css
                status
                hasContent
            }
        }
    `;

    /**
     * Get theme CSS by status
     *
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @param {String} status - DRAFT, PUBLISHED, or PUBLICATION
     * @param {Number} publicationId - Optional, required for PUBLICATION status
     * @returns {Promise}
     */
    return function getCss(scope, scopeId, status, publicationId) {
        return client.execute(query, {
            scope:         { type: scope || 'stores', scopeId: scopeId },
            status:        status || 'PUBLISHED',
            publicationId: publicationId || null
        }, 'GetThemeEditorCss');
    };
});
