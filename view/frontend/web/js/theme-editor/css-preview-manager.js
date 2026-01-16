define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/toolbar/device-frame',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager'
], function ($, DeviceFrame, CssManager) {
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
            
            console.log('✅ CSS Preview Manager initialized');
            return true;
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
         */
        setVariable: function(varName, value, fieldType) {
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
            var formattedValue = this._formatValue(value, fieldType);
            changes[varName] = formattedValue;
            this._updateStyles();
            console.log('🎨 CSS variable updated:', varName, '=', formattedValue, '(type:', fieldType, ')');
            return true;
        },

        /**
         * Format value based on field type
         */
        _formatValue: function(value, fieldType) {
            if (!fieldType || value === null || value === undefined) {
                return String(value);
            }
            fieldType = fieldType.toLowerCase();
            switch (fieldType) {
                case 'color':
                    return this._hexToRgb(value);
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
         * Convert HEX → RGB
         */
        _hexToRgb: function(hex) {
            if (!hex) {
                return hex;
            }
            if (!hex.toString().match(/^#?[0-9A-Fa-f]{3,6}$/)) {
                return String(hex);
            }
            hex = hex.toString().replace('#', '');
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            return r + ', ' + g + ', ' + b;
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
         * Convert RGB → HEX
         */
        rgbToHex: function(rgb) {
            if (!rgb) {
                return '#000000';
            }
            var parts = rgb.toString().match(/\d+/g);
            if (!parts || parts.length < 3) {
                return '#000000';
            }
            var r = parseInt(parts[0]);
            var g = parseInt(parts[1]);
            var b = parseInt(parts[2]);
            var toHex = function(n) {
                var hex = Math.max(0, Math.min(255, n)).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            return '#' + toHex(r) + toHex(g) + toHex(b);
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
                    displayValue = this.rgbToHex(value);
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
                        'Swissup_BreezeThemeEditor/js/theme-editor/panel-state',
                        'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers'
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
         * Public helper: HEX → RGB
         */
        hexToRgb: function(hex) {
            return this._hexToRgb(hex);
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
