define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($) {
    'use strict';

    $.widget('swissup.breezeHighlightToggle', {
        options: {
            activeClass: 'active',
            highlightClass: 'breeze-editor-highlight-mode'
        },

        _create: function () {
            this.isActive = false;
            this._bind();
        },

        _bind: function () {
            this.element.on('click', $.proxy(this._toggle, this));
        },

        _toggle: function () {
            this.isActive = !this.isActive;

            if (this.isActive) {
                $('body').addClass(this.options.highlightClass);
                this.element.addClass(this.options.activeClass);
            } else {
                $('body').removeClass(this.options.highlightClass);
                this.element.removeClass(this.options.activeClass);
            }

            this.element.trigger('highlightToggled', [this.isActive]);
        }
    });

    return $.swissup.breezeHighlightToggle;
});
