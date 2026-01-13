define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetThemeEditorCss($storeId: Int!, $themeId: Int, $status: BreezeThemeEditorStatusCode, $publicationId: Int) {
            getThemeEditorCss(storeId: $storeId, themeId: $themeId, status: $status, publicationId: $publicationId) {
                css
                status
                hasContent
            }
        }
    `;

    /**
     * Get theme CSS by status
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @param {String} status - DRAFT, PUBLISHED, or PUBLICATION
     * @param {Number} publicationId - Optional, required for PUBLICATION status
     * @returns {Promise}
     */
    return function getCss(storeId, themeId, status, publicationId) {
        return client.execute(query, {
            storeId: storeId,
            themeId: themeId || null,
            status: status || 'PUBLISHED',
            publicationId: publicationId || null
        }, 'GetThemeEditorCss');
    };
});
