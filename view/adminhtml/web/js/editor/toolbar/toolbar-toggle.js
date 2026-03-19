/**
 * Toolbar Toggle Button Widget
 * 
 * Collapses/expands the toolbar completely.
 * Shows a compact floating button when toolbar is hidden.
 */
define([
    'jquery',
    'mage/template',
    'jquery-ui-modules/widget',
    'text!Swissup_BreezeThemeEditor/template/editor/toolbar-toggle.html',
    'text!Swissup_BreezeThemeEditor/template/editor/compact-toggle-button.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper'
], function ($, mageTemplate, widget, toggleTemplate, compactTemplate, Logger, StorageHelper) {
    'use strict';

    var log = Logger.for('toolbar/toolbar-toggle');

    $.widget('breeze.breezeToolbarToggle', {
        options: {
            collapsed: false,
            toolbarSelector: '.bte-toolbar',
            compactContainerSelector: '#bte-compact-toggle'
        },

        /**
         * Initialize widget
         * @private
         */
        _create: function() {
            log.info('Initializing toolbar toggle');
            this.mainButtonTemplate = mageTemplate(toggleTemplate);
            this.compactButtonTemplate = mageTemplate(compactTemplate);
            this._render();
            this._bindEvents();
            this._restoreState();
            log.info('Toolbar toggle initialized');
        },

        /**
         * Render buttons from templates
         * @private
         */
        _render: function() {
            // Render main toggle button (inside toolbar)
            var mainHtml = this.mainButtonTemplate({
                collapsed: this.options.collapsed
            });
            this.element.html(mainHtml);
            this.$mainButton = this.element.find('.toolbar-button');
            
            // Render compact toggle button (floating, initially hidden)
            var compactHtml = this.compactButtonTemplate({
                label: 'Breeze Editor'
            });
            
            // Create compact container if it doesn't exist
            if ($(this.options.compactContainerSelector).length === 0) {
                $('body').append('<div id="bte-compact-toggle"></div>');
            }
            
            $(this.options.compactContainerSelector).html(compactHtml);
            this.$compactButton = $('#bte-compact-toggle-btn');
            this.$toolbar = $(this.options.toolbarSelector);
        },

        /**
         * Bind click events
         * @private
         */
        _bindEvents: function() {
            var self = this;
            
            // Main button - hide toolbar
            this.$mainButton.on('click', function() {
                self._hideToolbar();
            });
            
            // Compact button - show toolbar
            this.$compactButton.on('click', function() {
                self._showToolbar();
            });
        },

        /**
         * Hide toolbar completely
         * @private
         */
        _hideToolbar: function() {
            log.info('Hiding toolbar');
            
            this.options.collapsed = true;
            
            // Add collapsed class to toolbar
            this.$toolbar.addClass('toolbar-collapsed');
            $('body').addClass('bte-toolbar-hidden');
            
            // Reset CSS custom property for toolbar height
            document.documentElement.style.setProperty('--breeze-toolbar-height', '0px');
            
            // Close all dropdowns
            $('.toolbar-dropdown').hide();
            $('.toolbar-select').removeClass('active');
            
            // Show compact button with animation
            this.$compactButton.fadeIn(200);
            
            // Save state to localStorage
            this._saveState(false);
            
            // Trigger event
            $(this.element).trigger('toolbarHidden');
            
            log.info('Toolbar hidden, compact button shown');
        },

        /**
         * Show toolbar
         * @private
         */
        _showToolbar: function() {
            log.info('Showing toolbar');
            
            this.options.collapsed = false;
            
            // Remove collapsed class
            this.$toolbar.removeClass('toolbar-collapsed');
            $('body').removeClass('bte-toolbar-hidden');
            
            // Restore CSS custom property for toolbar height
            var toolbarHeight = this.$toolbar.outerHeight();
            document.documentElement.style.setProperty('--breeze-toolbar-height', toolbarHeight + 'px');
            
            // Hide compact button with animation
            this.$compactButton.fadeOut(200);
            
            // Save state to localStorage
            this._saveState(true);
            
            // Trigger event
            $(this.element).trigger('toolbarShown');
            
            log.info('Toolbar shown, compact button hidden');
        },

        /**
         * Save visibility state to localStorage
         * @private
         */
        _saveState: function(isVisible) {
            StorageHelper.setGlobalItem('admin_toolbar_visible', isVisible ? '1' : '0');
        },

        /**
         * Restore visibility state from localStorage
         * @private
         */
        _restoreState: function() {
            var state = StorageHelper.getGlobalItem('admin_toolbar_visible');
            if (state === '0') {
                // Restore collapsed state after a short delay
                setTimeout($.proxy(this._hideToolbar, this), 100);
            }
        }
    });

    return $.breeze.breezeToolbarToggle;
});
