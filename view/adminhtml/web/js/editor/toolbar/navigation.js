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
    'text!Swissup_BreezeThemeEditor/template/editor/navigation.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/panel/icon-registry'
], function ($, widget, mageTemplate, navigationTemplate, Logger, iconRegistry) {
    'use strict';

    var log = Logger.for('toolbar/navigation');

    $.widget('swissup.breezeNavigation', {
        options: {
            items: [],
            panelSelector: null,
            panelWidgets: {} // Config for lazy-loaded panel widgets
        },

        /**
         * Initialize widget
         */
        _create: function () {
            log.info('Initializing Navigation with ' + this.options.items.length + ' items');

            this.template = mageTemplate(navigationTemplate);
            this._render();
            this._bind();
        },

        /**
         * Render navigation buttons from template
         */
        _render: function () {
            var items = this.options.items.map(function (item) {
                return $.extend({}, item, {
                    iconHtml: iconRegistry.render(item.icon)
                });
            });

            var html = this.template({
                data: {
                    items: items
                }
            });

            this.element.html(html);
            this.$items = this.element.find('.nav-item');

            log.info('Navigation rendered');
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
                log.warn('Navigation item is disabled: ' + itemId);
                this._showDisabledMessage(itemId);
                return;
            }

            // Toggle: Якщо вже активний → деактивувати
            if ($item.hasClass('active')) {
                log.info('Toggling off active navigation: ' + itemId);
                this.deactivate(itemId);
                return;
            }

            // Активувати новий таб
            log.info('Switching navigation to: ' + itemId);
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
                log.error('Navigation item not found: ' + itemId);
                return;
            }

            if (item.disabled) {
                log.warn('Cannot activate disabled item: ' + itemId);
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

            log.info('Navigation activated: ' + itemId);

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

            log.info('Navigation deactivated: ' + itemId);

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

            // Initialize panel widget on first open (lazy loading)
            this._initializePanel(itemId);

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
                
                log.info('Panel shown: ' + panelId);

                // Додати клас до body для зсуву контенту
                $('body').addClass('bte-panel-active');

                this.element.trigger('panelShown', [{
                    panelId: panelId,
                    itemId: itemId
                }]);
            } else {
                log.warn('Panel not found: ' + panelId);
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
                log.info('Panel hidden: ' + panelId);

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

            log.info('All panels hidden');
        },

        /**
         * Initialize panel widget on first open (lazy loading).
         *
         * When panelConfig.require is set (an AMD module path), the module is
         * loaded first via require() to guarantee the jQuery widget is
         * registered on $.fn before we call it.  This eliminates the race
         * condition where toolbar.js auto-activates a panel before an async
         * <script> require() has finished loading the widget module.
         *
         * @param {String} itemId - Navigation item ID (e.g., 'theme-editor')
         */
        _initializePanel: function(itemId) {
            var panelConfig = this.options.panelWidgets[itemId];

            if (!panelConfig) {
                log.warn('No panel widget config for: ' + itemId);
                return;
            }

            var $panel = $(panelConfig.selector);

            if (!$panel.length) {
                log.error('Panel element not found: ' + panelConfig.selector);
                return;
            }

            // Check if already initialized
            if ($panel.data('panel-initialized')) {
                log.info('Panel already initialized: ' + itemId);
                return;
            }

            // If the widget is not yet on $.fn and we know which module provides it,
            // load that module first, then initialize.
            if (panelConfig.require && typeof $panel[panelConfig.widget] !== 'function') {
                var modulePath = panelConfig.require;
                log.info('Loading module for panel: ' + itemId + ' -> ' + modulePath);

                require([modulePath], function () {
                    if ($panel.data('panel-initialized')) {
                        return; // initialized while we were loading
                    }

                    try {
                        $panel[panelConfig.widget](panelConfig.config);
                        $panel.data('panel-initialized', true);
                        log.info('Panel initialized (async): ' + itemId + ' -> ' + panelConfig.widget);
                    } catch (e) {
                        log.error('Failed to initialize panel: ' + itemId + ' ' + e);
                    }
                });

                return;
            }

            try {
                // Initialize widget (synchronous — already loaded)
                $panel[panelConfig.widget](panelConfig.config);
                $panel.data('panel-initialized', true);

                log.info('Panel initialized: ' + itemId + ' -> ' + panelConfig.widget);
            } catch (e) {
                log.error('Failed to initialize panel: ' + itemId + ' ' + e);
            }
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

            log.info('Disabled item clicked: ' + itemId + ' -> ' + message);
        }
    });

    return $.swissup.breezeNavigation;
});
