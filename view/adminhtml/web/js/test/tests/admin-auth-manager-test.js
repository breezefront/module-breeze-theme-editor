/**
 * Admin Auth Manager Test Suite
 * 
 * Tests for admin-specific authentication with Bearer tokens
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper'
], function($, TestFramework, GraphQLClient, ConfigManager, StorageHelper) {
    'use strict';
    
    return TestFramework.suite('Admin Auth Manager', {
        /**
         * Test 1: Verify Bearer token exists in bte.global.admin_token
         */
        'should have Bearer token in storage': function() {
            var token = StorageHelper.getGlobalItem('admin_token');
            this.assertNotNull(token, 'Bearer token should exist in bte.global.admin_token');
            this.assertTrue(token.length > 0, 'Token should not be empty');
            
            console.log('✅ Bearer token found:', token.substring(0, 20) + '...');
        },
        
        /**
         * Test 2: Verify ConfigManager has admin config
         */
        'should have admin config available': function() {
            var config = ConfigManager.get();
            this.assertNotNull(config, 'ConfigManager should have config');
            this.assertNotNull(config.graphqlEndpoint, 'GraphQL endpoint should be configured');
            
            console.log('✅ GraphQL endpoint:', config.graphqlEndpoint);
        },
        
        /**
         * Test 3: Verify GraphQL client can add Bearer token to headers
         */
        'GraphQL client should use Bearer token in headers': function() {
            var headers = GraphQLClient._getHeaders();
            
            this.assertNotNull(headers, 'Headers should exist');
            this.assertNotNull(headers['Authorization'], 'Authorization header should exist');
            this.assertStringContains(
                headers['Authorization'], 
                'Bearer', 
                'Authorization header should use Bearer scheme'
            );
            
            console.log('✅ Authorization header:', headers['Authorization'].substring(0, 30) + '...');
        },
        
        /**
         * Test 4: Mock system should intercept GraphQL requests
         */
        'should intercept GraphQL requests with mock': function(done) {
            this.enableMocks();
            
            // Register mock
            this.mockOperation('TestQuery', {}, {
                testField: 'mock-success'
            });
            
            // Execute query
            GraphQLClient.execute(
                'query TestQuery { testField }',
                {},
                'TestQuery'
            ).done(function(response) {
                try {
                    this.assertNotNull(response, 'Response should not be null');
                    this.assertEquals(response.testField, 'mock-success', 'Should return mocked data');
                    
                    this.clearMocks();
                    console.log('✅ Mock interception successful');
                    done();
                } catch (e) {
                    this.clearMocks();
                    done(e);
                }
            }.bind(this)).fail(function(error) {
                this.clearMocks();
                done(new Error('GraphQL request failed: ' + error.message));
            }.bind(this));
        },
        
        /**
         * Test 5: Mock system should handle errors
         */
        'should handle mocked GraphQL errors': function(done) {
            this.enableMocks();
            
            // Register mock error
            this.mockOperation('ErrorQuery', {}, {
                _mockError: {
                    message: 'Test error message',
                    graphqlErrors: [{
                        message: 'Test error message',
                        extensions: { category: 'test' }
                    }],
                    extensions: { category: 'test' }
                }
            });
            
            // Execute query that should fail
            GraphQLClient.execute(
                'query ErrorQuery { errorField }',
                {},
                'ErrorQuery'
            ).done(function() {
                this.clearMocks();
                done(new Error('Should have failed with error'));
            }.bind(this)).fail(function(error) {
                try {
                    this.assertNotNull(error, 'Error should not be null');
                    this.assertStringContains(error.message, 'Test error message', 'Should return mock error message');
                    
                    this.clearMocks();
                    console.log('✅ Mock error handling successful');
                    done();
                } catch (e) {
                    this.clearMocks();
                    done(e);
                }
            }.bind(this));
        },
        
        /**
         * Test 6: Verify token persists across sessions
         */
        'should persist token in storage': function() {
            var token = StorageHelper.getGlobalItem('admin_token');
            this.assertNotNull(token, 'Token should exist initially');
            
            // Store original token
            var originalToken = token;
            
            // Simulate token retrieval by GraphQL client
            var retrievedToken = GraphQLClient._getToken();
            
            this.assertEquals(retrievedToken, originalToken, 'Retrieved token should match stored token');
            console.log('✅ Token persistence verified');
        },
        
        /**
         * Test 7: Verify Store header is included
         */
        'should include Store header in requests': function() {
            var headers = GraphQLClient._getHeaders();
            var config = ConfigManager.get();
            
            if (config && config.storeCode) {
                this.assertNotNull(headers['Store'], 'Store header should exist when storeCode is configured');
                this.assertEquals(headers['Store'], config.storeCode, 'Store header should match config');
                console.log('✅ Store header:', headers['Store']);
            } else {
                console.log('⚠️ No storeCode in config, skipping Store header test');
            }
        },
        
        /**
         * Test 8: Verify Content-Type header
         */
        'should include correct Content-Type header': function() {
            var headers = GraphQLClient._getHeaders();
            
            this.assertNotNull(headers['Content-Type'], 'Content-Type header should exist');
            this.assertEquals(headers['Content-Type'], 'application/json', 'Content-Type should be application/json');
            console.log('✅ Content-Type header verified');
        }
    });
});
