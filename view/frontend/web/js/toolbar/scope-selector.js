define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/scope-selector.html'
], function ($, widget, mageTemplate, scopeSelectorTemplate) {
    'use strict';

    $.widget('swissup.breezeScopeSelector', {
        options: {
            currentScope: 'Default Store View',
            scopes: [],
            hasMultiple: false
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
                    hasMultiple: this.options.hasMultiple
                }
            });

            this.element.html(html);
            this.$button = this.element.find('.toolbar-select');
            this.$dropdown = this.element.find('.toolbar-dropdown');
            this.$items = this.element.find('.dropdown-item');
        },

        _bind: function () {
            this.$button.on('click', $.proxy(this._toggleDropdown, this));
            this.$items.on('click', $.proxy(this._selectScope, this));
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

            // змінили перевірку видимості з `is(':visible')` на клас `.active`
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
            var scopeId = $item.data('scope-id');
            var scopeName = $item.find('.item-text').text();
            var scopeUrl = $item.attr('href');

            console.log('Switching to scope:', scopeName, '(' + scopeId + ')');

            this.element.trigger('scopeChanged', [{
                id: scopeId,
                name: scopeName,
                url: scopeUrl
            }]);

            // Redirect with access token
            var urlWithToken = this._addAccessToken(scopeUrl);
            console.log('Redirecting to:', urlWithToken);
            window.location.href = urlWithToken;
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
            $(document).off('click.scopeSelector');
            this._super();
        }
    });

    return $.swissup.breezeScopeSelector;
});
