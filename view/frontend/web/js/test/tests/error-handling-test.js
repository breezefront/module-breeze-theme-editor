/**
 * Error Handling Tests
 * 
 * Tests for GraphQL client error handling robustness
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function(TestFramework, GraphQLClient) {
    'use strict';
    
    return TestFramework.suite('Error Handling', {
        
        'should handle undefined response in _handleSuccess': function() {
            try {
                GraphQLClient._handleSuccess(undefined);
                this.fail('Should throw error for undefined response');
            } catch (e) {
                this.assertStringContains(e.message, 'Empty response', 
                    'Error message should mention empty response');
                this.assertNotNull(e.graphqlErrors, 
                    'Error should have graphqlErrors array');
                this.assertEquals(e.graphqlErrors.length, 0, 
                    'graphqlErrors should be empty array');
            }
        },
        
        'should handle null response in _handleSuccess': function() {
            try {
                GraphQLClient._handleSuccess(null);
                this.fail('Should throw error for null response');
            } catch (e) {
                this.assertStringContains(e.message, 'Empty response',
                    'Error message should mention empty response');
                this.assertNotNull(e.graphqlErrors,
                    'Error should have graphqlErrors array');
            }
        },
        
        'should handle GraphQL errors in response': function() {
            var response = {
                errors: [{
                    message: 'Invalid access token',
                    extensions: { category: 'graphql-authorization' }
                }]
            };
            
            try {
                GraphQLClient._handleSuccess(response);
                this.fail('Should throw error for GraphQL errors');
            } catch (e) {
                this.assertStringContains(e.message, 'Invalid access token',
                    'Error message should contain GraphQL error message');
                this.assertNotNull(e.extensions,
                    'Error should have extensions');
                this.assertNotNull(e.graphqlErrors,
                    'Error should have graphqlErrors array');
                this.assertEquals(e.graphqlErrors.length, 1,
                    'graphqlErrors should contain 1 error');
            }
        },
        
        'should handle response with missing data field': function() {
            var response = {};
            var result = GraphQLClient._handleSuccess(response);
            this.assertEquals(result, null, 
                'Should return null when response has no data field');
        },
        
        'should return data for valid response': function() {
            var response = {
                data: { 
                    test: 'value',
                    nested: { prop: 123 }
                }
            };
            var result = GraphQLClient._handleSuccess(response);
            this.assertNotNull(result, 'Result should not be null');
            this.assertEquals(result.test, 'value', 
                'Should return correct data');
            this.assertEquals(result.nested.prop, 123,
                'Should return nested data correctly');
        },
        
        'should handle empty responseText in _handleError': function() {
            var xhr = { responseText: '' };
            try {
                GraphQLClient._handleError(xhr, 'error', 'Network failed');
                this.fail('Should throw error');
            } catch (e) {
                this.assertStringContains(e.message, 'Network',
                    'Error message should mention network issue');
                this.assertNotNull(e.graphqlErrors,
                    'Error should have graphqlErrors array');
                this.assertEquals(e.graphqlErrors.length, 0,
                    'graphqlErrors should be empty for network errors');
            }
        },
        
        'should handle invalid JSON in _handleError': function() {
            var xhr = { responseText: 'not{json' };
            try {
                GraphQLClient._handleError(xhr, 'parsererror', 'Parse error');
                this.fail('Should throw error');
            } catch (e) {
                // Should use fallback message when JSON parse fails
                var validMessages = ['Parse error', 'parsererror', 'Network error'];
                var hasValidMessage = validMessages.some(function(msg) {
                    return e.message.indexOf(msg) !== -1;
                });
                this.assertTrue(hasValidMessage,
                    'Error message should be one of: ' + validMessages.join(', '));
            }
        },
        
        'should parse GraphQL errors in responseText': function() {
            var xhr = {
                responseText: JSON.stringify({
                    errors: [{
                        message: 'Access denied',
                        extensions: { code: 'FORBIDDEN' }
                    }]
                })
            };
            
            try {
                GraphQLClient._handleError(xhr, 'error', 'HTTP 403');
                this.fail('Should throw error');
            } catch (e) {
                this.assertEquals(e.message, 'Access denied',
                    'Should extract GraphQL error message');
                this.assertNotNull(e.extensions,
                    'Should extract extensions');
                this.assertEquals(e.extensions.code, 'FORBIDDEN',
                    'Should preserve extension properties');
                this.assertNotNull(e.graphqlErrors,
                    'Should have graphqlErrors array');
                this.assertEquals(e.graphqlErrors.length, 1,
                    'Should have 1 GraphQL error');
            }
        }
    });
});
