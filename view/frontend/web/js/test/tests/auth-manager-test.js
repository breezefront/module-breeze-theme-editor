/**
 * Auth Manager Tests
 *
 * Tests token storage and retrieval from localStorage.
 * Uses mocks to isolate from real URL parameters.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/auth-manager'
], function(TestFramework, AuthManager) {
    'use strict';
    
    var STORAGE_KEY = 'bte_access_token';
    var testToken = 'test_token_12345';
    
    // Store original methods for mocking
    var originalGetTokenFromUrl = null;
    
    return TestFramework.suite('Auth Manager', {
        
        /**
         * Test token storage in localStorage
         */
        'Should save token to localStorage': function() {
            // Clear any existing token
            localStorage.removeItem(STORAGE_KEY);
            
            var success = AuthManager.saveToken(testToken);
            
            this.assertTrue(success, 'Should successfully save token');
            
            var storedToken = localStorage.getItem(STORAGE_KEY);
            this.assertEquals(storedToken, testToken, 
                'Stored token should match test token');
            
            // Cleanup
            localStorage.removeItem(STORAGE_KEY);
        },
        
        /**
         * Test token retrieval from localStorage
         */
        'Should get token from localStorage': function() {
            // Store token directly in localStorage
            localStorage.setItem(STORAGE_KEY, testToken);
            
            var token = AuthManager.getTokenFromStorage();
            
            this.assertEquals(token, testToken, 
                'Should retrieve token from localStorage');
            
            // Cleanup
            localStorage.removeItem(STORAGE_KEY);
        },
        
        /**
         * Test token clearing
         */
        'Should clear token from localStorage': function() {
            // Store token
            localStorage.setItem(STORAGE_KEY, testToken);
            
            var success = AuthManager.clearToken();
            
            this.assertTrue(success, 'Should successfully clear token');
            
            var token = localStorage.getItem(STORAGE_KEY);
            
            this.assertEquals(token, null, 'Token should be null after clearing');
        },
        
        /**
         * Test hasToken() method with mock to isolate from URL
         */
        'Should check if token exists': function() {
            // Mock getTokenFromUrl to return null (isolate from real URL)
            originalGetTokenFromUrl = AuthManager.getTokenFromUrl;
            AuthManager.getTokenFromUrl = function() { return null; };
            
            // Clear token from localStorage
            localStorage.removeItem(STORAGE_KEY);
            
            var hasToken = AuthManager.hasToken();
            this.assertEquals(hasToken, false, 
                'hasToken() should return false when no token exists');
            
            // Add token to localStorage
            localStorage.setItem(STORAGE_KEY, testToken);
            
            hasToken = AuthManager.hasToken();
            this.assertEquals(hasToken, true, 
                'hasToken() should return true when token exists');
            
            // Cleanup
            localStorage.removeItem(STORAGE_KEY);
            AuthManager.getTokenFromUrl = originalGetTokenFromUrl;
        },
        
        /**
         * Test adding token to URL with mock to use testToken
         */
        'Should add token to URL': function() {
            // Mock getToken to return testToken
            var originalGetToken = AuthManager.getToken;
            AuthManager.getToken = function() { return testToken; };
            
            var targetUrl = 'https://example.com/checkout';
            var urlWithToken = AuthManager.addTokenToUrl(targetUrl);
            
            // Check that testToken was added
            var hasTestToken = urlWithToken.indexOf('breeze_theme_editor_access_token=' + testToken) !== -1;
            this.assertEquals(hasTestToken, true, 
                'Token should be added to URL');
            
            // Restore original
            AuthManager.getToken = originalGetToken;
        },
        
        /**
         * Test adding token to URL with existing query params and mock
         */
        'Should add token to URL with existing params': function() {
            // Mock getToken to return testToken
            var originalGetToken = AuthManager.getToken;
            AuthManager.getToken = function() { return testToken; };
            
            var targetUrl = 'https://example.com/checkout?foo=bar&baz=qux';
            var urlWithToken = AuthManager.addTokenToUrl(targetUrl);
            
            // Check that testToken was added
            var hasTestToken = urlWithToken.indexOf('breeze_theme_editor_access_token=' + testToken) !== -1;
            this.assertEquals(hasTestToken, true, 
                'Token should be added to URL with existing params');
            
            // Check that existing params are preserved
            var hasFoo = urlWithToken.indexOf('foo=bar') !== -1;
            this.assertEquals(hasFoo, true, 
                'Existing params should be preserved');
            
            var hasBaz = urlWithToken.indexOf('baz=qux') !== -1;
            this.assertEquals(hasBaz, true, 
                'All existing params should be preserved');
            
            // Restore original
            AuthManager.getToken = originalGetToken;
        }
    });
});
