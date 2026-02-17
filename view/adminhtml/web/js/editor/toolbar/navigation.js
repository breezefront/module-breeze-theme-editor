/**
 * Admin Navigation Widget
 * 
 * Спрощена версія navigation для admin area.
 * Базується на frontend version, але БЕЗ:
 * - theme-editor/panel залежності
 * - складної ініціалізації панелей
 * 
 * Управляє показом/приховуванням панелей через просту логіку.
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/navigation.html'
], function ($, widget, mageTemplate, navigationTemplate) {
    'use strict';

    $.widget('swissup.breezeNavigation', {
        options: {
            items: [],
            panelSelector: null
        },

        /**
         * Initialize widget
         */
        _create: function () {
            console.log('✅ Initializing Navigation with', this.options.items.length, 'items');

            this.template = mageTemplate(navigationTemplate);
            this._render();
            this._bind();
        },

        /**
         * Render navigation buttons from template
         */
        _render: function () {
            var html = this.template({
                data: {
                    items: this.options.items
                }
            });

            this.element.html(html);
            this.$items = this.element.find('.nav-item');

            console.log('📋 Navigation rendered');
        },

        /**
         * Bind click events
         */
        _bind: function () {
            this.$items.on('click', $.proxy(this._onItemClick, this));
        },

        /**
         * Handle navigation item click
         * @param {Event} e
         */
        _onItemClick: function (e) {
            e.preventDefault();

            var $item = $(e.currentTarget);
            var itemId = $item.data('id');

            // Ignore disabled items
            if ($item.hasClass('disabled') || $item.prop('disabled')) {
                console.warn('⚠️ Navigation item is disabled:', itemId);
                this._showDisabledMessage(itemId);
                return;
            }

            // Toggle: Якщо вже активний → деактивувати
            if ($item.hasClass('active')) {
                console.log('🔄 Toggling off active navigation:', itemId);
                this.deactivate(itemId);
                return;
            }

            // Активувати новий таб
            console.log('🔄 Switching navigation to:', itemId);
            this.setActive(itemId);
        },

        /**
         * Set active navigation item
         * @param {String} itemId
         * @param {Boolean} silent - Don't trigger events
         */
        setActive: function (itemId, silent) {
            var item = this.options.items.find(function(i) {
                return i.id === itemId;
            });

            if (!item) {
                console.error('❌ Navigation item not found:', itemId);
                return;
            }

            if (item.disabled) {
                console.warn('⚠️ Cannot activate disabled item:', itemId);
                return;
            }

            // Деактивувати всі таби
            this.$items.removeClass('active');
            this.options.items.forEach(function(i) {
                i.active = false;
            });

            // Активувати вибраний таб
            var $activeItem = this.$items.filter('[data-id="' + itemId + '"]');
            $activeItem.addClass('active');
            item.active = true;

            console.log('✅ Navigation activated:', itemId);

            // Сховати всі панелі
            this._hideAllPanels();

            // Показати відповідну панель
            this._showPanel(itemId);

            // Trigger event
            if (!silent) {
                this.element.trigger('navigationChanged', [{
                    id: itemId,
                    label: item.label,
                    panelId: item.panelId || itemId + '-panel',
                    active: true
                }]);
            }
        },

        /**
         * Деактивувати таб і сховати панель
         * @param {String} itemId
         * @param {Boolean} silent
         */
        deactivate: function (itemId, silent) {
            var item = this.options.items.find(function(i) {
                return i.id === itemId;
            });

            if (!item) {
                return;
            }

            // Видалити active клас
            var $item = this.$items.filter('[data-id="' + itemId + '"]');
            $item.removeClass('active');
            item.active = false;

            console.log('✅ Navigation deactivated:', itemId);

            // Сховати панель
            this._hidePanel(itemId);

            // Trigger event
            if (!silent) {
                this.element.trigger('navigationChanged', [{
                    id: itemId,
                    label: item.label,
                    panelId: item.panelId || itemId + '-panel',
                    active: false
                }]);
            }
        },

        /**
         * Show panel for navigation item
         * @param {String} itemId
         */
        _showPanel: function (itemId) {
            if (!this.options.panelSelector) {
                return;
            }

            var item = this.options.items.find(function(i) {
                return i.id === itemId;
            });

            if (!item) {
                return;
            }

            var panelId = item.panelId || itemId + '-panel';
            var $panel = $('#' + panelId);

            if ($panel.length) {
                // Step 1: Show panel (display: block) - makes it visible but off-screen
                $panel.show();
                
                // Step 2: Trigger reflow to ensure display:block is applied before transform
                $panel[0].offsetHeight; // Force reflow
                
                // Step 3: Add active class to trigger transform animation (slide in from LEFT)
                setTimeout(function() {
                    $panel.addClass('active');
                }, 10);
                
                console.log('👁️ Panel shown:', panelId);

                // Додати клас до body для зсуву контенту
                $('body').addClass('bte-panel-active');

                this.element.trigger('panelShown', [{
                    panelId: panelId,
                    itemId: itemId
                }]);
            } else {
                console.warn('⚠️ Panel not found:', panelId);
            }
        },

        /**
         * Hide panel for navigation item
         * @param {String} itemId
         */
        _hidePanel: function (itemId) {
            if (!this.options.panelSelector) {
                return;
            }

            var item = this.options.items.find(function(i) {
                return i.id === itemId;
            });

            if (!item) {
                return;
            }

            var panelId = item.panelId || itemId + '-panel';
            var $panel = $('#' + panelId);

            if ($panel.length) {
                var self = this;
                
                // Step 1: Remove active class to trigger transform animation (slide out to LEFT)
                $panel.removeClass('active');
                console.log('🙈 Panel hidden:', panelId);

                // Step 2: Wait for animation to complete (300ms), then hide panel (display: none)
                setTimeout(function() {
                    $panel.hide();
                }, 300); // Match CSS transition duration

                // Видалити клас з body (якщо немає інших активних панелей)
                if ($(this.options.panelSelector).find('.bte-panel.active').length === 0) {
                    $('body').removeClass('bte-panel-active');
                }

                this.element.trigger('panelHidden', [{
                    panelId: panelId,
                    itemId: itemId
                }]);
            }
        },

        /**
         * Hide all panels
         */
        _hideAllPanels: function () {
            if (!this.options.panelSelector) {
                return;
            }

            var $panelContainer = $(this.options.panelSelector);
            $panelContainer.children().removeClass('active').hide();

            // Видалити клас з body
            $('body').removeClass('bte-panel-active');

            console.log('🙈 All panels hidden');
        },

        /**
         * Show disabled message
         * @param {String} itemId
         */
        _showDisabledMessage: function (itemId) {
            var item = this.options.items.find(function(i) {
                return i.id === itemId;
            });

            if (!item) {
                return;
            }

            var message = item.label + ' is not available';

            if (item.badge && item.badge.type === 'pro') {
                message = item.label + ' is available in PRO version';
            }

            this.element.trigger('navigationDisabledClick', [{
                id: itemId,
                label: item.label,
                message: message
            }]);

            console.log('ℹ️ Disabled item clicked:', itemId, '→', message);
        }
    });

    return $.swissup.breezeNavigation;
});
