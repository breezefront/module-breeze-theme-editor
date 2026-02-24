define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetThemeConfig($storeId: Int!, $themeId: Int, $status: BreezeThemeEditorStatusCode) {
            breezeThemeEditorConfig(storeId: $storeId, themeId: $themeId, status: $status) {
                version
                metadata {
                    themeId
                    themeName
                    themeVersion
                    themeCode
                    themePath
                    parentId
                    lastPublished
                    hasUnpublishedChanges
                    draftChangesCount
                }
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
                        placeholder
                        helpText
                        palette
                        format
                        validation {
                            minLength
                            maxLength
                            min
                            max
                            pattern
                            message
                        }
                        params {
                            min
                            max
                            step
                            unit
                            options {
                                label
                                value
                                icon
                                preview
                            }
                            language
                            fallback
                            fontWeights
                            platforms
                            maxItems
                            allowedExtensions
                            maxFileSize
                            sides
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
                            cssVar
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
     * Get theme configuration with values
     *
     * @param {Number} storeId
     * @param {Number} themeId - Optional
     * @param {String} status - DRAFT or PUBLISHED
     * @returns {Promise}
     */
    return function getConfig(storeId, themeId, status) {
        return client.execute(query, {
            storeId: storeId,
            themeId: themeId || null,
            status:  status || 'DRAFT'
        }, 'GetThemeConfig');
    };
});
