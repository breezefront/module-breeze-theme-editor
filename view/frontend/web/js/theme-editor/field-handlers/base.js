define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/theme-editor/panel-state',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager'
], function ($, PanelState, CssPreviewManager) {
    'use strict';

    /**
     * Base Field Change Handler
     *
     * Handles common logic for all field types:
     * - Extract field data from DOM
     * - Update PanelState
     * - Trigger CSS preview
     * - Invoke callback
     */
    return {
        /**
         * Handle field change (called by specific handlers)
         *
         * @param {jQuery} $input - Input element
         * @param {Function} callback - Callback after change
         * @param {Object} options - Additional options
         */
        handleChange: function($input, callback, options) {
            options = options || {};

            var fieldData = this.extractFieldData($input);

            if (! fieldData.sectionCode || ! fieldData.fieldCode) {
                console.warn('⚠️ Missing data attributes:', {
                    element: $input[0],
                    class: $input.attr('class'),
                    data: fieldData
                });
                return false;
            }

            // Auto-detect type if not set
            if (!fieldData.type && ! options.skipTypeDetection) {
                fieldData.type = this.detectFieldType($input);
            }

            // Allow custom value extraction
            if (options.getValue && typeof options.getValue === 'function') {
                fieldData.value = options.getValue($input, fieldData);
            }

            // Update state
            PanelState.setValue(fieldData.sectionCode, fieldData.fieldCode, fieldData.value);

            // Live preview
            if (fieldData.cssVar && ! options.skipPreview) {
                CssPreviewManager.setVariable(fieldData.cssVar, fieldData.value, fieldData.type);
            }

            // Callback
            if (callback && typeof callback === 'function') {
                callback(fieldData);
            }

            console.log('🔄 Field changed:', {
                section: fieldData.sectionCode,
                field: fieldData.fieldCode,
                type: fieldData.type,
                value: fieldData.value,
                cssVar: fieldData.cssVar
            });

            return true;
        },

        /**
         * Extract field data from input element
         *
         * @param {jQuery} $input
         * @returns {Object}
         */
        extractFieldData:  function($input) {
            return {
                sectionCode: $input.data('section'),
                fieldCode: $input.data('field'),
                cssVar: $input.data('css-var'),
                type: $input.data('type'),
                value: this.getInputValue($input),
                defaultValue: $input.data('default')
            };
        },

        /**
         * Get input value based on element type
         *
         * @param {jQuery} $input
         * @returns {String|Boolean|null}
         */
        getInputValue: function($input) {
            var type = $input.attr('type');

            if (type === 'checkbox') {
                return $input.prop('checked');
            }

            if (type === 'radio') {
                // Only return value if this radio is checked
                return $input.is(':checked') ? $input.val() : null;
            }

            // For color fields: check if user selected from palette
            if ($input.hasClass('bte-color-input')) {
                var paletteRef = $input.attr('data-palette-ref');
                if (paletteRef) {
                    console.log('🔗 Using palette reference:', paletteRef);
                    return paletteRef; // Return --color-brand-amber-primary (without var())
                }
            }

            return $input.val();
        },

        /**
         * Auto-detect field type by CSS class
         *
         * @param {jQuery} $input
         * @returns {String|null}
         */
        detectFieldType: function($input) {
            var classList = $input.attr('class') || '';

            var typeMap = {
                'bte-color-picker': 'color',
                'bte-color-input': 'color',
                'bte-range-slider': 'range',
                'bte-number-input': 'number',
                'bte-text-input': 'text',
                'bte-textarea': 'textarea',
                'bte-code-editor': 'code',
                'bte-select': 'select',
                'bte-font-picker': 'font_picker',
                'bte-toggle-input': 'toggle',
                'bte-scheme-input': 'color_scheme',
                'bte-icon-set-input': 'icon_set_picker',
                'bte-social-link-input': 'social_links'
            };

            for (var className in typeMap) {
                if (classList.indexOf(className) !== -1) {
                    return typeMap[className];
                }
            }

            console.warn('⚠️ Unknown field type for class:', classList);
            return null;
        },

        /**
         * Validate input value
         *
         * @param {jQuery} $input
         * @param {*} value
         * @returns {Boolean}
         */
        validate: function($input, value) {
            var pattern = $input.attr('pattern');
            var minLength = $input.attr('minlength');
            var maxLength = $input.attr('maxlength');
            var min = $input.attr('min');
            var max = $input.attr('max'); // fixed: removed extra space before .attr
            var required = $input.prop('required');

            // Required check
            if (required && (! value || value === '')) {
                return false;
            }

            // Pattern check
            if (pattern && value) {
                var regex = new RegExp(pattern);
                if (!regex.test(value)) {
                    return false;
                }
            }

            // Length checks
            if (minLength && value && value.length < parseInt(minLength)) {
                return false;
            }
            if (maxLength && value && value.length > parseInt(maxLength)) {
                return false;
            }

            // Numeric range checks
            if (min && value && parseFloat(value) < parseFloat(min)) {
                return false;
            }
            if (max && value && parseFloat(value) > parseFloat(max)) {
                return false;
            }

            return true;
        },

        /**
         * Handle field reset button click
         * Restores draft value and clears dirty state
         * 
         * @param {jQuery} $resetBtn - Reset button element
         */
        handleFieldReset: function($resetBtn) {
            var fieldCode = $resetBtn.data('field-code');
            var sectionCode = $resetBtn.data('section-code');
            
            console.log('↺ Reset clicked:', sectionCode + '.' + fieldCode);
            
            // Show confirmation dialog
            if (!window.confirm('Discard unsaved changes?')) {
                console.log('↺ Reset cancelled by user');
                return;
            }
            
            // Get draft value from PanelState
            var draftValue = PanelState.getDraftValue(sectionCode, fieldCode);
            
            if (draftValue === undefined) {
                console.warn('⚠️ No draft value found for', sectionCode + '.' + fieldCode);
                return;
            }
            
            // Reset field in state (removes dirty flag)
            var restoredValue = PanelState.resetField(sectionCode, fieldCode);
            
            if (restoredValue === undefined) {
                console.error('❌ Failed to reset field');
                return;
            }
            
            // Update field UI
            this.updateFieldUIAfterReset(sectionCode, fieldCode, restoredValue);
            
            console.log('✅ Field reset complete:', sectionCode + '.' + fieldCode, '→', restoredValue);
        },

        /**
         * Update field UI after reset
         * Basic implementation - override in specific handlers if needed
         * 
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @param {*} value - Restored draft value
         */
        updateFieldUIAfterReset: function(sectionCode, fieldCode, value) {
            var $field = this._findFieldElement(sectionCode, fieldCode);
            
            if (!$field.length) {
                console.warn('⚠️ Field element not found for UI update');
                return;
            }
            
            var $wrapper = $field.closest('.bte-field');
            var $input = $wrapper.find('input, select, textarea').first();
            
            if ($input.length) {
                // Update input value
                $input.val(value);
                
                // Trigger change to update any dependent UI
                $input.trigger('change');
                
                console.log('✅ Field UI updated:', fieldCode, '=', value);
            }
        },

        /**
         * Find field element by section and field code
         * Helper method
         * 
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @returns {jQuery}
         */
        _findFieldElement: function(sectionCode, fieldCode) {
            return $('[data-field="' + fieldCode + '"][data-section="' + sectionCode + '"]');
        },

        /**
         * Attach event handlers for reset button
         * Call this in specific field handlers' initialization
         * 
         * @param {jQuery} $container - Container element
         */
        attachResetHandler: function($container) {
            var self = this;
            
            $container.on('click', '.bte-field-reset-btn', function(e) {
                e.preventDefault();
                e.stopPropagation();
                self.handleFieldReset($(this));
            });
        }
    };
});
