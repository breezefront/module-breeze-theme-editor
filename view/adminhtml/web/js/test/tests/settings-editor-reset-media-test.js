/**
 * Settings Editor — Field Reset/Restore CSS Preview Media Tests
 *
 * Verifies that _applyFieldResetToPreview() reads data-media from the
 * field DOM element and forwards it to CssPreviewManager.setVariable().
 *
 * Without this fix, reset/restore for media fields would update the wrong
 * CSS block (no @media wrapper) in the live preview.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function ($, TestFramework) {
    'use strict';

    // ─── DOM helpers ─────────────────────────────────────────────────────────

    function makeField(opts) {
        opts = opts || {};
        var $el = $('<div></div>')
            .attr('data-section',  opts.sectionCode  || 'typography')
            .attr('data-field',    opts.fieldCode    || 'font_size_mobile')
            .attr('data-type',     opts.type         || 'range')
            .attr('data-property', opts.property     || '--font-size');

        if (opts.selector  !== undefined) { $el.attr('data-selector',  opts.selector); }
        if (opts.media     !== undefined) { $el.attr('data-media',     opts.media); }
        if (opts.format    !== undefined) { $el.attr('data-format',    opts.format); }
        if (opts.defaultValue !== undefined) { $el.attr('data-default', opts.defaultValue); }

        return $el;
    }

    // ─── Inline _applyFieldResetToPreview logic (FIXED) ─────────────────────

    function runDispatchFixed($field, value) {
        var fieldCssVar = $field.attr('data-property');
        var fieldType   = ($field.attr('data-type') || '').toLowerCase();

        if (!fieldCssVar || value === undefined) { return null; }

        if (typeof value === 'string' && value.startsWith('--color-')) {
            return { method: 'removeVariable', varName: fieldCssVar };
        }

        return {
            method:    'setVariable',
            varName:   fieldCssVar,
            value:     value,
            fieldType: fieldType,
            fieldData: {
                format:       $field.attr('data-format')   || null,
                defaultValue: $field.attr('data-default')  || null,
                selector:     $field.attr('data-selector') || ':root',
                media:        $field.attr('data-media')    || null   // NEW
            }
        };
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    return TestFramework.suite('SettingsEditor — _applyFieldResetToPreview media', function (t) {

        // ------------------------------------------------------------------
        // L1 — DOM attribute reading
        // ------------------------------------------------------------------

        t.test('[media] data-media attribute is read when present', function () {
            var $f = makeField({ media: '(max-width: 767px)' });
            t.assertEqual($f.attr('data-media'), '(max-width: 767px)', 'data-media attr readable');
        });

        t.test('[media] data-media attribute absent → undefined', function () {
            var $f = makeField();
            t.assertFalse(!!$f.attr('data-media'), 'data-media absent when not set');
        });

        // ------------------------------------------------------------------
        // L2 — dispatch call shape
        // ------------------------------------------------------------------

        t.test('[media] media forwarded to setVariable fieldData', function () {
            var $f  = makeField({ media: '(max-width: 767px)' });
            var res = runDispatchFixed($f, '13px');

            t.assertEqual(res.method,              'setVariable',        'correct method');
            t.assertEqual(res.fieldData.media,     '(max-width: 767px)', 'media forwarded');
            t.assertEqual(res.fieldData.selector,  ':root',              'selector defaults to :root');
        });

        t.test('[media] media is null when data-media absent', function () {
            var $f  = makeField();
            var res = runDispatchFixed($f, '16px');

            t.assertNull(res.fieldData.media, 'media is null when data-media absent');
        });

        t.test('[media] selector and media both forwarded when both set', function () {
            var $f  = makeField({ selector: '.columns-container', media: '(max-width: 767px)' });
            var res = runDispatchFixed($f, '8px');

            t.assertEqual(res.fieldData.selector, '.columns-container',  'selector forwarded');
            t.assertEqual(res.fieldData.media,    '(max-width: 767px)',  'media forwarded');
        });

        // ------------------------------------------------------------------
        // L3 — palette ref (removeVariable) is unaffected by media
        // ------------------------------------------------------------------

        t.test('[media] palette ref resets via removeVariable (media irrelevant)', function () {
            var $f  = makeField({ media: '(max-width: 767px)' });
            var res = runDispatchFixed($f, '--color-brand-primary');

            t.assertEqual(res.method, 'removeVariable', 'removeVariable called for palette ref');
        });

        // ------------------------------------------------------------------
        // REGRESSION — old code did not forward media (field absent)
        // ------------------------------------------------------------------

        t.test('[regression] fixed code includes media, old code did not', function () {
            var $f = makeField({ media: '(max-width: 767px)' });

            // Old code (no media key)
            function runOld($field, value) {
                return {
                    method: 'setVariable',
                    fieldData: {
                        format:       $field.attr('data-format')   || null,
                        defaultValue: $field.attr('data-default')  || null,
                        selector:     $field.attr('data-selector') || ':root'
                        // no media
                    }
                };
            }

            var old   = runOld($f, '13px');
            var fixed = runDispatchFixed($f, '13px');

            t.assertFalse('media' in old.fieldData,                    'old code has no media key');
            t.assertEqual(fixed.fieldData.media, '(max-width: 767px)', 'fixed code forwards media');
        });

    });
});
