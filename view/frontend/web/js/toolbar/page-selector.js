define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/page-selector.html'
], function ($, widget, mageTemplate, pageSelectorTemplate) {
    'use strict';

    $.widget('swissup.breezePageSelector', {
        options: {
            currentPage: 'Home',
            _isNavigating: false,
            pages: [],
        },

        _create: function () {
            this.template = mageTemplate(pageSelectorTemplate);
            this._render();
            this._bind();
            this._initClickOutside();
        },

        _render: function () {
            var html = this.template({
                data: {
                    label: $.mage.__('Page'),
                    currentPage: this.options.currentPage,
                    dropdownTitle: $.mage.__('Switch Page Type'),
                    pages: this.options.pages
                }
            });

            this.element.html(html);
            this.$button = this.element.find('.toolbar-select');
            this.$dropdown = this.element.find('.toolbar-dropdown');
            this.$items = this.element.find('.dropdown-item');
        },

        _bind: function () {
            this.$button.on('click', $.proxy(this._toggleDropdown, this));
            this.$items.on('click', $.proxy(this._selectPage, this));
        },

        _initClickOutside: function () {
            var self = this;
            $(document).on('click.pageSelector', function(e) {
                if (!self.element.is(e.target) && self.element.has(e.target).length === 0) {
                    self._closeDropdown();
                }
            });
        },

        _toggleDropdown: function (e) {
            e.preventDefault();
            e.stopPropagation();

            var isVisible = this.$dropdown.hasClass('active');//this.$dropdown.is(':visible');

            // Close all other dropdowns
            // $('.toolbar-dropdown').hide();
            $('.toolbar-dropdown').removeClass('active');

            if (!isVisible) {
                this._openDropdown();
            } else {
                this._closeDropdown();
            }
        },

        _openDropdown: function () {
            this.$dropdown.addClass('active');
            this.$button.addClass('active');
            this.element.trigger('pageSelectorOpened');
            console.log('Page selector opened');
        },

        _closeDropdown: function () {
            this.$dropdown.removeClass('active');
            this.$button.removeClass('active');
            this.element.trigger('pageSelectorClosed');
        },

        _selectPage: function (e) {
            e.preventDefault();

            // 🔥 Захист від подвійного кліку
            if (this._isNavigating) {
                console.warn('⚠️ Navigation already in progress');
                return;
            }

            this._isNavigating = true;
            this.$button.prop('disabled', true).css('opacity', '0.6');

            var $item = $(e.currentTarget);
            var pageId = $item.data('page-id');
            var pageTitle = $item.find('.item-text').text();
            var pageUrl = $item.attr('href');

            console.log('🔄 Switching to page:', pageTitle, '(' + pageId + ')');

            this.element.trigger('pageChanged', [{
                id: pageId,
                title: pageTitle,
                url: pageUrl
            }]);

            // Redirect with access token
            var urlWithToken = this._addAccessToken(pageUrl);
            console.log('➡️ Redirecting to:', urlWithToken);

            // Додати невелику затримку для відображення стану
            setTimeout(function() {
                window.location.href = urlWithToken;
            }, 100);
        },

        /**
         * Get access token from current URL
         *
         * @return {string|null}
         */
        _getAccessToken: function() {
            var urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('breeze_theme_editor_access_token');
        },

        /**
         * Add access token to URL to keep editor active
         *
         * @param {string} url
         * @return {string}
         */
        _addAccessToken: function(url) {
            var token = this._getAccessToken();

            if (!token) {
                console.warn('Access token not found in current URL');
                return url;
            }

            var separator = url.indexOf('?') !== -1 ? '&' : '?';
            return url + separator + 'breeze_theme_editor_access_token=' + encodeURIComponent(token);
        },

        _destroy: function () {
            $(document).off('click.pageSelector');
            this._super();
        }
    });

    return $.swissup.breezePageSelector;
});
