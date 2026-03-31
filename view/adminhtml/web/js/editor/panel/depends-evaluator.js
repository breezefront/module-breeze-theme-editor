/**
 * Depends Evaluator
 *
 * Evaluates `dependsOn` conditions and controls field visibility via
 * the `bte-field-depends-hidden` CSS class.
 *
 * Event contract (all on `$(document)`):
 *
 *   Listens:
 *     'bte:sections-rendered'  { element }  — apply initial visibility after render
 *     'bte:field-changed'      { element, fieldCode, value } — re-evaluate on change
 *
 *   Publishes:
 *     'bte:field-visibility-changed'  { fieldCode, hidden } — consumed by panel-state.js
 *
 * Supports operators: EQUALS, NOT_EQUALS (1-level only, no chaining).
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, Logger) {
    'use strict';

    var log = Logger.for('panel/depends-evaluator');

    // ── Private helpers ─────────────────────────────────────────────────────

    /**
     * Evaluate a single dependsOn condition.
     *
     * @param {String} operator     'EQUALS' | 'NOT_EQUALS'
     * @param {String} controlValue Current value of the controlling field
     * @param {String} targetValue  Value defined in dependsOn
     * @returns {Boolean} true = show the dependent field
     */
    function _evaluate(operator, controlValue, targetValue) {
        switch (operator) {
            case 'NOT_EQUALS': return String(controlValue) !== String(targetValue);
            case 'EQUALS':
            default:           return String(controlValue) === String(targetValue);
        }
    }

    /**
     * Resolve the current value of a controlling field from the DOM.
     * Looks for the first input/select/textarea inside the field wrapper,
     * or the wrapper element itself if it carries a value attribute.
     *
     * @param {String} fieldCode
     * @param {jQuery} $element  Panel root element
     * @returns {String|null}  null when the field is not found
     */
    function _resolveControlValue(fieldCode, $element) {
        var $wrapper = $element.find('[data-field="' + fieldCode + '"]').first();

        if (!$wrapper.length) {
            return null;
        }

        // Prefer the actual input/select/textarea inside the wrapper
        var $input = $wrapper.find('input, select, textarea').first();

        if ($input.length) {
            if ($input.is(':checkbox')) {
                return $input.prop('checked') ? '1' : '0';
            }
            return String($input.val() !== undefined ? $input.val() : '');
        }

        // Fallback: wrapper itself may carry data-value (e.g. toggle widgets)
        var dataVal = $wrapper.attr('data-value');
        if (dataVal !== undefined) {
            return String(dataVal);
        }

        return null;
    }

    /**
     * Apply or remove the hidden class on a single wrapper and fire the
     * visibility-changed event so panel-state.js can update hiddenFields.
     *
     * @param {jQuery} $wrapper
     * @param {Boolean} show
     */
    function _applyVisibility($wrapper, show) {
        var fieldCode   = $wrapper.attr('data-field');
        var wasHidden   = $wrapper.hasClass('bte-field-depends-hidden');
        var willBeHidden = !show;

        $wrapper.toggleClass('bte-field-depends-hidden', willBeHidden);

        if (wasHidden !== willBeHidden) {
            log.debug(
                'Field "' + fieldCode + '" visibility changed → ' +
                (willBeHidden ? 'hidden' : 'visible')
            );
            $(document).trigger('bte:field-visibility-changed', [{
                fieldCode: fieldCode,
                hidden:    willBeHidden
            }]);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    var DependsEvaluator = {

        /**
         * Apply initial visibility to all depends-aware fields after render.
         * Called via the 'bte:sections-rendered' event.
         *
         * @param {jQuery} $element  Panel root element
         */
        applyInitialVisibility: function ($element) {
            var self = this;

            $element.find('[data-depends-on-field]').each(function () {
                var $wrapper    = $(this);
                var fieldCode   = $wrapper.attr('data-depends-on-field');
                var targetValue = $wrapper.attr('data-depends-on-value');
                var operator    = $wrapper.attr('data-depends-on-op') || 'EQUALS';

                var controlValue = _resolveControlValue(fieldCode, $element);

                var show;

                if (controlValue !== null) {
                    show = _evaluate(operator, controlValue, targetValue);
                } else {
                    // Controlling field not found: default — show for NOT_EQUALS, hide for EQUALS
                    show = operator === 'NOT_EQUALS';
                    log.warn(
                        'Controlling field "' + fieldCode + '" not found; ' +
                        'defaulting dependent field to ' + (show ? 'visible' : 'hidden')
                    );
                }

                _applyVisibility($wrapper, show);
            });
        },

        /**
         * Re-evaluate visibility for all fields that depend on changedFieldCode.
         * Called via the 'bte:field-changed' event.
         *
         * @param {jQuery} $element         Panel root element
         * @param {String} changedFieldCode The field whose value just changed
         * @param {String} newValue         The new value
         */
        updateVisibility: function ($element, changedFieldCode, newValue) {
            $element
                .find('[data-depends-on-field="' + changedFieldCode + '"]')
                .each(function () {
                    var $wrapper    = $(this);
                    var targetValue = $wrapper.attr('data-depends-on-value');
                    var operator    = $wrapper.attr('data-depends-on-op') || 'EQUALS';
                    var show        = _evaluate(operator, newValue, targetValue);

                    _applyVisibility($wrapper, show);
                });
        }
    };

    // ── DOM-event wiring (self-initialising) ────────────────────────────────

    $(document).on('bte:sections-rendered', function (e, data) {
        if (data && data.element) {
            DependsEvaluator.applyInitialVisibility(data.element);
        }
    });

    $(document).on('bte:field-changed', function (e, data) {
        if (data && data.element) {
            DependsEvaluator.updateVisibility(data.element, data.fieldCode, data.value);
        }
    });

    return DependsEvaluator;
});
