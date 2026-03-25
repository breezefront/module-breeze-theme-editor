define([
    'jquery',
    'jquery-ui-modules/widget',
    'Swissup_BreezeThemeEditor/js/editor/panel/font-palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/badge-renderer',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/panel/icon-registry',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/base-section-renderer'
], function ($, widget, FontPaletteManager, PanelState, CssPreviewManager, BadgeRenderer, Logger, StorageHelper, IconRegistry) {
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
     *
     * Section-level badges (Changed N, Modified N) + Reset button and a single
     * Restore (×) button next to the Modified badge mirror the colour palette
     * section behaviour.  Dirty/modified state is read from PanelState because
     * role fields are saved as ordinary fields.
     *
     * Restore button flow (section-level ×):
     *   - For every modified role: updates picker UI + CSS preview + consumer
     *     cascade immediately, then calls PanelState.restoreToDefault() which
     *     fires the 'field-restore' event picked up by settings-editor.js →
     *     discardDraft() mutation → markFieldAsSaved() → themeEditorDraftSaved
     *     event → _updateHeaderBadges() here.
     */
    $.widget('swissup.fontPaletteSection', $.swissup.baseSectionRenderer, {
        options: {
            fontPalettes: [], // Array from config.fontPalettes
            sections: []      // config.sections (to locate role field sectionCode + fieldCode)
        },

        _create: function () {
            this._super(); // binds bte:editabilityChanged via baseSectionRenderer

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
                        var currentValue = (field.value !== null && field.value !== undefined)
                            ? field.value
                            : (field.default || '');

                        this._roleFields[field.property] = {
                            sectionCode:  section.code,
                            fieldCode:    field.code,
                            currentValue: currentValue
                        };

                        // Publish the live current value so FontPaletteManager.resolveValue()
                        // and font-picker.js renderer both see the real saved font, not just
                        // the static schema default.
                        FontPaletteManager.setCurrentValue(field.property, currentValue);
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

            this.$header          = this.element.find('.bte-font-palette-header');
            this.$content         = this.element.find('.bte-font-palette-content');
            this.$badgesContainer = this.element.find('.bte-font-palette-badges');

            // Restore open/closed state from storage (default: open)
            var storedOpen = StorageHelper.getItem('font_palette_open');
            if (storedOpen !== 'false') {
                this.$header.addClass('active');
                this.$content.addClass('active').show();
            } else {
                this.$content.hide();
            }

            // Show initial badges (Modified N for customised roles)
            this._updateHeaderBadges();

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
            html += '<span class="bte-font-palette-title">' + IconRegistry.render('text-t') + 'Font Palettes</span>';
            html += '<div class="bte-font-palette-header-actions">';
            html += '<div class="bte-font-palette-badges"></div>';
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
         * Build HTML for a single role row (label + custom font picker dropdown + badge slot)
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
                // Let reset-button clicks bubble through to their own handler below
                if ($(e.target).closest('.bte-palette-reset-btn').length) {
                    return;
                }
                e.stopPropagation();

                var isOpen = self.$header.hasClass('active');

                if (isOpen) {
                    self.$header.removeClass('active');
                    self.$content.removeClass('active').slideUp(200);
                } else {
                    self.$header.addClass('active');
                    self.$content.addClass('active').slideDown(200);
                }

                StorageHelper.setItem('font_palette_open', isOpen ? 'false' : 'true');
            });

            // ── Reset button: discard all dirty role changes ─────────────────
            // Uses .bte-palette-reset-btn (same class as color palette section).
            // No conflict because this handler is scoped to this.element
            // (the font palette container), not the color palette container.
            this.element.on('click', '.bte-palette-reset-btn', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var dirty = [];

                Object.keys(self._roleFields).forEach(function (prop) {
                    var rf    = self._roleFields[prop];
                    var state = PanelState.getFieldState(rf.sectionCode, rf.fieldCode);

                    if (state && state.isDirty) {
                        dirty.push({
                            property:   prop,
                            rf:         rf,
                            savedValue: state.savedValue
                        });
                    }
                });

                if (!dirty.length) {
                    return;
                }

                var count = dirty.length;
                var msg   = 'Reset ' + count + ' font role' +
                    (count > 1 ? 's' : '') + ' to saved values?';

                if (!confirm(msg)) {
                    return;
                }

                dirty.forEach(function (item) {
                    PanelState.resetField(item.rf.sectionCode, item.rf.fieldCode);
                    self._roleFields[item.property].currentValue = item.savedValue;
                    FontPaletteManager.setCurrentValue(item.property, item.savedValue);
                    self._updateRolePickerUI(item.property, item.savedValue);
                    CssPreviewManager.setVariable(item.property, item.savedValue, 'font_picker');
                    self._updateConsumerFields(item.property, item.savedValue);
                });

                self._updateHeaderBadges();
                $(document).trigger('paletteColorChanged');

                log.info('Font role reset: ' + count + ' role(s) reverted to saved values');
            });

            // ── Restore button (×): restore ALL modified roles to defaults ────
            // Appears in the section header next to the "Modified (N)" badge.
            // No confirm dialog — matches the UX of the per-field restore button.
            this.element.on('click', '.bte-font-palette-restore-btn', function (e) {
                e.preventDefault();
                e.stopPropagation();

                Object.keys(self._roleFields).forEach(function (prop) {
                    var rf    = self._roleFields[prop];
                    var state = PanelState.getFieldState(rf.sectionCode, rf.fieldCode);

                    if (!state || !state.isModified) {
                        return;
                    }

                    var defaultValue = state.defaultValue;

                    self._updateRolePickerUI(prop, defaultValue);
                    CssPreviewManager.setVariable(prop, defaultValue, 'font_picker');
                    self._roleFields[prop].currentValue = defaultValue;
                    FontPaletteManager.setCurrentValue(prop, defaultValue);
                    self._updateConsumerFields(prop, defaultValue);
                    PanelState.restoreToDefault(rf.sectionCode, rf.fieldCode);

                    log.info('Role restored to default: ' + prop + ' -> ' + defaultValue);
                });

                self._updateHeaderBadges();
                $(document).trigger('paletteColorChanged');
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

                // Keep local role map and FontPaletteManager in sync for cascade,
                // reset, and consumer-field initial render
                if (self._roleFields[roleProperty]) {
                    self._roleFields[roleProperty].currentValue = val;
                }
                FontPaletteManager.setCurrentValue(roleProperty, val);

                // Cascade: update trigger buttons of consumer fields in the
                // accordion that currently reference this role property
                self._updateConsumerFields(roleProperty, val);

                // Update section-level badges (may show "Changed N" now)
                self._updateHeaderBadges();

                // Notify settings-editor to refresh save/reset button counts
                $(document).trigger('paletteColorChanged');

                log.info('Role font changed: ' + roleProperty + ' \u2192 ' + val);
            });

            // ── Listen for palette/field changes ─────────────────────────────
            // Refresh header badges when any field in the panel changes so the
            // count stays in sync.
            this._onPaletteChanged = function () {
                self._updateHeaderBadges();
            };
            $(document).on('paletteColorChanged', this._onPaletteChanged);

            // ── After a successful save / discard ─────────────────────────────
            // settings-editor.js calls PanelState.markAsSaved() (or
            // markFieldAsSaved) before firing themeEditorDraftSaved, so isDirty
            // will be false and isModified will be up-to-date for all fields.
            this._onDraftSaved = function () {
                self._updateHeaderBadges();
                log.debug('Font palette badges refreshed after save');
            };
            $(document).on('themeEditorDraftSaved', this._onDraftSaved);
        },

        /**
         * Compute dirty/modified counts from PanelState for all role fields and
         * render the header badge HTML via BadgeRenderer.
         */
        _updateHeaderBadges: function () {
            if (!this.$badgesContainer || !this.$badgesContainer.length) {
                return;
            }

            var dirty    = 0;
            var modified = 0;

            Object.keys(this._roleFields).forEach(function (prop) {
                var rf    = this._roleFields[prop];
                var state = PanelState.getFieldState(rf.sectionCode, rf.fieldCode);

                if (state) {
                    if (state.isDirty)    { dirty++;    }
                    if (state.isModified) { modified++; }
                }
            }, this);

            // renderPaletteBadges returns '' when both counts are 0.
            // When modified > 0, append a single × restore button right after
            // the Modified badge so the user can reset all roles to defaults.
            var html = BadgeRenderer.renderPaletteBadges(dirty, modified);

            if (modified > 0) {
                html += '<button type="button"' +
                    ' class="bte-font-palette-restore-btn bte-field-restore-btn"' +
                    ' title="Restore all font roles to default values"' +
                    ' aria-label="Remove all font customizations">' +
                    '\u00d7' +
                    '</button>';
            }

            this.$badgesContainer.html(html);

            log.debug('Font palette badges: dirty=' + dirty + ' modified=' + modified);
        },

        /**
         * Update the picker widget UI for a role to reflect a new font value
         * without re-rendering the entire section.
         *
         * @param {String} roleProperty  CSS var name, e.g. "--primary-font"
         * @param {String} fontValue     Font-family string to select
         */
        _updateRolePickerUI: function (roleProperty, fontValue) {
            var $widget = this.element.find(
                '.bte-font-picker-widget[data-role-property="' +
                roleProperty.replace(/"/g, '\\"') + '"]'
            );

            if (!$widget.length) {
                return;
            }

            var $dropdown = $widget.find('.bte-font-picker-dropdown');
            var $trigger  = $widget.find('.bte-font-picker-trigger');

            // Update dropdown selection state
            $dropdown.find('.bte-font-picker-option')
                .removeClass('is-selected')
                .attr('aria-selected', 'false');

            var $opt = $dropdown.find(
                '.bte-font-picker-option[data-value="' + fontValue.replace(/"/g, '\\"') + '"]'
            );
            $opt.addClass('is-selected').attr('aria-selected', 'true');

            // Update trigger button label and font preview
            var label = $opt.length ? $opt.text().trim() : fontValue;
            $trigger.find('.bte-font-picker-trigger-label')
                .text(label)
                .css('font-family', fontValue);
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
                var currentVal = $select.val();

                // Primary match: field has been saved and its value is the role property.
                // Fallback (Issue 020): field was never saved (value is null/empty) but its
                // configured default points to this role property — use data-default attribute
                // which is always rendered in the template regardless of saved value.
                var matchesByValue   = currentVal === roleProperty;
                var matchesByDefault = !currentVal && $select.attr('data-default') === roleProperty;

                if (!matchesByValue && !matchesByDefault) {
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
            this.element.off('click', '.bte-palette-reset-btn');
            this.element.off('click', '.bte-font-palette-restore-btn');
            this.element.off('click', '.bte-font-picker-trigger');
            this.element.off('click', '.bte-font-picker-option');

            if (this._onPaletteChanged) {
                $(document).off('paletteColorChanged', this._onPaletteChanged);
            }
            if (this._onDraftSaved) {
                $(document).off('themeEditorDraftSaved', this._onDraftSaved);
            }

            this._super();
        }
    });

    return $.swissup.fontPaletteSection;
});
