/**
 * Page Selector Widget
 * 
 * Allows switching between different page types to test theme
 * across various layouts (Home, Category, Product, Cart, etc.)
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/page-selector.html'
], function ($, mageTemplate, template) {
    'use strict';

    $.widget('swissup.breezePageSelector', {
        options: {
            pages: [],              // Page types from ViewModel
            currentPageId: null,    // Current page ID
            iframeBaseUrl: '',      // Base URL for iframe
            iframeSelector: '#bte-iframe'
        },

        /**
         * Widget initialization
         * @private
         */
        _create: function() {
            console.log('🎨 Initializing page selector', this.options);
            this.currentPageLabel = this._findPageLabel(this.options.currentPageId);
            this._render();
            this._bindEvents();
            console.log('✅ Page selector initialized');
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

            // Build new iframe URL
            var $iframe = $(this.options.iframeSelector);
            var currentUrl = $iframe.attr('src');
            var newUrl = this._buildPageUrl(pageData.url, currentUrl);

            console.log('🔄 Reloading iframe with page:', pageData.label);
            console.log('   Old URL:', currentUrl);
            console.log('   New URL:', newUrl);
            
            $iframe.attr('src', newUrl);

            // Update UI
            this._render();
            this._closeDropdown();

            // Trigger event
            $(this.element).trigger('pageChanged', [pageId, pageData]);
            
            console.log('✅ Page switched to:', pageData.label);
        },

        /**
         * Build new page URL preserving store and jstest params
         * @param {string} pageUrl
         * @param {string} currentUrl
         * @returns {string}
         * @private
         */
        _buildPageUrl: function(pageUrl, currentUrl) {
            try {
                // Parse current URL to preserve params
                var currentUrlObj = new URL(currentUrl, window.location.origin);
                var storeParam = currentUrlObj.searchParams.get('___store');
                var jstestParam = currentUrlObj.searchParams.get('jstest');

                // Build new URL with page path
                var newUrl = this.options.iframeBaseUrl + pageUrl;
                var newUrlObj = new URL(newUrl, window.location.origin);

                // Preserve store and jstest params
                if (storeParam) {
                    newUrlObj.searchParams.set('___store', storeParam);
                }
                if (jstestParam) {
                    newUrlObj.searchParams.set('jstest', jstestParam);
                }

                return newUrlObj.toString();
            } catch (e) {
                console.error('❌ Error building page URL:', e);
                // Fallback to simple concatenation
                return this.options.iframeBaseUrl + pageUrl;
            }
        },

        /**
         * Public API: Set current page
         * @param {string} pageId
         */
        setPage: function(pageId) {
            console.log('📝 Setting page externally:', pageId);
            this._selectPage(pageId);
        }
    });

    return $.swissup.breezePageSelector;
});
