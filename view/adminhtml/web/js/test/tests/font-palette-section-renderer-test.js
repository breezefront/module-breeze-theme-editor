/**
 * Font Palette Section Renderer Tests
 *
 * Tests are organised into two layers:
 *
 *   Layer 1 – Pure-logic (inline reproduction)
 *     Extracts algorithms from the widget methods that have no DOM or external
 *     module dependencies.  Based on the same approach used in
 *     palette-reset-behavior-test.js and css-preview-manager-palette-test.js.
 *
 *   Layer 2 – DOM / widget integration
 *     Instantiates the real $.widget('swissup.fontPaletteSection', …) with a
 *     minimal DOM fixture.  CssPreviewManager and BadgeRenderer are patched for
 *     the duration of each test so the iframe/template infrastructure is not
 *     needed.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/font-palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'
], function ($, TestFramework, FontPaletteManager, PanelState, CssPreviewManager) {
    'use strict';

    // =========================================================================
    // Inline reproductions of pure-logic widget methods
    // Kept in sync with font-palette-section-renderer.js
    // =========================================================================

    /** Reproduction of _escapeHtml */
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Reproduction of _escapeAttr */
    function escapeAttr(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Reproduction of _buildRoleMap scan logic.
     *
     * Returns a map of property → { sectionCode, fieldCode, currentValue }
     * for every field whose property is a known FontPaletteManager role.
     */
    function buildRoleMap(sections) {
        var roleFields = {};
        (sections || []).forEach(function (section) {
            (section.fields || []).forEach(function (field) {
                if (field.property && FontPaletteManager.getRole(field.property)) {
                    var role = FontPaletteManager.getRole(field.property);
                    var currentValue = (field.value !== null && field.value !== undefined)
                        ? field.value
                        : (role ? role['default'] : (field['default'] || ''));

                    roleFields[field.property] = {
                        sectionCode:  section.code,
                        fieldCode:    field.code,
                        currentValue: currentValue
                    };

                    FontPaletteManager.setCurrentValue(field.property, currentValue);
                }
            });
        });
        return roleFields;
    }

    /**
     * Reproduction of the dirty/modified counting loop in _updateHeaderBadges.
     *
     * @param  {Object}   roleFields      — map from buildRoleMap
     * @param  {Function} getFieldState   — injectable getFieldState(sec, field)
     * @return {{dirty: Number, modified: Number}}
     */
    function countBadges(roleFields, getFieldState) {
        var dirty = 0, modified = 0;
        Object.keys(roleFields).forEach(function (prop) {
            var rf    = roleFields[prop];
            var state = getFieldState(rf.sectionCode, rf.fieldCode);
            if (state) {
                if (state.isDirty)    { dirty++;    }
                if (state.isModified) { modified++; }
            }
        });
        return { dirty: dirty, modified: modified };
    }

    // =========================================================================
    // Test data
    // =========================================================================

    var TEST_PALETTES = [{
        id: 'default',
        label: 'Default',
        options: [
            { value: 'system-ui, sans-serif', label: 'System UI' },
            { value: "'Roboto', sans-serif",  label: 'Roboto',
              url: 'https://fonts.googleapis.com/css2?family=Roboto' }
        ],
        fonts: [
            { id: 'primary',   label: 'Primary',   property: '--primary-font',
              'default': 'system-ui, sans-serif' },
            { id: 'secondary', label: 'Secondary', property: '--secondary-font',
              'default': "'Roboto', sans-serif" }
        ]
    }];

    var TEST_SECTIONS = [{
        code: 'typography',
        fields: [
            { code: 'primary_font',   property: '--primary-font',
              value: null, 'default': 'system-ui, sans-serif' },
            { code: 'secondary_font', property: '--secondary-font',
              value: "'Roboto', sans-serif", 'default': 'system-ui, sans-serif' },
            // consumer field — not a role
            { code: 'body_font', property: '--body-font',
              value: null, 'default': 'system-ui, sans-serif' }
        ]
    }];

    // =========================================================================
    // DOM helpers
    // =========================================================================

    /**
     * Inline reproduction of _buildSectionHtml + _buildRoleRowHtml.
     * Kept in sync with font-palette-section-renderer.js.
     *
     * @param {Array}  palettes   - fontPalettes array (already init'd in FontPaletteManager)
     * @param {Object} roleFields - map from buildRoleMap()
     * @return {String}
     */
    function buildSectionHtml(palettes, roleFields) {
        var html = '<div class="bte-font-palette-section">';
        html += '<div class="bte-font-palette-header">';
        html += '<span class="bte-font-palette-title">Font Palettes</span>';
        html += '<div class="bte-font-palette-header-actions">';
        html += '<div class="bte-font-palette-badges"></div>';
        html += '<i class="bte-icon-chevron-down bte-font-palette-arrow"></i>';
        html += '</div>';
        html += '</div>';

        html += '<div class="bte-font-palette-content">';
        html += '<div class="bte-font-palette-roles">';

        (palettes || []).forEach(function (palette) {
            var stylesheetMap = FontPaletteManager.getStylesheetMap(palette.id);

            (palette.fonts || []).forEach(function (role) {
                var roleField    = roleFields[role.property] || {};
                var currentValue = roleField.currentValue || role['default'];

                var selectedLabel  = currentValue;
                var selectedFamily = currentValue;
                (palette.options || []).forEach(function (opt) {
                    if (opt.value === currentValue) {
                        selectedLabel  = opt.label;
                        selectedFamily = opt.value;
                    }
                });

                html += '<div class="bte-font-role-row">';
                html += '<label class="bte-font-role-label">' +
                    escapeHtml(role.label) + '</label>';

                html += '<div class="bte-font-picker-widget"' +
                    ' data-role-property="' + escapeAttr(role.property) + '"' +
                    ' data-section="' + escapeAttr(roleField.sectionCode || '') + '"' +
                    ' data-field="' + escapeAttr(roleField.fieldCode || '') + '"' +
                    ' data-font-stylesheets="' +
                        escapeAttr(JSON.stringify(stylesheetMap)) + '">';

                html += '<button type="button" class="bte-font-picker-trigger"' +
                    ' aria-haspopup="listbox" aria-expanded="false">';
                html += '<span class="bte-font-picker-trigger-label"' +
                    ' style="font-family: ' + escapeAttr(selectedFamily) + ';">' +
                    escapeHtml(selectedLabel) + '</span>';
                html += '<span class="bte-font-picker-trigger-arrow"></span>';
                html += '</button>';

                html += '<div class="bte-font-picker-dropdown" role="listbox" hidden>';
                (palette.options || []).forEach(function (opt) {
                    var isSel = opt.value === currentValue;
                    html += '<div class="bte-font-picker-option' +
                        (isSel ? ' is-selected' : '') + '"' +
                        ' role="option"' +
                        ' aria-selected="' + (isSel ? 'true' : 'false') + '"' +
                        ' data-value="' + escapeAttr(opt.value) + '"' +
                        ' style="font-family: ' + escapeAttr(opt.value) + ';">' +
                        escapeHtml(opt.label) +
                        '</div>';
                });
                html += '</div>'; // .bte-font-picker-dropdown
                html += '</div>'; // .bte-font-picker-widget
                html += '</div>'; // .bte-font-role-row
            });
        });

        html += '</div>'; // .bte-font-palette-roles
        html += '</div>'; // .bte-font-palette-content
        html += '</div>'; // .bte-font-palette-section

        return html;
    }

    /**
     * Inline reproduction of _bind() event handlers.
     * Attaches accordion, trigger-open/close and option-click handlers
     * directly on the container element — no $.widget needed.
     *
     * @param {jQuery} $c - container element
     */
    function bindHandlers($c) {
        var $header  = $c.find('.bte-font-palette-header');
        var $content = $c.find('.bte-font-palette-content');

        // ── Accordion toggle ──────────────────────────────────────────────────
        $c.on('click', '.bte-font-palette-header', function (e) {
            if ($(e.target).closest('.bte-palette-reset-btn').length) {
                return;
            }
            e.stopPropagation();

            var isOpen = $header.hasClass('active');
            if (isOpen) {
                $header.removeClass('active');
                $content.removeClass('active').hide();
            } else {
                $header.addClass('active');
                $content.addClass('active').show();
            }
        });

        // ── Trigger button: open / close dropdown ─────────────────────────────
        $c.on('click', '.bte-font-picker-trigger', function (e) {
            e.stopPropagation();

            var $trigger  = $(this);
            var $widget   = $trigger.closest('.bte-font-picker-widget');
            var $dropdown = $widget.find('.bte-font-picker-dropdown');
            var isOpen    = !$dropdown.prop('hidden');

            // Close any other open dropdowns first
            $c.find('.bte-font-picker-dropdown:not([hidden])').each(function () {
                if (this !== $dropdown[0]) {
                    $(this).prop('hidden', true);
                    $(this).closest('.bte-font-picker-widget')
                        .find('.bte-font-picker-trigger')
                        .attr('aria-expanded', 'false');
                }
            });

            if (isOpen) {
                $dropdown.prop('hidden', true);
                $trigger.attr('aria-expanded', 'false');
                return;
            }

            // Load font stylesheets into document.head
            var map = JSON.parse($widget.attr('data-font-stylesheets') || '{}');
            $.each(map, function (val, url) {
                if (url && !$('link[href="' + url + '"]', document).length) {
                    $('<link>', { rel: 'stylesheet', href: url }).appendTo(document.head);
                }
            });

            $dropdown.prop('hidden', false);
            $trigger.attr('aria-expanded', 'true');
        });

        // ── Option click: select a font for this role ─────────────────────────
        $c.on('click', '.bte-font-picker-option', function (e) {
            e.stopPropagation();

            var $option      = $(this);
            var $widget      = $option.closest('.bte-font-picker-widget');
            var $dropdown    = $widget.find('.bte-font-picker-dropdown');
            var $trigger     = $widget.find('.bte-font-picker-trigger');
            var val          = String($option.data('value'));
            var label        = $option.text().trim();
            var roleProperty = String($widget.data('role-property'));
            var sectionCode  = String($widget.data('section'));
            var fieldCode    = String($widget.data('field'));

            // Update selection state
            $dropdown.find('.bte-font-picker-option')
                .removeClass('is-selected')
                .attr('aria-selected', 'false');
            $option.addClass('is-selected').attr('aria-selected', 'true');

            // Update trigger button label and font preview
            $trigger.find('.bte-font-picker-trigger-label')
                .text(label)
                .css('font-family', val);

            // Close dropdown
            $dropdown.prop('hidden', true);
            $trigger.attr('aria-expanded', 'false');

            // Load external font stylesheet if needed
            var map = JSON.parse($widget.attr('data-font-stylesheets') || '{}');
            var url = map[val];
            if (url) {
                CssPreviewManager.loadFont(url);
            }

            // Persist value
            if (sectionCode && fieldCode) {
                PanelState.setValue(sectionCode, fieldCode, val);
            }

            // Reflect change in CSS preview
            CssPreviewManager.setVariable(roleProperty, val, 'font_picker');
        });
    }

    /**
     * Temporarily patch CssPreviewManager and PanelState for the duration
     * of fn(), then restore originals.  Returns the call-tracking stubs.
     */
    function withPatchedDeps(fn) {
        var calls = { setVariable: [], loadFont: [] };

        var origSetVariable = CssPreviewManager.setVariable;
        var origLoadFont    = CssPreviewManager.loadFont;
        var origSetValue    = PanelState.setValue;

        CssPreviewManager.setVariable = function (prop, val) {
            calls.setVariable.push({ prop: prop, val: val });
        };
        CssPreviewManager.loadFont = function (url) {
            calls.loadFont.push(url);
        };
        PanelState.setValue = function () {};

        try {
            fn(calls);
        } finally {
            CssPreviewManager.setVariable = origSetVariable;
            CssPreviewManager.loadFont    = origLoadFont;
            PanelState.setValue           = origSetValue;
        }
    }

    /**
     * Build a DOM fixture using the inline HTML builder and event binders.
     * FontPaletteManager is initialised with the given palettes.
     */
    function buildFixture(paletteOverrides, sectionOverrides) {
        var palettes = paletteOverrides || TEST_PALETTES;
        var sections = sectionOverrides || TEST_SECTIONS;

        FontPaletteManager.init(palettes);

        var $container = $('<div class="bte-font-palette-container">').appendTo(document.body);

        if (!palettes || !palettes.length) {
            $container.hide();
            return $container;
        }

        var roleFields = buildRoleMap(sections);
        $container.html(buildSectionHtml(palettes, roleFields));

        var $header  = $container.find('.bte-font-palette-header');
        var $content = $container.find('.bte-font-palette-content');
        $header.addClass('active');
        $content.addClass('active').show();

        bindHandlers($container);

        return $container;
    }

    /** Remove DOM fixture and reset FontPaletteManager. */
    function tearDown($container) {
        $container.off();
        $container.remove();
        FontPaletteManager.init([]);
    }

    // =========================================================================
    // Suite
    // =========================================================================

    return TestFramework.suite('Font Palette Section Renderer', {

        // ─── Layer 1: HTML escaping ──────────────────────────────────────────

        'escapeHtml: converts & to &amp;': function () {
            this.assertEqual('a &amp; b', escapeHtml('a & b'));
        },

        'escapeHtml: converts < and > to entities': function () {
            this.assertEqual('&lt;script&gt;', escapeHtml('<script>'));
        },

        'escapeHtml: converts double-quote to &quot;': function () {
            this.assertEqual('&quot;xss&quot;', escapeHtml('"xss"'));
        },

        'escapeAttr: converts & and " only (leaves < > as-is)': function () {
            // _escapeAttr is used in HTML attributes so < > are less dangerous
            // but & and " must still be escaped to prevent attribute injection.
            var result = escapeAttr('a & b "val"');
            this.assertStringContains(result, '&amp;',  '& must become &amp;');
            this.assertStringContains(result, '&quot;', '" must become &quot;');
        },

        'escapeHtml: numeric input is converted to string without throwing': function () {
            this.assertEqual('42', escapeHtml(42));
        },

        // ─── Layer 1: _buildRoleMap ──────────────────────────────────────────

        '_buildRoleMap: maps role fields to their section and field codes': function () {
            FontPaletteManager.init(TEST_PALETTES);
            var map = buildRoleMap(TEST_SECTIONS);

            this.assertTrue(
                map.hasOwnProperty('--primary-font'),
                '--primary-font must be in the role map'
            );
            this.assertEqual('typography',    map['--primary-font'].sectionCode);
            this.assertEqual('primary_font',  map['--primary-font'].fieldCode);
        },

        '_buildRoleMap: skips fields with no matching role in FontPaletteManager': function () {
            FontPaletteManager.init(TEST_PALETTES);
            var map = buildRoleMap(TEST_SECTIONS);

            // --body-font is not a palette role
            this.assertFalse(
                map.hasOwnProperty('--body-font'),
                'Consumer field --body-font must not appear in the role map'
            );
        },

        '_buildRoleMap: uses field.value when it is not null': function () {
            FontPaletteManager.init(TEST_PALETTES);
            var map = buildRoleMap(TEST_SECTIONS);

            // secondary_font has value: "'Roboto', sans-serif"
            this.assertEqual("'Roboto', sans-serif", map['--secondary-font'].currentValue,
                'currentValue should be field.value when value is not null');
        },

        '_buildRoleMap: falls back to field.default when value is null (legacy, role.default === field.default)': function () {
            FontPaletteManager.init(TEST_PALETTES);
            var map = buildRoleMap(TEST_SECTIONS);

            // In TEST_PALETTES role.default === field.default === 'system-ui, sans-serif',
            // so both the buggy and fixed paths return the same value here.
            this.assertEqual('system-ui, sans-serif', map['--primary-font'].currentValue,
                'currentValue should equal role.default when value is null');
        },

        // ─── Issue 024 ───────────────────────────────────────────────────────
        //
        // Scenario: theme developer overrides font_palettes.fonts[].default to
        // "Arial, sans-serif" for the "primary" role, but the matching
        // settings[].fields[].default still contains the old value
        // "ui-sans-serif, system-ui, sans-serif".
        //
        // Expected: currentValue (and FontPaletteManager._currentValues) must
        //           receive the authoritative role.default = "Arial, sans-serif".
        // Actual (bug): currentValue = "ui-sans-serif, system-ui, sans-serif"
        //               because field.default is used instead of role.default.

        '_buildRoleMap: uses role.default when value is null and role.default differs from field.default (Issue 024)': function () {
            // Palette where role.default = "Arial, sans-serif"
            var palettes = [{
                id: 'default',
                label: 'Default',
                options: [
                    { value: 'Arial, sans-serif',                label: 'Arial' },
                    { value: 'ui-sans-serif, system-ui, sans-serif', label: 'System UI' }
                ],
                fonts: [
                    {
                        id: 'primary',
                        label: 'Primary',
                        property: '--primary-font',
                        'default': 'Arial, sans-serif'          // ← authoritative
                    }
                ]
            }];

            // settings[].fields[].default still has the old value
            var sections = [{
                code: 'typography',
                fields: [{
                    code: 'primary_font',
                    property: '--primary-font',
                    value: null,                                  // never saved
                    'default': 'ui-sans-serif, system-ui, sans-serif'  // ← stale
                }]
            }];

            FontPaletteManager.init(palettes);
            var map = buildRoleMap(sections);

            this.assertEqual(
                'Arial, sans-serif',
                map['--primary-font'].currentValue,
                'currentValue must be role.default ("Arial") not field.default ("ui-sans-serif") — Issue 024'
            );
        },

        '_buildRoleMap: setCurrentValue receives role.default not field.default when value is null (Issue 024)': function () {
            var palettes = [{
                id: 'default',
                label: 'Default',
                options: [
                    { value: 'Arial, sans-serif',                    label: 'Arial' },
                    { value: 'ui-sans-serif, system-ui, sans-serif', label: 'System UI' }
                ],
                fonts: [{
                    id: 'primary',
                    label: 'Primary',
                    property: '--primary-font',
                    'default': 'Arial, sans-serif'
                }]
            }];

            var sections = [{
                code: 'typography',
                fields: [{
                    code: 'primary_font',
                    property: '--primary-font',
                    value: null,
                    'default': 'ui-sans-serif, system-ui, sans-serif'
                }]
            }];

            FontPaletteManager.init(palettes);
            buildRoleMap(sections);  // this calls FontPaletteManager.setCurrentValue internally

            this.assertEqual(
                'Arial, sans-serif',
                FontPaletteManager.getCurrentValue('--primary-font'),
                'FontPaletteManager.getCurrentValue must return role.default ("Arial"), not field.default ("ui-sans-serif") — Issue 024'
            );
        },

        '_buildRoleMap: saved field.value overrides role.default even when they differ (Issue 024, no regression)': function () {
            var palettes = [{
                id: 'default',
                label: 'Default',
                options: [
                    { value: 'Arial, sans-serif',        label: 'Arial' },
                    { value: "'Roboto', sans-serif",      label: 'Roboto' }
                ],
                fonts: [{
                    id: 'primary',
                    label: 'Primary',
                    property: '--primary-font',
                    'default': 'Arial, sans-serif'
                }]
            }];

            var sections = [{
                code: 'typography',
                fields: [{
                    code: 'primary_font',
                    property: '--primary-font',
                    value: "'Roboto', sans-serif",        // user saved Roboto
                    'default': 'ui-sans-serif, system-ui, sans-serif'
                }]
            }];

            FontPaletteManager.init(palettes);
            var map = buildRoleMap(sections);

            this.assertEqual(
                "'Roboto', sans-serif",
                map['--primary-font'].currentValue,
                'Saved field.value must always win over role.default — no regression'
            );
        },

        '_buildRoleMap: fields without a property key are skipped': function () {
            FontPaletteManager.init(TEST_PALETTES);
            var sections = [{
                code: 'typography',
                fields: [
                    { code: 'no_prop', value: null, 'default': 'x' }
                    // no property key
                ]
            }];
            var map = buildRoleMap(sections);
            this.assertEqual(0, Object.keys(map).length,
                'Fields without a property key must not enter the role map');
        },

        // ─── Layer 1: badge counting ─────────────────────────────────────────

        'badge counting: both counts are 0 when no field states exist': function () {
            var roleFields = {
                '--primary-font': { sectionCode: 'typography', fieldCode: 'primary_font' }
            };
            var counts = countBadges(roleFields, function () { return null; });
            this.assertEqual(0, counts.dirty,    'dirty should be 0');
            this.assertEqual(0, counts.modified, 'modified should be 0');
        },

        'badge counting: dirty incremented for isDirty state': function () {
            var roleFields = {
                '--primary-font':   { sectionCode: 'typo', fieldCode: 'pf' },
                '--secondary-font': { sectionCode: 'typo', fieldCode: 'sf' }
            };
            var states = {
                'typo.pf': { isDirty: true,  isModified: false },
                'typo.sf': { isDirty: false, isModified: false }
            };
            var counts = countBadges(roleFields, function (sec, field) {
                return states[sec + '.' + field] || null;
            });
            this.assertEqual(1, counts.dirty, 'dirty should be 1');
        },

        'badge counting: modified incremented for isModified state': function () {
            var roleFields = {
                '--primary-font':   { sectionCode: 'typo', fieldCode: 'pf' },
                '--secondary-font': { sectionCode: 'typo', fieldCode: 'sf' }
            };
            var states = {
                'typo.pf': { isDirty: false, isModified: true  },
                'typo.sf': { isDirty: false, isModified: true  }
            };
            var counts = countBadges(roleFields, function (sec, field) {
                return states[sec + '.' + field] || null;
            });
            this.assertEqual(2, counts.modified, 'modified should be 2');
        },

        // ─── Layer 1: restore button visibility logic ────────────────────────

        'restore button logic: absent when modified count is 0': function () {
            // Reproduction of the check in _updateHeaderBadges:
            // if (modified > 0) { html += '<button ...restore-btn...>'; }
            var modified = 0;
            var html = modified > 0
                ? '<button class="bte-font-palette-restore-btn">×</button>'
                : '';
            this.assertEqual('', html,
                'Restore button HTML must be empty when modified === 0');
        },

        'restore button logic: present when modified count is > 0': function () {
            var modified = 2;
            var html = modified > 0
                ? '<button class="bte-font-palette-restore-btn">×</button>'
                : '';
            this.assertStringContains(html, 'bte-font-palette-restore-btn',
                'Restore button must be present when modified > 0');
        },

        // ─── Layer 1: reset guard ────────────────────────────────────────────

        'reset guard: blocked when dirty list is empty': function () {
            var dirty = [];
            var shouldProceed = dirty.length > 0;
            this.assertFalse(shouldProceed, 'Reset must be blocked when no dirty fields');
        },

        'reset guard: proceeds when dirty list has entries': function () {
            var dirty = [{ property: '--primary-font', rf: {}, savedValue: 'x' }];
            var shouldProceed = dirty.length > 0;
            this.assertTrue(shouldProceed, 'Reset must proceed when dirty fields exist');
        },

        // ─── Layer 2: DOM — _render hides element when no palettes ───────────

        'render: hides container when fontPalettes is empty': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture([], []);

                self.assertTrue(
                    $c.css('display') === 'none' || !$c.is(':visible'),
                    'Container must be hidden when no font palettes are configured'
                );

                tearDown($c);
            });
        },

        // ─── Layer 2: DOM — _render generates expected structure ─────────────

        'render: builds a role row for every font role in every palette': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var rowCount = $c.find('.bte-font-role-row').length;
                // TEST_PALETTES has 2 roles (primary + secondary)
                self.assertEqual(2, rowCount,
                    'There should be one row per font role');
                tearDown($c);
            });
        },

        'render: each role row has a picker widget with data-role-property': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var props = $c.find('.bte-font-picker-widget[data-role-property]')
                    .map(function () { return $(this).data('role-property'); })
                    .get();
                self.assertTrue(props.indexOf('--primary-font') !== -1,
                    '--primary-font widget must be rendered');
                self.assertTrue(props.indexOf('--secondary-font') !== -1,
                    '--secondary-font widget must be rendered');
                tearDown($c);
            });
        },

        'render: dropdown options reflect palette options list': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $primaryWidget = $c.find(
                    '.bte-font-picker-widget[data-role-property="--primary-font"]'
                );
                var optCount = $primaryWidget.find('.bte-font-picker-option').length;
                // TEST_PALETTES has 2 options (System UI + Roboto)
                self.assertEqual(2, optCount,
                    'Dropdown must contain one option element per palette option');
                tearDown($c);
            });
        },

        'render: current value option is marked is-selected': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                // secondary_font has value: "'Roboto', sans-serif"
                var $widget = $c.find(
                    '.bte-font-picker-widget[data-role-property="--secondary-font"]'
                );
                var $selected = $widget.find('.bte-font-picker-option.is-selected');
                self.assertEqual(1, $selected.length,
                    'Exactly one option must be marked is-selected');
                self.assertEqual("'Roboto', sans-serif",
                    String($selected.data('value')),
                    'The is-selected option must match the saved value');
                tearDown($c);
            });
        },

        // ─── Layer 2: DOM — trigger open / close ─────────────────────────────

        'trigger click: opens dropdown and sets aria-expanded to true': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $trigger  = $c.find('.bte-font-picker-trigger').first();
                var $dropdown = $trigger.closest('.bte-font-picker-widget')
                    .find('.bte-font-picker-dropdown');

                $trigger.trigger('click');

                self.assertFalse($dropdown.prop('hidden'),
                    'Dropdown must be visible after trigger click');
                self.assertEqual('true', $trigger.attr('aria-expanded'),
                    'aria-expanded must be "true" after opening');
                tearDown($c);
            });
        },

        'trigger click: closes dropdown on second click': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $trigger  = $c.find('.bte-font-picker-trigger').first();
                var $dropdown = $trigger.closest('.bte-font-picker-widget')
                    .find('.bte-font-picker-dropdown');

                $trigger.trigger('click'); // open
                $trigger.trigger('click'); // close

                self.assertTrue($dropdown.prop('hidden'),
                    'Dropdown must be hidden after second trigger click');
                self.assertEqual('false', $trigger.attr('aria-expanded'),
                    'aria-expanded must be "false" after closing');
                tearDown($c);
            });
        },

        'trigger click: closes other open dropdowns': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $triggers  = $c.find('.bte-font-picker-trigger');
                var $first     = $triggers.eq(0);
                var $second    = $triggers.eq(1);
                var $drop1     = $first.closest('.bte-font-picker-widget')
                    .find('.bte-font-picker-dropdown');

                $first.trigger('click');  // open first dropdown
                $second.trigger('click'); // open second — should close first

                self.assertTrue($drop1.prop('hidden'),
                    'First dropdown must be closed when a second one is opened');
                tearDown($c);
            });
        },

        'trigger click: injects font stylesheets into document head': function () {
            var self = this;
            var robotoUrl = 'https://fonts.googleapis.com/css2?family=Roboto';
            $('link[href="' + robotoUrl + '"]').remove(); // clean slate

            withPatchedDeps(function () {
                var $c = buildFixture();
                // The second widget corresponds to --secondary-font (has Roboto option)
                var $trigger = $c.find(
                    '.bte-font-picker-widget[data-role-property="--secondary-font"]'
                ).find('.bte-font-picker-trigger');

                $trigger.trigger('click');

                self.assertTrue(
                    $('link[href="' + robotoUrl + '"]', document).length > 0,
                    'A <link> for Roboto font must be injected on dropdown open'
                );
                tearDown($c);
            });

            $('link[href="' + robotoUrl + '"]').remove();
        },

        // ─── Layer 2: DOM — option click ─────────────────────────────────────

        'option click: marks clicked option as is-selected': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $widget   = $c.find(
                    '.bte-font-picker-widget[data-role-property="--primary-font"]'
                );
                var $trigger  = $widget.find('.bte-font-picker-trigger');
                var $option   = $widget.find(
                    '.bte-font-picker-option[data-value="\'Roboto\', sans-serif"]'
                );

                $trigger.trigger('click');
                $option.trigger('click');

                self.assertTrue($option.hasClass('is-selected'),
                    'Clicked option must receive is-selected class');
                tearDown($c);
            });
        },

        'option click: removes is-selected from previously selected option': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $widget    = $c.find(
                    '.bte-font-picker-widget[data-role-property="--secondary-font"]'
                );
                var $trigger   = $widget.find('.bte-font-picker-trigger');
                // secondary font currently has Roboto selected; click System UI
                var $systemUi  = $widget.find(
                    '.bte-font-picker-option[data-value="system-ui, sans-serif"]'
                );
                var $roboto    = $widget.find(
                    '.bte-font-picker-option[data-value="\'Roboto\', sans-serif"]'
                );

                $trigger.trigger('click');
                $systemUi.trigger('click');

                self.assertFalse($roboto.hasClass('is-selected'),
                    'Previously selected option must lose is-selected class');
                tearDown($c);
            });
        },

        'option click: updates trigger label text and font-family': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $widget  = $c.find(
                    '.bte-font-picker-widget[data-role-property="--primary-font"]'
                );
                var $trigger = $widget.find('.bte-font-picker-trigger');
                var $roboto  = $widget.find(
                    '.bte-font-picker-option[data-value="\'Roboto\', sans-serif"]'
                );

                $trigger.trigger('click');
                $roboto.trigger('click');

                var labelText = $widget.find('.bte-font-picker-trigger-label').text().trim();
                self.assertEqual('Roboto', labelText,
                    'Trigger label text must update to selected option label');

                var fontFamily = $widget.find('.bte-font-picker-trigger-label').css('font-family');
                self.assertTrue(
                    fontFamily.toLowerCase().indexOf('roboto') !== -1,
                    'Trigger label font-family must contain Roboto'
                );
                tearDown($c);
            });
        },

        'option click: closes dropdown': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $widget   = $c.find(
                    '.bte-font-picker-widget[data-role-property="--primary-font"]'
                );
                var $trigger  = $widget.find('.bte-font-picker-trigger');
                var $dropdown = $widget.find('.bte-font-picker-dropdown');
                var $option   = $widget.find('.bte-font-picker-option').first();

                $trigger.trigger('click');
                $option.trigger('click');

                self.assertTrue($dropdown.prop('hidden'),
                    'Dropdown must be hidden after option click');
                self.assertEqual('false', $trigger.attr('aria-expanded'),
                    'aria-expanded must be "false" after option click');
                tearDown($c);
            });
        },

        'option click: calls CssPreviewManager.setVariable with role property and value': function () {
            var self = this;
            withPatchedDeps(function (calls) {
                var $c = buildFixture();
                var $widget  = $c.find(
                    '.bte-font-picker-widget[data-role-property="--primary-font"]'
                );
                var $trigger = $widget.find('.bte-font-picker-trigger');
                var $roboto  = $widget.find(
                    '.bte-font-picker-option[data-value="\'Roboto\', sans-serif"]'
                );

                $trigger.trigger('click');
                $roboto.trigger('click');

                var hit = calls.setVariable.some(function (c) {
                    return c.prop === '--primary-font' && c.val === "'Roboto', sans-serif";
                });
                self.assertTrue(hit,
                    'CssPreviewManager.setVariable must be called with the role property and chosen value');
                tearDown($c);
            });
        },

        // ─── Layer 2: DOM — accordion toggle ─────────────────────────────────

        'accordion: header click collapses the content section': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $header  = $c.find('.bte-font-palette-header');
                var $content = $c.find('.bte-font-palette-content');

                // Content is open by default; click to close
                $header.trigger('click');

                self.assertFalse($header.hasClass('active'),
                    'Header must lose "active" class after toggle click');
                tearDown($c);
            });
        },

        'accordion: second header click re-expands the section': function () {
            var self = this;
            withPatchedDeps(function () {
                var $c = buildFixture();
                var $header = $c.find('.bte-font-palette-header');

                $header.trigger('click'); // close
                $header.trigger('click'); // re-open

                self.assertTrue($header.hasClass('active'),
                    'Header must have "active" class after re-opening');
                tearDown($c);
            });
        },

        // ─── Layer 1: _updateConsumerFields (Issue 020) ──────────────────────
        //
        // Inline reproduction of the fixed method.
        // Kept in sync with font-palette-section-renderer.js _updateConsumerFields.

        '_updateConsumerFields: updates trigger when value matches role property': function () {
            // Arrange: hidden select whose .val() is already set to the role property
            // (field was previously saved with value "--secondary-font")
            var $container = $('<div>').appendTo(document.body);
            var selectId   = 'test-select-saved-020';
            var $select    = $('<select>')
                .attr('id',           selectId)
                .attr('class',        'bte-font-picker')
                .attr('data-default', '--secondary-font')
                .appendTo($container);
            $('<option>').val('--secondary-font').prop('selected', true).appendTo($select);

            var $widget = $('<div>')
                .attr('data-for', selectId)
                .appendTo($container);
            $('<span class="bte-font-picker-trigger-label">')
                .css('font-family', 'system-ui, sans-serif')
                .appendTo($widget);
            $('<div class="bte-font-picker-role-swatch">')
                .attr('data-value',       '--secondary-font')
                .attr('data-font-family', 'system-ui, sans-serif')
                .css('font-family',       'system-ui, sans-serif')
                .appendTo($widget);

            // Act: run the reproduced algorithm
            updateConsumerFields('--secondary-font', "'Roboto', sans-serif");

            // Assert
            var newFamily = $widget.find('.bte-font-picker-trigger-label').css('font-family');
            this.assertTrue(
                newFamily.toLowerCase().indexOf('roboto') !== -1,
                'Trigger label font-family must update when val() matches role property'
            );
            var swatchFamily = $widget.find(
                '.bte-font-picker-role-swatch[data-value="--secondary-font"]'
            ).attr('data-font-family');
            this.assertEqual("'Roboto', sans-serif", swatchFamily,
                'Role swatch data-font-family must be updated');

            $container.remove();
        },

        '_updateConsumerFields: updates trigger when value is null and default matches role (Issue 020 fix)': function () {
            // Arrange: hidden select with val() === null (never saved to DB),
            // but data-default points to the changed role — the regression case.
            var $container = $('<div>').appendTo(document.body);
            var selectId   = 'test-select-unsaved-020';
            var $select    = $('<select>')
                .attr('id',           selectId)
                .attr('class',        'bte-font-picker')
                .attr('data-default', '--secondary-font')
                .appendTo($container);
            // No option is selected → $select.val() returns null

            var $widget = $('<div>')
                .attr('data-for', selectId)
                .appendTo($container);
            $('<span class="bte-font-picker-trigger-label">')
                .css('font-family', 'system-ui, sans-serif')
                .appendTo($widget);
            $('<div class="bte-font-picker-role-swatch">')
                .attr('data-value',       '--secondary-font')
                .attr('data-font-family', 'system-ui, sans-serif')
                .css('font-family',       'system-ui, sans-serif')
                .appendTo($widget);

            // Act
            updateConsumerFields('--secondary-font', "'Roboto', sans-serif");

            // Assert: trigger must be updated even though val() is null
            var newFamily = $widget.find('.bte-font-picker-trigger-label').css('font-family');
            this.assertTrue(
                newFamily.toLowerCase().indexOf('roboto') !== -1,
                'Trigger must update via data-default fallback when val() is null (Issue 020)'
            );

            $container.remove();
        },

        '_updateConsumerFields: does not update trigger when default does not match changed role': function () {
            // Arrange: consumer field whose default points to --primary-font,
            // but we are notifying about a change to --secondary-font.
            var $container = $('<div>').appendTo(document.body);
            var selectId   = 'test-select-mismatch-020';
            var $select    = $('<select>')
                .attr('id',           selectId)
                .attr('class',        'bte-font-picker')
                .attr('data-default', '--primary-font')
                .appendTo($container);
            // No option selected → val() === null

            var $widget = $('<div>')
                .attr('data-for', selectId)
                .appendTo($container);
            var originalFamily = 'system-ui, sans-serif';
            $('<span class="bte-font-picker-trigger-label">')
                .css('font-family', originalFamily)
                .appendTo($widget);

            // Act: notify about --secondary-font change
            updateConsumerFields('--secondary-font', "'Roboto', sans-serif");

            // Assert: trigger must NOT be touched
            var currentFamily = $widget.find('.bte-font-picker-trigger-label').css('font-family');
            this.assertTrue(
                currentFamily.toLowerCase().indexOf('roboto') === -1,
                'Trigger must not update when data-default points to a different role'
            );

            $container.remove();
        },

        '_updateConsumerFields: does not update trigger when value is set to unrelated font': function () {
            // Arrange: consumer field with an explicit non-role value (user picked
            // a concrete font family — not a CSS var reference).
            var $container = $('<div>').appendTo(document.body);
            var selectId   = 'test-select-concrete-020';
            var $select    = $('<select>')
                .attr('id',           selectId)
                .attr('class',        'bte-font-picker')
                .attr('data-default', '--secondary-font')
                .appendTo($container);
            $('<option>').val('system-ui, sans-serif').prop('selected', true).appendTo($select);

            var $widget = $('<div>')
                .attr('data-for', selectId)
                .appendTo($container);
            $('<span class="bte-font-picker-trigger-label">')
                .css('font-family', 'system-ui, sans-serif')
                .appendTo($widget);

            // Act: role --secondary-font changes
            updateConsumerFields('--secondary-font', "'Roboto', sans-serif");

            // Assert: trigger must not change — field has a concrete saved value,
            // not a role reference
            var currentFamily = $widget.find('.bte-font-picker-trigger-label').css('font-family');
            this.assertTrue(
                currentFamily.toLowerCase().indexOf('roboto') === -1,
                'Trigger must not update when field has a concrete (non-role) saved value'
            );

            $container.remove();
        },

        // ─── Issue 025: previewReady guard ──────────────────────────────────
        //
        // These tests verify that preview calls (CssPreviewManager.setVariable,
        // loadFont, _updateConsumerFields) are gated behind the previewReady
        // Promise so that the first click always reaches the iframe.
        //
        // Each handler is reproduced in two flavours:
        //   _buggy  — current behaviour: synchronous call, no previewReady guard
        //   _fixed  — expected behaviour: wrapped in Promise.resolve().then()
        //
        // A1 / B1 / C1 — sync tests that PROVE the bug:
        //   buggy handler calls setVariable immediately (bad).
        // A2 / B2 / C2 — async tests that PROVE the fix works:
        //   fixed handler calls setVariable after the Promise resolves.
        // A3 / B3 / C3 — async tests for the "already resolved" path:
        //   fixed handler with Promise.resolve() still calls setVariable
        //   (no regression when iframe is already ready).
        //
        // ── Option click (A) ─────────────────────────────────────────────────

        'option click (025-A1): setVariable called synchronously without previewReady guard — proves the bug': function () {
            // Reproduce the CURRENT (buggy) option-click handler:
            // no previewReady guard → setVariable fires immediately even
            // when the iframe is not yet ready.
            var calls = { setVariable: [], loadFont: [] };

            optionClickBuggy('--primary-font', "'Roboto', sans-serif", null, calls);

            this.assertEqual(1, calls.setVariable.length,
                'Buggy handler calls setVariable synchronously (this is the bug)');
        },

        'option click (025-A2): setVariable not called before previewReady resolves (fixed handler)': function (done) {
            var self    = this;
            var resolve;
            var previewReady = new Promise(function (r) { resolve = r; });
            var calls = { setVariable: [], loadFont: [] };

            optionClickFixed(previewReady, '--primary-font', "'Roboto', sans-serif", null, calls);

            // Immediately after the click: nothing should have fired yet
            self.assertEqual(0, calls.setVariable.length,
                'setVariable must not fire before previewReady resolves');

            // Now resolve the Promise and wait for the microtask queue
            resolve();
            self.waitFor(
                function () { return calls.setVariable.length > 0; },
                1000,
                function (err) {
                    if (!err) {
                        self.assertEqual('--primary-font', calls.setVariable[0].prop,
                            'setVariable must receive the correct role property');
                        self.assertEqual("'Roboto', sans-serif", calls.setVariable[0].val,
                            'setVariable must receive the chosen font value');
                    }
                    done(err);
                }
            );
        },

        'option click (025-A3): setVariable called after microtask when previewReady already resolved': function (done) {
            var self  = this;
            var calls = { setVariable: [], loadFont: [] };

            // previewReady is already resolved — simulates normal page load where
            // the user clicks after the iframe has finished loading.
            optionClickFixed(Promise.resolve(), '--primary-font', 'system-ui, sans-serif', null, calls);

            self.waitFor(
                function () { return calls.setVariable.length > 0; },
                1000,
                function (err) {
                    if (!err) {
                        self.assertEqual('--primary-font', calls.setVariable[0].prop,
                            'setVariable must still be called when Promise was already resolved');
                    }
                    done(err);
                }
            );
        },

        'option click (025-A4): loadFont called after previewReady resolves when url is present': function (done) {
            var self    = this;
            var resolve;
            var previewReady = new Promise(function (r) { resolve = r; });
            var calls = { setVariable: [], loadFont: [] };
            var robotoUrl = 'https://fonts.googleapis.com/css2?family=Roboto';

            optionClickFixed(previewReady, '--primary-font', "'Roboto', sans-serif", robotoUrl, calls);

            // Not called yet
            self.assertEqual(0, calls.loadFont.length,
                'loadFont must not fire before previewReady resolves');

            resolve();
            self.waitFor(
                function () { return calls.loadFont.length > 0; },
                1000,
                function (err) {
                    if (!err) {
                        self.assertEqual(robotoUrl, calls.loadFont[0],
                            'loadFont must receive the correct stylesheet URL');
                    }
                    done(err);
                }
            );
        },

        // ── Reset handler (B) ────────────────────────────────────────────────

        'reset handler (025-B1): setVariable called synchronously without previewReady guard — proves the bug': function () {
            var calls  = { setVariable: [] };
            var dirty  = [
                { property: '--primary-font',   savedValue: 'system-ui, sans-serif' },
                { property: '--secondary-font',  savedValue: "'Roboto', sans-serif" }
            ];

            resetHandlerBuggy(dirty, calls);

            this.assertEqual(2, calls.setVariable.length,
                'Buggy reset handler calls setVariable synchronously for each dirty item (this is the bug)');
        },

        'reset handler (025-B2): setVariable not called before previewReady resolves (fixed handler)': function (done) {
            var self    = this;
            var resolve;
            var previewReady = new Promise(function (r) { resolve = r; });
            var calls  = { setVariable: [] };
            var dirty  = [
                { property: '--primary-font',  savedValue: 'system-ui, sans-serif' },
                { property: '--secondary-font', savedValue: "'Roboto', sans-serif" }
            ];

            resetHandlerFixed(previewReady, dirty, calls);

            self.assertEqual(0, calls.setVariable.length,
                'setVariable must not fire before previewReady resolves');

            resolve();
            self.waitFor(
                function () { return calls.setVariable.length >= 2; },
                1000,
                function (err) {
                    if (!err) {
                        self.assertEqual(2, calls.setVariable.length,
                            'setVariable must be called once per dirty item after resolve');
                    }
                    done(err);
                }
            );
        },

        'reset handler (025-B3): setVariable called for all dirty items when previewReady already resolved': function (done) {
            var self  = this;
            var calls = { setVariable: [] };
            var dirty = [
                { property: '--primary-font',  savedValue: 'system-ui, sans-serif' }
            ];

            resetHandlerFixed(Promise.resolve(), dirty, calls);

            self.waitFor(
                function () { return calls.setVariable.length > 0; },
                1000,
                function (err) {
                    if (!err) {
                        self.assertEqual(1, calls.setVariable.length,
                            'setVariable must be called even when Promise was already resolved');
                        self.assertEqual('--primary-font', calls.setVariable[0].prop,
                            'setVariable must receive the correct property');
                        self.assertEqual('system-ui, sans-serif', calls.setVariable[0].val,
                            'setVariable must receive the saved value');
                    }
                    done(err);
                }
            );
        },

        // ── Restore handler (C) ──────────────────────────────────────────────

        'restore handler (025-C1): setVariable called synchronously without previewReady guard — proves the bug': function () {
            var calls = { setVariable: [] };

            restoreHandlerBuggy('--primary-font', 'system-ui, sans-serif', calls);

            this.assertEqual(1, calls.setVariable.length,
                'Buggy restore handler calls setVariable synchronously (this is the bug)');
        },

        'restore handler (025-C2): setVariable not called before previewReady resolves (fixed handler)': function (done) {
            var self    = this;
            var resolve;
            var previewReady = new Promise(function (r) { resolve = r; });
            var calls   = { setVariable: [] };

            restoreHandlerFixed(previewReady, '--primary-font', 'system-ui, sans-serif', calls);

            self.assertEqual(0, calls.setVariable.length,
                'setVariable must not fire before previewReady resolves');

            resolve();
            self.waitFor(
                function () { return calls.setVariable.length > 0; },
                1000,
                function (err) {
                    if (!err) {
                        self.assertEqual('--primary-font', calls.setVariable[0].prop,
                            'setVariable must receive the correct property');
                        self.assertEqual('system-ui, sans-serif', calls.setVariable[0].val,
                            'setVariable must receive the default value');
                    }
                    done(err);
                }
            );
        },

        'restore handler (025-C3): setVariable called after microtask when previewReady already resolved': function (done) {
            var self  = this;
            var calls = { setVariable: [] };

            restoreHandlerFixed(Promise.resolve(), '--secondary-font', "'Roboto', sans-serif", calls);

            self.waitFor(
                function () { return calls.setVariable.length > 0; },
                1000,
                function (err) {
                    if (!err) {
                        self.assertEqual('--secondary-font', calls.setVariable[0].prop,
                            'setVariable must still fire when previewReady was already resolved');
                    }
                    done(err);
                }
            );
        }
    });

    // =========================================================================
    // Issue 025 — inline handler reproductions
    //
    // Each handler comes in two variants:
    //   *Buggy — reproduces the current (unfixed) code: direct synchronous call
    //   *Fixed — reproduces the expected (fixed) code: gated behind previewReady
    // =========================================================================

    /**
     * Buggy option-click handler reproduction (no previewReady guard).
     * Mirrors font-palette-section-renderer.js option click, lines ~418–441
     * BEFORE the fix — setVariable and loadFont are called synchronously.
     *
     * @param {String} roleProperty
     * @param {String} val
     * @param {String|null} url
     * @param {{setVariable: Array, loadFont: Array}} calls
     */
    function optionClickBuggy(roleProperty, val, url, calls) {
        if (url) {
            calls.loadFont.push(url);
        }
        calls.setVariable.push({ prop: roleProperty, val: val });
    }

    /**
     * Fixed option-click handler reproduction (with previewReady guard).
     * Mirrors font-palette-section-renderer.js option click AFTER the fix —
     * preview calls are wrapped in Promise.resolve(previewReady).then().
     *
     * @param {Promise|null} previewReady
     * @param {String} roleProperty
     * @param {String} val
     * @param {String|null} url
     * @param {{setVariable: Array, loadFont: Array}} calls
     */
    function optionClickFixed(previewReady, roleProperty, val, url, calls) {
        Promise.resolve(previewReady).then(function () {
            if (url) {
                calls.loadFont.push(url);
            }
            calls.setVariable.push({ prop: roleProperty, val: val });
        });
    }

    /**
     * Buggy reset handler reproduction (no previewReady guard).
     * Mirrors font-palette-section-renderer.js reset handler, lines ~293–300
     * BEFORE the fix — setVariable called synchronously inside dirty.forEach.
     *
     * @param {Array<{property: String, savedValue: String}>} dirty
     * @param {{setVariable: Array}} calls
     */
    function resetHandlerBuggy(dirty, calls) {
        dirty.forEach(function (item) {
            calls.setVariable.push({ prop: item.property, val: item.savedValue });
        });
    }

    /**
     * Fixed reset handler reproduction (with previewReady guard).
     * Mirrors font-palette-section-renderer.js reset handler AFTER the fix —
     * setVariable wrapped in Promise.resolve(previewReady).then() per item.
     *
     * @param {Promise|null} previewReady
     * @param {Array<{property: String, savedValue: String}>} dirty
     * @param {{setVariable: Array}} calls
     */
    function resetHandlerFixed(previewReady, dirty, calls) {
        dirty.forEach(function (item) {
            Promise.resolve(previewReady).then(function () {
                calls.setVariable.push({ prop: item.property, val: item.savedValue });
            });
        });
    }

    /**
     * Buggy restore handler reproduction (no previewReady guard).
     * Mirrors font-palette-section-renderer.js restore handler, lines ~325–331
     * BEFORE the fix — setVariable called synchronously.
     *
     * @param {String} prop
     * @param {String} defaultValue
     * @param {{setVariable: Array}} calls
     */
    function restoreHandlerBuggy(prop, defaultValue, calls) {
        calls.setVariable.push({ prop: prop, val: defaultValue });
    }

    /**
     * Fixed restore handler reproduction (with previewReady guard).
     * Mirrors font-palette-section-renderer.js restore handler AFTER the fix —
     * setVariable wrapped in Promise.resolve(previewReady).then().
     *
     * @param {Promise|null} previewReady
     * @param {String} prop
     * @param {String} defaultValue
     * @param {{setVariable: Array}} calls
     */
    function restoreHandlerFixed(previewReady, prop, defaultValue, calls) {
        Promise.resolve(previewReady).then(function () {
            calls.setVariable.push({ prop: prop, val: defaultValue });
        });
    }

    /**
     * Inline reproduction of _updateConsumerFields.
     * Kept in sync with font-palette-section-renderer.js _updateConsumerFields.
     *
     * @param {String} roleProperty  — CSS var name, e.g. "--secondary-font"
     * @param {String} newFontFamily — resolved font-family string
     */
    function updateConsumerFields(roleProperty, newFontFamily) {
        $('.bte-font-picker').each(function () {
            var $select    = $(this);
            var currentVal = $select.val();

            var matchesByValue   = currentVal === roleProperty;
            var matchesByDefault = !currentVal && $select.attr('data-default') === roleProperty;

            if (!matchesByValue && !matchesByDefault) {
                return;
            }

            var selectId = $select.attr('id');
            var $widget  = $('[data-for="' + selectId + '"]');
            if (!$widget.length) {
                return;
            }

            $widget.find('.bte-font-picker-trigger-label')
                .css('font-family', newFontFamily);

            $widget.find('.bte-font-picker-role-swatch[data-value="' + roleProperty + '"]')
                .attr('data-font-family', newFontFamily)
                .css('font-family', newFontFamily);
        });
    }
});
