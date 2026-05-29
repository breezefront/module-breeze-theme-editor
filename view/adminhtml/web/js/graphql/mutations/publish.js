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
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @param {String} title - Publication title
     * @param {String} description - Optional
     * @returns {Promise}
     */
    return function publish(scope, scopeId, title, description) {
        return client.execute(mutation, {
            input:  {
                scope:        { type: scope || 'stores', scopeId: scopeId },
                title:        title,
                description:  description || null
            }
        }, 'PublishDraft');
    };
});
