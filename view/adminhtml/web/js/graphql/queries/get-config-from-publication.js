define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetConfigFromPublication($storeId: Int!, $themeId: Int, $publicationId: Int!) {
            breezeThemeEditorConfigFromPublication(
                storeId: $storeId
                themeId: $themeId
                publicationId:  $publicationId
            ) {
                version
                sections {
                    code
                    label
                    icon
                    description
                    order
                    fields {
                        code
                        label
                        type
                        description
                        value
                        default
                        isModified
                        property
                        selector
                        required
                        validation {
                            minLength
                            maxLength
                            min
                            max
                            pattern
                            message
                        }
                        placeholder
                        helpText
                        palette
                        format
                        params {
                            ... on BreezeThemeEditorNumericParams {
                                min
                                max
                                step
                                unit
                            }
                            ... on BreezeThemeEditorSelectParams {
                                options {
                                    label
                                    value
                                    icon
                                    preview
                                }
                                maxItems
                            }
                            ... on BreezeThemeEditorFontPickerParams {
                                options {
                                    label
                                    value
                                    icon
                                    preview
                                }
                                fontWeights
                                fontStylesheets {
                                    value
                                    url
                                }
                            }
                            ... on BreezeThemeEditorSocialLinksParams {
                                platforms
                            }
                            ... on BreezeThemeEditorImageUploadParams {
                                sides
                                acceptTypes
                                maxSize
                            }
                            ... on BreezeThemeEditorCodeParams {
                                language
                                fallback
                            }
                        }
                        dependsOn {
                            fieldCode
                            value
                            operator
                        }
                    }
                }
                presets {
                    id
                    name
                    description
                    preview
                    settings {
                        sectionCode
                        fieldCode
                        value
                        isModified
                        updatedAt
                    }
                }
                metadata {
                    themeName
                    themeVersion
                    themeId
                    themeCode
                    themePath
                    parentId
                    lastPublished
                    hasUnpublishedChanges
                    draftChangesCount
                }
                palettes {
                    id
                    label
                    description
                    groups {
                        id
                        label
                        description
                        colors {
                            id
                            label
                            description
                            property
                            default
                            value
                            usageCount
                        }
                    }
                }
            }
        }
    `;

    /**
     * Get theme configuration from specific publication
     *
     * @param {Number} storeId - Required
     * @param {Number|null} themeId - Optional, auto-detected if null
     * @param {Number} publicationId - Publication ID to load from
     * @returns {Promise<Object>} - Returns full config structure
     */
    return function getConfigFromPublication(storeId, themeId, publicationId) {
        if (!publicationId) {
            return Promise.reject(new Error('publicationId is required'));
        }

        return client.execute(query, {
            storeId: storeId,
            themeId: themeId || null,
            publicationId: publicationId
        }, 'GetConfigFromPublication').then(function (response) {
            return response.breezeThemeEditorConfigFromPublication;
        });
    };
});
