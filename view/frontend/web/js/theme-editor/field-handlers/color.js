define([
    'jquery',
    'underscore',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/partials/palette-grid.html'
], function ($, _, BaseHandler, PaletteManager, paletteGridTemplate) {
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
                
                if (self.isValidHex(value)) {
                    // Update trigger preview
                    var $trigger = $textInput.siblings('.bte-color-trigger');
                    $trigger.find('.bte-color-preview').css('background-color', value);
                    
                    // Update Pickr instance if popup is open
                    var popupInstance = $trigger.data('popup-instance');
                    if (popupInstance && popupInstance.pickr) {
                        popupInstance.pickr.setColor(value, true); // silent=true (no events)
                    }
                    
                    // Save change
                    BaseHandler.handleChange($textInput, callback);
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
            
            // === CLOSE BUTTON HANDLER ===
            $closeBtn.on('click', function() {
                console.log('🔴 Close button clicked');
                self._closeAllPopups();
            });
            
            // === OUTSIDE CLICK HANDLER (specific to this popup) ===
            setTimeout(function() {
                $(document).on('click.bte-popup-' + Date.now(), function(e) {
                    var $target = $(e.target);
                    // Close if clicked outside popup, trigger, and NOT on Pickr elements
                    if (!$target.closest('.bte-color-popup').length && 
                        !$target.closest('.bte-color-trigger').length &&
                        !$target.closest('.pcr-app').length) {
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
            this._positionPopup($popup, $trigger);
            
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
                
                // Trigger change event
                BaseHandler.handleChange($textInput, callback);
            });
            
            // On save button click
            pickr.on('save', function(color) {
                if (color) {
                    var hex = color.toHEXA().toString();
                    $textInput.val(hex);
                    $trigger.find('.bte-color-preview').css('background-color', hex);
                    BaseHandler.handleChange($textInput, callback);
                }
                
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
                var $swatch = $(e.currentTarget);
                var hex = $swatch.data('hex');
                var cssVar = $swatch.data('css-var');
                
                // Update Pickr color (will trigger 'change' event)
                pickr.setColor(hex, false); // silent=false
                
                // Highlight selected swatch
                $popup.find('.bte-palette-swatch').removeClass('selected');
                $swatch.addClass('selected');
                
                console.log('🎨 Palette swatch clicked:', cssVar, '→', hex);
                
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
                zIndex: 10000
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
            $(document).off('click.bte-color-popup');
            $(document).off('keydown.bte-color-popup');
        }
    };
});
