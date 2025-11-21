define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($) {
    'use strict';

    $.widget('swissup.breezeToolbarToggle', {
        options: {
            collapsedClass: 'toolbar-collapsed',
            bodyHiddenClass: 'toolbar-hidden',
            toolbarSelector: '#breeze-theme-editor-toolbar',
            compactToggleSelector: '#breeze-editor-toolbar-compact-toggle',
            cookieName: 'breeze_toolbar_state',
            cookieLifetime: 365, // days
            hideText: 'Hide',
            showText: 'Show',
            hideIcon: '▲',
            showIcon: '▼'
        },

        _create: function () {
            this.$toolbar = $(this.options.toolbarSelector);
            this.$compactToggle = $(this.options.compactToggleSelector);
            this.isCollapsed = false;

            this._restoreState();
            this._bind();
        },

        _bind: function () {
            // Main toggle button
            this.element.on('click', $.proxy(this._toggle, this));

            // Compact toggle button
            this.$compactToggle.on('click', $.proxy(this._toggle, this));
        },

        _toggle: function () {
            this.isCollapsed = !this.isCollapsed;

            if (this.isCollapsed) {
                this._hide();
            } else {
                this._show();
            }

            this._saveState();
        },

        _hide: function () {
            this.$toolbar.addClass(this.options.collapsedClass);
            $('body').addClass(this.options.bodyHiddenClass);

            // Reset CSS custom property to 0
            document.documentElement.style.setProperty('--breeze-toolbar-height', '0px');

            this.$compactToggle.fadeIn(300);

            // Update button text and icon
            this.element.find('.button-text').text($.mage.__(this.options.showText));
            this.element.attr('title', $.mage.__('Show Toolbar'));

            this.element.trigger('toolbarHidden');
        },

        _show: function () {
            this.$toolbar.removeClass(this.options.collapsedClass);
            $('body').removeClass(this.options.bodyHiddenClass);

            // Restore CSS custom property
            var toolbarHeight = this.$toolbar.outerHeight();
            document.documentElement.style.setProperty('--breeze-toolbar-height', toolbarHeight + 'px');

            this.$compactToggle.fadeOut(300);

            // Update button text and icon
            this.element.find('.button-text').text($.mage.__(this.options.hideText));
            this.element.attr('title', $.mage.__('Hide Toolbar'));

            this.element.trigger('toolbarShown');
        },

        _saveState: function () {
            this._setCookie(
                this.options.cookieName,
                this.isCollapsed ? '1' : '0',
                this.options.cookieLifetime
            );
        },

        _restoreState: function () {
            var savedState = this._getCookie(this.options.cookieName);

            if (savedState === '1') {
                this.isCollapsed = true;
                // Delay hide to allow DOM to be ready
                setTimeout($.proxy(this._hide, this), 100);
            }
        },

        /**
         * Set cookie using native JavaScript
         * @param {string} name
         * @param {string} value
         * @param {number} days
         * @private
         */
        _setCookie: function (name, value, days) {
            var expires = '';

            if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = '; expires=' + date.toUTCString();
            }

            document.cookie = name + '=' + (value || '') + expires + '; path=/';
        },

        /**
         * Get cookie using native JavaScript
         * @param {string} name
         * @returns {string|null}
         * @private
         */
        _getCookie: function (name) {
            var nameEQ = name + '=';
            var ca = document.cookie.split(';');

            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) === ' ') {
                    c = c.substring(1, c.length);
                }
                if (c.indexOf(nameEQ) === 0) {
                    return c.substring(nameEQ.length, c.length);
                }
            }

            return null;
        },

        getState: function () {
            return this.isCollapsed;
        }
    });

    return $.swissup.breezeToolbarToggle;
});
