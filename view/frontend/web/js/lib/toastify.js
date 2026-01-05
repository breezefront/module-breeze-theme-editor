/**
 * Lightweight Toast Notification Library
 *
 * Usage:
 *   Toastify.show('success', 'Operation completed! ');
 *   Toastify.show('error', 'Something went wrong!');
 *   Toastify.show('notice', 'Please note...');
 *   Toastify.show('warning', 'Be careful!');
 */
define([
    'jquery'
], function ($) {
    'use strict';

    var Toastify = {
        /**
         * Default options
         */
        defaults: {
            duration:  3000,        // Auto-hide after 3 seconds
            position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
            closeButton: true,     // Show close button
            pauseOnHover: true,    // Pause auto-hide on hover
            icons: {
                success:  '✅',
                error:  '❌',
                notice:  'ℹ️',
                warning: '⚠️'
            }
        },

        /**
         * Container for toasts
         */
        $container: null,

        /**
         * Active toasts counter
         */
        activeToasts: 0,

        /**
         * Initialize toast container
         */
        _initContainer: function() {
            if (this.$container) {
                return;
            }

            this.$container = $('<div>').addClass('toastify-container');
            $('body').append(this.$container);
        },

        /**
         * Show toast notification
         *
         * @param {String} type - success, error, notice, warning
         * @param {String} message
         * @param {Object} options - Override defaults
         * @returns {jQuery} Toast element
         */
        show: function(type, message, options) {
            this._initContainer();

            options = $.extend({}, this.defaults, options || {});

            var self = this;
            var toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            // Create toast element
            var $toast = $('<div>')
                .addClass('toastify-toast toastify-' + type)
                .attr('id', toastId)
                .attr('data-type', type);

            // Add icon
            if (options.icons[type]) {
                $toast.append(
                    $('<span>').addClass('toastify-icon').html(options.icons[type])
                );
            }

            // Add message
            $toast.append(
                $('<div>').addClass('toastify-message').html(message)
            );

            // Add close button
            if (options.closeButton) {
                var $close = $('<button>')
                    .addClass('toastify-close')
                    .attr('type', 'button')
                    .attr('aria-label', 'Close')
                    .html('×');

                $close.on('click', function(e) {
                    e.preventDefault();
                    self.hide($toast);
                });

                $toast.append($close);
            }

            // Add to container
            this.$container.append($toast);
            this.activeToasts++;

            // Trigger show animation
            setTimeout(function() {
                $toast.addClass('toastify-show');
            }, 10);

            // Auto-hide timer
            var hideTimer = null;

            var startHideTimer = function() {
                if (options.duration > 0) {
                    hideTimer = setTimeout(function() {
                        self.hide($toast);
                    }, options.duration);
                }
            };

            var stopHideTimer = function() {
                if (hideTimer) {
                    clearTimeout(hideTimer);
                    hideTimer = null;
                }
            };

            // Pause on hover
            if (options.pauseOnHover) {
                $toast.on('mouseenter', stopHideTimer);
                $toast.on('mouseleave', startHideTimer);
            }

            // Start timer
            startHideTimer();

            return $toast;
        },

        /**
         * Hide toast
         *
         * @param {jQuery} $toast
         */
        hide: function($toast) {
            var self = this;

            $toast.removeClass('toastify-show');

            setTimeout(function() {
                $toast.remove();
                self.activeToasts--;

                // Remove container if no active toasts
                if (self.activeToasts === 0 && self.$container) {
                    self.$container.remove();
                    self.$container = null;
                }
            }, 300);
        },

        /**
         * Hide all toasts
         */
        hideAll: function() {
            var self = this;

            if (this.$container) {
                this.$container.find('.toastify-toast').each(function() {
                    self.hide($(this));
                });
            }
        },

        /**
         * Shortcut methods
         */
        success: function(message, options) {
            return this.show('success', message, options);
        },

        error: function(message, options) {
            return this.show('error', message, options);
        },

        notice: function(message, options) {
            return this.show('notice', message, options);
        },

        warning: function(message, options) {
            return this.show('warning', message, options);
        }
    };

    return Toastify;
});
