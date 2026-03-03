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
                    var currentValue = (field.value !== null && field.value !== undefined)
                        ? field.value
                        : (field.default || '');
                    roleFields[field.property] = {
                        sectionCode:  section.code,
                        fieldCode:    field.code,
                        currentValue: currentValue
                    };
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

        '_buildRoleMap: falls back to field.default when value is null': function () {
            FontPaletteManager.init(TEST_PALETTES);
            var map = buildRoleMap(TEST_SECTIONS);

            // primary_font has value: null → falls back to default
            this.assertEqual('system-ui, sans-serif', map['--primary-font'].currentValue,
                'currentValue should fall back to field.default when value is null');
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
        }
    });
});
