define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/main-toggle-button.html',
    'text!Swissup_BreezeThemeEditor/template/toolbar/compact-toggle-button.html'
], function ($, widget, mageTemplate, mainButtonTemplate, compactButtonTemplate) {
    'use strict';

    $.widget('swissup.breezeToolbarToggle', {
        options: {
            compactSelector: '#toolbar-compact-toggle',
            toolbarSelector: '#breeze-theme-editor-toolbar',
            panelsSelector: '#bte-panels-container',
            storageKey: 'breeze-editor-toolbar-visible'
        },

        _create: function () {
            this.mainButtonTemplate = mageTemplate(mainButtonTemplate);
            this.compactButtonTemplate = mageTemplate(compactButtonTemplate);
            this._render();
            this._bind();
            this._restoreState();
        },

        _render: function () {
            // Render main toggle button
            var mainHtml = this.mainButtonTemplate({
                data: {
                    hideTitle: $.mage.__('Hide Toolbar'),
                    hideLabel: $.mage.__('Hide')
                }
            });
            this.element.html(mainHtml);
            this.$mainButton = this.element.find('#breeze-editor-toolbar-toggle');

            // Render compact toggle button
            var compactHtml = this.compactButtonTemplate({
                data: {
                    showTitle: $.mage.__('Show Toolbar'),
                    label: $.mage.__('Breeze Editor')
                }
            });
            $(this.options.compactSelector).html(compactHtml);
            this.$compactButton = $('#breeze-editor-toolbar-compact-toggle');
            this.$toolbar = $(this.options.toolbarSelector);
            this.$panels = $(this.options.panelsSelector);  // 🔥 ДОДАТИ
        },

        _bind: function () {
            this.$mainButton.on('click', $.proxy(this._hideToolbar, this));
            this.$compactButton.on('click', $.proxy(this._showToolbar, this));
        },

        _hideToolbar: function () {
            this.$toolbar.addClass('toolbar-collapsed');
            $('body').addClass('toolbar-hidden');

            // 🔥 Сховати всі панелі
            this.$panels.find('.bte-panel').removeClass('active').hide();
            $('body').removeClass('bte-panel-active');

            // 🔥 Деактивувати всі navigation таби
            $('#toolbar-navigation .nav-item').removeClass('active');

            // Reset CSS custom properties
            document.documentElement.style.setProperty('--breeze-toolbar-height', '0px');
            document.documentElement.style.setProperty('--bte-sidebar-width', '0px');  // 🔥 ДОДАТИ

            this.$compactButton.fadeIn(200);
            this._saveState(false);
            $(document).trigger('toolbarHidden');

            console.log('🙈 Toolbar and panels hidden');
        },

        _showToolbar: function () {
            this.$toolbar.removeClass('toolbar-collapsed');
            $('body').removeClass('toolbar-hidden');

            // Restore CSS custom properties
            var toolbarHeight = this.$toolbar.outerHeight();
            document.documentElement.style.setProperty('--breeze-toolbar-height', toolbarHeight + 'px');

            // 🔥 НЕ відновлювати sidebar (панелі залишаються закритими)
            // Користувач сам відкриє потрібну панель
            document.documentElement.style.setProperty('--bte-sidebar-width', '0px');

            this.$compactButton.fadeOut(200);
            this._saveState(true);
            $(document).trigger('toolbarShown');

            console.log('👁️ Toolbar shown (panels remain closed)');
        },

        _saveState: function (isVisible) {
            try {
                localStorage.setItem(this.options.storageKey, isVisible ?  '1' : '0');
            } catch (e) {
                console.warn('Could not save toolbar state:', e);
            }
        },

        _restoreState: function () {
            try {
                var state = localStorage.getItem(this.options.storageKey);
                if (state === '0') {
                    setTimeout($.proxy(this._hideToolbar, this), 100);
                }
            } catch (e) {
                console.warn('Could not restore toolbar state:', e);
            }
        }
    });

    return $.swissup.breezeToolbarToggle;
});
