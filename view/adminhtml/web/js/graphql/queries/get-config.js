define([
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function (client) {
    'use strict';

    var query = `
        query GetThemeConfig($scope: BreezeThemeEditorScopeInput, $status: BreezeThemeEditorStatusCode) {
            breezeThemeEditorConfig(scope: $scope, status: $status) {
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
                    modifiedCount
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
                        fontPalette
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
                fontPalettes {
                    id
                    label
                    options {
                        value
                        label
                        url
                    }
                    fonts {
                        id
                        label
                        property
                        default
                    }
                }
            }
        }
    `;

    /**
     * Get theme configuration with values
     *
     * @param {String} scope - 'default', 'websites', or 'stores'
     * @param {Number} scopeId
     * @param {String} status - DRAFT or PUBLISHED
     * @returns {Promise}
     */
    return function getConfig(scope, scopeId, status) {
        return client.execute(query, {
            scope:   { type: scope || 'stores', scopeId: scopeId },
            status:  status || 'DRAFT'
        }, 'GetThemeConfig');
    };
});
