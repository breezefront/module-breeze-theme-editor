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
    'text!Swissup_BreezeThemeEditor/template/theme-editor/badges/dirty.html',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/badges/modified.html',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/badges/reset-button.html'
], function($, mageTemplate, dirtyTemplate, modifiedTemplate, resetButtonTemplate) {
    'use strict';

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
         * Render all badges for a field
         * 
         * Main entry point for rendering field badges. Combines dirty badge,
         * reset button, and modified badge based on field state.
         * 
         * Rendering rules:
         * - isDirty=true: Shows "Changed" badge + Reset button
         * - isModified=true: Shows "Modified" badge
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
            
            // Dirty state: Changed badge + Reset button
            if (isDirty) {
                html += this.renderDirtyBadge();
                html += this.renderResetButton(sectionCode, fieldCode);
            }
            
            // Modified state: Modified badge
            if (isModified) {
                html += this.renderModifiedBadge();
            }
            
            return html;
        },

        /**
         * Render Modified badge for palette swatch
         * 
         * Future use: Indicates palette color differs from theme default.
         * Currently reuses Modified badge template.
         * 
         * @param {String} colorName - Palette color identifier (e.g., 'primary')
         * @returns {String} HTML for palette modified badge
         */
        renderPaletteBadge: function(colorName) {
            // For now, reuse modified badge template
            // TODO: Create separate palette badge template if needed
            return this.renderModifiedBadge();
        }
    };
});
