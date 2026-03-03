define([
    'jquery',
    'jquery-ui-modules/widget',
    'Swissup_BreezeThemeEditor/js/editor/panel/font-palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, widget, FontPaletteManager, PanelState, CssPreviewManager, Logger) {
    'use strict';

    var log = Logger.for('panel/font-palette-section');

    /**
     * Font Palette Section Renderer
     *
     * Renders the named font role pickers in a dedicated section outside the
     * accordion.  Analogous to palette-section-renderer.js for color palettes.
     *
     * Each font palette has a list of named roles (Primary, Secondary, Utility).
     * This widget renders a custom font picker for each role, showing only the
     * palette options[] list (no role swatches — that would be self-referencing).
     *
     * On selection the widget:
     *   1. Updates PanelState (role field sectionCode + fieldCode) so the value
     *      is included in the normal save mutation.
     *   2. Updates the CSS preview via CssPreviewManager.setVariable() so
     *      var(--primary-font) resolves immediately in the preview iframe.
     *   3. Cascades to consumer fields in the accordion whose current value
     *      references this role property — updates their trigger button
     *      font-family so the UI reflects the new typeface.
     *   4. Fires paletteColorChanged to trigger _updateChangesCount() in
     *      settings-editor.js (updates the Save button counter).
     */
    $.widget('swissup.fontPaletteSection', {
        options: {
            fontPalettes: [], // Array from config.fontPalettes
            sections: []      // config.sections (to locate role field sectionCode + fieldCode)
        },

        _create: function () {
            log.info('Initializing Font Palette Section');
            this._buildRoleMap();
            this._render();
            this._bind();
        },

        /**
         * Build a map of CSS property → { sectionCode, fieldCode, currentValue }
         * by scanning config.sections for fields that are palette role definitions.
         */
        _buildRoleMap: function () {
            this._roleFields = {};

            (this.options.sections || []).forEach(function (section) {
                (section.fields || []).forEach(function (field) {
                    if (field.property && FontPaletteManager.getRole(field.property)) {
                        this._roleFields[field.property] = {
                            sectionCode:  section.code,
                            fieldCode:    field.code,
                            currentValue: (field.value !== null && field.value !== undefined)
                                ? field.value
                                : (field.default || '')
                        };
                    }
                }.bind(this));
            }.bind(this));

            log.debug('Role map built: ' + Object.keys(this._roleFields).length + ' roles');
        },

        /**
         * Render the font palette section HTML
         */
        _render: function () {
            if (!this.options.fontPalettes || this.options.fontPalettes.length === 0) {
                this.element.hide();
                return;
            }

            this.element.show();
            this.element.html(this._buildSectionHtml());

            this.$header  = this.element.find('.bte-font-palette-header');
            this.$content = this.element.find('.bte-font-palette-content');

            // Open by default
            this.$header.addClass('active');
            this.$content.addClass('active').show();

            log.debug('Font palette section rendered');
        },

        /**
         * Build the outer section shell HTML
         *
         * @returns {String}
         */
        _buildSectionHtml: function () {
            var html = '<div class="bte-font-palette-section">';

            html += '<div class="bte-font-palette-header">';
            html += '<span class="bte-font-palette-title">Font Palettes</span>';
            html += '<div class="bte-font-palette-header-actions">';
            html += '<i class="bte-icon-chevron-down bte-font-palette-arrow"></i>';
            html += '</div>';
            html += '</div>';

            html += '<div class="bte-font-palette-content">';
            html += '<div class="bte-font-palette-roles">';

            var self = this;
            (this.options.fontPalettes || []).forEach(function (palette) {
                (palette.fonts || []).forEach(function (role) {
                    html += self._buildRoleRowHtml(palette, role);
                });
            });

            html += '</div>'; // .bte-font-palette-roles
            html += '</div>'; // .bte-font-palette-content
            html += '</div>'; // .bte-font-palette-section

            return html;
        },

        /**
         * Build HTML for a single role row (label + custom font picker dropdown)
         *
         * @param {Object} palette
         * @param {Object} role
         * @returns {String}
         */
        _buildRoleRowHtml: function (palette, role) {
            var roleField     = this._roleFields[role.property] || {};
            var currentValue  = roleField.currentValue || role.default;
            var stylesheetMap = FontPaletteManager.getStylesheetMap(palette.id);

            // Resolve the label and font-family for the currently selected option
            var selectedLabel  = currentValue; // fallback: show raw value
            var selectedFamily = currentValue;

            (palette.options || []).forEach(function (opt) {
                if (opt.value === currentValue) {
                    selectedLabel  = opt.label;
                    selectedFamily = opt.value;
                }
            });

            var html = '<div class="bte-font-role-row">';

            // Row label (e.g. "Primary")
            html += '<label class="bte-font-role-label">' +
                this._escapeHtml(role.label) + '</label>';

            // Font picker widget — same visual structure as consumer field pickers
            // but without a hidden <select> (values flow directly through PanelState).
            // data-role-property links this widget to its CSS variable.
            // data-section + data-field enable PanelState.setValue().
            html += '<div class="bte-font-picker-widget"' +
                ' data-role-property="' + this._escapeAttr(role.property) + '"' +
                ' data-section="' + this._escapeAttr(roleField.sectionCode || '') + '"' +
                ' data-field="' + this._escapeAttr(roleField.fieldCode || '') + '"' +
                ' data-font-stylesheets="' +
                    this._escapeAttr(JSON.stringify(stylesheetMap)) + '">';

            // Trigger button
            html += '<button type="button" class="bte-font-picker-trigger"' +
                ' aria-haspopup="listbox" aria-expanded="false">';
            html += '<span class="bte-font-picker-trigger-label"' +
                ' style="font-family: ' + this._escapeAttr(selectedFamily) + ';">' +
                this._escapeHtml(selectedLabel) + '</span>';
            html += '<span class="bte-font-picker-trigger-arrow"></span>';
            html += '</button>';

            // Dropdown options list (no role swatches — role pickers are self)
            html += '<div class="bte-font-picker-dropdown" role="listbox" hidden>';

            (palette.options || []).forEach(function (opt) {
                var isSel = opt.value === currentValue;
                html += '<div class="bte-font-picker-option' + (isSel ? ' is-selected' : '') + '"' +
                    ' role="option"' +
                    ' aria-selected="' + (isSel ? 'true' : 'false') + '"' +
                    ' data-value="' + this._escapeAttr(opt.value) + '"' +
                    ' style="font-family: ' + this._escapeAttr(opt.value) + ';">' +
                    this._escapeHtml(opt.label) +
                    '</div>';
            }.bind(this));

            html += '</div>'; // .bte-font-picker-dropdown
            html += '</div>'; // .bte-font-picker-widget
            html += '</div>'; // .bte-font-role-row

            return html;
        },

        /**
         * Bind event handlers
         */
        _bind: function () {
            var self = this;

            // ── Accordion toggle ─────────────────────────────────────────────
            this.element.on('click', '.bte-font-palette-header', function (e) {
                e.stopPropagation();

                var isOpen = self.$header.hasClass('active');

                if (isOpen) {
                    self.$header.removeClass('active');
                    self.$content.removeClass('active').slideUp(200);
                } else {
                    self.$header.addClass('active');
                    self.$content.addClass('active').slideDown(200);
                }
            });

            // ── Trigger button: open / close dropdown ────────────────────────
            // stopPropagation prevents the panel-level simple.js handler from
            // also firing on the same click (it would try to drive a missing
            // hidden <select> via data-for, which doesn't exist for role pickers).
            this.element.on('click', '.bte-font-picker-trigger', function (e) {
                e.stopPropagation();

                var $trigger  = $(this);
                var $widget   = $trigger.closest('.bte-font-picker-widget');
                var $dropdown = $widget.find('.bte-font-picker-dropdown');
                var isOpen    = !$dropdown.prop('hidden');

                // Close any other open dropdowns inside this section first
                self.element.find('.bte-font-picker-dropdown:not([hidden])').each(function () {
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

                // Load all font stylesheets into the admin document so the
                // option labels render in their own typefaces
                var map = JSON.parse($widget.attr('data-font-stylesheets') || '{}');
                $.each(map, function (val, url) {
                    if (url && !$('link[href="' + url + '"]', document).length) {
                        $('<link>', { rel: 'stylesheet', href: url }).appendTo(document.head);
                    }
                });

                $dropdown.prop('hidden', false);
                $trigger.attr('aria-expanded', 'true');

                // Scroll selected option into view
                var $selected = $dropdown.find('.bte-font-picker-option.is-selected');
                if ($selected.length) {
                    $selected[0].scrollIntoView({ block: 'nearest' });
                }
            });

            // ── Option click: select a font for this role ────────────────────
            // stopPropagation prevents simple.js from also firing (it would
            // look for data-for / hidden <select> that don't exist here).
            this.element.on('click', '.bte-font-picker-option', function (e) {
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

                // Update selection state in dropdown
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

                // Load external stylesheet if required (e.g. Google Fonts)
                var map = JSON.parse($widget.attr('data-font-stylesheets') || '{}');
                var url = map[val];
                if (url) {
                    CssPreviewManager.loadFont(url);
                }

                // Persist value via PanelState so _save() includes this field
                if (sectionCode && fieldCode) {
                    PanelState.setValue(sectionCode, fieldCode, val);
                }

                // Reflect change immediately in the CSS preview iframe
                CssPreviewManager.setVariable(roleProperty, val, 'font_picker');

                // Keep local role map in sync for cascade
                if (self._roleFields[roleProperty]) {
                    self._roleFields[roleProperty].currentValue = val;
                }

                // Cascade: update trigger buttons of consumer fields in the
                // accordion that currently reference this role property
                self._updateConsumerFields(roleProperty, val);

                // Notify settings-editor to refresh save/reset button counts
                $(document).trigger('paletteColorChanged');

                log.info('Role font changed: ' + roleProperty + ' \u2192 ' + val);
            });
        },

        /**
         * Cascade update: when a role font changes, find all consumer font_picker
         * fields in the accordion whose current value is this role property (e.g.
         * "--primary-font") and update their trigger button to show the new font.
         *
         * Also updates the matching role swatch's data-font-family attribute so
         * that a subsequent swatch click resolves to the new font.
         *
         * @param {String} roleProperty  CSS var name, e.g. "--primary-font"
         * @param {String} newFontFamily  Actual font-family string, e.g. "'Roboto', sans-serif"
         */
        _updateConsumerFields: function (roleProperty, newFontFamily) {
            $('.bte-font-picker').each(function () {
                var $select = $(this);
                if ($select.val() !== roleProperty) {
                    return;
                }

                // Locate the custom widget that drives this hidden select
                var selectId = $select.attr('id');
                var $widget  = $('[data-for="' + selectId + '"]');
                if (!$widget.length) {
                    return;
                }

                // Update trigger label's font preview (text / role label is unchanged)
                $widget.find('.bte-font-picker-trigger-label')
                    .css('font-family', newFontFamily);

                // Update font-family on the matching role swatch in the dropdown
                // so its inline preview and the data-font-family fallback are current
                $widget.find('.bte-font-picker-role-swatch[data-value="' + roleProperty + '"]')
                    .attr('data-font-family', newFontFamily)
                    .css('font-family', newFontFamily);
            });

            log.debug('Consumer fields updated for role: ' + roleProperty);
        },

        // ── HTML helpers ─────────────────────────────────────────────────────

        _escapeHtml: function (str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        },

        _escapeAttr: function (str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;');
        },

        /**
         * Destroy widget
         */
        _destroy: function () {
            this.element.off('click', '.bte-font-palette-header');
            this.element.off('click', '.bte-font-picker-trigger');
            this.element.off('click', '.bte-font-picker-option');
            this._super();
        }
    });

    return $.swissup.fontPaletteSection;
});
