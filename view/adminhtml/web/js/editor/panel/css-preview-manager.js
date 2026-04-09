define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/color-utils',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper',
    'Swissup_BreezeThemeEditor/js/editor/css-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/panel/font-palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, ColorUtils, IframeHelper, CssManager, StorageHelper, Logger, FontPaletteManager, PaletteManager, Constants) {
    'use strict';

    var log = Logger.for('panel/css-preview-manager');

    var changes = {};
    var $styleElement = null;
    var iframeDocument = null;

    /**
     * Tracks which palette vars were injected for each field var.
     * Key  : field CSS variable  (e.g. '--base-color')
     * Value: array of injected palette vars
     *        (e.g. ['--color-brand-amber-dark', '--color-brand-amber-dark-rgb'])
     *
     * Used to clean up orphaned palette vars when a field's value changes away
     * from a palette reference (reset, overwrite with concrete value, etc.).
     */
    var _fieldPaletteVars = {};

    return {
        /** Cached PaletteManager reference — set lazily in _subscribeToPaletteChanges(). */
        _paletteManager: null,

        /**
         * Initialize preview manager.
         *
         * Returns a Promise that resolves (true) once the iframe has loaded the
         * frontend page (detected by presence of #bte-theme-css-variables) and
         * live-preview changes have been loaded from localStorage.
         *
         * Listens for TWO signals so initialization is never missed:
         *   1. bte:cssManagerReady — fired by css-manager after it guarantees that
         *      #bte-theme-css-variables is in the iframe DOM (either found natively
         *      or created as a placeholder after 20 retries).  This is the primary
         *      trigger and fixes the race condition where the iframe 'load' event
         *      could fire before css-manager finished its own retry loop.
         *   2. #bte-iframe 'load' — kept as a fallback for same-page navigations
         *      inside the iframe (user clicks a link in the frontend preview).
         *
         * Both paths share tryInit() and a resolved guard to prevent double-init.
         *
         * @returns {Promise<boolean>}
         */
        init: function() {
            var self = this;
            return new Promise(function(resolve) {
                var resolved = false;

                function tryInit() {
                    // Only query IframeHelper when iframeDocument hasn't been
                    // provided already (e.g. via the bte:cssManagerReady payload).
                    if (!iframeDocument) {
                        iframeDocument = IframeHelper.getDocument();
                    }

                    // Wait until the frontend page is loaded.
                    // #bte-theme-css-variables is injected by the Breeze theme in <head>
                    // and is absent on the admin redirect page — we use it as a
                    // reliable "frontend is ready" signal (same check as css-manager).
                    if (!iframeDocument ||
                            !$(iframeDocument).find('#bte-theme-css-variables').length) {
                        return; // not ready yet — will be retried on the next signal
                    }

                    // Prevent double-initialization if both signals fire simultaneously.
                    if (resolved) {
                        return;
                    }
                    resolved = true;

                    // Clean up both listeners — no longer needed for this init cycle.
                    $(Constants.SELECTORS.IFRAME).off('load.bte-preview-init');
                    $(document).off('bte:cssManagerReady.bte-preview-init');

                    self._createStyleElement();

                    // Load saved changes from localStorage
                    self._loadFromLocalStorage();

                    // Subscribe to palette changes for cascade behavior
                    self._subscribeToPaletteChanges();

                    log.info('CSS Preview Manager initialized');
                    resolve(true);
                }

                // PRIMARY: css-manager fires this after it guarantees #bte-theme-css-variables
                // is in the DOM — covers the case where iframe 'load' already fired before
                // css-manager finished its retry loop (or created a placeholder at retry 20).
                $(document).on('bte:cssManagerReady.bte-preview-init', function(e, data) {
                    // Use the iframeDocument passed by css-manager to avoid a re-query race.
                    if (data && data.iframeDocument) {
                        iframeDocument = data.iframeDocument;
                    }
                    tryInit();
                });

                // SECONDARY: iframe 'load' handles navigations that happen after the initial
                // boot cycle (user browses to a different page inside the iframe preview).
                $(Constants.SELECTORS.IFRAME).on('load.bte-preview-init', tryInit);

                // Synchronous attempt: covers the edge case where css-manager already
                // fired bte:cssManagerReady before this Promise was constructed.
                tryInit();
            });
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
                log.warn('CSS Preview Manager not initialized');
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

            // PaletteManager is a static AMD dependency of this module — no circular
            // dependency exists and no async require is needed.
            self._paletteManager = PaletteManager;

            PaletteManager.subscribe(function(cssVar, hexValue) {
                log.debug('Palette cascade: ' + cssVar + ' -> ' + hexValue);

                // Update HEX version in live preview (e.g. --color-brand-primary)
                self.setVariable(cssVar, hexValue, 'color');

                // Update RGB version so fields with format:rgb can reference
                // var(--color-brand-primary-rgb)
                var rgbValue = ColorUtils.hexToRgb(hexValue);
                self.setVariable(cssVar + '-rgb', rgbValue, 'color', { format: 'rgb' });

                // Update color fields that reference this palette color
                self._updateFieldsReferencingPalette(cssVar, hexValue);
            });

            log.info('Subscribed to palette changes');
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
            
            log.debug('Updating ' + $inputs.length + ' field(s) referencing ' + cssVar);
            
            var self = this;
            $inputs.each(function() {
                var $input = $(this);
                var $trigger = $input.siblings('.bte-color-trigger');
                
                // Get field's CSS variable
                var fieldCssVar = $input.attr('data-property');

                
                // Update input value
                $input.val(hexValue);
                
                // Update preview box background
                $trigger.find('.bte-color-preview').css('background-color', hexValue);
                
                // Update Pickr instance if exists
                var popupInstance = $trigger.data('popup-instance');
                var pickrInstance = popupInstance && popupInstance.pickr;
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
                log.debug('Live preview <style> inserted after #bte-publication-css');
            } else if ($draftStyle && $draftStyle.length) {
                // Insert after draft (normal case)
                $draftStyle.after($styleElement);
                log.debug('Live preview <style> inserted after #bte-theme-css-variables-draft');
            } else if ($publishedStyle && $publishedStyle.length) {
                // Insert after published (fallback)
                $publishedStyle.after($styleElement);
                log.debug('Live preview <style> inserted after #bte-theme-css-variables');
            } else {
                // Last resort: append to body
                var $body = $(iframeDocument).find('body');
                if (!$body.length && iframeDocument.body) {
                    $body = $(iframeDocument.body);
                }

                if ($body.length) {
                    $body.append($styleElement);
                    log.warn('Fallback: Live preview <style> appended to end of <body>');
                } else {
                    log.error('Cannot find insertion point for live preview styles!');
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
                log.warn('Cannot edit in ' + CssManager.getCurrentStatus() + ' mode. Switch to DRAFT to edit.');
                return false;
            }

            if (!iframeDocument || !$styleElement) {
                return false;
            }
            var formattedValue = this._formatValue(value, fieldType, fieldData);
            changes[varName] = formattedValue;


            // When the value is a palette reference (e.g. '--color-brand-amber-primary'),
            // ensure the palette variable and its -rgb variant are defined in the live
            // preview.  Without this, var(--color-brand-amber-primary-rgb) resolves to
            // nothing and produces black colors.
            //
            // Always clean up any palette vars that were previously injected for this
            // field, then re-inject if the new value is still a palette reference.
            // This covers: reset → concrete value, palette-A → palette-B, etc.
            this._cleanupFieldPaletteVars(varName);

            // _paletteManager is set synchronously in _subscribeToPaletteChanges()
            // because PaletteManager is a static AMD dependency of this module.
            if (typeof value === 'string' && value.startsWith('--') && this._paletteManager) {
                var paletteColor = this._paletteManager.getColor(value);
                if (paletteColor) {
                    var hex = paletteColor.value || paletteColor.hex;
                    if (hex) {
                        if (!changes[value]) {
                            changes[value] = hex;
                        }
                        var rgbVar = value + '-rgb';
                        if (!changes[rgbVar]) {
                            changes[rgbVar] = ColorUtils.hexToRgb(hex);
                        }
                        // Track what was injected so cleanup can remove it later
                        _fieldPaletteVars[varName] = [value, rgbVar];
                    }
                }
            }

            // Font-palette role reference (e.g. '--primary-font') — inject the
            // actual font stack so var(--primary-font) resolves in the preview.
            if (fieldType === 'font_picker' &&
                    typeof value === 'string' && value.startsWith('--')) {
                var fontRole = FontPaletteManager.getRole(value);
                if (fontRole) {
                    if (!changes[value]) {
                        changes[value] = fontRole['default'];
                    }
                    _fieldPaletteVars[varName] = [value];
                }
            }

            this._updateStyles();
            log.debug('CSS variable updated: ' + varName + ' = ' + formattedValue + ' (type: ' + fieldType + ')');
            return true;
        },

        /**
         * Inject an external stylesheet into the preview iframe (idempotent).
         * Used by font picker to load Google Fonts / custom web fonts in the preview.
         *
         * @param {String} url - Stylesheet URL (e.g. a Google Fonts URL)
         */
        loadFont: function(url) {
            if (!url || !iframeDocument) {
                return;
            }
            // Derive a stable id from the URL so we never inject the same sheet twice
            var linkId = 'bte-font-' + url.replace(/[^a-zA-Z0-9]/g, '-');
            if (iframeDocument.getElementById(linkId)) {
                return;
            }
            var link = iframeDocument.createElement('link');
            link.id    = linkId;
            link.rel   = 'stylesheet';
            link.href  = url;
            iframeDocument.head.appendChild(link);
            log.debug('Font stylesheet injected into preview: ' + url);
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
                log.warn('Cannot edit in ' + CssManager.getCurrentStatus() + ' mode. Switch to DRAFT to edit.');
                return false;
            }

            if (changes[varName]) {
                this._cleanupFieldPaletteVars(varName);
                delete changes[varName];
                this._updateStyles();
                log.debug('CSS variable removed: ' + varName);
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
                    // HEX8 (#rrggbbaa) → rgba(r, g, b, a) to preserve alpha channel
                    var rgba = ColorUtils.hex8ToRgba(value);
                    if (rgba !== null) {
                        return rgba;
                    }
                    return ColorUtils.hexToRgb(value);  // #ffffff → 255, 255, 255
                }
                if (ColorUtils.isRgbColor(value)) {
                    // Normalize: "rgb(255, 0, 0)" → "255, 0, 0"
                    return ColorUtils.hexToRgb(value);  // hexToRgb handles rgb() wrapper
                }
            } else {
                // Breeze 3.0: Output HEX format (#ffffff or #rrggbbaa)
                if (ColorUtils.isHexColor(value)) {
                    return ColorUtils.normalizeHex(value);  // #FFFFFF → #ffffff, #RRGGBBAA → #rrggbbaa
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
            // CSS-var reference (e.g. '--primary-font') → wrap in var()
            if (font.startsWith('--')) {
                return 'var(' + font + ')';
            }
            // Already quoted or already a full CSS font stack (contains comma) — pass through as-is
            if (font.startsWith('"') || font.startsWith("'") || font.includes(',')) {
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
                log.error('$styleElement is null!');
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
            
            log.debug('CSS Preview updated (' + Object.keys(changes).length + ' vars)');
        },

        /**
         * Load live preview changes from localStorage
         * Note: Field sync is handled by panel.js after config loads
         * @private
         */
        _loadFromLocalStorage: function() {
            try {
                var stored = StorageHelper.getLivePreviewChanges();
                if (stored && Object.keys(stored).length > 0) {
                    changes = stored;
                    this._updateStyles();
                    log.info('Loaded live preview from localStorage: ' + Object.keys(changes).length + ' variables');
                    // Note: syncFieldsFromChanges() is called by panel.js after fields are rendered
                }
            } catch (e) {
                log.warn('Failed to load live preview from localStorage: ' + e);
            }
        },

        /**
         * Save live preview changes to localStorage
         * @private
         */
        _saveToLocalStorage: function() {
            try {
                StorageHelper.setLivePreviewChanges(changes);
            } catch (e) {
                log.warn('Failed to save live preview to localStorage: ' + e);
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
                $panelElement = $(Constants.SELECTORS.PANELS);
            }
            
            if (!$panelElement.length) {
                log.warn('Cannot sync fields: panel element not found');
                return;
            }
            

            
            // Iterate over all changes and update corresponding form fields
            Object.keys(changes).forEach(function(property) {
                var value = changes[property];
                
                // Find field with this CSS property
                // Use [data-section][data-field] to match only real form fields,
                // not palette swatches which also carry data-property.
                var $field = $('[data-property="' + property + '"][data-section][data-field]');

                if (!$field.length) {
                    return;
                }
                
                var fieldType = $field.data('type');
                var displayValue = value;

                
                // Convert value back to field format
                if (fieldType === 'color') {
                    // Palette reference stored as var(--color-x) in CSS changes,
                    // but the color input must show the resolved HEX value.
                    // data-palette-ref on the input element already holds the raw ref.
                    if (typeof value === 'string' && /^var\(--/.test(value)) {
                        // Strip var() wrapper to get the raw palette ref (--color-x)
                        var paletteRef = value.replace(/^var\((.+)\)$/, '$1');
                        // Resolve the palette ref to its HEX color for display
                        var paletteColor = PaletteManager.getColor(paletteRef);
                        if (paletteColor) {
                            displayValue = paletteColor.hex || paletteColor.value || value;
                        } else {
                            // Color not found in palette; skip DOM update — the
                            // initial render already set the input to the correct hex.
                            displayValue = null;
                        }
                    } else if (ColorUtils.isRgbColor(value)) {
                        // Convert RGB back to HEX only if value is in RGB format.
                        // Values from localStorage may already be in HEX format.
                        displayValue = ColorUtils.rgbToHex(value);
                    }
                }

                // Font palette role reference stored as var(--primary-font) in
                // changes, but the <select> value must be the raw ref '--primary-font'.
                if (fieldType === 'font_picker' &&
                        typeof displayValue === 'string' &&
                        displayValue.startsWith('var(--')) {
                    displayValue = displayValue.replace(/^var\((.+)\)$/, '$1');
                }
                
                // Update field value
                if (displayValue !== null) {
                    if (fieldType === 'color') {
                        // Color picker — update both the text input and the preview dot.
                        // $field[0] is the .bte-color-trigger div (data-type="color"),
                        // not an <input type="color">, so we must use fieldType (data-type)
                        // rather than $field.attr('type') which returns undefined for a div.
                        var $colorWrapper = $field.closest('.bte-field-control');
                        var $textInput    = $colorWrapper.find('.bte-color-input');
                        var $preview      = $colorWrapper.find('.bte-color-preview');
                        if ($textInput.length) {
                            $textInput.val(displayValue);
                        }
                        if ($preview.length) {
                            $preview.css('background-color', displayValue);
                        }

                    } else if ($field.attr('type') === 'checkbox') {
                        $field.prop('checked', value === '1' || value === true);
                    } else {
                        $field.val(displayValue);
                        // For font pickers, mirror the selected font onto the <select> trigger.
                        // Use setProperty() so that CSS custom property references like
                        // '--primary-font' are correctly applied as var(--primary-font).
                        if (fieldType === 'font_picker') {
                            var fontCssValue = displayValue.startsWith('--')
                                ? 'var(' + displayValue + ')'
                                : displayValue;
                            $field[0].style.setProperty('font-family', fontCssValue);
                        }
                    }
                }
                
                // Get section and field codes to update PanelState and badges
                var sectionCode = $field.data('section');
                var fieldCode = $field.data('field');
                
                if (sectionCode && fieldCode) {
                    // Use synchronous require() — at runtime all modules are already in the
                    // RequireJS cache, so sync require is safe here (same pattern as
                    // setVariable() using _paletteManager).  The async form was originally
                    // used to avoid a circular-dependency error at *definition* time:
                    //   field-handlers → field-handlers/base → css-preview-manager
                    // That circularity only matters during the initial module definition,
                    // not at call time.  Using async require here causes PanelState.setValue()
                    // to run in a future microtask, so getChangesCount() still reads 0 when
                    // _updateChangesCount() fires right after syncFieldsFromChanges() returns.
                    try {
                        var PanelState    = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');
                        var FieldHandlers = require('Swissup_BreezeThemeEditor/js/editor/panel/field-handlers');

                        // Normalize palette reference: 'var(--color-x)' → '--color-x'
                        // PanelState stores palette refs without var() wrapper (e.g. '--color-red'),
                        // but changes in localStorage are formatted with var() for CSS output.
                        // Without this normalization, a saved palette-ref field (savedValue='--color-x')
                        // would appear dirty after reload because 'var(--color-x)' !== '--color-x'.
                        var stateValue = value;
                        if (typeof stateValue === 'string' && /^var\(--/.test(stateValue)) {
                            stateValue = stateValue.replace(/^var\((.+)\)$/, '$1');
                        }

                        // Update PanelState to mark field as changed
                        PanelState.setValue(sectionCode, fieldCode, stateValue);

                        // Update badges to show "Changed" indicator
                        FieldHandlers.updateBadges($panelElement, sectionCode, fieldCode);
                    } catch (e) {
                        log.warn('syncFieldsFromChanges: PanelState/FieldHandlers not in cache yet: ' + e);
                    }
                    
                    log.debug('Synced field value & badges: ' + property + ' -> ' + displayValue + ' (' + sectionCode + '.' + fieldCode + ')');
                } else {
                    log.debug('Synced field value: ' + property + ' -> ' + displayValue + ' (no section/field code)');
                }
                
                syncedCount++;
            }.bind(this));
            
            if (syncedCount > 0) {
                log.info('Synced ' + syncedCount + ' field values from live preview');
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
            _fieldPaletteVars = {};
            if ($styleElement) {
                $styleElement.text(':root {}');
            }
            
            // Clear localStorage
            try {
                StorageHelper.clearLivePreviewChanges();
            } catch (e) {
                log.warn('Failed to clear live preview from localStorage: ' + e);
            }
            
            log.info('CSS Preview reset');
            return true;
        },

        /**
         * Reset specific variable
         */
        resetVariable: function(varName) {
            if (changes[varName]) {
                this._cleanupFieldPaletteVars(varName);
                delete changes[varName];
                this._updateStyles();
                log.info('CSS variable reset: ' + varName);
                return true;
            }
            return false;
        },

        /**
         * Remove palette vars that were injected for a specific field variable.
         *
         * A palette var is removed only when no OTHER field still references it,
         * covering the case where two fields share the same palette color.
         *
         * @param {String} varName - Field CSS variable (e.g. '--base-color')
         */
        _cleanupFieldPaletteVars: function(varName) {
            var injected = _fieldPaletteVars[varName];
            if (!injected) {
                return;
            }
            injected.forEach(function(paletteVar) {
                var stillNeeded = Object.keys(_fieldPaletteVars).some(function(fv) {
                    return fv !== varName &&
                           _fieldPaletteVars[fv] &&
                           _fieldPaletteVars[fv].indexOf(paletteVar) !== -1;
                });
                if (!stillNeeded) {

                    delete changes[paletteVar];
                }
            });
            delete _fieldPaletteVars[varName];
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
            log.info('CSS Preview loaded ' + Object.keys(changes).length + ' variables');
            return true;
        },

        /**
         * Re-create live preview style element after iframe navigation
         * Called by device-frame (frontend) or manually (admin) when iframe loads new page
         */
        recreateLivePreviewStyle: function() {
            // Update iframe reference
            iframeDocument = IframeHelper.getDocument();
            if (!iframeDocument) {
                log.warn('Cannot recreate live preview: iframe not initialized');
                return false;
            }

            // Re-create style element
            this._createStyleElement();

            // Re-apply existing changes
            if (Object.keys(changes).length > 0) {
                this._updateStyles();
                log.info('Re-applied ' + Object.keys(changes).length + ' live preview changes after navigation');
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
            log.info('CSS Preview Manager destroyed');
        }
    };
});
