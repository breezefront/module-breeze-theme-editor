define([
    'mage/template',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/badge-renderer',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function(mageTemplate, PanelState, BadgeRenderer, Logger) {
    'use strict';

    var log = Logger.for('panel/field-renderers/base');

    /**
     * Base Field Renderer
     * All field renderers extend this class
     */
    var BaseFieldRenderer = {
        /**
         * Template (set in subclass via text! plugin)
         */
        templateString: null,

        /**
         * Compiled template cache
         */
        _compiledTemplate: null,

        /**
         * Get compiled template
         *
         * @returns {Function}
         */
        getTemplate: function() {
            if (!this._compiledTemplate && this.templateString) {
                this._compiledTemplate = mageTemplate(this.templateString);
            }
            return this._compiledTemplate;
        },

        /**
         * Render field HTML
         *
         * @param {Object} field - Field config from GraphQL
         * @param {String} sectionCode
         * @returns {String} HTML
         */
        render: function(field, sectionCode) {
            var data = this.prepareData(field, sectionCode);
            var template = this.getTemplate();

            if (!template) {
                log.error('No template for renderer');
                return '';
            }

            return template({ data: data });
        },

        /**
         * Prepare field data for template
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {Object}
         */
        prepareData: function(field, sectionCode) {
            // Validate required properties
            if (!field.code) {
                log.error('Field missing "code" property');
            }
            if (!sectionCode) {
                log.error('Missing sectionCode for field: ' + (field.code || 'unknown'));
            }

            var fieldCode = field.code || 'unknown';

            // ✅ Get runtime state from PanelState (if initialized)
            var fieldState = PanelState.getFieldState(sectionCode, fieldCode);

            // Use runtime state if available, otherwise fallback to field data
            var currentValue = fieldState
                ? fieldState.value
                : (field.value !== undefined && field.value !== null ? field.value : field.default);

            var isModified = fieldState
                ?  fieldState.isModified
                : !!field.isModified;

            var isDirty = fieldState
                ? fieldState.isDirty
                : false;

            return {
                sectionCode: sectionCode,
                code: fieldCode,
                label: field.label || 'Unnamed Field',
                description: field.description || '',
                helpText: field.helpText || '',
                value: currentValue,
                default: field.default,
                property: field.property || '',
                placeholder: field.placeholder || '',
                required: !!field.required,
                isModified: isModified,
                isDirty: isDirty,
                badgesHtml: this.renderBadges(isDirty, isModified, sectionCode, fieldCode),
                validation: field.validation || {},
                params: field.params || {},
                fieldId: 'field-' + fieldCode
            };
        },

        /**
         * Render status badges HTML
         *
         * Delegates to BadgeRenderer module for modular badge rendering.
         * 
         * @param {Boolean} isDirty - Has unsaved changes
         * @param {Boolean} isModified - Different from default (saved)
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {String} HTML
         */
        renderBadges: function(isDirty, isModified, sectionCode, fieldCode) {
            return BadgeRenderer.renderFieldBadges(isDirty, isModified, sectionCode, fieldCode);
        },

        /**
         * Update field badges in DOM without re-rendering entire field
         *
         * @param {jQuery} $element - Panel element
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {Boolean} Success
         */
        updateFieldBadges: function($element, sectionCode, fieldCode) {
            var fieldState = PanelState.getFieldState(sectionCode, fieldCode);

            if (!fieldState) {
                log.warn('Field state not found: ' + sectionCode + '.' + fieldCode);
                return false;
            }
            
            log.debug('updateFieldBadges called: ' + sectionCode + '.' + fieldCode);
            log.debug('Field state: ' + JSON.stringify({
                value: fieldState.value,
                savedValue: fieldState.savedValue,
                defaultValue: fieldState.defaultValue,
                isDirty: fieldState.isDirty,
                isModified: fieldState.isModified
            }));

            // Find field container by input element
            var $input = $element.find('[data-section="' + sectionCode + '"][data-field="' + fieldCode + '"]');

            if ($input.length === 0) {
                log.warn('Field input not found in DOM: ' + sectionCode + '.' + fieldCode);
                return false;
            }

            var $field = $input.closest('.bte-field');

            if ($field.length === 0) {
                log.warn('Field container not found: ' + sectionCode + '.' + fieldCode);
                return false;
            }

            // Update field state classes
            $field.toggleClass('bte-field-modified', fieldState.isModified);
            $field.toggleClass('bte-field-dirty', fieldState.isDirty);

            // Update badges in header
            var $header = $field.find('.bte-field-header');

            if ($header.length === 0) {
                log.warn('Field header not found: ' + sectionCode + '.' + fieldCode);
                return false;
            }

            // Remove old badges, groups and action buttons
            $header.find('.bte-badge, .bte-badge-group, .bte-field-reset-btn, .bte-field-restore-btn').remove();

            // Generate and append new badges
            var badgesHtml = this.renderBadges(fieldState.isDirty, fieldState.isModified, sectionCode, fieldCode);

            if (badgesHtml) {
                $header.append(badgesHtml);
            }

            log.debug('Badges updated: ' + sectionCode + '.' + fieldCode + ' isDirty=' + fieldState.isDirty + ' isModified=' + fieldState.isModified);

            return true;
        },

        /**
         * Build data attributes string
         *
         * @param {Object} field
         * @param {String} sectionCode
         * @returns {String}
         */
        buildDataAttributes: function(field, sectionCode) {
            var fieldCode = field.code || 'unknown';

            var attrs = [
                'data-section="' + sectionCode + '"',
                'data-field="' + fieldCode + '"',
                'data-type="' + (field.type || 'unknown') + '"'
            ];

            if (field.property) {
                attrs.push('data-property="' + field.property + '"');
            }

            if (field.default !== undefined) {
                attrs.push('data-default="' + field.default + '"');
            }

            return attrs.join(' ');
        }
    };

    return BaseFieldRenderer;
});
