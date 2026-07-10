/**
 * Badge Renderer - Centralized badge and button rendering
 * 
 * Renders status badges and action buttons for Theme Editor fields:
 * - "Changed" badge (dirty state - unsaved changes)
 * - "Modified" badge (saved but different from default)
 * - Reset button (discard unsaved changes)
 * 
 * Uses separate HTML templates for each component for better maintainability.
 * Templates are lazy-loaded and cached using mageTemplate.
 * 
 * @module BadgeRenderer
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/badges/dirty.html',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/badges/modified.html',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/badges/reset-button.html',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/badges/restore-button.html',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/badges/highlight-icon.html',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/badges/palette-changed.html',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/badges/palette-reset-button.html',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/badges/palette-modified.html'
], function($, mageTemplate, dirtyTemplate, modifiedTemplate, resetButtonTemplate, restoreButtonTemplate,
            highlightIconTemplate,
            paletteChangedTemplate, paletteResetTemplate, paletteModifiedTemplate) {
    'use strict';

    var MEDIA_DEVICE_ALIASES = ['mobile', 'tablet', 'desktop'];

    var MEDIA_DEVICE_ICONS = {
        desktop: require.toUrl('Swissup_BreezeThemeEditor/images/Desktop.svg'),
        tablet:  require.toUrl('Swissup_BreezeThemeEditor/images/Tablet.svg'),
        mobile:  require.toUrl('Swissup_BreezeThemeEditor/images/Phone.svg')
    };

    return {
        /**
         * Compiled template cache
         * @private
         */
        _templates: {},

        /**
         * Get or compile a template
         * 
         * Templates are compiled once and cached for performance.
         * 
         * @private
         * @param {String} name - Template identifier (e.g., 'dirty', 'modified', 'reset')
         * @param {String} templateString - Raw HTML template string
         * @returns {Function} Compiled mageTemplate function
         */
        _getTemplate: function(name, templateString) {
            if (!this._templates[name]) {
                this._templates[name] = mageTemplate(templateString);
            }
            return this._templates[name];
        },

        /**
         * Render "Changed" badge (dirty state)
         * 
         * Indicates field has unsaved changes. Appears with pulsing animation.
         * 
         * @returns {String} HTML for dirty badge
         */
        renderDirtyBadge: function() {
            var template = this._getTemplate('dirty', dirtyTemplate);
            return template({});
        },

        /**
         * Render "Modified" badge
         * 
         * Indicates field value differs from default (saved customization).
         * 
         * @returns {String} HTML for modified badge
         */
        renderModifiedBadge: function() {
            var template = this._getTemplate('modified', modifiedTemplate);
            return template({});
        },

        /**
         * Render Reset button
         * 
         * Button to discard unsaved changes and revert to draft value.
         * Appears next to "Changed" badge when field is dirty.
         * 
         * @param {String} sectionCode - Section identifier (e.g., 'general')
         * @param {String} fieldCode - Field identifier (e.g., 'primary_color')
         * @returns {String} HTML for reset button
         */
        renderResetButton: function(sectionCode, fieldCode) {
            var template = this._getTemplate('reset', resetButtonTemplate);
            return template({
                data: {
                    sectionCode: sectionCode,
                    fieldCode: fieldCode
                }
            });
        },

        /**
         * Render Restore button
         * 
         * Button to restore field to its default value (removes customization).
         * Appears next to "Modified" badge when field differs from default.
         * 
         * @param {String} sectionCode - Section identifier (e.g., 'general')
         * @param {String} fieldCode - Field identifier (e.g., 'primary_color')
         * @returns {String} HTML for restore button
         */
        renderRestoreButton: function(sectionCode, fieldCode) {
            var template = this._getTemplate('restore', restoreButtonTemplate);
            return template({
                data: {
                    sectionCode: sectionCode,
                    fieldCode: fieldCode
                }
            });
        },

        /**
         * Render the per-field "highlight" icon button.
         *
         * Clicking it marks the live-preview elements affected by this
         * field's CSS variable (panel/highlight-overlay.js). Rendered once
         * at initial field template compile (not part of renderFieldBadges,
         * which gets fully regenerated on every value change from
         * PanelState data that has no `property`).
         *
         * @param {String} property - Field's CSS variable (e.g. '--base-color')
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {String} HTML for the highlight icon, or '' when the field has no CSS variable
         */
        renderHighlightIcon: function(property, sectionCode, fieldCode) {
            if (!property) {
                return '';
            }
            var template = this._getTemplate('highlightIcon', highlightIconTemplate);
            return template({
                data: {
                    property: property,
                    sectionCode: sectionCode,
                    fieldCode: fieldCode
                }
            });
        },

        /**
         * Render all badges for a field
         * 
         * Main entry point for rendering field badges. Combines dirty badge,
         * reset button, modified badge, and restore button based on field state.
         * 
         * Rendering rules:
         * - isDirty=true: Shows "Changed" badge + Reset button
         * - isModified=true: Shows "Modified" badge + Restore button
         * - Both can be shown simultaneously
         * - Returns empty string if neither state is active
         * 
         * @param {Boolean} isDirty - Field has unsaved changes
         * @param {Boolean} isModified - Field differs from default (saved)
         * @param {String} sectionCode - Section identifier
         * @param {String} fieldCode - Field identifier
         * @returns {String} Combined HTML for all applicable badges
         */
        renderFieldBadges: function(isDirty, isModified, sectionCode, fieldCode) {
            var html = '';

            // Dirty state: Changed badge + Reset button — grouped so button sticks to badge
            if (isDirty) {
                html += '<span class="bte-badge-group">';
                html += this.renderDirtyBadge();
                html += this.renderResetButton(sectionCode, fieldCode);
                html += '</span>';
            }

            // Modified state: Modified badge + Restore button — grouped so button sticks to badge
            if (isModified) {
                html += '<span class="bte-badge-group">';
                html += this.renderModifiedBadge();
                html += this.renderRestoreButton(sectionCode, fieldCode);
                html += '</span>';
            }

            return html;
        },

        /**
         * Check if alias is a known device alias
         *
         * @param {String} alias
         * @returns {Boolean}
         */
        isKnownMediaAlias: function(alias) {
            return !!alias && MEDIA_DEVICE_ALIASES.indexOf(alias) !== -1;
        },

        /**
         * Render media device badge with SVG icon
         *
         * @param {String} alias - 'mobile' | 'tablet' | 'desktop'
         * @returns {String} HTML or empty string
         */
        renderMediaBadge: function(alias) {
            if (!this.isKnownMediaAlias(alias)) {
                return '';
            }
            var label = alias.charAt(0).toUpperCase() + alias.slice(1);
            var icon  = MEDIA_DEVICE_ICONS[alias];
            return '<span class="bte-badge bte-badge-media" title="' + label + '">'
                 + '<img src="' + icon + '" width="12" height="12" alt="">'
                 + ' ' + label
                 + '</span>';
        },

        /**
         * Render "Changed" badge for palette header (with count)
         * 
         * Indicates palette section has unsaved color changes.
         * Shows count of dirty colors.
         * 
         * @param {Number} count - Number of unsaved palette colors
         * @returns {String} HTML for palette changed badge
         */
        renderPaletteChangedBadge: function(count) {
            var template = this._getTemplate('paletteChanged', paletteChangedTemplate);
            return template({ data: { count: count } });
        },

        /**
         * Render Reset button for palette header
         * 
         * Button to discard all unsaved palette changes.
         * Appears next to "Changed" badge when palette has dirty colors.
         * 
         * @returns {String} HTML for palette reset button
         */
        renderPaletteResetButton: function() {
            var template = this._getTemplate('paletteReset', paletteResetTemplate);
            return template({});
        },

        /**
         * Render "Modified" badge for palette header (with count)
         * 
         * Indicates palette has saved colors that differ from theme defaults.
         * Shows count of modified colors.
         * 
         * @param {Number} count - Number of saved colors different from defaults
         * @returns {String} HTML for palette modified badge
         */
        renderPaletteModifiedBadge: function(count) {
            var template = this._getTemplate('paletteModified', paletteModifiedTemplate);
            return template({ data: { count: count } });
        },

        /**
         * Render all palette header badges (Changed + Reset + Modified)
         * 
         * Main entry point for rendering palette section badges.
         * Combines changed badge, reset button, and modified badge based on state.
         * 
         * Rendering rules:
         * - dirtyCount > 0: Shows "Changed (N)" badge + Reset button
         * - modifiedCount > 0: Shows "Modified (N)" badge
         * - Both can be shown simultaneously
         * - Returns empty string if both counts are 0
         * 
         * @param {Number} dirtyCount - Count of unsaved palette colors
         * @param {Number} modifiedCount - Count of saved colors != defaults
         * @returns {String} Combined HTML for all palette badges
         */
        renderPaletteBadges: function(dirtyCount, modifiedCount) {
            var html = '';
            
            // Changed badge + Reset button (if has dirty colors)
            if (dirtyCount > 0) {
                html += this.renderPaletteChangedBadge(dirtyCount);
                html += this.renderPaletteResetButton();
            }
            
            // Modified badge (if has modified colors)
            if (modifiedCount > 0) {
                html += this.renderPaletteModifiedBadge(modifiedCount);
            }
            
            return html;
        }
    };
});
