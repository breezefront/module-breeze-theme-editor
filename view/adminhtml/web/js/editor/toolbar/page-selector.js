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
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/cookie-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/url-builder',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, mageTemplate, template, cookieManager, scopeManager, urlBuilder, StorageHelper, Logger, Constants) {
    'use strict';

    var log = Logger.for('toolbar/page-selector');

    $.widget('swissup.breezePageSelector', {
        options: {
            pages: [],
            currentPageId: null,
            storeCode: '',
            jstest: false,
            iframeSelector: Constants.SELECTORS.IFRAME,
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
            // Try to restore currentPageId from localStorage
            var savedPageId = StorageHelper.getCurrentPageId();
            if (savedPageId && this._isValidPageId(savedPageId)) {
                this.options.currentPageId = savedPageId;
                log.info('Restored page ID from localStorage: ' + savedPageId);
            }
            
            this.currentPageLabel = this._findPageLabel(this.options.currentPageId);
            this._initializeCurrentParams();
            this._render();
            this._bindEvents();
            log.info('Page selector initialized');
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
            log.debug('Initialized params: ' + JSON.stringify(this.currentParams));
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
         * Check if page ID exists in available pages
         * @param {String} pageId
         * @returns {Boolean}
         * @private
         */
        _isValidPageId: function(pageId) {
            var found = false;
            this.options.pages.forEach(function(page) {
                if (page.id === pageId) {
                    found = true;
                }
            });
            return found;
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
            this.element.on('click', Constants.SELECTORS.TOOLBAR_SELECT, function(e) {
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
            var $dropdown = this.element.find(Constants.SELECTORS.TOOLBAR_DROPDOWN);
            var $button = this.element.find(Constants.SELECTORS.TOOLBAR_SELECT);
            var isVisible = $dropdown.is(':visible');
            
            // Close all other dropdowns first
            $(Constants.SELECTORS.TOOLBAR_DROPDOWN).not($dropdown).hide();
            $(Constants.SELECTORS.TOOLBAR_SELECT).not($button).removeClass('active');
            
            // Toggle this dropdown
            $dropdown.toggle();
            $button.toggleClass('active', !isVisible);
            
            log.info(isVisible ? 'Closing page dropdown' : 'Opening page dropdown');
        },

        /**
         * Close dropdown
         * @private
         */
        _closeDropdown: function() {
            this.element.find(Constants.SELECTORS.TOOLBAR_DROPDOWN).hide();
            this.element.find(Constants.SELECTORS.TOOLBAR_SELECT).removeClass('active');
        },

        /**
         * Select page and reload iframe
         * @param {string} pageId
         * @private
         */
        _selectPage: function(pageId) {
            log.info('Switching to page: ' + pageId);

            if (pageId === this.options.currentPageId) {
                log.info('Already viewing page: ' + pageId);
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
                log.error('Page not found: ' + pageId);
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

            log.info('Reloading iframe with page: ' + pageData.label);
            log.debug('New URL: ' + newUrl);
            
            // Set navigation cookies BEFORE navigation
            var storeCode = scopeManager.getStoreCode(this.currentParams.store);
            var themeId = scopeManager.getThemeId(this.options.themeId);
            cookieManager.setNavigationCookies(storeCode, themeId);
            
            // Navigate iframe directly via contentWindow for better UX
            try {
                iframe.contentWindow.location.href = newUrl;
            } catch (e) {
                // Fallback to iframe.src if contentWindow access fails
                log.warn('Cannot set iframe contentWindow.location, using src attribute');
                $iframe.attr('src', newUrl);
            }

            // Update UI
            this._render();
            this._closeDropdown();

            // Trigger event
            $(this.element).trigger(Constants.EVENTS.PAGE_CHANGED, [pageId, pageData]);
            
            // Save page ID to localStorage
            StorageHelper.setCurrentPageId(pageId);
            log.info('Saved page ID to localStorage: ' + pageId);
            
            log.info('Page switched to: ' + pageData.label);
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
                var storeCode = scopeManager.getStoreCode(this.currentParams.store);
                var themeId = scopeManager.getThemeId(this.options.themeId);
                
                log.debug('Building URL with - storeCode: ' + storeCode + ' themeId: ' + themeId);
                
                // Add navigation parameters
                return urlBuilder.addNavigationParams(pageUrl, {
                    storeCode: storeCode,
                    themeId: themeId,
                    jstest: this.currentParams.jstest
                });
            } catch (e) {
                log.error('Error building page URL: ' + e + ' pageUrl: ' + pageUrl);
                return pageUrl;
            }
        },

        /**
         * Public API: Set current page
         * @param {string} pageId
         */
        setPage: function(pageId) {
            log.info('Setting page externally: ' + pageId);
            this._selectPage(pageId);
        },

        /**
         * Public API: Update store parameter
         * Called by scope-selector when store changes
         * @param {string} storeCode
         */
        updateStoreParam: function(storeCode) {
            log.info('Updating store parameter: ' + storeCode);
            this.currentParams.store = storeCode;
        },

        /**
         * Public API: Reset to home page
         * Called by scope-selector when store changes to reset page selection
         */
        resetToHomePage: function() {
            log.info('Resetting page selector to home');
            this.options.currentPageId = 'cms_index_index';
            this.currentPageLabel = this._findPageLabel('cms_index_index');
            this._render();
            log.info('Page selector reset to home');
        },

        /**
         * Public API: Update current page type without navigation
         * Used by iframe URL sync to update dropdown when user navigates within iframe
         * 
         * This method updates the UI only - it does NOT reload the iframe.
         * It's called automatically when user clicks links inside iframe and page type changes.
         * 
         * @param {string} pageType - New page type (e.g. 'catalog_product_view')
         * @returns {boolean} - Success status
         */
        updateCurrentPageType: function(pageType) {
            if (!this._isValidPageId(pageType)) {
                log.warn('Page Selector: Invalid page type: ' + pageType);
                return false;
            }
            
            // Check if already on this page type
            if (this.options.currentPageId === pageType) {
                log.info('Page Selector: Already on page type: ' + pageType);
                return true;
            }
            
            // Update internal state
            this.options.currentPageId = pageType;
            this.currentPageLabel = this._findPageLabel(pageType);
            
            // Re-render dropdown to show new selection
            this._render();
            
            // Save to localStorage
            StorageHelper.setCurrentPageId(pageType);
            
            log.info('Page Selector: Updated to ' + pageType + ' (' + this.currentPageLabel + ')');
            return true;
        }
    });

    return $.swissup.breezePageSelector;
});
