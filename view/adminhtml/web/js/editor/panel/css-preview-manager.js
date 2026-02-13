define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/util/color-utils',
    'Swissup_BreezeThemeEditor/js/toolbar/device-frame',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-manager'
], function ($, ColorUtils, DeviceFrame, CssManager) {
    'use strict';

    var changes = {};
    var $styleElement = null;
    var iframeDocument = null;

    return {
        /**
         * Initialize preview manager
         */
        init: function() {
            iframeDocument = DeviceFrame.getDocument();
            if (!iframeDocument) {
                console.warn('⚠️ CSS Preview Manager: iframe not initialized');
                return false;
            }
            this._createStyleElement();
            
            // Load saved changes from localStorage
            this._loadFromLocalStorage();
            
            // Subscribe to palette changes for cascade behavior
            this._subscribeToPaletteChanges();
            
            console.log('✅ CSS Preview Manager initialized');
            return true;
        },
        
        /**
         * Check if preview manager is active (iframe initialized)
         * @returns {Boolean}
         */
        isActive: function() {
            return iframeDocument !== null;
        },
        
        /**
         * Update CSS preview (refresh styles)
         * Alias for _updateStyles() for public API
         */
        updatePreview: function() {
            if (!this.isActive()) {
                console.warn('⚠️ CSS Preview Manager not initialized');
                return;
            }
            this._updateStyles();
        },
        
        /**
         * Refresh preview (alias for updatePreview)
         */
        refresh: function() {
            this.updatePreview();
        },

        /**
         * Subscribe to palette color changes
         * Updates CSS variables in live preview when palette colors change
         */
        _subscribeToPaletteChanges: function() {
            var self = this;
            
            // Lazy require to avoid circular dependency
            require(['Swissup_BreezeThemeEditor/js/editor/panel/palette-manager'], function(PaletteManager) {
                PaletteManager.subscribe(function(cssVar, hexValue) {
                    console.log('🎨 Palette cascade:', cssVar, '→', hexValue);
                    
            // Update BOTH HEX and RGB versions in live preview
            // This ensures fields with format:rgb can reference var(--palette-color-rgb)
            self.setVariable(cssVar, hexValue, 'color');  // HEX version: --color-brand-primary
            
            // Convert HEX to RGB and set RGB version with explicit format
            var rgbValue = ColorUtils.hexToRgb(hexValue);
            self.setVariable(cssVar + '-rgb', rgbValue, 'color', { format: 'rgb' });  // RGB version: --color-brand-primary-rgb
                    
                    // Update color fields that reference this palette color
                    self._updateFieldsReferencingPalette(cssVar, hexValue);
                });
                
                console.log('✅ Subscribed to palette changes');
            });
        },

        /**
         * Update color fields that reference a specific palette color
         * Updates input values and Pickr instances to reflect new palette color
         * 
         * @param {String} cssVar - Palette CSS variable (e.g., "--color-brand-primary")
         * @param {String} hexValue - New HEX value (e.g., "#1979c3")
         */
        _updateFieldsReferencingPalette: function(cssVar, hexValue) {
            // Find all color inputs with this palette reference
            var $inputs = $('.bte-color-input[data-palette-ref="' + cssVar + '"]');
            
            if ($inputs.length === 0) {
                return;
            }
            
            console.log('🔄 Updating', $inputs.length, 'field(s) referencing', cssVar);
            
            var self = this;
            $inputs.each(function() {
                var $input = $(this);
                var $trigger = $input.siblings('.bte-color-trigger');
                
                // Get field's CSS variable
                var fieldCssVar = $input.attr('data-css-var');
                
                // Remove field's CSS variable from live preview (allow cascade to work via var())
                if (fieldCssVar && changes[fieldCssVar]) {
                    delete changes[fieldCssVar];
                    console.log('🗑️ Removed', fieldCssVar, 'from live preview (uses palette ref)');
                }
                
                // Update input value
                $input.val(hexValue);
                
                // Update preview box background
                $trigger.find('.bte-color-preview').css('background-color', hexValue);
                
                // Update Pickr instance if exists
                var pickrInstance = $trigger.data('pickr');
                if (pickrInstance) {
                    // Set flag to prevent palette-ref removal
                    $input.data('is-palette-update', true);
                    $trigger.data('is-palette-update', true);
                    
                    pickrInstance.setColor(hexValue, true); // silent=true
                    
                    // Clear flag after short delay
                    setTimeout(function() {
                        $input.removeData('is-palette-update');
                        $trigger.removeData('is-palette-update');
                    }, 50);
                }
            });
            
            // Update styles after removing field variables
            this._updateStyles();
        },

        /**
         * Create <style> element in iframe body
         * Insert in correct order: published → draft → publication → LIVE PREVIEW (highest priority)
         */
        _createStyleElement: function() {
            if (!iframeDocument) {
                return;
            }

            var $prevStyle = $(iframeDocument).find('#bte-live-preview');
            if ($prevStyle.length) {
                $prevStyle.remove();
            }

            $styleElement = $('<style>', {
                id: 'bte-live-preview',
                type: 'text/css',
                media: 'all'
            });

            // Insert in correct order (live-preview має найвищий пріоритет)
            var $publicationStyle = $(iframeDocument).find('#bte-publication-css');
            var $draftStyle = $(iframeDocument).find('#bte-theme-css-variables-draft');
            var $publishedStyle = $(iframeDocument).find('#bte-theme-css-variables');

            if ($publicationStyle && $publicationStyle.length) {
                // Insert after publication (if viewing old version)
                $publicationStyle.after($styleElement);
                console.log('📝 Live preview <style> inserted after #bte-publication-css');
            } else if ($draftStyle && $draftStyle.length) {
                // Insert after draft (normal case)
                $draftStyle.after($styleElement);
                console.log('📝 Live preview <style> inserted after #bte-theme-css-variables-draft');
            } else if ($publishedStyle && $publishedStyle.length) {
                // Insert after published (fallback)
                $publishedStyle.after($styleElement);
                console.log('📝 Live preview <style> inserted after #bte-theme-css-variables');
            } else {
                // Last resort: append to body
                var $body = $(iframeDocument).find('body');
                if (!$body.length && iframeDocument.body) {
                    $body = $(iframeDocument.body);
                }

                if ($body.length) {
                    $body.append($styleElement);
                    console.warn('⚠️ Fallback: Live preview <style> appended to end of <body>');
                } else {
                    console.error('❌ Cannot find insertion point for live preview styles!');
                    return;
                }
            }
        },

        /**
         * Set CSS variable (with automatic format conversion)
         * Only works in DRAFT mode (editable)
         * 
         * @param {String} varName - CSS variable name
         * @param {String} value - Variable value
         * @param {String} fieldType - Field type
         * @param {Object} fieldData - Additional field data (format, defaultValue, etc.)
         */
        setVariable: function(varName, value, fieldType, fieldData) {
            // Check if editing is allowed
            if (!CssManager.isEditable()) {
                console.warn('⚠️ Cannot edit in', CssManager.getCurrentStatus(), 'mode. Switch to DRAFT to edit.');
                return false;
            }

            if (!iframeDocument || !$styleElement) {
                if (!this.init()) {
                    return false;
                }
            }
            var formattedValue = this._formatValue(value, fieldType, fieldData);
            changes[varName] = formattedValue;
            this._updateStyles();
            console.log('🎨 CSS variable updated:', varName, '=', formattedValue, '(type:', fieldType, ')');
            return true;
        },

        /**
         * Remove CSS variable from changes
         * Used when field is reset to palette reference - allows cascade via var()
         * 
         * @param {String} varName - CSS variable name (e.g., '--base-color')
         * @returns {Boolean} true if variable was removed, false if not found
         */
        removeVariable: function(varName) {
            if (!CssManager.isEditable()) {
                console.warn('⚠️ Cannot edit in', CssManager.getCurrentStatus(), 'mode. Switch to DRAFT to edit.');
                return false;
            }

            if (changes[varName]) {
                delete changes[varName];
                this._updateStyles();
                console.log('🗑️ CSS variable removed:', varName);
                return true;
            }
            return false;
        },

        /**
         * Format value based on field type
         * 
         * @param {String} value - Field value
         * @param {String} fieldType - Field type
         * @param {Object} fieldData - Additional field data (format, defaultValue, etc.)
         * @returns {String} Formatted value
         */
        _formatValue: function(value, fieldType, fieldData) {
            if (!fieldType || value === null || value === undefined) {
                return String(value);
            }
            fieldType = fieldType.toLowerCase();
            switch (fieldType) {
                case 'color':
                    return this._formatColorValue(value, fieldData);
                case 'font_picker':
                    return this._formatFont(value);
                case 'toggle':
                case 'checkbox':
                    return (value === true || value === '1' || value === 1) ? '1' : '0';
                case 'textarea':
                    return this._escapeValue(String(value));
                case 'range':
                case 'number':
                case 'text':
                case 'select':
                default:
                    return String(value);
            }
        },

        /**
         * Format color value with auto-detection support
         * Matches backend CssGenerator::formatColor() logic
         * 
         * @param {String} value - Color value (HEX, RGB, or palette reference)
         * @param {Object} fieldData - Field data including format and defaultValue
         * @returns {String} Formatted color value
         */
        _formatColorValue: function(value, fieldData) {
            if (!value) {
                return value;
            }
            
            value = String(value);
            fieldData = fieldData || {};
            
            // Palette reference: --color-brand-primary → var(--color-brand-primary)
            if (value.startsWith('--')) {
                // Smart mapping: append -rgb suffix if field requires RGB format
                if (fieldData.format === 'rgb') {
                    return 'var(' + value + '-rgb)';  // --color-brand-primary-rgb
                }
                return 'var(' + value + ')';  // --color-brand-primary (HEX by default)
            }
            
            // Already wrapped: var(--color-test) → var(--color-test)
            if (value.startsWith('var(')) {
                return value;
            }
            
            // Determine format: auto if default exists but no format specified, otherwise hex
            var format = fieldData.format;
            if (!format) {
                format = fieldData.defaultValue ? 'auto' : 'hex';
            }
            
            format = format.toLowerCase();
            
            // Auto-detect format from default value
            if (format === 'auto') {
                var defaultValue = fieldData.defaultValue;
                if (defaultValue && ColorUtils.isRgbColor(defaultValue)) {
                    format = 'rgb';
                } else {
                    format = 'hex';
                }
            }
            
            // Apply requested format
            if (format === 'rgb') {
                // Breeze 2.0: Output RGB format (255, 255, 255)
                if (ColorUtils.isHexColor(value)) {
                    return ColorUtils.hexToRgb(value);  // #ffffff → 255, 255, 255
                }
                if (ColorUtils.isRgbColor(value)) {
                    // Normalize: "rgb(255, 0, 0)" → "255, 0, 0"
                    return ColorUtils.hexToRgb(value);  // hexToRgb handles rgb() wrapper
                }
            } else {
                // Breeze 3.0: Output HEX format (#ffffff)
                if (ColorUtils.isHexColor(value)) {
                    return ColorUtils.normalizeHex(value);  // #FFFFFF → #ffffff
                }
                if (ColorUtils.isRgbColor(value)) {
                    return ColorUtils.rgbToHex(value);  // 255, 255, 255 → #ffffff
                }
            }
            
            // Fallback: return as-is
            return value;
        },

        /**
         * Format font with quotes and fallback
         */
        _formatFont: function(font) {
            if (!font) {
                return font;
            }
            font = String(font);
            if (font.startsWith('"') || font.startsWith("'")) {
                return font;
            }
            return '"' + font + '", sans-serif';
        },

        /**
         * Escape textarea values to prevent CSS injection
         */
        _escapeValue: function(value) {
            return value.replace(/\/\*/g, '/ *').replace(/\*\//g, '* /');
        },

        /**
         * Get current CSS variable value from iframe
         */
        getVariable: function(varName) {
            if (!iframeDocument) {
                return null;
            }
            var value = getComputedStyle(iframeDocument.documentElement)
                .getPropertyValue(varName)
                .trim();
            return value || null;
        },

        /**
         * Update :root styles in iframe
         */
        _updateStyles: function() {
            if (!$styleElement) {
                console.error('$styleElement is null!');
                return;
            }
            var css = ':root {\n';
            Object.keys(changes).forEach(function(varName) {
                css += '    ' + varName + ': ' + changes[varName] + ';\n';
            });
            css += '}';
            $styleElement.text(css);
            
            // Save to localStorage
            this._saveToLocalStorage();
            
            if (console.groupCollapsed) {
                console.groupCollapsed('📝 CSS Preview updated (' + Object.keys(changes).length + ' vars)');
                console.log(css);
                console.groupEnd();
            }
        },

        /**
         * Load live preview changes from localStorage
         * Note: Field sync is handled by panel.js after config loads
         * @private
         */
        _loadFromLocalStorage: function() {
            try {
                var stored = localStorage.getItem('bte_live_preview_changes');
                if (stored) {
                    changes = JSON.parse(stored);
                    if (Object.keys(changes).length > 0) {
                        this._updateStyles();
                        console.log('📥 Loaded live preview from localStorage:', Object.keys(changes).length, 'variables');
                        // Note: syncFieldsFromChanges() is called by panel.js after fields are rendered
                    }
                }
            } catch (e) {
                console.warn('⚠️ Failed to load live preview from localStorage:', e);
            }
        },

        /**
         * Save live preview changes to localStorage
         * @private
         */
        _saveToLocalStorage: function() {
            try {
                localStorage.setItem('bte_live_preview_changes', JSON.stringify(changes));
            } catch (e) {
                console.warn('⚠️ Failed to save live preview to localStorage:', e);
            }
        },

        /**
         * Get all pending changes
         */
        getChanges: function() {
            return $.extend({}, changes);
        },

        /**
         * Sync form fields with live preview changes
         * Updates field values to match what's in live preview
         * @param {jQuery} $panelElement - Optional panel element reference (defaults to #bte-panels-container)
         */
        syncFieldsFromChanges: function($panelElement) {
            var syncedCount = 0;
            
            // Get panel element if not provided
            if (!$panelElement || !$panelElement.length) {
                $panelElement = $('#bte-panels-container');
            }
            
            if (!$panelElement.length) {
                console.warn('⚠️ Cannot sync fields: panel element not found');
                return;
            }
            
            // Iterate over all changes and update corresponding form fields
            Object.keys(changes).forEach(function(cssVar) {
                var value = changes[cssVar];
                
                // Find field with this CSS variable
                var $field = $('[data-css-var="' + cssVar + '"]');
                if (!$field.length) {
                    return;
                }
                
                var fieldType = $field.data('type');
                var displayValue = value;
                
                // Convert value back to field format
                if (fieldType === 'color') {
                    // Convert RGB back to HEX
                    displayValue = ColorUtils.rgbToHex(value);
                }
                
                // Update field value
                if ($field.attr('type') === 'color') {
                    // Color picker
                    $field.val(displayValue);
                    
                    // Also update text input if exists
                    var $textInput = $field.closest('.bte-field-control').find('.bte-color-input');
                    if ($textInput.length) {
                        $textInput.val(displayValue);
                    }
                } else if ($field.attr('type') === 'checkbox') {
                    $field.prop('checked', value === '1' || value === true);
                } else {
                    $field.val(displayValue);
                }
                
                // Get section and field codes to update PanelState and badges
                var sectionCode = $field.data('section');
                var fieldCode = $field.data('field');
                
                if (sectionCode && fieldCode) {
                    // Dynamically load PanelState and FieldHandlers to avoid circular dependency
                    require([
                        'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
                        'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers'
                    ], function(PanelState, FieldHandlers) {
                        // Update PanelState to mark field as changed
                        PanelState.setValue(sectionCode, fieldCode, displayValue);
                        
                        // Update badges to show "Changed" indicator
                        FieldHandlers.updateBadges($panelElement, sectionCode, fieldCode);
                    });
                    
                    console.log('🔄 Synced field value & badges:', cssVar, '→', displayValue, '(' + sectionCode + '.' + fieldCode + ')');
                } else {
                    console.log('🔄 Synced field value:', cssVar, '→', displayValue, '(no section/field code)');
                }
                
                syncedCount++;
            }.bind(this));
            
            if (syncedCount > 0) {
                console.log('✅ Synced', syncedCount, 'field values from live preview');
            }
        },

        /**
         * Check if has pending changes
         */
        hasChanges: function() {
            return Object.keys(changes).length > 0;
        },

        /**
         * Reset all changes
         */
        reset: function() {
            changes = {};
            if ($styleElement) {
                $styleElement.text(':root {}');
            }
            
            // Clear localStorage
            try {
                localStorage.removeItem('bte_live_preview_changes');
            } catch (e) {
                console.warn('⚠️ Failed to clear live preview from localStorage:', e);
            }
            
            console.log('↺ CSS Preview reset');
            return true;
        },

        /**
         * Reset specific variable
         */
        resetVariable: function(varName) {
            if (changes[varName]) {
                delete changes[varName];
                this._updateStyles();
                console.log('↺ CSS variable reset:', varName);
                return true;
            }
            return false;
        },

        /**
         * Load settings object
         */
        load: function(settings) {
            if (!settings || typeof settings !== 'object') {
                return false;
            }
            changes = $.extend({}, settings);
            this._updateStyles();
            console.log('📥 CSS Preview loaded', Object.keys(changes).length, 'variables');
            return true;
        },

        /**
         * Re-create live preview style element after iframe navigation
         * Called by DeviceFrame when iframe loads new page
         */
        recreateLivePreviewStyle: function() {
            // Update iframe reference
            iframeDocument = DeviceFrame.getDocument();
            if (!iframeDocument) {
                console.warn('⚠️ Cannot recreate live preview: iframe not initialized');
                return false;
            }

            // Re-create style element
            this._createStyleElement();

            // Re-apply existing changes
            if (Object.keys(changes).length > 0) {
                this._updateStyles();
                console.log('✅ Re-applied', Object.keys(changes).length, 'live preview changes after navigation');
            }

            return true;
        },

        /**
         * Destroy preview manager
         */
        destroy: function() {
            if ($styleElement) {
                $styleElement.remove();
                $styleElement = null;
            }
            changes = {};
            iframeDocument = null;
            console.log('🗑️ CSS Preview Manager destroyed');
        }
    };
});
