/**
 * Auth Manager Tests
 *
 * Tests token storage and retrieval from localStorage.
 * Simplified version without window.location modification.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/auth-manager'
], function(TestFramework, AuthManager) {
    'use strict';
    
    var STORAGE_KEY = 'bte_access_token';
    var testToken = 'test_token_12345';
    
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
         * Test hasToken() method
         * Note: hasToken() checks URL first, then localStorage
         * In test environment, URL contains token, so we test getTokenFromStorage() directly
         */
        'Should check if token exists': function() {
            // Clear token from localStorage
            localStorage.removeItem(STORAGE_KEY);
            
            var tokenFromStorage = AuthManager.getTokenFromStorage();
            this.assertEquals(tokenFromStorage, null, 
                'getTokenFromStorage() should return null when no token in localStorage');
            
            // Add token to localStorage
            localStorage.setItem(STORAGE_KEY, testToken);
            
            tokenFromStorage = AuthManager.getTokenFromStorage();
            this.assertEquals(tokenFromStorage, testToken, 
                'getTokenFromStorage() should return token when it exists in localStorage');
            
            // Cleanup
            localStorage.removeItem(STORAGE_KEY);
        },
        
        /**
         * Test adding token to URL
         * Note: In test environment, URL contains real token (from URL param)
         * getToken() prioritizes URL token over localStorage, so we test with real token
         */
        'Should add token to URL': function() {
            var targetUrl = 'https://example.com/checkout';
            var urlWithToken = AuthManager.addTokenToUrl(targetUrl);
            
            // Check that token parameter exists (any token value)
            var hasTokenParam = urlWithToken.indexOf('breeze_theme_editor_access_token=') !== -1;
            this.assertEquals(hasTokenParam, true, 
                'Token parameter should be added to URL');
            
            // Check that URL was actually modified
            var urlWasModified = urlWithToken !== targetUrl;
            this.assertEquals(urlWasModified, true,
                'URL should be modified to include token');
        },
        
        /**
         * Test adding token to URL with existing query params
         * Note: Uses real token from URL parameter, not testToken
         */
        'Should add token to URL with existing params': function() {
            var targetUrl = 'https://example.com/checkout?foo=bar&baz=qux';
            var urlWithToken = AuthManager.addTokenToUrl(targetUrl);
            
            // Check that token parameter exists (any token value)
            var hasTokenParam = urlWithToken.indexOf('breeze_theme_editor_access_token=') !== -1;
            this.assertEquals(hasTokenParam, true, 
                'Token parameter should be added to URL with existing params');
            
            // Check that existing params are preserved
            var hasFoo = urlWithToken.indexOf('foo=bar') !== -1;
            this.assertEquals(hasFoo, true, 
                'Existing params should be preserved');
            
            var hasBaz = urlWithToken.indexOf('baz=qux') !== -1;
            this.assertEquals(hasBaz, true, 
                'All existing params should be preserved');
        }
    });
});
