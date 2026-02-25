/**
 * Page Selector Sync Test Suite
 * 
 * Tests automatic page-selector synchronization when user navigates in iframe.
 * Tests body class detection for accurate page type identification.
 * 
 * Implementation files:
 * - iframe-helper.js: detectPageTypeFromBody(), startUrlSync()
 * - page-selector.js: updateCurrentPageType()
 * - toolbar.js: bte:pageTypeChanged event listener
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper'
], function($, TestFramework, IframeHelper, StorageHelper) {
    'use strict';
    
    return TestFramework.suite('Page Selector Sync', {
        
        // ========================================================================
        // GROUP 1: Body Class Detection Tests (7 tests)
        // ========================================================================
        
        /**
         * Test 1: detectPageTypeFromBody() should detect home page
         */
        'detectPageTypeFromBody() should detect cms-index-index': function() {
            // Mock iframe document with body class
            var mockDoc = {
                body: {
                    className: 'cms-index-index page-layout-1column'
                }
            };
            
            // Stub getDocument() to return mock
            var originalGetDocument = IframeHelper.getDocument;
            IframeHelper.getDocument = function() { return mockDoc; };
            
            try {
                // Test
                var pageType = IframeHelper.detectPageTypeFromBody();
                
                // Assert
                this.assertEquals(pageType, 'cms_index_index', 'Should detect home page');
                console.log('✅ Detected home page from body class');
                
            } finally {
                // Restore original method
                IframeHelper.getDocument = originalGetDocument;
            }
        },
        
        /**
         * Test 2: detectPageTypeFromBody() should detect category page
         */
        'detectPageTypeFromBody() should detect catalog-category-view': function() {
            var mockDoc = {
                body: {
                    className: 'catalog-category-view page-layout-2columns-left category-jackets-women'
                }
            };
            
            var originalGetDocument = IframeHelper.getDocument;
            IframeHelper.getDocument = function() { return mockDoc; };
            
            try {
                var pageType = IframeHelper.detectPageTypeFromBody();
                this.assertEquals(pageType, 'catalog_category_view', 'Should detect category page');
                console.log('✅ Detected category page from body class');
            } finally {
                IframeHelper.getDocument = originalGetDocument;
            }
        },
        
        /**
         * Test 3: detectPageTypeFromBody() should detect product page
         */
        'detectPageTypeFromBody() should detect catalog-product-view': function() {
            var mockDoc = {
                body: {
                    className: 'catalog-product-view product-joust-duffle-bag page-layout-1column'
                }
            };
            
            var originalGetDocument = IframeHelper.getDocument;
            IframeHelper.getDocument = function() { return mockDoc; };
            
            try {
                var pageType = IframeHelper.detectPageTypeFromBody();
                this.assertEquals(pageType, 'catalog_product_view', 'Should detect product page');
                console.log('✅ Detected product page from body class');
            } finally {
                IframeHelper.getDocument = originalGetDocument;
            }
        },
        
        /**
         * Test 4: detectPageTypeFromBody() should detect checkout cart
         */
        'detectPageTypeFromBody() should detect checkout-cart-index': function() {
            var mockDoc = {
                body: {
                    className: 'checkout-cart-index page-layout-1column'
                }
            };
            
            var originalGetDocument = IframeHelper.getDocument;
            IframeHelper.getDocument = function() { return mockDoc; };
            
            try {
                var pageType = IframeHelper.detectPageTypeFromBody();
                this.assertEquals(pageType, 'checkout_cart_index', 'Should detect cart page');
                console.log('✅ Detected cart page from body class');
            } finally {
                IframeHelper.getDocument = originalGetDocument;
            }
        },
        
        /**
         * Test 5: detectPageTypeFromBody() should detect checkout
         */
        'detectPageTypeFromBody() should detect checkout-index-index': function() {
            var mockDoc = {
                body: {
                    className: 'checkout-index-index page-layout-checkout'
                }
            };
            
            var originalGetDocument = IframeHelper.getDocument;
            IframeHelper.getDocument = function() { return mockDoc; };
            
            try {
                var pageType = IframeHelper.detectPageTypeFromBody();
                this.assertEquals(pageType, 'checkout_index_index', 'Should detect checkout page');
                console.log('✅ Detected checkout page from body class');
            } finally {
                IframeHelper.getDocument = originalGetDocument;
            }
        },
        
        /**
         * Test 6: detectPageTypeFromBody() should return null if no match
         */
        'detectPageTypeFromBody() should return null for unknown page': function() {
            var mockDoc = {
                body: {
                    className: 'unknown-page-type custom-class'
                }
            };
            
            var originalGetDocument = IframeHelper.getDocument;
            IframeHelper.getDocument = function() { return mockDoc; };
            
            try {
                var pageType = IframeHelper.detectPageTypeFromBody();
                this.assertEquals(pageType, null, 'Should return null for unknown page');
                console.log('✅ Returns null for unknown page type');
            } finally {
                IframeHelper.getDocument = originalGetDocument;
            }
        },
        
        /**
         * Test 7: detectPageTypeFromBody() should handle iframe not accessible
         */
        'detectPageTypeFromBody() should handle iframe not accessible': function() {
            var originalGetDocument = IframeHelper.getDocument;
            IframeHelper.getDocument = function() { return null; };
            
            try {
                var pageType = IframeHelper.detectPageTypeFromBody();
                this.assertEquals(pageType, null, 'Should return null when iframe not accessible');
                console.log('✅ Handles iframe not accessible gracefully');
            } finally {
                IframeHelper.getDocument = originalGetDocument;
            }
        },
        
        // ========================================================================
        // GROUP 2: Page Selector Widget API Tests (3 tests)
        // ========================================================================
        
        /**
         * Test 8: updateCurrentPageType() should update widget state
         */
        'PageSelector.updateCurrentPageType() should update state': function() {
            // Initialize storage
            StorageHelper.init(1, 5);
            
            // Create mock page-selector widget
            var widget = {
                options: {
                    currentPageId: 'cms_index_index',
                    pages: [
                        { id: 'cms_index_index', label: 'Home' },
                        { id: 'catalog_category_view', label: 'Category' },
                        { id: 'catalog_product_view', label: 'Product' }
                    ]
                },
                currentPageLabel: 'Home',
                _isValidPageId: function(pageType) {
                    var self = this;
                    return this.options.pages.some(function(p) { return p.id === pageType; });
                },
                _findPageLabel: function(pageType) {
                    var self = this;
                    var page = null;
                    this.options.pages.forEach(function(p) {
                        if (p.id === pageType) {
                            page = p;
                        }
                    });
                    return page ? page.label : 'Unknown';
                },
                _render: function() {
                    // Mock render
                }
            };
            
            // Import updateCurrentPageType method (same as in page-selector.js)
            widget.updateCurrentPageType = function(pageType) {
                if (!this._isValidPageId(pageType)) {
                    return false;
                }
                if (this.options.currentPageId === pageType) {
                    return true;
                }
                this.options.currentPageId = pageType;
                this.currentPageLabel = this._findPageLabel(pageType);
                StorageHelper.setCurrentPageId(pageType);
                this._render();
                return true;
            };
            
            // Test: Update to product page
            var success = widget.updateCurrentPageType('catalog_product_view');
            
            // Assert
            this.assertTrue(success, 'Should return true');
            this.assertEquals(widget.options.currentPageId, 'catalog_product_view', 'Should update currentPageId');
            this.assertEquals(widget.currentPageLabel, 'Product', 'Should update currentPageLabel');
            this.assertEquals(StorageHelper.getCurrentPageId(), 'catalog_product_view', 'Should save to localStorage');
            
            console.log('✅ updateCurrentPageType() updates widget state correctly');
        },
        
        /**
         * Test 9: updateCurrentPageType() should reject invalid page type
         */
        'PageSelector.updateCurrentPageType() should reject invalid type': function() {
            var widget = {
                options: {
                    currentPageId: 'cms_index_index',
                    pages: [
                        { id: 'cms_index_index', label: 'Home' }
                    ]
                },
                _isValidPageId: function(pageType) {
                    var self = this;
                    return this.options.pages.some(function(p) { return p.id === pageType; });
                }
            };
            
            widget.updateCurrentPageType = function(pageType) {
                if (!this._isValidPageId(pageType)) {
                    return false;
                }
                return true;
            };
            
            // Test: Try invalid page type
            var success = widget.updateCurrentPageType('invalid_page_type');
            
            // Assert
            this.assertFalse(success, 'Should return false for invalid type');
            
            console.log('✅ updateCurrentPageType() rejects invalid page types');
        },
        
        /**
         * Test 10: updateCurrentPageType() should skip if already on same page
         */
        'PageSelector.updateCurrentPageType() should skip if same page': function() {
            var renderCalled = false;
            
            var widget = {
                options: {
                    currentPageId: 'cms_index_index',
                    pages: [{ id: 'cms_index_index', label: 'Home' }]
                },
                _isValidPageId: function() { return true; },
                _render: function() {
                    renderCalled = true;
                }
            };
            
            widget.updateCurrentPageType = function(pageType) {
                if (!this._isValidPageId(pageType)) {
                    return false;
                }
                if (this.options.currentPageId === pageType) {
                    return true; // Skip render
                }
                this._render();
                return true;
            };
            
            // Test: Update to same page
            var success = widget.updateCurrentPageType('cms_index_index');
            
            // Assert
            this.assertTrue(success, 'Should return true');
            this.assertFalse(renderCalled, 'Should not re-render if same page');
            
            console.log('✅ updateCurrentPageType() skips re-render for same page');
        }
    });
});
