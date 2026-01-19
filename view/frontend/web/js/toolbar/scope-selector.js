define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/scope-selector.html',
    'Swissup_BreezeThemeEditor/js/auth-manager'
], function ($, widget, mageTemplate, scopeSelectorTemplate, AuthManager) {
    'use strict';

    $.widget('swissup.breezeScopeSelector', {
        options: {
            currentScope: 'Default Store View',
            scopes: [],
            hasMultiple: false,
            isHierarchical: false,  // NEW: hierarchical mode flag
            activePath: {}          // NEW: {website_id: 1, group_id: 1, store_id: 1}
        },

        _create: function () {
            this.template = mageTemplate(scopeSelectorTemplate);
            this._render();

            if (this.options.hasMultiple) {
                this._bind();
                this._initClickOutside();
            }
        },

        _render: function () {
            var html = this.template({
                data: {
                    label: $.mage.__('Store'),
                    currentScope: this.options.currentScope,
                    dropdownTitle: $.mage.__('Switch Store View'),
                    scopes: this.options.scopes,
                    hasMultiple: this.options.hasMultiple,
                    isHierarchical: this.options.isHierarchical  // NEW
                }
            });

            this.element.html(html);
            this.$button = this.element.find('.toolbar-select');
            this.$dropdown = this.element.find('.toolbar-dropdown');
            
            // NEW: Handle hierarchical items
            if (this.options.isHierarchical) {
                this.$headers = this.element.find('.scope-header');
                this.$storeItems = this.element.find('.scope-store');
            } else {
                this.$items = this.element.find('.dropdown-item');
            }
        },

        _bind: function () {
            this.$button.on('click', $.proxy(this._toggleDropdown, this));
            
            if (this.options.isHierarchical) {
                this._bindHierarchical();
            } else {
                this.$items.on('click', $.proxy(this._selectScope, this));
            }
        },

        /**
         * Bind events for hierarchical mode
         * @private
         */
        _bindHierarchical: function () {
            var self = this;
            
            // Click on website/group headers to toggle
            this.$headers.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                self._toggleHierarchyItem($(this));
            });
            
            // Click on store view to navigate
            this.$storeItems.on('click', function(e) {
                e.preventDefault();
                self._selectScope(e);
            });
            
            // Auto-expand to active store
            this._expandToActiveStore();
        },

        /**
         * Toggle expand/collapse for website or group
         * @param {jQuery} $header
         * @private
         */
        _toggleHierarchyItem: function ($header) {
            var $container = $header.next(); // .scope-groups or .scope-stores
            var $toggle = $header.find('.scope-toggle');
            var isExpanded = $container.is(':visible');
            
            if (isExpanded) {
                // Collapse
                $container.slideUp(200);
                $toggle.text('▶');
                $header.removeClass('expanded');
            } else {
                // Expand
                $container.slideDown(200);
                $toggle.text('▼');
                $header.addClass('expanded');
            }
        },

        /**
         * Auto-expand tree to show active store
         * @private
         */
        _expandToActiveStore: function () {
            var activePath = this.options.activePath;
            
            if (!activePath || !activePath.website_id) {
                return;
            }
            
            // Find and expand website
            var $website = this.element.find('[data-website-id="' + activePath.website_id + '"]');
            if ($website.length) {
                var $websiteHeader = $website.find('.scope-header-website');
                $websiteHeader.find('.scope-toggle').text('▼');
                $websiteHeader.addClass('expanded');
                $website.find('.scope-groups').show();
                
                // Find and expand group
                var $group = $website.find('[data-group-id="' + activePath.group_id + '"]');
                if ($group.length) {
                    var $groupHeader = $group.find('.scope-header-group');
                    $groupHeader.find('.scope-toggle').text('▼');
                    $groupHeader.addClass('expanded');
                    $group.find('.scope-stores').show();
                }
            }
        },

        _initClickOutside: function () {
            var self = this;
            $(document).on('click.scopeSelector', function(e) {
                if (!self.element.is(e.target) && self.element.has(e.target).length === 0) {
                    self._closeDropdown();
                }
            });
        },

        _toggleDropdown: function (e) {
            e.preventDefault();
            e.stopPropagation();

            var isVisible = this.$dropdown.hasClass('active');

            // Close all other dropdowns
            $('.toolbar-dropdown').removeClass('active');
            $('.toolbar-select').removeClass('active');

            if (!isVisible) {
                this._openDropdown();
            } else {
                this._closeDropdown();
            }
        },

        _openDropdown: function () {
            this.$dropdown.addClass('active');
            this.$button.addClass('active');
            this.element.trigger('scopeSelectorOpened');
            console.log('Scope selector opened');
        },

        _closeDropdown: function () {
            this.$dropdown.removeClass('active');
            this.$button.removeClass('active');
            this.element.trigger('scopeSelectorClosed');
        },

        _selectScope: function (e) {
            e.preventDefault();
            var $item = $(e.currentTarget);
            var scopeId = $item.data('store-id') || $item.data('scope-id');
            var scopeName = $item.find('.item-text').text();
            var scopeUrl = $item.attr('href');

            console.log('Switching to scope:', scopeName, '(' + scopeId + ')');

            this.element.trigger('scopeChanged', [{
                id: scopeId,
                name: scopeName,
                url: scopeUrl
            }]);

            // Redirect with access token
            var urlWithToken = AuthManager.addTokenToUrl(scopeUrl);
            console.log('Redirecting to:', urlWithToken);
            window.location.href = urlWithToken;
        },

        _destroy: function () {
            $(document).off('click.scopeSelector');
            this._super();
        }
    });

    return $.swissup.breezeScopeSelector;
});
