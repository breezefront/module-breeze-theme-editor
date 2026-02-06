/**
 * Scope Selector Widget
 * 
 * Allows switching between store views with hierarchical display:
 * Website → Store Group → Store View
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/scope-selector.html'
], function ($, mageTemplate, template) {
    'use strict';

    $.widget('swissup.breezeScopeSelector', {
        options: {
            websites: [],           // Hierarchical store data from ViewModel
            currentStoreId: null,   // Current store ID
            iframeSelector: '#bte-iframe',
            pageSelectorElement: '#bte-page-selector', // Page selector element (to update store param)
            themeId: null           // Theme ID for preview cookie
        },

        /**
         * Widget initialization
         * @private
         */
        _create: function() {
            console.log('🎨 Initializing scope selector', this.options);
            this._processHierarchy();
            this._render();
            this._bindEvents();
            console.log('✅ Scope selector initialized');
        },

        /**
         * Process hierarchy data and add UI states
         * @private
         */
        _processHierarchy: function() {
            // Add expanded states to hierarchy data
            this.options.websites.forEach(function(website) {
                website.isExpanded = true; // Expand by default
                website.groups.forEach(function(group) {
                    group.isExpanded = true;
                });
            });

            // Find current store name
            this.currentStoreName = this._findStoreName(this.options.currentStoreId);
            console.log('📍 Current store:', this.currentStoreName, '(ID: ' + this.options.currentStoreId + ')');
        },

        /**
         * Find store name by ID
         * @param {number} storeId
         * @returns {string}
         * @private
         */
        _findStoreName: function(storeId) {
            var name = 'Unknown Store';
            this.options.websites.forEach(function(website) {
                website.groups.forEach(function(group) {
                    group.stores.forEach(function(store) {
                        if (store.id == storeId) {
                            name = store.name;
                        }
                    });
                });
            });
            return name;
        },

        /**
         * Render widget HTML
         * @private
         */
        _render: function() {
            var html = mageTemplate(template, {
                websites: this.options.websites,
                currentStoreId: this.options.currentStoreId,
                currentStoreName: this.currentStoreName
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

            // Toggle website
            this.element.on('click', '.scope-header-website', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var $website = $(this).closest('.scope-website');
                var websiteId = $website.data('website-id');
                self._toggleWebsite(websiteId);
            });

            // Toggle group
            this.element.on('click', '.scope-header-group', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var $group = $(this).closest('.scope-group');
                var groupId = $group.data('group-id');
                self._toggleGroup(groupId);
            });

            // Select store
            this.element.on('click', '.scope-store', function(e) {
                e.preventDefault();
                var storeId = $(this).data('store-id');
                var storeCode = $(this).data('store-code');
                var storeName = $(this).find('.item-text').text();
                self._selectStore(storeId, storeCode, storeName);
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
            
            console.log(isVisible ? '🔽 Closing scope dropdown' : '🔼 Opening scope dropdown');
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
         * Toggle website expansion
         * @param {number} websiteId
         * @private
         */
        _toggleWebsite: function(websiteId) {
            var $website = this.element.find('[data-website-id="' + websiteId + '"]');
            var $groups = $website.find('.scope-groups').first();
            var $toggle = $website.find('.scope-header-website .scope-toggle').first();
            var isVisible = $groups.is(':visible');

            $groups.toggle();
            $toggle.text(isVisible ? '▶' : '▼');
            
            console.log((isVisible ? '📁' : '📂') + ' Website toggled:', websiteId);
        },

        /**
         * Toggle group expansion
         * @param {number} groupId
         * @private
         */
        _toggleGroup: function(groupId) {
            var $group = this.element.find('[data-group-id="' + groupId + '"]');
            var $stores = $group.find('.scope-stores').first();
            var $toggle = $group.find('.scope-header-group .scope-toggle').first();
            var isVisible = $stores.is(':visible');

            $stores.toggle();
            $toggle.text(isVisible ? '▶' : '▼');
            
            console.log((isVisible ? '📁' : '📂') + ' Group toggled:', groupId);
        },

        /**
         * Set theme preview cookie for Magento
         * 
         * Magento uses 'preview_theme' cookie to override store's default theme.
         * This ensures iframe displays correct theme when switching stores.
         * 
         * @private
         */
        _setThemePreviewCookie: function() {
            if (!this.options.themeId) {
                console.warn('⚠️ No themeId provided, cannot set preview_theme cookie');
                return;
            }
            
            // Set cookie for Magento theme preview (SameSite=Lax, path=/)
            document.cookie = 'preview_theme=' + this.options.themeId + '; path=/; SameSite=Lax';
            console.log('🎨 Set preview_theme cookie:', this.options.themeId);
        },

        /**
         * Select store and reload iframe
         * @param {number} storeId
         * @param {string} storeCode
         * @param {string} storeName
         * @private
         */
        _selectStore: function(storeId, storeCode, storeName) {
            console.log('🏪 Switching to store:', storeCode, '(ID: ' + storeId + ')');

            if (storeId == this.options.currentStoreId) {
                console.log('ℹ️ Already viewing store:', storeCode);
                this._closeDropdown();
                return;
            }

            // Update current store
            this.options.currentStoreId = storeId;
            this.currentStoreName = storeName;

            // Get iframe element and read real URL from contentWindow
            var $iframe = $(this.options.iframeSelector);
            var iframe = $iframe[0];
            var currentUrl;
            
            try {
                // Get the actual frontend URL (after redirect), not the admin wrapper URL
                currentUrl = iframe.contentWindow.location.href;
            } catch (e) {
                // Fallback to iframe src if contentWindow access fails (cross-origin)
                console.warn('⚠️ Cannot access iframe contentWindow, using src attribute');
                currentUrl = $iframe.attr('src');
            }
            
            var newUrl = this._updateUrlStoreParam(currentUrl, storeCode);
            
            console.log('🔄 Reloading iframe with store:', storeCode);
            console.log('   Old URL:', currentUrl);
            console.log('   New URL:', newUrl);
            
            // Set theme preview cookie BEFORE navigation
            this._setThemePreviewCookie();
            
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

            // Update page selector's store parameter
            var $pageSelector = $(this.options.pageSelectorElement);
            if ($pageSelector.length && $pageSelector.data('swissup-breezePageSelector')) {
                $pageSelector.breezePageSelector('updateStoreParam', storeCode);
            }

            // Trigger event
            $(this.element).trigger('storeChanged', [storeId, storeCode]);
            
            console.log('✅ Store switched to:', storeName);
        },

        /**
         * Update URL store parameter
         * 
         * Note: url is the current iframe URL (absolute).
         * We parse it and update only the ___store query parameter.
         * 
         * @param {string} url - Current iframe absolute URL
         * @param {string} storeCode - New store code to set
         * @returns {string}
         * @private
         */
        _updateUrlStoreParam: function(url, storeCode) {
            try {
                // Parse URL (handles absolute URLs correctly)
                var urlObj = new URL(url, window.location.origin);
                
                // Update ___store parameter
                urlObj.searchParams.set('___store', storeCode);
                
                return urlObj.toString();
            } catch (e) {
                console.error('❌ Error updating URL store param:', e);
                console.error('   url:', url);
                console.error('   storeCode:', storeCode);
                return url;
            }
        },

        /**
         * Public API: Set current store
         * @param {number} storeId
         * @param {string} storeCode
         */
        setStore: function(storeId, storeCode) {
            console.log('📝 Setting store externally:', storeCode);
            var storeName = this._findStoreName(storeId);
            this._selectStore(storeId, storeCode, storeName);
        }
    });

    return $.swissup.breezeScopeSelector;
});
