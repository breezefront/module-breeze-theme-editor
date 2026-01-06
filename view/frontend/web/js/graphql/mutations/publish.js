define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var mutation = `
        mutation PublishDraft($input: PublishBreezeThemeEditorInput!) {
            publishBreezeThemeEditor(input: $input) {
                success
                message
                publication {
                    publicationId
                    title
                    publishedAt
                    publishedByName
                    changesCount
                }
            }
        }
    `;

    /**
     * Publish draft to production
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @param {String} title - Publication title
     * @param {String} description - Optional
     * @param {Boolean} notifyUsers
     * @returns {Promise}
     */
    return function publish(storeId, themeId, title, description, notifyUsers) {
        return client.execute(mutation, {
            input:  {
                storeId: storeId,
                themeId: themeId || null,
                title: title,
                description: description || null,
                notifyUsers: notifyUsers || false
            }
        }, 'PublishDraft');
    };
});
