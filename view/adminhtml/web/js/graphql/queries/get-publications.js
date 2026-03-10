define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetPublications($scope: BreezeThemeEditorScopeInput, $pageSize: Int, $currentPage: Int, $search: String) {
            breezeThemeEditorPublications(
                scope: $scope
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
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @param {Number} pageSize - Items per page (default: 20)
     * @param {Number} currentPage - Current page (default: 1)
     * @param {String|null} search - Search by title (optional)
     * @returns {Promise<Object>} - Returns { items:  [], page_info: {}, total_count: 0 }
     */
    return function getPublications(scope, scopeId, pageSize, currentPage, search) {
        return client.execute(query, {
            scope:       { type: scope || 'stores', scopeId: scopeId },
            pageSize:    pageSize || 20,
            currentPage: currentPage || 1,
            search:      search || null
        }, 'GetPublications').then(function (response) {
            return response.breezeThemeEditorPublications;
        });
    };
});
