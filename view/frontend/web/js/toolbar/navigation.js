define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/navigation.html'
], function ($, widget, mageTemplate, navigationTemplate) {
    'use strict';

    $.widget('swissup.breezeNavigation', {
        options: {
            items: [],
            panelSelector: null
        },

        _create: function () {
            console.log('✅ Initializing Navigation with', this.options.items.length, 'items');

            this.template = mageTemplate(navigationTemplate);
            this._render();
            this._bind();
            // ❌ ВИДАЛИТИ автоактивацію:
            // this._activateDefault();
        },

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

        _bind: function () {
            this.$items.on('click', $.proxy(this._onItemClick, this));
        },

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

            // 🔥 TOGGLE: Якщо вже активний → деактивувати
            if ($item.hasClass('active')) {
                console.log('🔄 Toggling off active navigation:', itemId);
                this.deactivate(itemId);
                return;
            }

            // Активувати новий таб
            console.log('🔄 Switching navigation to:', itemId);
            this.setActive(itemId);
        },

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
         * 🔥 NEW: Деактивувати таб і сховати панель
         */
        deactivate: function (itemId, silent) {
            var item = this.options.items.find(function(i) {
                return i.id === itemId;
            });

            if (! item) {
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

        _showPanel: function (itemId) {
            if (! this.options.panelSelector) {
                return;
            }

            var item = this.options.items.find(function(i) {
                return i.id === itemId;
            });

            if (! item) {
                return;
            }

            var panelId = item.panelId || itemId + '-panel';
            var $panel = $('#' + panelId);

            if ($panel.length) {
                $panel.addClass('active').show();
                console.log('👁️ Panel shown:', panelId);

                // 🔥 Додати клас до body для зсуву контенту
                $('body').addClass('bte-panel-active');

                this.element.trigger('panelShown', [{
                    panelId: panelId,
                    itemId: itemId
                }]);
            } else {
                console.warn('⚠️ Panel not found:', panelId);
            }
        },

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
                $panel.removeClass('active').hide();
                console.log('🙈 Panel hidden:', panelId);

                // 🔥 Видалити клас з body (якщо немає інших активних панелей)
                if ($(this.options.panelSelector).find('.bte-panel.active').length === 0) {
                    $('body').removeClass('bte-panel-active');
                }

                this.element.trigger('panelHidden', [{
                    panelId: panelId,
                    itemId: itemId
                }]);
            }
        },

        _hideAllPanels: function () {
            if (!this.options.panelSelector) {
                return;
            }

            var $panelContainer = $(this.options.panelSelector);
            $panelContainer.children().removeClass('active').hide();

            // 🔥 Видалити клас з body
            $('body').removeClass('bte-panel-active');

            console.log('🙈 All panels hidden');
        },

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

            alert(message);
        },

        getActiveId: function () {
            var activeItem = this.options.items.find(function(item) {
                return item.active === true;
            });

            return activeItem ? activeItem.id : null;
        },

        getActiveItem: function () {
            return this.options.items.find(function(item) {
                return item.active === true;
            }) || null;
        },

        /**
         * 🔥 NEW: Перевірити чи є активний таб
         */
        hasActive: function () {
            return this.getActiveId() !== null;
        },

        setItemEnabled: function (itemId, enabled) {
            var $item = this.$items.filter('[data-id="' + itemId + '"]');

            if (enabled) {
                $item.removeClass('disabled').prop('disabled', false);
            } else {
                $item.addClass('disabled').prop('disabled', true);
            }

            var item = this.options.items.find(function(i) {
                return i.id === itemId;
            });

            if (item) {
                item.disabled = !enabled;
            }

            console.log('🔧 Navigation item', itemId, enabled ? 'enabled' : 'disabled');
        },

        _destroy: function () {
            this.$items.off('click');
            this._super();
        }
    });

    return $.swissup.breezeNavigation;
});
