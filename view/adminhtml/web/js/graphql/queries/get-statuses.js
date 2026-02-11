define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetStatuses {
            breezeThemeEditorStatuses {
                code
                label
                sortOrder
            }
        }
    `;

    /**
     * Get available statuses (DRAFT, PUBLISHED, etc.)
     *
     * @returns {Promise}
     */
    return function getStatuses() {
        return client.execute(query, {}, 'GetStatuses');
    };
});
