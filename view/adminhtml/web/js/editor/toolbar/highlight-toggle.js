/**
 * Highlight Toggle Button Widget
 * 
 * Toggles element highlighting in the preview iframe.
 * Phase 2: Will enable/disable clickable elements overlay.
 */
define([
    'jquery',
    'mage/template',
    'jquery-ui-modules/widget',
    'text!Swissup_BreezeThemeEditor/template/editor/highlight-toggle.html'
], function ($, mageTemplate, widget, highlightTemplate) {
    'use strict';

    $.widget('breeze.breezeHighlightToggle', {
        options: {
            enabled: false,
            iframeSelector: '#bte-iframe'
        },

        /**
         * Initialize widget
         * @private
         */
        _create: function() {
            console.log('🎨 Initializing highlight toggle');
            this._render();
            this._bindEvents();
            console.log('✅ Highlight toggle initialized');
        },

        /**
         * Render button from template
         * @private
         */
        _render: function() {
            var template = mageTemplate(highlightTemplate);
            var html = template({
                enabled: this.options.enabled
            });
            this.element.html(html);
        },

        /**
         * Bind click events
         * @private
         */
        _bindEvents: function() {
            var self = this;
            
            this.element.find('.toolbar-button').on('click', function() {
                self._toggleHighlight();
            });
        },

        /**
         * Toggle highlight mode
         * @private
         */
        _toggleHighlight: function() {
            this.options.enabled = !this.options.enabled;
            
            console.log(this.options.enabled ? '✨ Highlight enabled' : '🔴 Highlight disabled');
            
            // Update button visual state
            this.element.find('.toolbar-button').toggleClass('active', this.options.enabled);
            
            // TODO Phase 2: Enable/disable element overlay in iframe
            // $(this.options.iframeSelector).contents().find('body').toggleClass('bte-highlight-mode', this.options.enabled);
            
            // Trigger event for other components
            $(this.element).trigger('highlightToggled', [this.options.enabled]);
        }
    });

    return $.breeze.breezeHighlightToggle;
});
