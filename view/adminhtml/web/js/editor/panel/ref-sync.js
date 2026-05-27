/**
 * Ref Sync — live two-way synchronization between ref fields
 *
 * When a field changes, finds all other inputs in the panel that share the
 * same section + field key (i.e. ref fields pointing to the same DB record)
 * and updates their value + triggers `input` so existing handlers fire
 * (CSS preview, PanelState, badges).
 *
 * Anti-recursion: a module-level flag `_syncing` prevents the triggered
 * `input` event on the mirror field from looping back.
 *
 * @module Swissup_BreezeThemeEditor/js/editor/panel/ref-sync
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, Logger) {
    'use strict';

    var log      = Logger.for('panel/ref-sync');
    var _syncing = false;

    var RefSync = {
        /**
         * Bind the bte:field-changed listener for the given panel container.
         *
         * @param {jQuery} $container - The settings editor root element
         */
        init: function ($container) {
            $(document).on('bte:field-changed', function (e, data) {
                if (_syncing) {
                    return;
                }

                if (!data || !data.sectionCode || !data.fieldCode) {
                    return;
                }

                RefSync._syncFields($container, data.sectionCode, data.fieldCode, data.value);
            });

            log.info('RefSync initialized');
        },

        /**
         * Find all inputs in $container that share the same section+field and
         * update their value, triggering `input` so handlers run normally.
         *
         * @param {jQuery} $container
         * @param {string} sectionCode
         * @param {string} fieldCode
         * @param {string} value
         */
        _syncFields: function ($container, sectionCode, fieldCode, value) {
            var $mirrors = $container.find('[data-field="' + fieldCode + '"]').filter(function () {
                var $el       = $(this);
                var elSection = $el.data('original-section') || $el.data('section');
                return elSection === sectionCode;
            });

            if ($mirrors.length <= 1) {
                return; // nothing to sync
            }

            log.debug('RefSync: syncing ' + $mirrors.length + ' inputs for ' + sectionCode + '.' + fieldCode + ' = ' + value);

            // Strip units for inputs that store raw numeric values (e.g. range sliders)
            var numericValue = parseFloat(value);
            var rawValue     = !isNaN(numericValue) ? String(numericValue) : value;

            _syncing = true;

            try {
                $mirrors.each(function () {
                    var $el        = $(this);
                    var currentVal = String($el.val());

                    if (currentVal === rawValue || currentVal === String(value)) {
                        return; // already up to date
                    }

                    $el.val(rawValue).trigger('input');
                });
            } finally {
                _syncing = false;
            }
        }
    };

    return RefSync;
});
