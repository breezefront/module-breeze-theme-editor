/**
 * Mock Helper for GraphQL Queries (Admin Context)
 * 
 * Provides mocking capabilities for GraphQL requests in admin tests.
 * Intercepts GraphQLClient.execute() to return mock data.
 * 
 * ADMIN-SPECIFIC: Works with Bearer token authentication
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
                console.warn('⚠️ Mock system already active (Admin Context)');
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
                    console.log('🎭 MOCK HIT (Admin):', operationName, variables);
                    var mockData = self._mockResponses[mockKey];
                    
                    // Return jQuery Deferred with mock data (matching admin client behavior)
                    // Admin client returns jQuery promise via $.Deferred()
                    var deferred = $.Deferred();
                    
                    // Simulate async behavior with setTimeout
                    setTimeout(function() {
                        // Check if mock data contains an error
                        if (mockData._mockError) {
                            var error = new Error(mockData._mockError.message || 'Mock error');
                            error.graphqlErrors = mockData._mockError.graphqlErrors || [];
                            error.extensions = mockData._mockError.extensions || null;
                            deferred.reject(error);
                        } else {
                            // Return data directly (admin client unwraps response.data in _handleSuccess)
                            deferred.resolve(mockData);
                        }
                    }, 10); // Small delay to simulate network latency
                    
                    return deferred.promise();
                }
                
                // No mock found - use original (real GraphQL request)
                console.log('📡 REAL REQUEST (Admin):', operationName, variables);
                return self._originalExecute(query, variables, operationName);
            };
            
            this._isActive = true;
            console.log('✅ Mock system activated (Admin Context)');
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
                scope: { type: 'stores', scopeId: params.storeId },
                status: params.status || 'PUBLISHED',
                publicationId: params.publicationId || null
            });
            
            this._mockResponses[mockKey] = mockResponse;
            
            console.log('🎭 Mock registered (Admin):', mockKey);
        },
        
        /**
         * Register mock for any GraphQL operation
         * 
         * @param {String} operationName - GraphQL operation name
         * @param {Object} variables - Query variables
         * @param {Object} mockResponse - Mock data to return
         * 
         * @example
         * MockHelper.mockOperation('GetStores', {}, {
         *     getStores: [
         *         { id: 1, name: 'Default Store' }
         *     ]
         * });
         */
        mockOperation: function(operationName, variables, mockResponse) {
            var mockKey = this._createMockKey(operationName, variables);
            this._mockResponses[mockKey] = mockResponse;
            
            console.log('🎭 Mock registered (Admin):', mockKey);
        },
        
        /**
         * Register mock error for GraphQL operation
         * 
         * @param {String} operationName - GraphQL operation name
         * @param {Object} variables - Query variables
         * @param {String} errorMessage - Error message
         * @param {Object} extensions - Optional error extensions
         * 
         * @example
         * MockHelper.mockError('SaveCss', {}, 'Unauthorized', {
         *     category: 'authentication'
         * });
         */
        mockError: function(operationName, variables, errorMessage, extensions) {
            var mockKey = this._createMockKey(operationName, variables);
            this._mockResponses[mockKey] = {
                _mockError: {
                    message: errorMessage,
                    graphqlErrors: [{
                        message: errorMessage,
                        extensions: extensions || null
                    }],
                    extensions: extensions || null
                }
            };
            
            console.log('🎭 Mock error registered (Admin):', mockKey);
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
            console.log('🧹 Cleared', count, 'mock(s) (Admin Context)');
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
            console.log('✅ Mock system deactivated (Admin Context)');
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
        },
        
        /**
         * Get admin Bearer token (helper for tests)
         * 
         * @returns {String|null}
         */
        getAdminToken: function() {
            return localStorage.getItem('bte_admin_token');
        },
        
        /**
         * Check if admin token exists (helper for tests)
         * 
         * @returns {Boolean}
         */
        hasAdminToken: function() {
            var token = this.getAdminToken();
            return token !== null && token !== undefined && token !== '';
        }
    };
    
    return MockHelper;
});
