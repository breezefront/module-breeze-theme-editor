/**
 * DependsEvaluator Tests
 *
 * Covers:
 *   — _evaluate() logic for EQUALS / NOT_EQUALS operators
 *   — applyInitialVisibility() adds/removes bte-field-depends-hidden
 *   — updateVisibility() toggles class on controlling-field value change
 *   — 'bte:field-visibility-changed' DOM event is fired on visibility change
 *   — cross-section: controlling field found anywhere in $element
 *   — unknown controlling field fallback behaviour
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/depends-evaluator'
], function ($, TestFramework, DependsEvaluator) {
    'use strict';

    // ── DOM helpers ──────────────────────────────────────────────────────────

    /**
     * Build a minimal panel DOM containing:
     *  - a controlling field wrapper with an <select> inside
     *  - a dependent field wrapper with data-depends-on-* attributes
     *
     * @param {Object} opts
     * @param {String} opts.controlCode      data-field of controlling field
     * @param {String} opts.controlValue     current value of controlling <select>
     * @param {String} opts.dependentCode    data-field of dependent wrapper
     * @param {String} opts.dependsOnField   data-depends-on-field value
     * @param {String} opts.dependsOnValue   data-depends-on-value value
     * @param {String} [opts.operator]       data-depends-on-op (default: EQUALS)
     * @returns {{ $panel, $control, $dependent }}
     */
    function makePanel(opts) {
        var $panel = $('<div class="bte-panel">');

        // Controlling field
        var $control = $('<div>')
            .attr('class', 'bte-field-wrapper')
            .attr('data-field', opts.controlCode);
        var $select = $('<select>').val(opts.controlValue);
        $('<option>').val(opts.controlValue).appendTo($select);
        $select.appendTo($control);
        $control.appendTo($panel);

        // Dependent field
        var operator = opts.operator || 'EQUALS';
        var $dependent = $('<div>')
            .attr('class', 'bte-field-wrapper')
            .attr('data-field', opts.dependentCode)
            .attr('data-depends-on-field', opts.dependsOnField)
            .attr('data-depends-on-value', opts.dependsOnValue)
            .attr('data-depends-on-op', operator);
        $dependent.append($('<input type="text">'));
        $dependent.appendTo($panel);

        return { $panel: $panel, $control: $control, $dependent: $dependent };
    }

    // ── Suite ────────────────────────────────────────────────────────────────

    return TestFramework.suite('DependsEvaluator', {

        // ─── applyInitialVisibility — EQUALS ─────────────────────────────────

        'applyInitialVisibility: hides dependent field when EQUALS condition is false': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'system',        // does NOT equal 'custom'
                dependentCode: 'custom_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'EQUALS'
            });

            DependsEvaluator.applyInitialVisibility(dom.$panel);

            this.assertTrue(
                dom.$dependent.hasClass('bte-field-depends-hidden'),
                'Dependent field must have bte-field-depends-hidden when condition is false'
            );
        },

        'applyInitialVisibility: shows dependent field when EQUALS condition is true': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'custom',        // equals 'custom' ✓
                dependentCode: 'custom_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'EQUALS'
            });

            DependsEvaluator.applyInitialVisibility(dom.$panel);

            this.assertFalse(
                dom.$dependent.hasClass('bte-field-depends-hidden'),
                'Dependent field must NOT have bte-field-depends-hidden when condition is true'
            );
        },

        // ─── applyInitialVisibility — NOT_EQUALS ─────────────────────────────

        'applyInitialVisibility: shows dependent field when NOT_EQUALS condition is true': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'system',        // !== 'custom' → show
                dependentCode: 'system_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'NOT_EQUALS'
            });

            DependsEvaluator.applyInitialVisibility(dom.$panel);

            this.assertFalse(
                dom.$dependent.hasClass('bte-field-depends-hidden'),
                'Dependent field must be visible when NOT_EQUALS condition is true'
            );
        },

        'applyInitialVisibility: hides dependent field when NOT_EQUALS condition is false': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'custom',        // === 'custom' → NOT_EQUALS is false → hide
                dependentCode: 'system_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'NOT_EQUALS'
            });

            DependsEvaluator.applyInitialVisibility(dom.$panel);

            this.assertTrue(
                dom.$dependent.hasClass('bte-field-depends-hidden'),
                'Dependent field must be hidden when NOT_EQUALS condition is false'
            );
        },

        // ─── updateVisibility ─────────────────────────────────────────────────

        'updateVisibility: removes hidden class when new value satisfies EQUALS': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'system',
                dependentCode: 'custom_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'EQUALS'
            });

            // Start hidden
            dom.$dependent.addClass('bte-field-depends-hidden');

            // User changes controlling field to 'custom'
            DependsEvaluator.updateVisibility(dom.$panel, 'font_source', 'custom');

            this.assertFalse(
                dom.$dependent.hasClass('bte-field-depends-hidden'),
                'Hidden class must be removed when new value satisfies condition'
            );
        },

        'updateVisibility: adds hidden class when new value breaks EQUALS': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'custom',
                dependentCode: 'custom_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'EQUALS'
            });

            // Start visible
            dom.$dependent.removeClass('bte-field-depends-hidden');

            // User changes to 'system' — condition fails → hide
            DependsEvaluator.updateVisibility(dom.$panel, 'font_source', 'system');

            this.assertTrue(
                dom.$dependent.hasClass('bte-field-depends-hidden'),
                'Hidden class must be added when new value breaks condition'
            );
        },

        // ─── bte:field-visibility-changed event ──────────────────────────────

        'updateVisibility: fires bte:field-visibility-changed with hidden=true when hiding': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'custom',
                dependentCode: 'custom_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'EQUALS'
            });

            dom.$dependent.removeClass('bte-field-depends-hidden'); // start visible

            var captured = null;
            $(document).one('bte:field-visibility-changed', function (e, data) {
                captured = data;
            });

            DependsEvaluator.updateVisibility(dom.$panel, 'font_source', 'system');

            this.assertNotNull(captured, 'bte:field-visibility-changed event must be fired');
            this.assertEquals(captured.fieldCode, 'custom_url', 'fieldCode must match dependent field');
            this.assertEquals(captured.hidden,    true,         'hidden must be true when field is hidden');
        },

        'updateVisibility: fires bte:field-visibility-changed with hidden=false when showing': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'system',
                dependentCode: 'custom_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'EQUALS'
            });

            dom.$dependent.addClass('bte-field-depends-hidden'); // start hidden

            var captured = null;
            $(document).one('bte:field-visibility-changed', function (e, data) {
                captured = data;
            });

            DependsEvaluator.updateVisibility(dom.$panel, 'font_source', 'custom');

            this.assertNotNull(captured, 'bte:field-visibility-changed event must be fired');
            this.assertEquals(captured.hidden, false, 'hidden must be false when field becomes visible');
        },

        'updateVisibility: does NOT fire event when visibility does not change': function () {
            var dom = makePanel({
                controlCode:   'font_source',
                controlValue:  'system',
                dependentCode: 'custom_url',
                dependsOnField: 'font_source',
                dependsOnValue: 'custom',
                operator:       'EQUALS'
            });

            // Field is already hidden; condition stays false → no change
            dom.$dependent.addClass('bte-field-depends-hidden');

            var fired = false;
            $(document).one('bte:field-visibility-changed', function () {
                fired = true;
            });

            DependsEvaluator.updateVisibility(dom.$panel, 'font_source', 'system');

            this.assertFalse(fired, 'Event must NOT fire when visibility does not change');
        },

        // ─── Cross-section: controlling field in different wrapper ────────────

        'applyInitialVisibility: works when controlling field is in a different section wrapper': function () {
            // Both wrappers are inside $panel but in different "section" divs
            var $panel = $('<div class="bte-panel">');

            var $sectionA = $('<div class="bte-accordion-content" data-section="fonts">');
            var $controlWrapper = $('<div class="bte-field-wrapper" data-field="font_source">');
            var $select = $('<select>').val('system');
            $('<option>').val('system').appendTo($select);
            $controlWrapper.append($select).appendTo($sectionA);
            $sectionA.appendTo($panel);

            var $sectionB = $('<div class="bte-accordion-content" data-section="advanced">');
            var $dependentWrapper = $('<div class="bte-field-wrapper">')
                .attr('data-field',          'custom_url')
                .attr('data-depends-on-field', 'font_source')
                .attr('data-depends-on-value', 'custom')
                .attr('data-depends-on-op',    'EQUALS');
            $dependentWrapper.append($('<input type="text">')).appendTo($sectionB);
            $sectionB.appendTo($panel);

            DependsEvaluator.applyInitialVisibility($panel);

            this.assertTrue(
                $dependentWrapper.hasClass('bte-field-depends-hidden'),
                'Cross-section dependsOn must work: field "font_source" is in section A, ' +
                'dependent "custom_url" in section B'
            );
        },

        // ─── Fallback: unknown controlling field ──────────────────────────────

        'applyInitialVisibility: hides EQUALS field when controlling field is missing': function () {
            var $panel = $('<div class="bte-panel">');
            // No controlling field added to DOM
            var $dependent = $('<div class="bte-field-wrapper">')
                .attr('data-field',          'custom_url')
                .attr('data-depends-on-field', 'nonexistent_field')
                .attr('data-depends-on-value', 'custom')
                .attr('data-depends-on-op',    'EQUALS');
            $dependent.appendTo($panel);

            DependsEvaluator.applyInitialVisibility($panel);

            this.assertTrue(
                $dependent.hasClass('bte-field-depends-hidden'),
                'EQUALS field must default to hidden when controlling field is not in DOM'
            );
        },

        'applyInitialVisibility: shows NOT_EQUALS field when controlling field is missing': function () {
            var $panel = $('<div class="bte-panel">');
            var $dependent = $('<div class="bte-field-wrapper">')
                .attr('data-field',          'other_url')
                .attr('data-depends-on-field', 'nonexistent_field')
                .attr('data-depends-on-value', 'custom')
                .attr('data-depends-on-op',    'NOT_EQUALS');
            $dependent.appendTo($panel);

            DependsEvaluator.applyInitialVisibility($panel);

            this.assertFalse(
                $dependent.hasClass('bte-field-depends-hidden'),
                'NOT_EQUALS field must default to visible when controlling field is not in DOM'
            );
        }

    });
});
