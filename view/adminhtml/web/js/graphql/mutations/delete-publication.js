define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation DeletePublication($publicationId: Int!) {
            deleteBreezeThemeEditorPublication(publicationId: $publicationId) {
                success
                message
            }
        }
    `;

    /**
     * Delete a historical publication record.
     *
     * @param {Number} publicationId - ID of the publication to delete
     * @returns {Promise}
     */
    return function deletePublication(publicationId) {
        return client.execute(mutation, {
            publicationId: publicationId
        }, 'DeletePublication');
    };
});
