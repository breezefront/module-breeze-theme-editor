define([
    'jquery',
    'underscore',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/color',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/partials/palette-grid.html'
], function ($, _, BaseHandler, PaletteManager, ColorRenderer, paletteGridTemplate) {
    'use strict';

    /**
     * Color Field Handler with Pickr Integration
     *
     * Opens a popup with:
     * - Grouped palette grid (left side)
     * - Pickr color picker widget (right side)
     */
    return {
        /**
         * Initialize color field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            var self = this;

            // Text input → update trigger preview and Pickr
            $element.on('input', '.bte-color-input', function(e) {
                var $textInput = $(e.currentTarget);
                var value = $textInput.val();
                
                console.log('🎨 ColorHandler input event:', {
                    value: value,
                    isValid: self.isValidHex(value),
                    section: $textInput.data('section'),
                    field: $textInput.data('field'),
                    hasCallback: typeof callback === 'function'
                });
                
                if (self.isValidHex(value)) {
                    // Update trigger preview
                    var $trigger = $textInput.siblings('.bte-color-trigger');
                    $trigger.find('.bte-color-preview').css('background-color', value);
                    
                    // 🆕 ALWAYS remove palette reference when user types manually
                    // This fixes the badge issue - without this, BaseHandler.getInputValue()
                    // reads the old palette-ref instead of the new typed value
                    $textInput.removeAttr('data-palette-ref');
                    $trigger.removeAttr('data-palette-ref');
                    console.log('🔓 Palette reference removed (manual text input)');
                    
                    // Update Pickr instance if popup is open
                    var popupInstance = $trigger.data('popup-instance');
                    if (popupInstance) {
                        if (popupInstance.pickr) {
                            popupInstance.pickr.setColor(value, true); // silent=true (no events)
                        }
                        
                        if (popupInstance.$popup) {
                            popupInstance.$popup.find('.bte-palette-swatch').removeClass('selected');
                        }
                    }
                    
                    // Save change
                    console.log('🎨 Calling BaseHandler.handleChange with callback:', typeof callback);
                    BaseHandler.handleChange($textInput, callback);
                    console.log('🎨 BaseHandler.handleChange completed');
                } else {
                    console.log('⏳ Waiting for valid HEX:', value);
                }
            });
            
            // Color trigger → open popup with Pickr
            $element.on('click', '.bte-color-trigger', function(e) {
                e.preventDefault();
                self._openPopup($(e.currentTarget), callback);
            });
            
            // Close popup on outside click
            $(document).on('click.bte-color-popup', function(e) {
                if (!$(e.target).closest('.bte-color-popup, .bte-color-trigger, .pcr-app').length) {
                    self._closeAllPopups();
                }
            });
            
            // Close popup on ESC key
            $(document).on('keydown.bte-color-popup', function(e) {
                if (e.key === 'Escape' || e.keyCode === 27) {
                    self._closeAllPopups();
                }
            });
            
            console.log('✅ Color field handler initialized (Pickr)');
        },

        /**
         * Validate HEX color format
         *
         * @param {String} value
         * @returns {Boolean}
         */
        isValidHex: function(value) {
            return /^#[0-9A-Fa-f]{6}$/.test(value);
        },

        /**
         * Open color popup with Pickr and grouped palette grid
         * 
         * @param {jQuery} $trigger - Color trigger element
         * @param {Function} callback - Change callback
         */
        _openPopup: function($trigger, callback) {
            var self = this;
            
            // Close any existing popups first
            this._closeAllPopups();
            
            // Get palette ID
            var paletteId = $trigger.data('palette');
            if (!paletteId) {
                console.warn('⚠️ No palette configured for this field');
                return;
            }
            
            // Get current color
            var $textInput = $trigger.siblings('.bte-color-input');
            var currentColor = $textInput.val() || $trigger.data('default') || '#000000';
            
            // Get palette data with groups
            var paletteData = PaletteManager.getPaletteWithGroups(paletteId);
            if (!paletteData || !paletteData.groups) {
                console.warn('⚠️ Palette not found:', paletteId);
                return;
            }
            
            // === CREATE POPUP CONTAINER ===
            var $popup = $('<div class="bte-color-popup"></div>');
            
            // === CLOSE BUTTON ===
            var $closeBtn = $('<button type="button" class="bte-popup-close" aria-label="Close">&times;</button>');
            $popup.append($closeBtn);
            
            // === LEFT SIDE: Custom Grouped Palette Grid ===
            // Wrap paletteData in { data: ... } for Underscore.js template
            var paletteHtml = _.template(paletteGridTemplate)({ data: paletteData });
            $popup.append(paletteHtml);
            
            // === RIGHT SIDE: Pickr Widget Container ===
            var $pickrContainer = $('<div class="bte-popup-pickr-container"></div>');
            var $pickrEl = $('<div class="bte-pickr-widget"></div>');
            $pickrContainer.append($pickrEl);
            $popup.append($pickrContainer);
            
            // Append popup to body
            $('body').append($popup);
            
            // === HIGHLIGHT MATCHING SWATCH (if color was picked from palette) ===
            (function highlightMatchingSwatch() {
                var currentColorValue = currentColor; // currentColor from line 104
                var paletteRef = $textInput.attr('data-palette-ref') || $trigger.attr('data-palette-ref');
                
                console.log('🔍 Looking for matching swatch:', {
                    currentColor: currentColorValue,
                    paletteRef: paletteRef
                });
                
                // Priority 1: Match by palette reference (exact source)
                if (paletteRef) {
                    var $matchedSwatch = $popup.find('.bte-palette-swatch[data-css-var="' + paletteRef + '"]');
                    if ($matchedSwatch.length) {
                        $matchedSwatch.addClass('selected');
                        console.log('✨ Pre-selected palette swatch by ref:', paletteRef);
                        return; // Done
                    } else {
                        console.warn('⚠️ Palette ref not found in current palette:', paletteRef);
                        // Fallback to hex matching below
                    }
                }
                
                // Priority 2: Match by hex (fallback for legacy or manual colors)
                if (currentColorValue && self.isValidHex(currentColorValue)) {
                    var currentColorLower = currentColorValue.toLowerCase();
                    $popup.find('.bte-palette-swatch').each(function() {
                        var $swatch = $(this);
                        var swatchHex = $swatch.data('hex');
                        
                        if (swatchHex && swatchHex.toLowerCase() === currentColorLower) {
                            $swatch.addClass('selected');
                            console.log('✨ Pre-selected palette swatch by hex:', swatchHex);
                            return false; // Stop loop
                        }
                    });
                }
            })();
            
            // === CLOSE BUTTON HANDLER ===
            $closeBtn.on('click', function() {
                console.log('🔴 Close button clicked');
                self._closeAllPopups();
            });
            
            // === OUTSIDE CLICK HANDLER (specific to this popup) ===
            setTimeout(function() {
                $(document).on('click.bte-popup-' + Date.now(), function(e) {
                    var $target = $(e.target);
                    // Close if clicked outside popup, trigger, Pickr elements, and palette swatches
                    if (!$target.closest('.bte-color-popup').length && 
                        !$target.closest('.bte-color-trigger').length &&
                        !$target.closest('.pcr-app').length &&
                        !$target.closest('.bte-palette-swatch').length) {
                        self._closeAllPopups();
                    }
                });
            }, 100); // Delay to prevent immediate close
            
            // === LAZY LOAD PICKR ===
            require(['pickr'], function(Pickr) {
                if (!Pickr) {
                    console.error('❌ Pickr failed to load');
                    self._closeAllPopups();
                    return;
                }
                
                // === INITIALIZE PICKR ===
                var pickr = Pickr.create({
                el: $pickrEl[0],
                theme: 'nano',
                container: $pickrContainer[0],
                
                // Inline mode (embedded in our popup)
                inline: true,
                showAlways: true,
                
                // Position (not used in inline mode)
                autoReposition: false,
                
                // Default color
                default: currentColor,
                
                // Disable built-in swatches (we have our own)
                swatches: null,
                
                // Lock opacity (ви сказали можна вимкнути)
                lockOpacity: true,
                
                // Components visibility
                components: {
                    palette: true,      // Box (Saturation/Value)
                    preview: true,      // Color comparison
                    opacity: false,     // Opacity slider (вимкнено)
                    hue: true,          // Hue slider
                    
                    interaction: {
                        hex: true,      // HEX input
                        rgba: false,    // Hide RGBA button
                        hsla: false,    // Hide HSLA button
                        hsva: false,    // Hide HSVA button
                        cmyk: false,    // Hide CMYK button
                        input: true,    // Show input field
                        clear: false,   // Hide clear button
                        cancel: true,   // Show cancel button
                        save: true      // Show save button
                    }
                }
            });
            
            // Position popup to the right of trigger
            self._positionPopup($popup, $trigger);
            
            // Store references
            $trigger.data('popup-instance', {
                $popup: $popup,
                pickr: pickr
            });
            
            // === PICKR EVENT HANDLERS ===
            
            // On color change (while dragging/adjusting)
            pickr.on('change', function(color) {
                var hex = color.toHEXA().toString();
                
                // Update text input
                $textInput.val(hex);
                
                // Update trigger preview
                $trigger.find('.bte-color-preview').css('background-color', hex);
                
                // Check if this is a palette cascade update (from PaletteManager)
                var isPaletteUpdate = $textInput.data('is-palette-update');
                if (isPaletteUpdate) {
                    console.log('✅ Palette cascade - preserving reference (change)');
                    return; // Don't remove palette-ref, don't trigger save
                }
                
                // Check if this is a palette selection (programmatic change)
                var isPaletteSelection = $textInput.data('is-palette-selection');
                
                if (!isPaletteSelection) {
                    // 🆕 Remove palette reference (manual color change)
                    $textInput.removeAttr('data-palette-ref');
                    $trigger.removeAttr('data-palette-ref');
                    
                    // 🆕 Remove selected class from all swatches
                    $popup.find('.bte-palette-swatch').removeClass('selected');
                    
                    console.log('🔓 Palette reference removed (manual change)');
                } else {
                    console.log('✅ Palette reference preserved (palette selection)');
                }
                
                // Trigger change event
                BaseHandler.handleChange($textInput, callback);
            });
            
            // On save button click
            pickr.on('save', function(color) {
                if (!color) {
                    // Close popup after save
                    self._closeAllPopups();
                    return;
                }
                
                // Check if this is a palette cascade update (from PaletteManager)
                var isPaletteUpdate = $textInput.data('is-palette-update');
                if (isPaletteUpdate) {
                    console.log('✅ Palette cascade - preserving reference (save)');
                    // Close popup after save
                    self._closeAllPopups();
                    return; // Don't remove palette-ref, don't trigger save
                }
                
                var hex = color.toHEXA().toString();
                $textInput.val(hex);
                $trigger.find('.bte-color-preview').css('background-color', hex);
                
                // Check if this is a palette selection
                var isPaletteSelection = $textInput.data('is-palette-selection');
                
                if (!isPaletteSelection) {
                    // 🆕 Remove palette reference (manual save)
                    $textInput.removeAttr('data-palette-ref');
                    $trigger.removeAttr('data-palette-ref');
                    
                    // 🆕 Remove selected class from all swatches
                    $popup.find('.bte-palette-swatch').removeClass('selected');
                    
                    console.log('🔓 Palette reference removed (manual save)');
                } else {
                    console.log('✅ Palette reference preserved (palette selection on save)');
                }
                
                BaseHandler.handleChange($textInput, callback);
                
                // Close popup after save
                self._closeAllPopups();
            });
            
            // On cancel button click
            pickr.on('cancel', function() {
                // Restore original color
                pickr.setColor(currentColor);
                $textInput.val(currentColor);
                $trigger.find('.bte-color-preview').css('background-color', currentColor);
                
                // Close popup
                self._closeAllPopups();
            });
            
            // === CUSTOM PALETTE GRID HANDLERS ===
            
            // Handle swatch clicks
            $popup.on('click', '.bte-palette-swatch', function(e) {
                e.stopPropagation(); // Prevent outside click handler
                
                var $swatch = $(e.currentTarget);
                var hex = $swatch.data('hex');
                var cssVar = $swatch.data('css-var');
                
                console.log('🎨 Palette swatch clicked:', cssVar, '→', hex);
                
                // Update text input and trigger preview FIRST (before Pickr)
                $textInput.val(hex);
                $trigger.find('.bte-color-preview').css('background-color', hex);
                
                // 🆕 Store palette reference for future highlighting
                $textInput.attr('data-palette-ref', cssVar);
                $trigger.attr('data-palette-ref', cssVar);
                console.log('🔗 Palette reference saved:', cssVar, '→', hex);
                
                // Set flag to prevent removal in pickr.on('change') and pickr.on('save')
                $textInput.data('is-palette-selection', true);
                $trigger.data('is-palette-selection', true);
                
                // Update Pickr color (SILENT to avoid triggering events that close popup)
                try {
                    if (pickr && pickr._root && pickr._root.interaction && pickr.setColor) {
                        pickr.setColor(hex, true); // silent=true (no events)
                        console.log('✅ Pickr color updated (silent)');
                    } else {
                        console.warn('⚠️ Pickr instance not ready, skipping Pickr update');
                    }
                } catch (err) {
                    console.error('❌ Error setting Pickr color:', err);
                }
                
                // Highlight selected swatch
                $popup.find('.bte-palette-swatch').removeClass('selected');
                $swatch.addClass('selected');
                
                // Debug logging for color field save
                console.log('💾 Color field save:', {
                    hex: hex,
                    paletteRef: cssVar,
                    willSaveAs: $textInput.attr('data-palette-ref') || hex,
                    hasPaletteRef: !!$textInput.attr('data-palette-ref')
                });
                
                // Trigger change event to save
                BaseHandler.handleChange($textInput, callback);
                
                // Clear flag after change is processed
                // Use setTimeout to ensure flag is cleared after all events complete
                setTimeout(function() {
                    $textInput.removeData('is-palette-selection');
                    $trigger.removeData('is-palette-selection');
                    console.log('🧹 Palette selection flag cleared');
                }, 50);
                
                // Popup stays open (as per your preference)
            });
            
            console.log('🎨 Color popup opened with Pickr');
            
            }); // End of require(['pickr'])
        },

        /**
         * Position popup to the right of trigger
         * 
         * @param {jQuery} $popup - Popup container
         * @param {jQuery} $trigger - Color trigger element
         */
        _positionPopup: function($popup, $trigger) {
            var triggerOffset = $trigger.offset();
            var triggerWidth = $trigger.outerWidth();
            
            // Position to the right with 10px gap
            var left = triggerOffset.left + triggerWidth + 10;
            var top = triggerOffset.top;
            
            $popup.css({
                position: 'absolute',
                left: left + 'px',
                top: top + 'px',
                zIndex: 10001
            });
        },

        /**
         * Close all open color popups and destroy Pickr instances
         */
        _closeAllPopups: function() {
            $('.bte-color-trigger').each(function() {
                var popupInstance = $(this).data('popup-instance');
                if (popupInstance) {
                    // Destroy Pickr instance
                    if (popupInstance.pickr) {
                        popupInstance.pickr.destroyAndRemove();
                    }
                    
                    // Remove popup from DOM
                    popupInstance.$popup.remove();
                    
                    // Clear data
                    $(this).removeData('popup-instance');
                }
            });
            
            // Safety cleanup: clear any remaining palette selection flags
            $('.bte-color-input').removeData('is-palette-selection');
            $('.bte-color-input').removeData('is-palette-update');
            $('.bte-color-trigger').removeData('is-palette-selection');
            $('.bte-color-trigger').removeData('is-palette-update');
        },

        /**
         * Destroy handlers and cleanup
         * 
         * @param {jQuery} $element - Panel element
         */
        destroy: function($element) {
            // Close popups and destroy Pickr instances
            this._closeAllPopups();
            
            // Remove event listeners
            $element.off('click', '.bte-color-trigger');
            $element.off('input', '.bte-color-input');
            $element.off('click', '.bte-field-reset-btn');
            $(document).off('click.bte-color-popup');
            $(document).off('keydown.bte-color-popup');
        },

        /**
         * Update field UI after reset
         * Handles palette reference resolution for color fields
         * 
         * @param {String} sectionCode
         * @param {String} fieldCode
         * @param {*} value - Restored draft value (HEX or palette ref)
         * @param {jQuery} $field - Field element (passed by BaseHandler to avoid re-finding)
         * @param {Object} handlerRef - Reference to ColorHandler for accessing own methods
         */
        updateFieldUIAfterReset: function(sectionCode, fieldCode, value, $field, handlerRef) {
            // Use provided $field or find it (for backward compatibility)
            if (!$field || !$field.length) {
                $field = this._findFieldElement(sectionCode, fieldCode);
            }
            
            if (!$field.length) {
                console.warn('⚠️ Color field element not found');
                return;
            }
            
            var $wrapper = $field.closest('.bte-field');
            var $input = $wrapper.find('.bte-color-input');
            var $preview = $wrapper.find('.bte-color-preview');
            
            // Check if value is palette reference
            var isPaletteRef = typeof value === 'string' && value.startsWith('--color-');
            var hexValue;
            
            console.log('🐛 DEBUG Reset: value =', value, 'isPaletteRef =', isPaletteRef);
            
            if (isPaletteRef) {
                // Resolve palette ref to HEX using handlerRef to access ColorHandler methods
                console.log('🐛 DEBUG Reset: Calling _resolvePaletteRef with', value);
                hexValue = (handlerRef || this)._resolvePaletteRef(value);
                
                console.log('🐛 DEBUG Reset: _resolvePaletteRef returned:', hexValue);
                console.log('🐛 DEBUG Reset: hexValue type:', typeof hexValue);
                console.log('🐛 DEBUG Reset: hexValue starts with #:', hexValue && hexValue.startsWith('#'));
                
                // Update input and preserve palette ref attribute
                $input.val(hexValue);
                
                console.log('🐛 DEBUG Reset: After $input.val(), $input.val() =', $input.val());
                
                $input.attr('data-palette-ref', value);
                
                console.log('↺ Color reset with palette ref:', value, '→', hexValue);
            } else {
                // Regular HEX color
                hexValue = value;
                
                // Update input and remove palette ref
                $input.val(hexValue);
                $input.removeAttr('data-palette-ref');
                
                console.log('↺ Color reset with HEX:', hexValue);
            }
            
            // Update preview boxes
            $preview.each(function() {
                $(this).css('background-color', hexValue);
            });
            
            // Update Pickr instance if exists
            var popupInstance = $field.data('popup-instance');
            if (popupInstance && popupInstance.pickr) {
                popupInstance.pickr.setColor(hexValue, true); // silent: true
                console.log('↺ Pickr updated:', hexValue);
            }
            
            // Note: CSS preview is updated via 'field-reset' event in panel.js
            // No need to trigger 'change' event here, as it would cause isDirty to be set again
        },

        /**
         * Resolve palette reference to HEX color
         * Uses ColorRenderer's simple PaletteManager lookup
         * 
         * @param {String} paletteRef - CSS variable name (--color-*)
         * @returns {String} HEX color
         */
        _resolvePaletteRef: function(paletteRef) {
            console.log('🐛 DEBUG _resolvePaletteRef: input =', paletteRef);
            console.log('🐛 DEBUG _resolvePaletteRef: ColorRenderer =', ColorRenderer);
            console.log('🐛 DEBUG _resolvePaletteRef: ColorRenderer._getPaletteHexFromMapping =', typeof ColorRenderer._getPaletteHexFromMapping);
            
            var result = ColorRenderer._getPaletteHexFromMapping(paletteRef);
            
            console.log('🐛 DEBUG _resolvePaletteRef: ColorRenderer returned =', result);
            console.log('🐛 DEBUG _resolvePaletteRef: result type =', typeof result);
            
            return result;
        }
    };
});
