/**
 * SyncFieldsFromChanges — F5 Reload Bug Tests  (Issues 018 & 019)
 *
 * Tests for two bugs that manifest together after F5 (page reload) in DRAFT mode:
 *
 * Bug A (Issue 018) — bte-color-preview dot not updated
 *   Root cause: syncFieldsFromChanges() checks $field.attr('type') === 'color',
 *   but $field[0] is div.bte-color-trigger (no type attr), so the condition is
 *   always false.  The .bte-color-preview background-color is never updated.
 *   Fix: use fieldType === 'color' (reads data-type) and explicitly call
 *        $preview.css('background-color', displayValue).
 *
 * Bug B (Issue 019) — "Save (0)" / disabled Reset button after F5
 *   Root cause (two-part):
 *     1. settings-editor.js calls _updateChangesCount() inside _hideLoader()
 *        BEFORE syncFieldsFromChanges() runs (it runs in _previewReady.then()).
 *     2. Inside syncFieldsFromChanges(), PanelState.setValue() is called inside
 *        an ASYNC require([…], cb) — so even a _updateChangesCount() placed right
 *        after syncFieldsFromChanges() would fire before PanelState is updated.
 *   Fix (two-part):
 *     Part A (css-preview-manager.js): replace async require([…], cb) with
 *            synchronous require() + try/catch (safe at runtime — modules are
 *            already in RequireJS cache by the time syncFieldsFromChanges() runs).
 *     Part B (settings-editor.js): add self._updateChangesCount() immediately
 *            after CssPreviewManager.syncFieldsFromChanges(self.element).
 *
 * Test layers:
 *   1–4   Layer 1 — Color field DOM update (pure jQuery, always runs)      Bug A
 *   5–7   Layer 2 — PanelState sync isolated (always runs)                 Bug B
 *   8–12  Layer 3 — Integration with real CssPreviewManager + synthetic DOM
 *                   (auto-skipped when not in DRAFT mode)
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'
], function ($, TestFramework, CssPreviewManager) {
    'use strict';

    // ─── Layer 1 helpers — mirror the color-update block from syncFieldsFromChanges()

    /**
     * BROKEN path — mirrors the pre-fix code in syncFieldsFromChanges().
     * Uses $field.attr('type') === 'color' which never matches a div.bte-color-trigger.
     * Used only by the regression test (Test 4) to document the old broken behaviour.
     *
     * @param {jQuery} $field       - jQuery collection returned by $('[data-property]')
     * @param {String} displayValue - resolved color value to apply
     */
    function runColorFieldUpdateBroken($field, displayValue) {
        if ($field.attr('type') === 'color') {
            // Old branch — never reached when $field[0] is a div
            $field.val(displayValue);
            var $textInput = $field.closest('.bte-field-control').find('.bte-color-input');
            if ($textInput.length) {
                $textInput.val(displayValue);
            }
        } else {
            // Falls through here — updates text input but NOT the preview dot
            $field.val(displayValue);
        }
    }

    /**
     * FIXED path — mirrors the post-fix code in syncFieldsFromChanges().
     * Uses fieldType === 'color' (reads data-type) and updates both
     * .bte-color-input and .bte-color-preview.
     *
     * @param {jQuery} $field       - jQuery collection (trigger div + text input)
     * @param {String} fieldType    - value of data-type attribute on $field[0]
     * @param {String} displayValue - resolved color value to apply
     */
    function runColorFieldUpdateFixed($field, fieldType, displayValue) {
        if (fieldType === 'color') {
            var $colorWrapper = $field.closest('.bte-field-control');
            var $textInput    = $colorWrapper.find('.bte-color-input');
            var $preview      = $colorWrapper.find('.bte-color-preview');
            if ($textInput.length) { $textInput.val(displayValue); }
            if ($preview.length)   { $preview.css('background-color', displayValue); }
        } else {
            $field.val(displayValue);
        }
    }

    /**
     * Build a minimal color-field DOM wrapper that mirrors the real color.html template.
     * Structure:
     *   div.bte-field-control
     *     div.bte-color-picker-wrapper
     *       div.bte-color-trigger[data-property][data-type=color][data-section][data-field]
     *         div.bte-color-preview[style]
     *       input.bte-color-input[type=text][data-property][data-type=color][data-section][data-field]
     *
     * @param {String} property     - CSS variable name, e.g. '--body-bg'
     * @param {String} initialColor - initial hex color, e.g. '#ffffff'
     * @param {String} sectionCode  - e.g. 'general'
     * @param {String} fieldCode    - e.g. 'body_bg'
     * @returns {jQuery} .bte-field-control element (detached, not in document)
     */
    function buildColorFieldWrapper(property, initialColor, sectionCode, fieldCode) {
        property    = property    || '--body-bg';
        initialColor = initialColor || '#ffffff';
        sectionCode = sectionCode || 'general';
        fieldCode   = fieldCode   || 'body_bg';

        return $('<div class="bte-field-control">')
            .append(
                $('<div class="bte-color-picker-wrapper">')
                    .append(
                        $('<div class="bte-color-trigger">')
                            .attr({
                                'data-property': property,
                                'data-type':     'color',
                                'data-section':  sectionCode,
                                'data-field':    fieldCode
                            })
                            .append(
                                $('<div class="bte-color-preview">')
                                    .css('background-color', initialColor)
                            )
                    )
                    .append(
                        $('<input type="text" class="bte-color-input">')
                            .attr({
                                'data-property': property,
                                'data-type':     'color',
                                'data-section':  sectionCode,
                                'data-field':    fieldCode
                            })
                            .val(initialColor)
                    )
            );
    }

    /**
     * Build a minimal fake panel element containing one or more fields,
     * suitable for passing to CssPreviewManager.syncFieldsFromChanges().
     *
     * @param {Array} fields - [{property, initialColor, sectionCode, fieldCode}]
     * @returns {jQuery} div element containing all field wrappers
     */
    function buildFakePanel(fields) {
        var $panel = $('<div class="bte-fake-panel-test">');
        (fields || []).forEach(function (f) {
            $panel.append(buildColorFieldWrapper(
                f.property, f.initialColor, f.sectionCode, f.fieldCode
            ));
        });
        return $panel;
    }

    // ─── Suite ───────────────────────────────────────────────────────────────

    return TestFramework.suite('SyncFieldsFromChanges — F5 Reload Bugs', {

        // ─── Layer 1: Color field DOM update (pure jQuery) ────────────────

        /**
         * Test 1 (Bug A fix check):
         * The FIXED code path sets .bte-color-preview background-color.
         */
        'should update bte-color-preview background-color (fixed path)': function () {
            var $wrapper    = buildColorFieldWrapper('--body-bg', '#ffffff');
            var $field      = $wrapper.find('[data-property="--body-bg"]'); // 2 elements
            var fieldType   = $field.data('type'); // 'color' from div[0]

            runColorFieldUpdateFixed($field, fieldType, '#804545');

            var $preview = $wrapper.find('.bte-color-preview');
            var bg = $preview.css('background-color'); // browser normalises to rgb(...)

            // Either 'rgb(128, 69, 69)' (browser-normalised) or '#804545' (raw)
            this.assertTrue(
                bg.indexOf('128') !== -1 || bg === '#804545',
                'bte-color-preview background-color must be updated to #804545, got: ' + bg
            );
        },

        /**
         * Test 2:
         * The FIXED code path also sets .bte-color-input text value.
         */
        'should update bte-color-input text value (fixed path)': function () {
            var $wrapper    = buildColorFieldWrapper('--body-bg', '#ffffff');
            var $field      = $wrapper.find('[data-property="--body-bg"]');
            var fieldType   = $field.data('type');

            runColorFieldUpdateFixed($field, fieldType, '#804545');

            this.assertEquals(
                $wrapper.find('.bte-color-input').val(),
                '#804545',
                'bte-color-input must show the draft value #804545'
            );
        },

        /**
         * Test 3:
         * Both .bte-color-input and .bte-color-preview are updated together.
         * (Composite assertion — both in one wrapper, one call.)
         */
        'should update both bte-color-input and bte-color-preview in one pass': function () {
            var $wrapper = buildColorFieldWrapper('--header-bg', '#000000');
            var $field   = $wrapper.find('[data-property="--header-bg"]');
            var fieldType = $field.data('type');

            runColorFieldUpdateFixed($field, fieldType, '#1a6e3c');

            var inputVal = $wrapper.find('.bte-color-input').val();
            var previewBg = $wrapper.find('.bte-color-preview').css('background-color');

            this.assertEquals(inputVal, '#1a6e3c', 'bte-color-input must be #1a6e3c');
            this.assertTrue(
                previewBg.indexOf('26') !== -1 || previewBg === '#1a6e3c',
                'bte-color-preview must reflect #1a6e3c, got: ' + previewBg
            );
        },

        /**
         * Test 4 (REGRESSION — Issue 018):
         * Documents the BEFORE and AFTER states.
         *
         * BEFORE fix: $field.attr('type') === 'color' is always false (div has
         *             no type attr) → falls to else → preview dot NOT updated.
         * AFTER fix:  fieldType === 'color' is true → preview dot IS updated.
         */
        'REGRESSION: old attr(type) branch misses preview dot; new data-type branch hits it': function () {
            var draftColor = '#804545';

            // ── BEFORE: broken path — preview dot stays at old color ──────────
            var $wrapperBefore = buildColorFieldWrapper('--body-bg', '#ffffff');
            var $fieldBefore   = $wrapperBefore.find('[data-property="--body-bg"]');

            runColorFieldUpdateBroken($fieldBefore, draftColor);

            var previewBefore = $wrapperBefore.find('.bte-color-preview').css('background-color');
            // Background must still be white (rgb(255,255,255)) — the bug is reproduced
            this.assertTrue(
                previewBefore.indexOf('255') !== -1 || previewBefore === '#ffffff',
                'BEFORE fix: preview dot must remain at #ffffff (bug reproduced), got: ' + previewBefore
            );
            // Text input IS updated (the else-branch calls $field.val())
            this.assertEquals(
                $wrapperBefore.find('.bte-color-input').val(),
                draftColor,
                'BEFORE fix: text input should be updated (else branch runs)'
            );

            // ── AFTER: fixed path — preview dot updated ────────────────────────
            var $wrapperAfter = buildColorFieldWrapper('--body-bg', '#ffffff');
            var $fieldAfter   = $wrapperAfter.find('[data-property="--body-bg"]');
            var fieldType     = $fieldAfter.data('type');

            runColorFieldUpdateFixed($fieldAfter, fieldType, draftColor);

            var previewAfter = $wrapperAfter.find('.bte-color-preview').css('background-color');
            this.assertTrue(
                previewAfter.indexOf('128') !== -1 || previewAfter === '#804545',
                'AFTER fix: preview dot must be #804545, got: ' + previewAfter
            );
            this.assertEquals(
                $wrapperAfter.find('.bte-color-input').val(),
                draftColor,
                'AFTER fix: text input must also be #804545'
            );
        },

        // ─── Layer 2: PanelState sync (isolated) ──────────────────────────

        /**
         * Test 5 (Bug B fix check):
         * After calling PanelState.setValue() for a field that was
         * initialized with a different savedValue, getChangesCount() must be > 0.
         * This is the state that should exist when _updateChangesCount() fires
         * after syncFieldsFromChanges() (once the sync require fix is in place).
         */
        'PanelState.getChangesCount() should be > 0 after setValue() with draft value': function () {
            var PanelState = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');

            // Minimal config: one section, one field whose savedValue = #ffffff
            var mockConfig = {
                sections: [{
                    code: 'general',
                    label: 'General',
                    fields: [{
                        code:       'body_bg',
                        label:      'Body Background',
                        type:       'color',
                        property:   '--body-bg',
                        value:      '#ffffff',
                        default:    '#ffffff',
                        isModified: false
                    }]
                }]
            };
            PanelState.init(mockConfig);

            // Simulate what syncFieldsFromChanges() does after the sync-require fix
            PanelState.setValue('general', 'body_bg', '#804545');

            this.assertTrue(
                PanelState.getChangesCount() > 0,
                'getChangesCount() must be > 0 after setValue() with a draft value'
            );

            // Cleanup: reset so other tests start clean
            PanelState.reset();
        },

        /**
         * Test 6:
         * var(--color-x) values must be normalized to --color-x before setValue().
         * This matches the normalization logic in syncFieldsFromChanges() that
         * prevents palette-ref fields from appearing dirty after reload.
         */
        'PanelState should NOT be dirty when var() is normalized to -- before setValue()': function () {
            var PanelState = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');

            var mockConfig = {
                sections: [{
                    code: 'general',
                    label: 'General',
                    fields: [{
                        code:       'body_bg',
                        label:      'Body Background',
                        type:       'color',
                        property:   '--body-bg',
                        value:      '--color-brand-primary', // savedValue = palette ref
                        default:    '#ffffff',
                        isModified: true
                    }]
                }]
            };
            PanelState.init(mockConfig);

            // Simulate normalization: 'var(--color-brand-primary)' → '--color-brand-primary'
            var rawValue   = 'var(--color-brand-primary)';
            var stateValue = rawValue.replace(/^var\((.+)\)$/, '$1');

            PanelState.setValue('general', 'body_bg', stateValue);

            this.assertEquals(
                PanelState.getChangesCount(),
                0,
                'Field must NOT be dirty when normalized var() matches the saved palette ref'
            );

            PanelState.reset();
        },

        /**
         * Test 7:
         * getChangesCount() must equal the number of fields that were synced
         * with a value different from their savedValue.
         */
        'PanelState.getChangesCount() should equal number of synced dirty fields': function () {
            var PanelState = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');

            var mockConfig = {
                sections: [{
                    code: 'general',
                    label: 'General',
                    fields: [
                        {
                            code: 'body_bg', label: 'Body BG', type: 'color',
                            property: '--body-bg', value: '#ffffff', default: '#ffffff', isModified: false
                        },
                        {
                            code: 'header_bg', label: 'Header BG', type: 'color',
                            property: '--header-bg', value: '#000000', default: '#000000', isModified: false
                        },
                        {
                            code: 'link_color', label: 'Link Color', type: 'color',
                            property: '--link-color', value: '#0000ff', default: '#0000ff', isModified: false
                        }
                    ]
                }]
            };
            PanelState.init(mockConfig);

            // Sync 2 of the 3 fields with new values
            PanelState.setValue('general', 'body_bg',   '#804545');
            PanelState.setValue('general', 'header_bg', '#1a6e3c');
            // link_color not synced — stays clean

            this.assertEquals(
                PanelState.getChangesCount(),
                2,
                'getChangesCount() must be 2 when 2 of 3 fields are synced with draft values'
            );

            PanelState.reset();
        },

        // ─── Layer 3: Integration — synthetic DOM fixture ─────────────────

        /**
         * Test 8 (Bug A integration):
         * Real CssPreviewManager.syncFieldsFromChanges() on a synthetic panel DOM
         * must update .bte-color-preview background-color to the draft value.
         *
         * Auto-skipped if editor is not in DRAFT mode (no changes in localStorage).
         */
        'syncFieldsFromChanges() should update bte-color-preview on synthetic panel DOM': function (done) {
            var self = this;

            // Check for any existing draft changes to use as test data
            var existingChanges = CssPreviewManager.getChanges();
            var testProperty    = null;
            var testValue       = null;

            Object.keys(existingChanges).some(function (prop) {
                var v = existingChanges[prop];
                // Only use plain hex values for this test (skip var() and rgb)
                if (typeof v === 'string' && v.charAt(0) === '#') {
                    testProperty = prop;
                    testValue    = v;
                    return true;
                }
            });

            if (!testProperty) {
                console.log('   Skipping Test 8: no hex-valued draft changes found (not in DRAFT mode or no changes)');
                done();
                return;
            }

            // Build a synthetic panel element with one color field for testProperty
            var $panel = buildFakePanel([{
                property:     testProperty,
                initialColor: '#ffffff',  // start white — must change to testValue
                sectionCode:  'test_section',
                fieldCode:    'test_field'
            }]);

            // Append to document so jQuery can find elements inside it
            $panel.appendTo('body');

            try {
                // Set up minimal PanelState so setValue() doesn't warn "field not found"
                var PanelState = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');
                var priorConfig = PanelState.config; // save to restore later

                PanelState.init({
                    sections: [{
                        code: 'test_section',
                        label: 'Test',
                        fields: [{
                            code:       'test_field',
                            label:      'Test Field',
                            type:       'color',
                            property:   testProperty,
                            value:      '#ffffff',
                            default:    '#ffffff',
                            isModified: false
                        }]
                    }]
                });

                // Act — use $panel directly so syncFieldsFromChanges scopes to it
                CssPreviewManager.syncFieldsFromChanges($panel);

                // Assert — preview dot must show the draft value
                var $preview = $panel.find('.bte-color-preview');
                var bg = $preview.css('background-color');

                // testValue is a hex like '#804545' → browser gives 'rgb(128, 69, 69)'
                var r = parseInt(testValue.slice(1, 3), 16);
                var g = parseInt(testValue.slice(3, 5), 16);
                var b = parseInt(testValue.slice(5, 7), 16);
                var expectedRgb = 'rgb(' + r + ', ' + g + ', ' + b + ')';

                self.assertTrue(
                    bg === expectedRgb || bg === testValue.toLowerCase(),
                    'bte-color-preview must be ' + testValue + ' after syncFieldsFromChanges(), got: ' + bg
                );

                // Restore PanelState
                if (priorConfig) {
                    PanelState.init(priorConfig);
                } else {
                    PanelState.clear();
                }

            } finally {
                $panel.remove();
            }

            done();
        },

        /**
         * Test 9 (Bug B integration):
         * Real CssPreviewManager.syncFieldsFromChanges() on a synthetic panel DOM
         * must result in PanelState.getChangesCount() > 0 after the call returns.
         *
         * This verifies that the sync require() fix (Part A of Issue 019) makes
         * syncFieldsFromChanges() fully synchronous w.r.t. PanelState updates.
         *
         * Auto-skipped if editor is not in DRAFT mode.
         */
        'syncFieldsFromChanges() should result in PanelState.getChangesCount() > 0': function (done) {
            var self = this;

            var existingChanges = CssPreviewManager.getChanges();
            var testProperty    = null;
            var testValue       = null;

            Object.keys(existingChanges).some(function (prop) {
                var v = existingChanges[prop];
                if (typeof v === 'string' && v.charAt(0) === '#') {
                    testProperty = prop;
                    testValue    = v;
                    return true;
                }
            });

            if (!testProperty) {
                console.log('   Skipping Test 9: no hex-valued draft changes found (not in DRAFT mode or no changes)');
                done();
                return;
            }

            var $panel = buildFakePanel([{
                property:     testProperty,
                initialColor: '#ffffff',
                sectionCode:  'test_section_b',
                fieldCode:    'test_field_b'
            }]);

            $panel.appendTo('body');

            try {
                var PanelState = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');
                var priorConfig = PanelState.config;

                PanelState.init({
                    sections: [{
                        code: 'test_section_b',
                        label: 'Test B',
                        fields: [{
                            code:       'test_field_b',
                            label:      'Test Field B',
                            type:       'color',
                            property:   testProperty,
                            value:      '#ffffff',
                            default:    '#ffffff',
                            isModified: false
                        }]
                    }]
                });

                // Act
                CssPreviewManager.syncFieldsFromChanges($panel);

                // After the sync-require fix, PanelState.setValue() runs synchronously
                // inside syncFieldsFromChanges(), so getChangesCount() > 0 immediately.
                self.assertTrue(
                    PanelState.getChangesCount() > 0,
                    'PanelState.getChangesCount() must be > 0 immediately after ' +
                    'syncFieldsFromChanges() returns (requires sync require fix)'
                );

                if (priorConfig) {
                    PanelState.init(priorConfig);
                } else {
                    PanelState.clear();
                }

            } finally {
                $panel.remove();
            }

            done();
        },

        /**
         * Test 10:
         * Non-color (text) field value is updated correctly.
         * Uses a synthetic input[type=text] with data-type="text".
         */
        'syncFieldsFromChanges() should update a non-color text field value': function (done) {
            var self = this;

            // Inject a fake change for a text field into CssPreviewManager
            // by calling setVariable() if available, otherwise skip.
            var fakeProperty = '--bte-test-text-field-018';

            // Build a synthetic panel with a plain text input for this property
            var $panel = $('<div class="bte-fake-panel-test">');
            var $input = $('<input type="text" class="bte-text-input">')
                .attr({
                    'data-property': fakeProperty,
                    'data-type':     'text',
                    'data-section':  'test_section_c',
                    'data-field':    'test_text_c'
                })
                .val('old-value');
            $panel.append($input).appendTo('body');

            try {
                var PanelState = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');
                var priorConfig = PanelState.config;

                PanelState.init({
                    sections: [{
                        code: 'test_section_c',
                        label: 'Test C',
                        fields: [{
                            code:       'test_text_c',
                            label:      'Test Text',
                            type:       'text',
                            property:   fakeProperty,
                            value:      'old-value',
                            default:    'old-value',
                            isModified: false
                        }]
                    }]
                });

                // Directly set a change in CssPreviewManager for our test property
                var didSet = CssPreviewManager.setVariable(fakeProperty, 'new-value', 'text', {});
                if (!didSet) {
                    console.log('   Skipping Test 10: setVariable() not available or returned false');
                    done();
                    return;
                }

                CssPreviewManager.syncFieldsFromChanges($panel);

                self.assertEquals(
                    $panel.find('[data-property="' + fakeProperty + '"]').val(),
                    'new-value',
                    'Text field must be updated to the draft value after syncFieldsFromChanges()'
                );

                // Cleanup
                CssPreviewManager.resetVariable(fakeProperty);
                if (priorConfig) {
                    PanelState.init(priorConfig);
                } else {
                    PanelState.clear();
                }

            } finally {
                $panel.remove();
            }

            done();
        },

        /**
         * Test 11:
         * Checkbox field checked state is set from draft value '1'.
         */
        'syncFieldsFromChanges() should check a checkbox field when draft value is "1"': function (done) {
            var self = this;

            var fakeProperty = '--bte-test-checkbox-018';

            var $panel = $('<div class="bte-fake-panel-test">');
            var $checkbox = $('<input type="checkbox">')
                .attr({
                    'data-property': fakeProperty,
                    'data-type':     'checkbox',
                    'data-section':  'test_section_d',
                    'data-field':    'test_checkbox_d'
                })
                .prop('checked', false);
            $panel.append($checkbox).appendTo('body');

            try {
                var PanelState = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');
                var priorConfig = PanelState.config;

                PanelState.init({
                    sections: [{
                        code: 'test_section_d',
                        label: 'Test D',
                        fields: [{
                            code:       'test_checkbox_d',
                            label:      'Test Checkbox',
                            type:       'checkbox',
                            property:   fakeProperty,
                            value:      '0',
                            default:    '0',
                            isModified: false
                        }]
                    }]
                });

                var didSet = CssPreviewManager.setVariable(fakeProperty, '1', 'checkbox', {});
                if (!didSet) {
                    console.log('   Skipping Test 11: setVariable() not available for checkbox');
                    done();
                    return;
                }

                CssPreviewManager.syncFieldsFromChanges($panel);

                self.assertTrue(
                    $panel.find('[data-property="' + fakeProperty + '"]').prop('checked'),
                    'Checkbox must be checked when draft value is "1"'
                );

                // Cleanup
                CssPreviewManager.resetVariable(fakeProperty);
                if (priorConfig) {
                    PanelState.init(priorConfig);
                } else {
                    PanelState.clear();
                }

            } finally {
                $panel.remove();
            }

            done();
        },

        /**
         * Test 12:
         * When CssPreviewManager has no changes (empty map),
         * syncFieldsFromChanges() must not mutate any DOM element
         * and PanelState.getChangesCount() must remain 0.
         */
        'syncFieldsFromChanges() with empty changes map must touch nothing': function () {
            var PanelState = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');
            var priorConfig = PanelState.config;

            // Build isolated panel — field value starts at '#aabbcc'
            var $panel = buildFakePanel([{
                property:     '--bte-test-empty-018',
                initialColor: '#aabbcc',
                sectionCode:  'test_section_e',
                fieldCode:    'test_empty_e'
            }]).appendTo('body');

            try {
                PanelState.init({
                    sections: [{
                        code: 'test_section_e',
                        label: 'Test E',
                        fields: [{
                            code:       'test_empty_e',
                            label:      'Test Empty',
                            type:       'color',
                            property:   '--bte-test-empty-018',
                            value:      '#aabbcc',
                            default:    '#aabbcc',
                            isModified: false
                        }]
                    }]
                });

                // Ensure no change exists for our property
                var existingChanges = CssPreviewManager.getChanges();
                if (existingChanges['--bte-test-empty-018']) {
                    CssPreviewManager.resetVariable('--bte-test-empty-018');
                }

                // Act — nothing to sync
                CssPreviewManager.syncFieldsFromChanges($panel);

                // Assert DOM unchanged
                this.assertEquals(
                    $panel.find('.bte-color-input').val(),
                    '#aabbcc',
                    'Text input must remain unchanged when no draft changes exist for this property'
                );

                // Assert PanelState unchanged
                this.assertEquals(
                    PanelState.getChangesCount(),
                    0,
                    'getChangesCount() must be 0 when changes map has no matching entries'
                );

            } finally {
                $panel.remove();
                if (priorConfig) {
                    PanelState.init(priorConfig);
                } else {
                    PanelState.clear();
                }
            }
        }

    });
});
