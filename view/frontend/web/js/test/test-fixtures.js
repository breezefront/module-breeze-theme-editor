/**
 * Test Fixtures
 * 
 * Reusable mock data for tests.
 * Contains mock responses for GraphQL queries.
 */
define([], function() {
    'use strict';
    
    return {
        /**
         * Mock: Publication CSS with green button
         * Use for testing publication mode with visible changes
         */
        publicationGreenButton: {
            getThemeEditorCss: {
                css: `:root {
    --button-primary-bg: 65, 204, 5;  /* Green button from publication */
    --base-color: 17, 24, 39;          /* Default text color */
}`,
                status: 'PUBLICATION',
                hasContent: true
            }
        },
        
        /**
         * Mock: Publication CSS with red button
         * Alternative publication with different colors
         */
        publicationRedButton: {
            getThemeEditorCss: {
                css: `:root {
    --button-primary-bg: 220, 38, 38;  /* Red button from publication */
    --link-color: 220, 38, 38;         /* Red links */
    --base-color: 17, 24, 39;          /* Default text color */
}`,
                status: 'PUBLICATION',
                hasContent: true
            }
        },
        
        /**
         * Mock: Empty publication (no changes)
         * Use for testing publications with no CSS changes
         */
        publicationEmpty: {
            getThemeEditorCss: {
                css: `:root {\n}\n`,
                status: 'PUBLICATION',
                hasContent: false
            }
        },
        
        /**
         * Mock: Publication with complex CSS
         * Use for testing publications with multiple variables
         */
        publicationComplex: {
            getThemeEditorCss: {
                css: `:root {
    --button-primary-bg: 65, 204, 5;         /* Green */
    --button-secondary-bg: 59, 130, 246;    /* Blue */
    --base-color: 17, 24, 39;               /* Dark gray */
    --link-color: 59, 130, 246;             /* Blue */
    --font-family-base: "Inter", sans-serif; /* Inter font */
    --spacing-base: 1rem;                   /* Base spacing */
}`,
                status: 'PUBLICATION',
                hasContent: true
            }
        },
        
        /**
         * Mock: Published CSS (base theme with red color)
         * Use for testing PUBLISHED mode
         */
        publishedBase: {
            getThemeEditorCss: {
                css: `:root {
    --button-primary-bg: 25, 118, 210;  /* Default blue */
    --base-color: 180, 24, 24;           /* Red color (published) */
}`,
                status: 'PUBLISHED',
                hasContent: true
            }
        },
        
        /**
         * Mock: Draft CSS with changes (blue color)
         * Use for testing DRAFT mode
         */
        draftWithChanges: {
            getThemeEditorCss: {
                css: `:root {
    --button-primary-bg: 220, 38, 38;  /* Red button (modified) */
    --base-color: 15, 39, 219;          /* Blue color (draft) */
}`,
                status: 'DRAFT',
                hasContent: true
            }
        },
        
        /**
         * Helper: Create custom publication CSS
         * 
         * @param {Object} variables - CSS variables to include
         * @returns {Object} Mock response
         * 
         * @example
         * var mockData = fixtures.createPublicationCss({
         *     '--button-color': '255, 0, 0',
         *     '--text-color': '0, 0, 0'
         * });
         */
        createPublicationCss: function(variables) {
            var css = ':root {\n';
            
            for (var varName in variables) {
                if (variables.hasOwnProperty(varName)) {
                    css += '    ' + varName + ': ' + variables[varName] + ';\n';
                }
            }
            
            css += '}\n';
            
            return {
                getThemeEditorCss: {
                    css: css,
                    status: 'PUBLICATION',
                    hasContent: Object.keys(variables).length > 0
                }
            };
        },
        
        /**
         * Mock: GraphQL error response
         * Use for testing error handling
         */
        graphqlError: {
            errors: [
                {
                    message: 'Publication not found',
                    extensions: {
                        category: 'graphql-no-such-entity'
                    }
                }
            ]
        },
        
        /**
         * Mock: Network error
         * Use for testing network failure scenarios
         */
        networkError: new Error('Network request failed'),
        
        // =====================================================================
        // PALETTE MOCK FIXTURES
        // =====================================================================
        
        /**
         * Mock: Color palette configuration
         * Use for testing palette UI and state management
         */
        mockPaletteConfig: {
            id: 'default',
            label: 'Default Palette',
            groups: [
                {
                    id: 'brand',
                    label: 'Brand Colors',
                    colors: [
                        {
                            id: 'primary',
                            label: 'Primary',
                            cssVar: '--color-brand-primary',
                            value: '25, 121, 195',
                            default: '25, 121, 195',
                            usageCount: 5
                        },
                        {
                            id: 'accent',
                            label: 'Accent',
                            cssVar: '--color-brand-accent',
                            value: '255, 165, 0',
                            default: '255, 165, 0',
                            usageCount: 3
                        },
                        {
                            id: 'secondary',
                            label: 'Secondary',
                            cssVar: '--color-brand-secondary',
                            value: '108, 117, 125',
                            default: '108, 117, 125',
                            usageCount: 2
                        }
                    ]
                },
                {
                    id: 'semantic',
                    label: 'Semantic Colors',
                    colors: [
                        {
                            id: 'success',
                            label: 'Success',
                            cssVar: '--color-semantic-success',
                            value: '40, 167, 69',
                            default: '40, 167, 69',
                            usageCount: 1
                        },
                        {
                            id: 'error',
                            label: 'Error',
                            cssVar: '--color-semantic-error',
                            value: '220, 53, 69',
                            default: '220, 53, 69',
                            usageCount: 4
                        }
                    ]
                },
                {
                    id: 'test',
                    label: 'Test Colors',
                    colors: [
                        {
                            id: 'test-red',
                            label: 'Test Red',
                            cssVar: '--color-test-red',
                            value: '255, 0, 0',
                            default: '255, 0, 0',
                            usageCount: 0
                        }
                    ]
                }
            ]
        },
        
        /**
         * Mock: Full config with palettes
         * Use for testing GraphQL config query with palette data
         */
        mockConfigWithPalettes: {
            breezeThemeEditorConfig: {
                sections: [],
                palettes: [
                    {
                        id: 'default',
                        label: 'Default Palette',
                        groups: [
                            {
                                id: 'brand',
                                label: 'Brand Colors',
                                colors: [
                                    {
                                        id: 'primary',
                                        label: 'Primary',
                                        cssVar: '--color-brand-primary',
                                        value: '25, 121, 195',
                                        default: '25, 121, 195',
                                        usageCount: 5
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        },
        
        /**
         * Mock: Save palette value - Success response
         * Use for testing successful palette color save mutation
         */
        mockSavePaletteSuccess: {
            saveBreezeThemeEditorPaletteValue: {
                success: true,
                message: 'Color saved successfully',
                affectedFields: ['button_color', 'link_color', 'header_bg']
            }
        },
        
        /**
         * Mock: Save palette value - Validation error (invalid CSS var)
         * Use for testing CSS variable name validation
         */
        mockSavePaletteValidationErrorCssVar: {
            saveBreezeThemeEditorPaletteValue: {
                success: false,
                message: 'Invalid CSS variable name. Must start with --color-',
                affectedFields: []
            }
        },
        
        /**
         * Mock: Save palette value - Validation error (invalid RGB format)
         * Use for testing RGB value format validation
         */
        mockSavePaletteValidationErrorRgb: {
            saveBreezeThemeEditorPaletteValue: {
                success: false,
                message: 'Invalid RGB format. Expected format: "R, G, B" (e.g., "255, 0, 0")',
                affectedFields: []
            }
        },
        
        /**
         * Mock: Save palette value - GraphQL error
         * Use for testing GraphQL error handling during save
         */
        mockSavePaletteGraphqlError: {
            errors: [
                {
                    message: 'Unable to save palette value',
                    extensions: {
                        category: 'graphql-input-error'
                    }
                }
            ]
        },
        
        /**
         * Mock: Empty palette configuration
         * Use for testing empty state handling
         */
        mockEmptyPalette: {
            id: 'empty',
            label: 'Empty Palette',
            groups: []
        },
        
        // =====================================================================
        // COLOR FIELD PALETTE REFERENCE FIXTURES
        // =====================================================================
        
        /**
         * Mock: Palette config for color field tests
         * Use for testing palette reference tracking in color fields
         */
        mockColorFieldPalette: {
            id: 'brand-colors',
            label: 'Brand Colors',
            groups: [
                {
                    id: 'primary',
                    label: 'Primary Colors',
                    colors: [
                        {
                            id: 'primary',
                            label: 'Primary Blue',
                            cssVar: '--color-brand-primary',
                            value: '25, 121, 195',
                            hex: '#1979c3',
                            default: '25, 121, 195',
                            usageCount: 5
                        },
                        {
                            id: 'secondary',
                            label: 'Secondary Green',
                            cssVar: '--color-brand-secondary',
                            value: '40, 167, 69',
                            hex: '#28a745',
                            default: '40, 167, 69',
                            usageCount: 3
                        }
                    ]
                },
                {
                    id: 'semantic',
                    label: 'Semantic Colors',
                    colors: [
                        {
                            id: 'error',
                            label: 'Error Red',
                            cssVar: '--color-semantic-error',
                            value: '220, 53, 69',
                            hex: '#dc3545',
                            default: '220, 53, 69',
                            usageCount: 2
                        }
                    ]
                }
            ]
        },
        
        /**
         * Mock: Palette with duplicate HEX colors
         * Use for testing priority of palette ref vs hex matching
         */
        mockPaletteWithDuplicates: {
            id: 'duplicate-test',
            label: 'Duplicate Test',
            groups: [
                {
                    id: 'test',
                    label: 'Test Colors',
                    colors: [
                        {
                            id: 'blue-primary',
                            label: 'Blue Primary',
                            cssVar: '--color-blue-primary',
                            value: '25, 121, 195',
                            hex: '#1979c3',
                            default: '25, 121, 195',
                            usageCount: 3
                        },
                        {
                            id: 'blue-500',
                            label: 'Blue 500',
                            cssVar: '--color-blue-500',
                            value: '25, 121, 195',
                            hex: '#1979c3', // Same HEX!
                            default: '25, 121, 195',
                            usageCount: 1
                        }
                    ]
                }
            ]
        }
    };
});
