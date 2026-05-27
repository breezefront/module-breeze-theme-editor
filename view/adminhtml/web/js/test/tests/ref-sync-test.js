/**
 * RefSync — live two-way synchronization between ref fields
 *
 * Tests cover:
 *  1. Source → mirror sync (same section+field)
 *  2. Mirror → source sync (two-way)
 *  3. Fields with different fieldCode are NOT synced
 *  4. Fields with different sectionCode are NOT synced
 *  5. Already up-to-date mirrors are not re-triggered
 *  6. Anti-recursion: no infinite loop when mirror triggers input
 *  7. Missing sectionCode/fieldCode in event data — no crash
 *  8. Single input (no mirror) — nothing happens
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function ($, TestFramework) {
    'use strict';

    // ── Inline RefSync logic (mirrors production ref-sync.js) ───────────────

    var _syncing = false;

    var RefSync = {
        init: function ($container) {
            $(document).on('bte:field-changed.ref-sync-test', function (e, data) {
                if (_syncing) {
                    return;
                }
                if (!data || !data.sectionCode || !data.fieldCode) {
                    return;
                }
                RefSync._syncFields($container, data.sectionCode, data.fieldCode, data.value);
            });
        },

        destroy: function () {
            $(document).off('bte:field-changed.ref-sync-test');
        },

        _syncFields: function ($container, sectionCode, fieldCode, value) {
            var $mirrors = $container.find('[data-field="' + fieldCode + '"]').filter(function () {
                var $el       = $(this);
                var elSection = $el.data('original-section') || $el.data('section');
                return elSection === sectionCode;
            });

            if ($mirrors.length <= 1) {
                return;
            }

            var numericValue = parseFloat(value);
            var rawValue     = !isNaN(numericValue) ? String(numericValue) : value;

            _syncing = true;
            try {
                $mirrors.each(function () {
                    var $el        = $(this);
                    var currentVal = String($el.val());
                    if (currentVal === rawValue || currentVal === String(value)) {
                        return;
                    }
                    $el.val(rawValue).trigger('input');
                });
            } finally {
                _syncing = false;
            }
        }
    };

    // ── DOM factory ──────────────────────────────────────────────────────────

    /**
     * Build a panel with given input descriptors.
     *
     * @param  {Array<{field, section, originalSection}>} inputs
     * @return {jQuery}
     */
    function makePanel(inputs) {
        var $panel = $('<div class="bte-settings-panel"></div>');

        inputs.forEach(function (cfg) {
            var $input = $('<input type="text">')
                .attr('data-field', cfg.field)
                .attr('data-section', cfg.section);

            if (cfg.originalSection) {
                $input.attr('data-original-section', cfg.originalSection);
            }

            if (cfg.value !== undefined) {
                $input.val(cfg.value);
            }

            $panel.append($input);
        });

        return $panel;
    }

    /**
     * Fire bte:field-changed and return immediately.
     */
    function fireFieldChanged(sectionCode, fieldCode, value) {
        $(document).trigger('bte:field-changed', [{
            sectionCode: sectionCode,
            fieldCode:   fieldCode,
            value:       value
        }]);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    function setup() {
        _syncing = false;
        RefSync.destroy();
    }

    return TestFramework.suite('RefSync — two-way field synchronization', function (t) {

        // ------------------------------------------------------------------
        // 1. Source → mirror sync (same section + field)
        // ------------------------------------------------------------------
        t.test('source change syncs value to mirror input', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography', value: '16' },
                { field: 'font_size', section: 'typography', originalSection: 'typography', value: '16' }
            ]);

            RefSync.init($panel);

            var $inputs = $panel.find('[data-field="font_size"]');
            var $source = $inputs.eq(0);
            var $mirror = $inputs.eq(1);

            $source.val('20');
            fireFieldChanged('typography', 'font_size', '20');

            t.assertEqual($mirror.val(), '20', 'mirror value updated to 20');
        });

        // ------------------------------------------------------------------
        // 2. Two-way: mirror → source
        // ------------------------------------------------------------------
        t.test('mirror change syncs value back to source input', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography', value: '16' },
                { field: 'font_size', section: 'typography', originalSection: 'typography', value: '16' }
            ]);

            RefSync.init($panel);

            var $inputs = $panel.find('[data-field="font_size"]');
            var $source = $inputs.eq(0);
            var $mirror = $inputs.eq(1);

            $mirror.val('24');
            fireFieldChanged('typography', 'font_size', '24');

            t.assertEqual($source.val(), '24', 'source value updated to 24');
        });

        // ------------------------------------------------------------------
        // 3. Different fieldCode — not synced
        // ------------------------------------------------------------------
        t.test('inputs with different fieldCode are not synced', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size',   section: 'typography', value: '16' },
                { field: 'line_height', section: 'typography', value: '1.5' }
            ]);

            RefSync.init($panel);

            var $lineHeight = $panel.find('[data-field="line_height"]');

            fireFieldChanged('typography', 'font_size', '20');

            t.assertEqual($lineHeight.val(), '1.5', 'line_height not touched');
        });

        // ------------------------------------------------------------------
        // 4. Different sectionCode — not synced
        // ------------------------------------------------------------------
        t.test('inputs with same fieldCode but different section are not synced', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography', value: '16' },
                { field: 'font_size', section: 'buttons',    value: '14' }
            ]);

            RefSync.init($panel);

            var $buttonsInput = $panel.find('[data-section="buttons"]');

            fireFieldChanged('typography', 'font_size', '20');

            t.assertEqual($buttonsInput.val(), '14', 'buttons font_size not touched');
        });

        // ------------------------------------------------------------------
        // 5. Already up-to-date mirror — input event not re-triggered
        // ------------------------------------------------------------------
        t.test('mirror with same value does not trigger input event', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography', value: '20' },
                { field: 'font_size', section: 'typography', value: '20' }
            ]);

            RefSync.init($panel);

            var inputCount = 0;
            $panel.find('[data-field="font_size"]').on('input', function () {
                inputCount++;
            });

            fireFieldChanged('typography', 'font_size', '20');

            t.assertEqual(inputCount, 0, 'no input events fired when value unchanged');
        });

        // ------------------------------------------------------------------
        // 6. Anti-recursion: no infinite loop
        // ------------------------------------------------------------------
        t.test('sync does not recurse infinitely', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography', value: '16' },
                { field: 'font_size', section: 'typography', value: '16' }
            ]);

            RefSync.init($panel);

            var callCount = 0;
            $panel.find('[data-field="font_size"]').on('input', function () {
                callCount++;
                // Simulate what a real handler would do — fire bte:field-changed again
                fireFieldChanged('typography', 'font_size', '20');
            });

            fireFieldChanged('typography', 'font_size', '20');

            // Both inputs get one input event each (2 total), but no infinite loop.
            // Without anti-recursion this would loop endlessly.
            t.assertTrue(callCount === 2, 'input event fired exactly once per input, got: ' + callCount);
        });

        // ------------------------------------------------------------------
        // 7. Missing data in event — no crash
        // ------------------------------------------------------------------
        t.test('missing sectionCode in event data does not throw', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography', value: '16' }
            ]);

            RefSync.init($panel);

            var threw = false;
            try {
                $(document).trigger('bte:field-changed', [{ fieldCode: 'font_size', value: '20' }]);
                $(document).trigger('bte:field-changed', [null]);
                $(document).trigger('bte:field-changed', [{}]);
            } catch (e) {
                threw = true;
            }

            t.assertFalse(threw, 'no exception on malformed event data');
        });

        // ------------------------------------------------------------------
        // 8. Single input (no mirror) — nothing happens
        // ------------------------------------------------------------------
        t.test('single input with no mirror does not trigger any input event', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography', value: '16' }
            ]);

            RefSync.init($panel);

            var inputFired = false;
            $panel.find('[data-field="font_size"]').on('input', function () {
                inputFired = true;
            });

            fireFieldChanged('typography', 'font_size', '20');

            t.assertFalse(inputFired, 'no input event when there is no mirror');
        });

        // ------------------------------------------------------------------
        // 9. originalSection used for section matching
        // ------------------------------------------------------------------
        t.test('originalSection attribute is used for section matching', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography',          value: '16' },
                { field: 'font_size', section: 'mobile', originalSection: 'typography', value: '16' }
            ]);

            RefSync.init($panel);

            var $mobileInput = $panel.find('[data-section="mobile"]');

            fireFieldChanged('typography', 'font_size', '22');

            t.assertEqual($mobileInput.val(), '22', 'mirror matched via originalSection');
        });

        // ------------------------------------------------------------------
        // 10. Value with unit (e.g. "18px") — raw numeric synced to mirror
        // ------------------------------------------------------------------
        t.test('value with unit is stripped before setting on mirror input', function () {
            setup();
            var $panel = makePanel([
                { field: 'font_size', section: 'typography', value: '16' },
                { field: 'font_size', section: 'typography', value: '16' }
            ]);

            RefSync.init($panel);

            var $inputs = $panel.find('[data-field="font_size"]');
            var $mirror = $inputs.eq(1);

            // RangeHandler sends value with unit e.g. "18px"
            fireFieldChanged('typography', 'font_size', '18px');

            t.assertEqual('18', $mirror.val(), 'mirror receives raw numeric value without unit');
        });

    });
});
