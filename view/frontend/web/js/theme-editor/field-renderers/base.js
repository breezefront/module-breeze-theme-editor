define([
    'mage/template',
    'Swissup_BreezeThemeEditor/js/theme-editor/panel-state'
], function(mageTemplate, PanelState) {
    'use strict';

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
                console.error('❌ No template for renderer:', this);
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
                console.error('❌ Field missing "code" property:', field);
            }
            if (!sectionCode) {
                console.error('❌ Missing sectionCode for field:', field.code || 'unknown');
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
                cssVar: field.cssVar || '',
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
         * @param {Boolean} isDirty - Has unsaved changes
         * @param {Boolean} isModified - Different from default (saved)
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {String} HTML
         */
        renderBadges: function(isDirty, isModified, sectionCode, fieldCode) {
            // Lazy load and cache badge template
            if (!this._badgeTemplate) {
                var templateString = 
                    '<% if (data.isDirty) { %>' +
                        '<span class="bte-badge bte-badge-dirty" title="You have unsaved changes for this field">' +
                            '<span class="bte-badge-icon">●</span> Changed' +
                        '</span>' +
                        '<button type="button" ' +
                                'class="bte-field-reset-btn" ' +
                                'data-field-code="<%= data.fieldCode %>" ' +
                                'data-section-code="<%= data.sectionCode %>" ' +
                                'title="Discard unsaved changes" ' +
                                'aria-label="Reset field to draft value">↺</button>' +
                    '<% } %>' +
                    '<% if (data.isModified) { %>' +
                        '<span class="bte-badge bte-badge-modified" title="This field has been customized from its default value">Modified</span>' +
                    '<% } %>';
                
                this._badgeTemplate = mageTemplate(templateString);
            }

            // Render badges using template
            return this._badgeTemplate({
                data: {
                    isDirty: isDirty,
                    isModified: isModified,
                    sectionCode: sectionCode,
                    fieldCode: fieldCode
                }
            });
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
                console.warn('⚠️ Field state not found:', sectionCode + '.' + fieldCode);
                return false;
            }

            // Find field container by input element
            var $input = $element.find('[data-section="' + sectionCode + '"][data-field="' + fieldCode + '"]');

            if ($input.length === 0) {
                console.warn('⚠️ Field input not found in DOM:', sectionCode + '.' + fieldCode);
                return false;
            }

            var $field = $input.closest('.bte-field');

            if ($field.length === 0) {
                console.warn('⚠️ Field container not found:', sectionCode + '.' + fieldCode);
                return false;
            }

            // Update field state classes
            $field.toggleClass('bte-field-modified', fieldState.isModified);
            $field.toggleClass('bte-field-dirty', fieldState.isDirty);

            // Update badges in header
            var $header = $field.find('.bte-field-header');

            if ($header.length === 0) {
                console.warn('⚠️ Field header not found:', sectionCode + '.' + fieldCode);
                return false;
            }

            // Remove old badges and reset button
            $header.find('.bte-badge, .bte-field-reset-btn').remove();

            // Generate and append new badges
            var badgesHtml = this.renderBadges(fieldState.isDirty, fieldState.isModified, sectionCode, fieldCode);

            if (badgesHtml) {
                $header.append(badgesHtml);
            }

            console.log('🔄 Badges updated:', sectionCode + '.' + fieldCode, {
                isDirty: fieldState.isDirty,
                isModified: fieldState.isModified
            });

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

            if (field.cssVar) {
                attrs.push('data-css-var="' + field.cssVar + '"');
            }

            if (field.default !== undefined) {
                attrs.push('data-default="' + field.default + '"');
            }

            return attrs.join(' ');
        }
    };

    return BaseFieldRenderer;
});
