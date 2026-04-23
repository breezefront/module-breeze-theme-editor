define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/dialog'
], function ($, PanelState, CssPreviewManager, Logger, Dialog) {
    'use strict';

    var log = Logger.for('panel/field-handlers/base');

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
         * Handler registry - injected by field-handlers.js
         * Maps field types to specialized handlers
         * @private
         */
        _handlerRegistry: null,

        /**
         * Handle field change (called by specific handlers)
         *
         * @param {jQuery} $input - Input element
         * @param {Function} callback - Callback after change
         * @param {Object} options - Additional options
         */
        handleChange: function($input, callback, options) {
            options = options || {};

            log.debug('BaseHandler.handleChange called: hasInput=' + !!$input + ' inputClass=' + $input.attr('class') + ' hasCallback=' + (typeof callback === 'function'));

            var fieldData = this.extractFieldData($input);

            if (! fieldData.sectionCode || ! fieldData.fieldCode) {
                log.warn('Missing data attributes: class=' + $input.attr('class'));
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
            log.debug('Calling PanelState.setValue: ' + fieldData.sectionCode + '.' + fieldData.fieldCode + ' = ' + fieldData.value);
            PanelState.setValue(fieldData.sectionCode, fieldData.fieldCode, fieldData.value);
            log.debug('PanelState.setValue completed');

            // Live preview
            if (fieldData.property && ! options.skipPreview) {
                // Merge fieldData with options (color-specific data like format, defaultValue)
                var previewData = Object.assign({}, fieldData, options);
                CssPreviewManager.setVariable(fieldData.property, fieldData.value, fieldData.type, previewData);
            }

            // Callback
            log.debug('About to call callback, type: ' + typeof callback);
            if (callback && typeof callback === 'function') {
                log.debug('Calling callback with fieldData: ' + JSON.stringify(fieldData));
                callback(fieldData);
                log.debug('Callback completed');
            } else {
                log.warn('Callback not called, type: ' + typeof callback);
            }

            log.debug('Field changed: section=' + fieldData.sectionCode + ' field=' + fieldData.fieldCode + ' type=' + fieldData.type + ' value=' + fieldData.value + ' property=' + fieldData.property);

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
                property: $input.data('property') || $input.data('css-var'),
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
                log.debug('Using palette reference: ' + paletteRef);
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

            log.warn('Unknown field type for class: ' + classList);
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
         * Shared implementation for reset and restore actions.
         *
         * @param {Object} options
         * @param {jQuery}   options.$btn           - Button element (carries data-field-code / data-section-code)
         * @param {string}   options.label          - Action label for logging ('Reset' | 'Restore')
         * @param {string}   options.confirmMessage - Text shown in the confirmation dialog
         * @param {Function} options.stateAction    - PanelState method to call (resetField | restoreToDefault)
         * @param {string}   options.notFoundMsg    - Log message when stateAction returns undefined
         * @private
         */
        _handleFieldAction: function (options) {
            var fieldCode   = options.$btn.data('field-code');
            var sectionCode = options.$btn.data('section-code');

            log.info(options.label + ' clicked: ' + sectionCode + '.' + fieldCode);

            var self = this;
            Dialog.confirm(options.confirmMessage, function () {
                self._doFieldAction(options, sectionCode, fieldCode);
            });
        },

        /**
         * Execute the field action after user confirmed.
         *
         * @param {Object} options
         * @param {string} sectionCode
         * @param {string} fieldCode
         * @private
         */
        _doFieldAction: function (options, sectionCode, fieldCode) {
            var restoredValue = options.stateAction(sectionCode, fieldCode);

            if (restoredValue === undefined) {
                log.error(options.notFoundMsg + ': ' + sectionCode + '.' + fieldCode);
                return;
            }

            var $field    = this._findFieldElement(sectionCode, fieldCode);
            var $wrapper  = $field.closest('.bte-field');
            var $input    = $wrapper.find('input, select, textarea').first();
            var fieldType = ($input.attr('data-type') || $field.attr('data-type') || '').toUpperCase();
            var handler   = this._getHandlerForType(fieldType);

            if (handler && handler.updateFieldUIAfterReset && handler !== this) {
                log.info('Using specialized handler for ' + options.label + ', type: ' + fieldType);
                handler.updateFieldUIAfterReset.call(this, sectionCode, fieldCode, restoredValue, $field, handler);
            } else {
                log.info('Using base handler for type: ' + fieldType);
                this.updateFieldUIAfterReset(sectionCode, fieldCode, restoredValue);
            }

            log.info('Field ' + options.label + ' complete: ' + sectionCode + '.' + fieldCode + ' -> ' + restoredValue);
        },

        /**
         * Handle field reset button click.
         * Restores draft value and clears dirty state.
         *
         * @param {jQuery} $resetBtn
         */
        handleFieldReset: function ($resetBtn) {
            this._handleFieldAction({
                $btn:           $resetBtn,
                label:          'Reset',
                confirmMessage: 'Discard unsaved changes?',
                stateAction:    PanelState.resetField.bind(PanelState),
                notFoundMsg:    'Failed to reset field'
            });
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
                log.warn('Field element not found for UI update');
                return;
            }
            
            var $wrapper = $field.closest('.bte-field');
            var $input = $wrapper.find('input, select, textarea').first();
            
            if ($input.length) {
                // Update input value
                $input.val(value);
                
                // Don't trigger 'change' event - it would set isDirty=true again
                // CSS preview is updated via 'field-reset' event listener in panel.js
                
                log.info('Field UI updated: ' + fieldCode + ' = ' + value);
            }
        },

        /**
         * Get specialized handler for field type from registry
         * 
         * @param {String} fieldType - Field type (e.g., 'COLOR', 'RANGE', 'TEXT')
         * @returns {Object|null} Handler object or null if not found
         * @private
         */
        _getHandlerForType: function(fieldType) {
            if (!this._handlerRegistry) {
                return null;
            }
            
            return this._handlerRegistry[fieldType] || null;
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
         * Handle field restore button click.
         * Restores field to its default value and triggers auto-save via PanelState event.
         *
         * @param {jQuery} $restoreBtn
         */
        handleFieldRestore: function ($restoreBtn) {
            this._handleFieldAction({
                $btn:           $restoreBtn,
                label:          'Restore',
                confirmMessage: 'Your customization will be lost. Continue?',
                stateAction:    PanelState.restoreToDefault.bind(PanelState),
                notFoundMsg:    'Failed to restore field'
            });
        },

        /**
         * Attach event handlers for reset button
         * Call this in specific field handlers' initialization
         * 
         * @param {jQuery} $container - Container element
         * @param {Object} handlerRegistry - Map of field types to handlers (optional)
         */
        attachResetHandler: function($container, handlerRegistry) {
            var self = this;
            
            // Store registry for later use in handleFieldReset
            if (handlerRegistry) {
                this._handlerRegistry = handlerRegistry;
                log.info('Handler registry attached with ' + Object.keys(handlerRegistry).length + ' types');
            }
            
            $container.on('click', '.bte-field-reset-btn', function(e) {
                e.preventDefault();
                e.stopPropagation();
                self.handleFieldReset($(this));
            });

            $container.on('click', '.bte-field-restore-btn', function(e) {
                e.preventDefault();
                e.stopPropagation();
                self.handleFieldRestore($(this));
            });
        }
    };
});
