/**
 * Loading State Utility for Breeze Theme Editor
 * 
 * Manages loading indicators and disabled states during async operations.
 * Provides consistent loading UX across all components.
 * 
 * @module Swissup_BreezeThemeEditor/js/editor/utils/ui/loading
 */
define(['jquery', 'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'], function($, Logger) {
    'use strict';
    
    var log = Logger.for('utils/ui/loading');
    
    return {
        /**
         * Show loading spinner on element
         * 
         * Adds loading class, disables interactive elements, and displays spinner.
         * 
         * @param {string|jQuery} element - Element selector or jQuery object
         */
        show: function(element) {
            var $el = $(element);
            
            if (!$el.length) {
                log.warn('[Loading] Element not found: ' + element);
                return;
            }
            
            // Add loading class for CSS styling
            $el.addClass('bte-loading');
            
            // Disable all interactive elements and mark them for later re-enabling
            var $interactive = $el.find('button, input, select, textarea, a');
            $interactive.attr('data-bte-disabled', '1').prop('disabled', true);
            
            // Add spinner if not already present
            if (!$el.find('.bte-spinner').length) {
                $el.append('<div class="bte-spinner"><span>Loading</span></div>');
            }
        },
        
        /**
         * Hide loading spinner from element
         * 
         * Removes loading class, re-enables interactive elements, and removes spinner.
         * 
         * @param {string|jQuery} element - Element selector or jQuery object
         */
        hide: function(element) {
            var $el = $(element);
            
            if (!$el.length) {
                log.warn('[Loading] Element not found: ' + element);
                return;
            }
            
            // Remove loading class
            $el.removeClass('bte-loading');
            
            // Re-enable interactive elements that were disabled by show()
            var $interactive = $el.find('[data-bte-disabled]');
            $interactive.removeAttr('data-bte-disabled').prop('disabled', false);
            
            // Remove spinner
            $el.find('.bte-spinner').remove();
        },
        
        /**
         * Toggle loading state
         * 
         * @param {string|jQuery} element - Element selector or jQuery object
         * @param {boolean} show - True to show loading, false to hide
         */
        toggle: function(element, show) {
            if (show) {
                this.show(element);
            } else {
                this.hide(element);
            }
        },
        
        /**
         * Check if element is in loading state
         * 
         * @param {string|jQuery} element - Element selector or jQuery object
         * @returns {boolean} True if element is loading
         */
        isLoading: function(element) {
            var $el = $(element);
            return $el.hasClass('bte-loading');
        }
    };
});
