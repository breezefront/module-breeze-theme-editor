define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($, widget) {
    'use strict';

    /**
     * Base Section Renderer
     *
     * Provides common editability handling for palette/font-palette section widgets.
     *
     * Listens to the 'bte:editabilityChanged' document event (fired by
     * settings-editor._updateFieldsEditability) and toggles the .bte-field-disabled
     * class + disabled prop on this.$content and its inputs.
     *
     * Child widgets must:
     *   1. Extend this base:  $.widget('swissup.myWidget', $.swissup.baseSectionRenderer, {...})
     *   2. Call this._super() as the first line of _create()
     *   3. Set this.$content before the event fires (i.e. in _render(), called from _create())
     *   4. Call this._super() inside their own _destroy()
     */
    $.widget('swissup.baseSectionRenderer', {

        _create: function () {
            this._bindEditability();
        },

        /**
         * Subscribe to bte:editabilityChanged using the widget name as namespace
         * so each widget instance can be cleaned up independently.
         */
        _bindEditability: function () {
            var self = this;

            $(document).on('bte:editabilityChanged.' + this.widgetName, function (e, data) {
                self._setEditable(data.isEditable);
            });
        },

        /**
         * Toggle disabled state on the section content area.
         * Override in child widget for custom behaviour.
         *
         * @param {Boolean} isEditable
         */
        _setEditable: function (isEditable) {
            if (!this.$content) {
                return;
            }

            this.$content.toggleClass('bte-field-disabled', !isEditable);
            this.$content.find('input, button, select').prop('disabled', !isEditable);
        },

        /**
         * Clean up event listener on destroy.
         * Child _destroy() must call this._super().
         */
        _destroy: function () {
            $(document).off('bte:editabilityChanged.' + this.widgetName);
            this._super();
        }
    });

    return $.swissup.baseSectionRenderer;
});
