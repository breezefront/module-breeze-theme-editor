/**
 * Page Selector Widget
 * 
 * Allows switching between different page types to test theme
 * across various layouts (Home, Category, Product, Cart, etc.)
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/page-selector.html',
    'Swissup_BreezeThemeEditor/js/editor/util/cookie-manager',
    'Swissup_BreezeThemeEditor/js/editor/util/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/util/url-builder'
], function ($, mageTemplate, template, cookieManager, configManager, urlBuilder) {
    'use strict';

    $.widget('swissup.breezePageSelector', {
        options: {
            pages: [],
            currentPageId: null,
            storeCode: '',
            jstest: false,
            iframeSelector: '#bte-iframe',
            themeId: null
        },

        /**
         * Current URL parameters (store, jstest)
         * @private
         */
        currentParams: {},

        /**
         * Widget initialization
         * @private
         */
        _create: function() {
            this.currentPageLabel = this._findPageLabel(this.options.currentPageId);
            this._initializeCurrentParams();
            this._render();
            this._bindEvents();
            console.log('✅ Page selector initialized');
        },

        /**
         * Initialize current parameters from options (passed from config)
         * @private
         */
        _initializeCurrentParams: function() {
            this.currentParams = {
                store: this.options.storeCode || '',
                jstest: this.options.jstest || false
            };
            console.log('📦 Initialized params:', this.currentParams);
        },

        /**
         * Find page label by ID
         * @param {string} pageId
         * @returns {string}
         * @private
         */
        _findPageLabel: function(pageId) {
            var label = 'Unknown Page';
            this.options.pages.forEach(function(page) {
                if (page.id === pageId) {
                    label = page.label;
                }
            });
            return label;
        },

        /**
         * Render widget HTML
         * @private
         */
        _render: function() {
            var html = mageTemplate(template, {
                pages: this.options.pages,
                currentPageId: this.options.currentPageId,
                currentPageLabel: this.currentPageLabel
            });
            this.element.html(html);
        },

        /**
         * Bind event handlers
         * @private
         */
        _bindEvents: function() {
            var self = this;

            // Toggle dropdown
            this.element.on('click', '.toolbar-select', function(e) {
                e.preventDefault();
                self._toggleDropdown();
            });

            // Select page
            this.element.on('click', '[data-page-id]', function(e) {
                e.preventDefault();
                var pageId = $(this).data('page-id');
                self._selectPage(pageId);
            });

            // Close dropdown when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest(self.element).length) {
                    self._closeDropdown();
                }
            });
        },

        /**
         * Toggle dropdown visibility
         * @private
         */
        _toggleDropdown: function() {
            var $dropdown = this.element.find('.toolbar-dropdown');
            var $button = this.element.find('.toolbar-select');
            var isVisible = $dropdown.is(':visible');
            
            // Close all other dropdowns first
            $('.toolbar-dropdown').not($dropdown).hide();
            $('.toolbar-select').not($button).removeClass('active');
            
            // Toggle this dropdown
            $dropdown.toggle();
            $button.toggleClass('active', !isVisible);
            
            console.log(isVisible ? '🔽 Closing page dropdown' : '🔼 Opening page dropdown');
        },

        /**
         * Close dropdown
         * @private
         */
        _closeDropdown: function() {
            this.element.find('.toolbar-dropdown').hide();
            this.element.find('.toolbar-select').removeClass('active');
        },

        /**
         * Select page and reload iframe
         * @param {string} pageId
         * @private
         */
        _selectPage: function(pageId) {
            console.log('📄 Switching to page:', pageId);

            if (pageId === this.options.currentPageId) {
                console.log('ℹ️ Already viewing page:', pageId);
                this._closeDropdown();
                return;
            }

            // Find page data
            var pageData = null;
            this.options.pages.forEach(function(page) {
                if (page.id === pageId) {
                    pageData = page;
                }
            });

            if (!pageData) {
                console.error('❌ Page not found:', pageId);
                return;
            }

            // Update current page
            this.options.currentPageId = pageId;
            this.currentPageLabel = pageData.label;

            // Get iframe element
            var $iframe = $(this.options.iframeSelector);
            var iframe = $iframe[0];
            
            // Build new URL with current params
            var newUrl = this._buildPageUrlWithParams(pageData.url);

            console.log('🔄 Reloading iframe with page:', pageData.label);
            console.log('   New URL:', newUrl);
            
            // Set navigation cookies BEFORE navigation
            var storeCode = configManager.getStoreCode(this.currentParams.store);
            var themeId = configManager.getThemeId(this.options.themeId);
            cookieManager.setNavigationCookies(storeCode, themeId);
            
            // Navigate iframe directly via contentWindow for better UX
            try {
                iframe.contentWindow.location.href = newUrl;
            } catch (e) {
                // Fallback to iframe.src if contentWindow access fails
                console.warn('⚠️ Cannot set iframe contentWindow.location, using src attribute');
                $iframe.attr('src', newUrl);
            }

            // Update UI
            this._render();
            this._closeDropdown();

            // Trigger event
            $(this.element).trigger('pageChanged', [pageId, pageData]);
            
            console.log('✅ Page switched to:', pageData.label);
        },

        /**
         * Build page URL with current parameters (store, jstest, preview_theme)
         * 
         * @param {string} pageUrl - Absolute URL from PageUrlProvider
         * @returns {string}
         * @private
         */
        _buildPageUrlWithParams: function(pageUrl) {
            try {
                // Get current config (may be updated by scope selector)
                var storeCode = configManager.getStoreCode(this.currentParams.store);
                var themeId = configManager.getThemeId(this.options.themeId);
                
                console.log('📦 Building URL with - storeCode:', storeCode, 'themeId:', themeId);
                
                // Add navigation parameters
                return urlBuilder.addNavigationParams(pageUrl, {
                    storeCode: storeCode,
                    themeId: themeId,
                    jstest: this.currentParams.jstest
                });
            } catch (e) {
                console.error('❌ Error building page URL:', e);
                console.error('   pageUrl:', pageUrl);
                return pageUrl;
            }
        },

        /**
         * Public API: Set current page
         * @param {string} pageId
         */
        setPage: function(pageId) {
            console.log('📝 Setting page externally:', pageId);
            this._selectPage(pageId);
        },

        /**
         * Public API: Update store parameter
         * Called by scope-selector when store changes
         * @param {string} storeCode
         */
        updateStoreParam: function(storeCode) {
            console.log('🏪 Updating store parameter:', storeCode);
            this.currentParams.store = storeCode;
        },

        /**
         * Public API: Reset to home page
         * Called by scope-selector when store changes to reset page selection
         */
        resetToHomePage: function() {
            console.log('🏠 Resetting page selector to home');
            this.options.currentPageId = 'cms_index_index';
            this.currentPageLabel = this._findPageLabel('cms_index_index');
            this._render();
            console.log('✅ Page selector reset to home');
        }
    });

    return $.swissup.breezePageSelector;
});
