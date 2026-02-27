define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation RollbackPublication($input: RollbackBreezeThemeEditorInput!) {
            rollbackBreezeThemeEditor(input: $input) {
                success
                message
                publication {
                    publicationId
                    title
                    publishedAt
                    publishedByName
                    isRollback
                    rollbackFrom
                    changesCount
                }
            }
        }
    `;

    /**
     * Publish a specific historical publication ("publish this version")
     *
     * @param {Number} publicationId - ID of the historical publication to restore
     * @param {String} title         - Label for the new rollback publication record
     * @param {String} description   - Optional notes
     * @returns {Promise}
     */
    return function rollback(publicationId, title, description) {
        return client.execute(mutation, {
            input: {
                publicationId: publicationId,
                title: title,
                description: description || null
            }
        }, 'RollbackPublication');
    };
});
