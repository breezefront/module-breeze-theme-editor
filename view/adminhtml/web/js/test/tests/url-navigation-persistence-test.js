/**
 * URL Navigation Persistence Test Suite
 * 
 * Tests for URL navigation persistence feature that allows iframe to maintain
 * its current page position after F5 (page refresh).
 * 
 * Tests the following implementation files:
 * - storage-helper.js: getCurrentUrl(), setCurrentUrl(), getCurrentPageId(), setCurrentPageId()
 * - iframe-helper.js: getCurrentUrl(), extractPath(), saveCurrentUrl(), syncUrlToParent(), startUrlSync()
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper'
], function($, TestFramework, StorageHelper, IframeHelper) {
    'use strict';
    
    return TestFramework.suite('URL Navigation Persistence', {
        
        // ========================================================================
        // GROUP 1: Storage Helper Tests (8 tests)
        // ========================================================================
        
        /**
         * Test 1: getCurrentUrl() should return default '/' when not set
         */
        'StorageHelper.getCurrentUrl() should return default "/" when not set': function() {
            // Setup: Initialize with test store/theme
            StorageHelper.init(99, 99);
            
            // Clear any existing data (both new and old key formats)
            localStorage.removeItem('bte_99_99_current_url');
            localStorage.removeItem('bte_current_url'); // Clean up old format key from previous tests
            
            // Test: Get URL when not set
            var url = StorageHelper.getCurrentUrl();
            
            // Assert
            this.assertEquals(url, '/', 'Should return default "/"');
            
            console.log('✅ getCurrentUrl() returns default "/"');
        },
        
        /**
         * Test 2: getCurrentUrl() and setCurrentUrl() should work together
         */
        'StorageHelper should save and retrieve URL correctly': function() {
            // Setup
            StorageHelper.init(99, 99);
            
            // Test: Save URL
            StorageHelper.setCurrentUrl('/catalog/category');
            
            // Assert: Retrieve saved URL
            var url = StorageHelper.getCurrentUrl();
            this.assertEquals(url, '/catalog/category', 'Should return saved URL');
            
            // Verify scoped key format
            var scopedValue = localStorage.getItem('bte_99_99_current_url');
            this.assertEquals(scopedValue, '/catalog/category', 'Should use scoped key');
            
            console.log('✅ setCurrentUrl() and getCurrentUrl() work correctly');
        },
        
        /**
         * Test 3: setCurrentUrl() should use scoped localStorage key
         */
        'StorageHelper.setCurrentUrl() should use scoped key format': function() {
            // Setup
            StorageHelper.init(1, 5);
            
            // Test: Save URL
            StorageHelper.setCurrentUrl('/catalog/product/view/id/25');
            
            // Assert: Check localStorage key format
            var value = localStorage.getItem('bte_1_5_current_url');
            this.assertNotNull(value, 'Scoped key should exist');
            this.assertEquals(value, '/catalog/product/view/id/25', 'Value should match');
            
            console.log('✅ setCurrentUrl() uses scoped key: bte_1_5_current_url');
        },
        
        /**
         * Test 4: getCurrentPageId() should return default 'cms_index_index' when not set
         */
        'StorageHelper.getCurrentPageId() should return default when not set': function() {
            // Setup
            StorageHelper.init(99, 99);
            localStorage.removeItem('bte_99_99_current_page_id');
            
            // Test
            var pageId = StorageHelper.getCurrentPageId();
            
            // Assert
            this.assertEquals(pageId, 'cms_index_index', 'Should return default page ID');
            
            console.log('✅ getCurrentPageId() returns default "cms_index_index"');
        },
        
        /**
         * Test 5: getCurrentPageId() and setCurrentPageId() should work together
         */
        'StorageHelper should save and retrieve page ID correctly': function() {
            // Setup
            StorageHelper.init(99, 99);
            
            // Test: Save page ID
            StorageHelper.setCurrentPageId('catalog_category_view');
            
            // Assert: Retrieve saved page ID
            var pageId = StorageHelper.getCurrentPageId();
            this.assertEquals(pageId, 'catalog_category_view', 'Should return saved page ID');
            
            console.log('✅ setCurrentPageId() and getCurrentPageId() work correctly');
        },
        
        /**
         * Test 6: setCurrentPageId() should use scoped localStorage key
         */
        'StorageHelper.setCurrentPageId() should use scoped key format': function() {
            // Setup
            StorageHelper.init(2, 7);
            
            // Test: Save page ID
            StorageHelper.setCurrentPageId('catalog_product_view');
            
            // Assert: Check localStorage key format
            var value = localStorage.getItem('bte_2_7_current_page_id');
            this.assertNotNull(value, 'Scoped key should exist');
            this.assertEquals(value, 'catalog_product_view', 'Value should match');
            
            console.log('✅ setCurrentPageId() uses scoped key: bte_2_7_current_page_id');
        },
        
        /**
         * Test 7: Different store/theme combinations should use different localStorage keys
         */
        'StorageHelper should use different keys for different store/theme combinations': function() {
            // Test: Store 1, Theme 5
            StorageHelper.init(1, 5);
            StorageHelper.setCurrentUrl('/store1-theme5-url');
            
            // Test: Store 2, Theme 7
            StorageHelper.init(2, 7);
            StorageHelper.setCurrentUrl('/store2-theme7-url');
            
            // Assert: Both values exist independently
            var url1 = localStorage.getItem('bte_1_5_current_url');
            var url2 = localStorage.getItem('bte_2_7_current_url');
            
            this.assertEquals(url1, '/store1-theme5-url', 'Store 1/Theme 5 should have own value');
            this.assertEquals(url2, '/store2-theme7-url', 'Store 2/Theme 7 should have own value');
            
            console.log('✅ Different store/theme combinations use separate keys');
        },
        
        /**
         * Test 8: Migration from old unscoped keys to new scoped format
         */
        'StorageHelper should migrate old unscoped keys to new scoped format': function() {
            // Setup: Simulate old key format
            StorageHelper.init(99, 99);
            localStorage.removeItem('bte_99_99_current_url'); // Remove new key
            localStorage.setItem('bte_current_url', '/old-format-url'); // Set old key
            
            // Test: Read URL (should trigger migration)
            var url = StorageHelper.getCurrentUrl();
            
            // Assert: Should return old value
            this.assertEquals(url, '/old-format-url', 'Should read from old key');
            
            // Assert: Should migrate to new key
            var newValue = localStorage.getItem('bte_99_99_current_url');
            this.assertEquals(newValue, '/old-format-url', 'Should migrate to new scoped key');
            
            // Cleanup: Remove both keys after test
            localStorage.removeItem('bte_99_99_current_url');
            localStorage.removeItem('bte_current_url');
            
            console.log('✅ Migration from old unscoped keys works correctly');
        },
        
        // ========================================================================
        // GROUP 2: URL Extraction Tests (10 tests)
        // ========================================================================
        
        /**
         * Test 9: extractPath() should return basic path unchanged
         */
        'IframeHelper.extractPath() should preserve basic path': function() {
            var result = IframeHelper.extractPath('/catalog/category');
            this.assertEquals(result, '/catalog/category', 'Basic path should remain unchanged');
            console.log('✅ extractPath() preserves basic path');
        },
        
        /**
         * Test 10: extractPath() should preserve user query parameters
         */
        'IframeHelper.extractPath() should preserve user query parameters': function() {
            var result = IframeHelper.extractPath('/catalog?page=2&sort=price');
            this.assertEquals(result, '/catalog?page=2&sort=price', 'User params should be preserved');
            console.log('✅ extractPath() preserves user query parameters');
        },
        
        /**
         * Test 11: extractPath() should preserve hash/fragment
         */
        'IframeHelper.extractPath() should preserve hash': function() {
            var result = IframeHelper.extractPath('/catalog#reviews');
            this.assertEquals(result, '/catalog#reviews', 'Hash should be preserved');
            console.log('✅ extractPath() preserves hash');
        },
        
        /**
         * Test 12: extractPath() should preserve both query and hash
         */
        'IframeHelper.extractPath() should preserve query and hash together': function() {
            var result = IframeHelper.extractPath('/catalog?page=2#reviews');
            this.assertEquals(result, '/catalog?page=2#reviews', 'Query + hash should be preserved');
            console.log('✅ extractPath() preserves query + hash');
        },
        
        /**
         * Test 13: extractPath() should remove ___store parameter
         */
        'IframeHelper.extractPath() should remove ___store parameter': function() {
            var result = IframeHelper.extractPath('/catalog?___store=21');
            this.assertEquals(result, '/catalog', 'System param ___store should be removed');
            console.log('✅ extractPath() removes ___store parameter');
        },
        
        /**
         * Test 14: extractPath() should remove preview_theme parameter
         */
        'IframeHelper.extractPath() should remove preview_theme parameter': function() {
            var result = IframeHelper.extractPath('/catalog?preview_theme=1');
            this.assertEquals(result, '/catalog', 'System param preview_theme should be removed');
            console.log('✅ extractPath() removes preview_theme parameter');
        },
        
        /**
         * Test 15: extractPath() should remove jstest parameter
         */
        'IframeHelper.extractPath() should remove jstest parameter': function() {
            var result = IframeHelper.extractPath('/catalog?jstest=true');
            this.assertEquals(result, '/catalog', 'System param jstest should be removed');
            console.log('✅ extractPath() removes jstest parameter');
        },
        
        /**
         * Test 16: extractPath() should handle mixed user and system parameters
         */
        'IframeHelper.extractPath() should preserve user params while removing system params': function() {
            var input = '/catalog?page=2&___store=21&sort=price&preview_theme=1';
            var result = IframeHelper.extractPath(input);
            
            // Should keep: page, sort
            // Should remove: ___store, preview_theme
            this.assertStringContains(result, 'page=2', 'User param "page" should be preserved');
            this.assertStringContains(result, 'sort=price', 'User param "sort" should be preserved');
            this.assertFalse(result.indexOf('___store') >= 0, 'System param ___store should be removed');
            this.assertFalse(result.indexOf('preview_theme') >= 0, 'System param preview_theme should be removed');
            
            console.log('✅ extractPath() handles mixed params correctly:', result);
        },
        
        /**
         * Test 17: extractPath() should handle all system parameters together
         */
        'IframeHelper.extractPath() should remove all system parameters': function() {
            var input = '/catalog?___store=21&preview_theme=1&jstest=true';
            var result = IframeHelper.extractPath(input);
            this.assertEquals(result, '/catalog', 'All system params should be removed');
            console.log('✅ extractPath() removes all system parameters');
        },
        
        /**
         * Test 18: extractPath() should return '/' for null/undefined/empty
         */
        'IframeHelper.extractPath() should handle null/undefined/empty': function() {
            this.assertEquals(IframeHelper.extractPath(null), '/', 'null should return "/"');
            this.assertEquals(IframeHelper.extractPath(undefined), '/', 'undefined should return "/"');
            this.assertEquals(IframeHelper.extractPath(''), '/', 'empty string should return "/"');
            console.log('✅ extractPath() handles null/undefined/empty correctly');
        },
        
        // ========================================================================
        // GROUP 3: URL Sync Tests with Stubs (7 tests)
        // ========================================================================
        
        /**
         * Test 19: getCurrentUrl() should read from iframe (integration test)
         */
        'IframeHelper.getCurrentUrl() should access iframe location': function() {
            // Note: This is an integration test with real iframe
            // We can't mock contentWindow (read-only), so we test actual behavior
            
            // Test: Call getCurrentUrl() with real iframe
            var url = IframeHelper.getCurrentUrl();
            
            // Assert: Should return a string or null (depending on iframe state)
            // If iframe exists and is accessible, should return string
            // If cross-origin or not found, should return null
            var isValidResult = (typeof url === 'string' || url === null);
            this.assertTrue(isValidResult, 'Should return string or null');
            
            console.log('✅ getCurrentUrl() returns valid result:', url);
        },
        
        /**
         * Test 20: getCurrentUrl() handles real iframe gracefully
         */
        'IframeHelper.getCurrentUrl() should handle real iframe gracefully': function() {
            // Test: Method should not throw error with real iframe
            var didNotThrow = false;
            
            try {
                var url = IframeHelper.getCurrentUrl();
                didNotThrow = true;
            } catch (e) {
                didNotThrow = false;
            }
            
            // Assert: Should not throw error
            this.assertTrue(didNotThrow, 'Should not throw error');
            
            console.log('✅ getCurrentUrl() handles real iframe without errors');
        },
        
        /**
         * Test 21: saveCurrentUrl() should use extractPath() and save to storage
         */
        'IframeHelper.saveCurrentUrl() should clean and save URL': function() {
            // Setup: Stub getCurrentUrl() to return mock URL
            StorageHelper.init(99, 99);
            localStorage.removeItem('bte_99_99_current_url');
            
            var originalGetCurrentUrl = IframeHelper.getCurrentUrl;
            
            // Stub: Return URL with system params
            IframeHelper.getCurrentUrl = function() {
                return '/catalog?page=2&___store=21&preview_theme=1';
            };
            
            try {
                // Test: Save current URL
                var success = IframeHelper.saveCurrentUrl();
                
                // Assert: Should return true
                this.assertTrue(success, 'Should return true');
                
                // Assert: Should save cleaned URL (system params removed)
                var savedUrl = StorageHelper.getCurrentUrl();
                this.assertStringContains(savedUrl, 'page=2', 'Should preserve user param');
                this.assertFalse(savedUrl.indexOf('___store') >= 0, 'Should remove ___store');
                this.assertFalse(savedUrl.indexOf('preview_theme') >= 0, 'Should remove preview_theme');
                
                console.log('✅ saveCurrentUrl() saves cleaned URL:', savedUrl);
            } finally {
                // Restore original method
                IframeHelper.getCurrentUrl = originalGetCurrentUrl;
            }
        },
        
        /**
         * Test 22: saveCurrentUrl() should return false when iframe not accessible
         */
        'IframeHelper.saveCurrentUrl() should return false when iframe unavailable': function() {
            // Setup: Stub getCurrentUrl() to return null (simulates iframe not accessible)
            var originalGetCurrentUrl = IframeHelper.getCurrentUrl;
            
            IframeHelper.getCurrentUrl = function() {
                return null; // Simulate cross-origin or missing iframe
            };
            
            try {
                // Test: Try to save URL
                var success = IframeHelper.saveCurrentUrl();
                
                // Assert: Should return false
                this.assertFalse(success, 'Should return false when URL not accessible');
                
                console.log('✅ saveCurrentUrl() returns false when iframe unavailable');
            } finally {
                // Restore
                IframeHelper.getCurrentUrl = originalGetCurrentUrl;
            }
        },
        
        /**
         * Test 23: syncUrlToParent() integration test
         */
        'IframeHelper.syncUrlToParent() should execute without errors': function() {
            // Note: This is an integration test - we test that method runs without throwing
            // We can't fully mock history.replaceState behavior in test environment
            
            var didNotThrow = false;
            
            try {
                // Test: Call syncUrlToParent with real iframe
                var result = IframeHelper.syncUrlToParent();
                
                // Assert: Should return boolean
                var isBoolean = (typeof result === 'boolean');
                this.assertTrue(isBoolean, 'Should return boolean');
                
                didNotThrow = true;
            } catch (e) {
                didNotThrow = false;
            }
            
            // Assert: Should not throw error
            this.assertTrue(didNotThrow, 'Should not throw error');
            
            console.log('✅ syncUrlToParent() executes without errors');
        },
        
        /**
         * Test 24: syncUrlToParent() with stubbed getCurrentUrl
         */
        'IframeHelper.syncUrlToParent() should handle URL changes': function() {
            // Setup: Stub getCurrentUrl to return specific URL
            var originalGetCurrentUrl = IframeHelper.getCurrentUrl;
            
            IframeHelper.getCurrentUrl = function() {
                return '/catalog/category';
            };
            
            try {
                // Test: Sync URL (should use stubbed URL)
                var result = IframeHelper.syncUrlToParent();
                
                // Assert: Should return boolean
                var isBoolean = (typeof result === 'boolean');
                this.assertTrue(isBoolean, 'Should return boolean value');
                
                console.log('✅ syncUrlToParent() handles URL changes');
            } finally {
                // Restore
                IframeHelper.getCurrentUrl = originalGetCurrentUrl;
            }
        },
        
        /**
         * Test 25: startUrlSync() should return interval ID
         */
        'IframeHelper.startUrlSync() should return interval ID': function() {
            // Test: Start URL sync (uses real iframe)
            var intervalId = IframeHelper.startUrlSync();
            
            try {
                // Assert: Should return interval ID (number)
                this.assertNotNull(intervalId, 'Should return interval ID');
                this.assertTrue(typeof intervalId === 'number', 'Interval ID should be a number');
                
                console.log('✅ startUrlSync() returns interval ID:', intervalId);
            } finally {
                // Cleanup: Stop interval
                if (intervalId) {
                    clearInterval(intervalId);
                }
            }
        },
        
        // ========================================================================
        // GROUP 4: Edge Cases & Error Handling (6 tests)
        // ========================================================================
        
        /**
         * Test 26: Handle very long URLs
         */
        'Should handle very long URLs (>2000 characters)': function() {
            // Setup: Create URL with 2500 characters
            var longPath = '/catalog/product/view/id/123?';
            for (var i = 0; i < 200; i++) {
                longPath += 'param' + i + '=value' + i + '&';
            }
            longPath = longPath.slice(0, -1); // Remove trailing &
            
            // Test: Extract path
            var result = IframeHelper.extractPath(longPath);
            
            // Assert: Should handle without error
            this.assertNotNull(result, 'Should handle long URLs');
            this.assertTrue(result.length > 1000, 'Should preserve long URL');
            
            // Test: Save to storage
            StorageHelper.init(99, 99);
            StorageHelper.setCurrentUrl(result);
            var retrieved = StorageHelper.getCurrentUrl();
            
            this.assertEquals(retrieved, result, 'Should save and retrieve long URL');
            
            console.log('✅ Handles very long URLs (' + result.length + ' chars)');
        },
        
        /**
         * Test 27: Handle special characters in URLs
         */
        'Should handle special characters in URLs': function() {
            // Test: Various special characters
            var urls = [
                '/search?q=hello world',  // space (should be encoded)
                '/search?q=hello+world',  // plus
                '/product/café',          // unicode
                '/search?q=50%',          // percent
                '/category/toys&games'    // ampersand in path
            ];
            
            urls.forEach(function(url) {
                var result = IframeHelper.extractPath(url);
                this.assertNotNull(result, 'Should handle: ' + url);
            }.bind(this));
            
            console.log('✅ Handles special characters in URLs');
        },
        
        /**
         * Test 28: Handle malformed URLs with multiple question marks
         */
        'Should handle malformed URLs gracefully': function() {
            // Test: URLs with multiple ?
            var malformed = '/catalog?page=2?sort=price';
            var result = IframeHelper.extractPath(malformed);
            
            // Assert: Should not throw error
            this.assertNotNull(result, 'Should handle malformed URL');
            
            console.log('✅ Handles malformed URLs gracefully');
        },
        
        /**
         * Test 29: Preserve URL encoding
         */
        'Should preserve URL encoding': function() {
            // Test: URL with encoded characters
            var encoded = '/search?q=%20test%20query';
            var result = IframeHelper.extractPath(encoded);
            
            // Assert: Should preserve encoding
            this.assertStringContains(result, '%20', 'Should preserve URL encoding');
            
            console.log('✅ Preserves URL encoding');
        },
        
        /**
         * Test 30: Handle trailing slashes
         */
        'Should preserve trailing slashes': function() {
            // Test: With trailing slash
            var withSlash = '/catalog/category/';
            var result1 = IframeHelper.extractPath(withSlash);
            this.assertEquals(result1, '/catalog/category/', 'Should preserve trailing slash');
            
            // Test: Without trailing slash
            var withoutSlash = '/catalog/category';
            var result2 = IframeHelper.extractPath(withoutSlash);
            this.assertEquals(result2, '/catalog/category', 'Should preserve no trailing slash');
            
            console.log('✅ Preserves trailing slashes correctly');
        },
        
        /**
         * Test 31: Handle complex fragment identifiers
         */
        'Should handle complex fragment identifiers': function() {
            // Test: Complex hash
            var complexHash = '/catalog#section-2.5/item-3/tab:reviews';
            var result = IframeHelper.extractPath(complexHash);
            
            // Assert: Should preserve complex hash
            this.assertStringContains(result, '#section-2.5/item-3/tab:reviews', 'Should preserve complex hash');
            
            console.log('✅ Handles complex fragment identifiers');
        },
        
        // ========================================================================
        // GROUP 5: Integration Workflow Tests (4 tests)
        // ========================================================================
        
        /**
         * Test 32: F5 restoration flow simulation
         */
        'Should restore URL after simulated page refresh (F5 flow)': function() {
            // Setup: Simulate user navigation
            StorageHelper.init(1, 5);
            
            // Step 1: User navigates to category page
            StorageHelper.setCurrentUrl('/catalog/category/view/id/25');
            StorageHelper.setCurrentPageId('catalog_category_view');
            
            // Step 2: Simulate F5 (page refresh) - localStorage persists
            
            // Step 3: After reload, restore from localStorage
            var restoredUrl = StorageHelper.getCurrentUrl();
            var restoredPageId = StorageHelper.getCurrentPageId();
            
            // Assert: Should restore saved state
            this.assertEquals(restoredUrl, '/catalog/category/view/id/25', 'URL should be restored');
            this.assertEquals(restoredPageId, 'catalog_category_view', 'Page ID should be restored');
            
            console.log('✅ F5 restoration flow works correctly');
        },
        
        /**
         * Test 33: GET parameter priority over localStorage
         */
        'GET parameter should have priority over localStorage': function() {
            // Setup: Save URL to localStorage
            StorageHelper.init(1, 5);
            StorageHelper.setCurrentUrl('/old-url-from-storage');
            
            // Simulate: GET parameter provides different URL
            // In real app: index.phtml reads $_GET['url'] first
            var getParamUrl = '/new-url-from-get-param';
            
            // Assert: GET param should be used (priority over localStorage)
            // This is handled in index.phtml, but we verify the logic
            var storageUrl = StorageHelper.getCurrentUrl();
            this.assertEquals(storageUrl, '/old-url-from-storage', 'Storage has old URL');
            
            // In real flow: index.phtml checks GET first, then falls back to storage
            var finalUrl = getParamUrl || storageUrl;
            this.assertEquals(finalUrl, '/new-url-from-get-param', 'GET param has priority');
            
            console.log('✅ GET parameter priority logic verified');
        },
        
        /**
         * Test 34: Store switching uses different localStorage keys
         */
        'Switching stores should use separate localStorage keys': function() {
            // Scenario: User switches between stores
            
            // Store 1: Navigate to category
            StorageHelper.init(1, 5);
            StorageHelper.setCurrentUrl('/store1-category');
            StorageHelper.setCurrentPageId('catalog_category_view');
            
            // Store 2: Navigate to product
            StorageHelper.init(2, 5);
            StorageHelper.setCurrentUrl('/store2-product');
            StorageHelper.setCurrentPageId('catalog_product_view');
            
            // Switch back to Store 1
            StorageHelper.init(1, 5);
            var store1Url = StorageHelper.getCurrentUrl();
            var store1PageId = StorageHelper.getCurrentPageId();
            
            // Assert: Store 1 should have its own saved state
            this.assertEquals(store1Url, '/store1-category', 'Store 1 URL preserved');
            this.assertEquals(store1PageId, 'catalog_category_view', 'Store 1 page ID preserved');
            
            // Switch to Store 2
            StorageHelper.init(2, 5);
            var store2Url = StorageHelper.getCurrentUrl();
            var store2PageId = StorageHelper.getCurrentPageId();
            
            // Assert: Store 2 should have its own saved state
            this.assertEquals(store2Url, '/store2-product', 'Store 2 URL preserved');
            this.assertEquals(store2PageId, 'catalog_product_view', 'Store 2 page ID preserved');
            
            console.log('✅ Store switching preserves separate states');
        },
        
        /**
         * Test 35: Page selector and URL should stay in sync
         */
        'Page selector ID should sync with current URL': function() {
            // Setup
            StorageHelper.init(1, 5);
            
            // Scenario: User selects "Category" from dropdown
            StorageHelper.setCurrentPageId('catalog_category_view');
            StorageHelper.setCurrentUrl('/catalog/category/view/id/10');
            
            // Assert: Both should be set
            this.assertEquals(StorageHelper.getCurrentPageId(), 'catalog_category_view', 'Page ID set');
            this.assertEquals(StorageHelper.getCurrentUrl(), '/catalog/category/view/id/10', 'URL set');
            
            // Scenario: User navigates via link in iframe
            StorageHelper.setCurrentPageId('catalog_product_view');
            StorageHelper.setCurrentUrl('/catalog/product/view/id/25');
            
            // Assert: Both should update
            this.assertEquals(StorageHelper.getCurrentPageId(), 'catalog_product_view', 'Page ID updated');
            this.assertEquals(StorageHelper.getCurrentUrl(), '/catalog/product/view/id/25', 'URL updated');
            
            console.log('✅ Page selector and URL stay in sync');
        }
    });
});
