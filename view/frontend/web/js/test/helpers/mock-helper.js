/**
 * Mock Helper for GraphQL Queries
 * 
 * Provides mocking capabilities for GraphQL requests in tests.
 * Intercepts GraphQLClient.execute() to return mock data.
 */
define(['jquery', 'Swissup_BreezeThemeEditor/js/graphql/client'], function($, GraphQLClient) {
    'use strict';
    
    var MockHelper = {
        _originalExecute: null,
        _mockResponses: {},
        _isActive: false,
        
        /**
         * Activate mock system
         * Replaces GraphQLClient.execute with mock-aware version
         */
        activate: function() {
            if (this._isActive) {
                console.warn('⚠️ Mock system already active');
                return;
            }
            
            var self = this;
            
            // Save original execute method
            this._originalExecute = GraphQLClient.execute.bind(GraphQLClient);
            
            // Replace with mock-aware version
            GraphQLClient.execute = function(query, variables, operationName) {
                var mockKey = self._createMockKey(operationName, variables);
                
                // Check if mock exists for this request
                if (self._mockResponses[mockKey]) {
                    console.log('🎭 MOCK HIT:', operationName, variables);
                    var mockData = self._mockResponses[mockKey];
                    
                    // Return Promise with mock data (unwrapped, matching real GraphQL client behavior)
                    // Real client returns response.data, so we return mockData directly
                    return Promise.resolve(mockData);
                }
                
                // No mock found - use original (real GraphQL request)
                console.log('📡 REAL REQUEST:', operationName, variables);
                return self._originalExecute(query, variables, operationName);
            };
            
            this._isActive = true;
            console.log('✅ Mock system activated');
        },
        
        /**
         * Register mock for GetThemeEditorCss query
         * 
         * @param {Object} params - {storeId, themeId, status, publicationId}
         * @param {Object} mockResponse - Mock data to return
         * 
         * @example
         * MockHelper.mockGetCss({
         *     storeId: 21,
         *     themeId: 21,
         *     status: 'PUBLICATION',
         *     publicationId: 999
         * }, {
         *     getThemeEditorCss: {
         *         css: ':root { --color: red; }',
         *         hasContent: true
         *     }
         * });
         */
        mockGetCss: function(params, mockResponse) {
            var mockKey = this._createMockKey('GetThemeEditorCss', {
                storeId: params.storeId,
                themeId: params.themeId || null,
                status: params.status || 'PUBLISHED',
                publicationId: params.publicationId || null
            });
            
            this._mockResponses[mockKey] = mockResponse;
            
            console.log('🎭 Mock registered:', mockKey);
        },
        
        /**
         * Register mock for any GraphQL operation
         * 
         * @param {String} operationName - GraphQL operation name
         * @param {Object} variables - Query variables
         * @param {Object} mockResponse - Mock data to return
         */
        mockOperation: function(operationName, variables, mockResponse) {
            var mockKey = this._createMockKey(operationName, variables);
            this._mockResponses[mockKey] = mockResponse;
            
            console.log('🎭 Mock registered:', mockKey);
        },
        
        /**
         * Create unique key for mock based on operation name and variables
         * 
         * @private
         * @param {String} operationName
         * @param {Object} variables
         * @returns {String}
         */
        _createMockKey: function(operationName, variables) {
            // Sort variables to ensure consistent keys
            var sortedVars = {};
            if (variables) {
                Object.keys(variables).sort().forEach(function(key) {
                    sortedVars[key] = variables[key];
                });
            }
            
            return operationName + ':' + JSON.stringify(sortedVars);
        },
        
        /**
         * Clear all registered mocks
         * Does NOT deactivate the mock system
         */
        clearMocks: function() {
            var count = Object.keys(this._mockResponses).length;
            this._mockResponses = {};
            console.log('🧹 Cleared', count, 'mock(s)');
        },
        
        /**
         * Deactivate mock system and restore original GraphQL client
         */
        deactivate: function() {
            if (!this._isActive) {
                return;
            }
            
            // Restore original execute method
            if (this._originalExecute) {
                GraphQLClient.execute = this._originalExecute;
                this._originalExecute = null;
            }
            
            // Clear all mocks
            this.clearMocks();
            
            this._isActive = false;
            console.log('✅ Mock system deactivated');
        },
        
        /**
         * Check if mock system is active
         * 
         * @returns {Boolean}
         */
        isActive: function() {
            return this._isActive;
        },
        
        /**
         * Get count of registered mocks
         * 
         * @returns {Number}
         */
        getMockCount: function() {
            return Object.keys(this._mockResponses).length;
        }
    };
    
    return MockHelper;
});
