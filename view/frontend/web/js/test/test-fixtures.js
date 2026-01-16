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
         * Mock: Published CSS (base theme)
         * Use for testing PUBLISHED mode
         */
        publishedBase: {
            getThemeEditorCss: {
                css: `:root {
    --button-primary-bg: 25, 118, 210;  /* Default blue */
    --base-color: 17, 24, 39;            /* Default dark */
}`,
                status: 'PUBLISHED',
                hasContent: true
            }
        },
        
        /**
         * Mock: Draft CSS with changes
         * Use for testing DRAFT mode
         */
        draftWithChanges: {
            getThemeEditorCss: {
                css: `:root {
    --button-primary-bg: 220, 38, 38;  /* Red (modified) */
    --base-color: 180, 24, 24;         /* Dark red (modified) */
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
        networkError: new Error('Network request failed')
    };
});
