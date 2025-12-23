define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetPublications($storeId: Int!, $themeId: Int, $pageSize: Int, $currentPage: Int, $search: String) {
            breezeThemeEditorPublications(
                storeId: $storeId
                themeId:  $themeId
                pageSize: $pageSize
                currentPage: $currentPage
                search:  $search
            ) {
                items {
                    publicationId
                    title
                    description
                    publishedAt
                    publishedByName
                    publishedByEmail
                    isRollback
                    rollbackFrom
                    changesCount
                    canRollback
                }
                page_info {
                    page_size
                    current_page
                    total_pages
                }
                total_count
            }
        }
    `;

    /**
     * Get publication history
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @param {Number} pageSize
     * @param {Number} currentPage
     * @param {String} search - Optional
     * @returns {Promise}
     */
    return function getPublications(storeId, themeId, pageSize, currentPage, search) {
        return client.execute(query, {
            storeId:  storeId,
            themeId: themeId || null,
            pageSize: pageSize || 20,
            currentPage: currentPage || 1,
            search:  search || null
        }, 'GetPublications');
    };
});
