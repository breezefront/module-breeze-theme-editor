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
            
            this.assertNull(token, 'Token should be null after clearing');
        },
        
        /**
         * Test hasToken() method
         */
        'Should check if token exists': function() {
            // Clear token
            localStorage.removeItem(STORAGE_KEY);
            
            this.assertFalse(AuthManager.hasToken(), 
                'hasToken() should return false when no token exists');
            
            // Add token to localStorage
            localStorage.setItem(STORAGE_KEY, testToken);
            
            this.assertTrue(AuthManager.hasToken(), 
                'hasToken() should return true when token exists in localStorage');
            
            // Cleanup
            localStorage.removeItem(STORAGE_KEY);
        },
        
        /**
         * Test adding token to URL
         */
        'Should add token to URL': function() {
            // Store token in localStorage
            localStorage.setItem(STORAGE_KEY, testToken);
            
            var targetUrl = 'https://example.com/checkout';
            var urlWithToken = AuthManager.addTokenToUrl(targetUrl);
            
            this.assertTrue(
                urlWithToken.indexOf('breeze_theme_editor_access_token=' + testToken) !== -1,
                'Token should be added to URL'
            );
            
            // Cleanup
            localStorage.removeItem(STORAGE_KEY);
        },
        
        /**
         * Test adding token to URL with existing query params
         */
        'Should add token to URL with existing params': function() {
            localStorage.setItem(STORAGE_KEY, testToken);
            
            var targetUrl = 'https://example.com/checkout?foo=bar&baz=qux';
            var urlWithToken = AuthManager.addTokenToUrl(targetUrl);
            
            this.assertTrue(
                urlWithToken.indexOf('breeze_theme_editor_access_token=' + testToken) !== -1,
                'Token should be added to URL with existing params'
            );
            
            this.assertTrue(
                urlWithToken.indexOf('foo=bar') !== -1,
                'Existing params should be preserved'
            );
            
            this.assertTrue(
                urlWithToken.indexOf('baz=qux') !== -1,
                'All existing params should be preserved'
            );
            
            // Cleanup
            localStorage.removeItem(STORAGE_KEY);
        }
    });
});
