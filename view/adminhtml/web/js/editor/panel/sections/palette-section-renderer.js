define([
    'jquery',
    'jquery-ui-modules/widget',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/palette-section.html',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/panel/icon-registry',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/base-palette-renderer'
], function (
    $,
    widget,
    paletteTemplate,
    PaletteManager,
    Logger,
    StorageHelper,
    IconRegistry
    // base-palette-renderer registers $.swissup.basePaletteRenderer — no var needed
) {
    'use strict';

    /**
     * Palette Section Renderer
     * 
     * Renders color palette matrix in sidebar
     * - Matrix layout (5 colors per row)
     * - Groups separated by thick borders
     * - Pickr color picker on click (with opacity/alpha support)
     * - Debounced save (500ms)
     */
    $.widget('swissup.paletteSection', $.swissup.basePaletteRenderer, {
        options: {
            palettes: [],
            scope: 'stores',
            scopeId: null,
            themeId: null
        },

        _create: function () {
            this._super(); // binds bte:editabilityChanged via baseSectionRenderer

            Logger.info('palette-section', 'Initializing');

            // PaletteManager is always initialized by settings-editor before
            // _initPaletteSection() is called, so no need to re-init here.
            // The old guard "if (!PaletteManager.storeId)" was preventing
            // re-initialization after a store switch.

            this._render();

            // Guard flag: suppress reset clicks for 500 ms after a palette colour
            // change, to prevent accidental resets triggered by a stray click that
            // arrives just after the Reset button appears in the header.
            this._justChanged = false;
            this._justChangedTimer = null;

            this._bind();
        },

        /**
         * Render palette section
         */
        _render: function () {
            // Insert template
            this.element.html(paletteTemplate);

            // Prepend palette icon to title
            this.element.find('.bte-palette-title').prepend(IconRegistry.render('palette'));

            // Cache selectors
            this.$header = this.element.find('.bte-palette-header');
            this.$content = this.element.find('.bte-palette-content');
            this.$grid = this.element.find('.bte-palette-grid');
            this.$badgesContainer = this.element.find('.bte-palette-badges');
            
            // Restore open/closed state from storage (default: open)
            var storedOpen = StorageHelper.getItem('palette_open');
            if (storedOpen !== 'false') {
                this.$header.addClass('active');
                this.$content.addClass('active').show();
            } else {
                this.$content.hide();
            }

            // Render palettes
            this._renderPalettes();

            Logger.debug('palette-section', 'Rendered');
        },

        /**
         * Render all palettes
         */
        _renderPalettes: function () {
            var self = this;

            if (!this.options.palettes || this.options.palettes.length === 0) {
                this.$grid.html('<p class="bte-no-palettes">No color palettes available</p>');
                return;
            }

            // Render each palette (usually just 'default')
            this.options.palettes.forEach(function(palette) {
                self._renderPalette(palette);
            });
            
            // Update header badges after initial render
            this._updateHeaderBadges();
        },

        /**
         * Render single palette with groups
         * 
         * @param {Object} palette
         */
        _renderPalette: function (palette) {
            var self = this;

            if (!palette.groups || palette.groups.length === 0) {
                return;
            }

            // Render each group
            palette.groups.forEach(function(group, index) {
                self._renderGroup(group, index);
            });
        },

        /**
         * Render color group
         * 
         * @param {Object} group
         * @param {Number} index - Group index (for border styling)
         */
        _renderGroup: function (group, index) {
            var self = this;
            
            // Group container wrapper
            var $groupContainer = $('<div class="bte-palette-group-container"></div>');
            
            // Add separator (except first group)
            if (index > 0) {
                var $separator = $('<div class="bte-palette-group-separator"></div>');
                $groupContainer.append($separator);
            }
            
            // Group label (SHOW, not hide)
            var $label = $('<div class="bte-palette-group-label">' + group.label + '</div>');
            $groupContainer.append($label);
            
            // Swatches grid wrapper (8 columns)
            var $swatchGrid = $('<div class="bte-palette-group-grid"></div>');
            
            // Render colors in this group
            group.colors.forEach(function(color) {
                var $swatch = self._createSwatch(color);
                $swatchGrid.append($swatch);
            });
            
            $groupContainer.append($swatchGrid);
            this.$grid.append($groupContainer);
            
            Logger.debug('palette-section', 'Rendered group: ' + group.label + ' with ' + group.colors.length + ' colors');
        },

        /**
         * Create color swatch element
         * 
         * @param {Object} color
         * @returns {jQuery}
         */
        _createSwatch: function (color) {
            var hexValue = color.value;  // Already HEX format (Breeze 3.0)

            // Create swatch container
            var $swatch = $('<div class="bte-palette-swatch"></div>');
            $swatch.attr('data-property', color.property);
            $swatch.attr('data-label', color.label);
            $swatch.attr('data-usage', color.usageCount || 0);

            // Check if color is modified (saved value != default)
            var isModified = PaletteManager.isColorModified(color.property);

            // Add modified class for orange border
            if (isModified) {
                $swatch.addClass('bte-swatch-modified');
            }

            // Add title tooltip
            $swatch.attr('title', this._buildSwatchTooltip(color.label, hexValue, color.usageCount, isModified));

            // Create visual square
            var $visual = $('<div class="bte-swatch-visual"></div>');
            $visual.css('background-color', hexValue);

            $swatch.append($visual);

            return $swatch;
        },

        /**
         * Bind event handlers
         */
        _bind: function () {
            var self = this;

            // Toggle accordion
            this._bindAccordion(this.$header, this.$content, 'palette_open');

            // Click on swatch → open Pickr popup
            this.$grid.on('click', '.bte-palette-swatch', function() {
                self._openPickrPopup($(this));
            });

            // Close Pickr popup on outside click
            $(document).on('click.bte-palette-pickr', function(e) {
                setTimeout(function() {
                    if (!$('.bte-color-popup').length) return;
                    if (!$(e.target).closest('.bte-color-popup, .bte-palette-swatch').length) {
                        self._closeAllPalettePickrPopups();
                    }
                }, 10);
            });

            // Close Pickr popup on ESC
            $(document).on('keydown.bte-palette-pickr', function(e) {
                if (e.key === 'Escape' || e.keyCode === 27) {
                    self._closeAllPalettePickrPopups();
                }
            });

            // Reset button handler
            this.element.on('click', '.bte-palette-reset-btn', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Don't trigger accordion toggle

                // Ignore focus-return click from native colour picker (see _justChanged comment)
                if (self._justChanged) {
                    Logger.debug('palette-section', 'Reset ignored (colour-change cooldown active)');
                    return;
                }

                if (!PaletteManager.hasDirtyChanges()) {
                    Logger.debug('palette-section', 'Reset skipped — no dirty changes');
                    return;
                }
                
                // Confirm with user
                var count = PaletteManager.getDirtyCount();
                var confirmMsg = 'Reset ' + count + ' palette color' + (count > 1 ? 's' : '') + ' to saved values?';
                
                if (!confirm(confirmMsg)) {
                    return;
                }
                
                // Revert changes
                var reverted = PaletteManager.revertDirtyChanges();
                
                Logger.info('palette-section', 'Changes reverted', {count: reverted});
                
                // Show toast notification
                require(['Swissup_BreezeThemeEditor/js/lib/toastify'], function(Toastify) {
                    Toastify.show('info', reverted + ' palette color' + (reverted > 1 ? 's' : '') + ' reset');
                });
            });

            // Listen for palette changes to update reset button
            $(document).on('paletteColorChanged.paletteSection', function() {
                self._updateResetButton();
            });

            // Listen for revert to update UI
            $(document).on('paletteChangesReverted.paletteSection', function(e, data) {
                // Remove all dirty classes
                self.$grid.find('.bte-palette-swatch').removeClass('bte-swatch-dirty');
                
                // Update all swatch visuals to saved values
                self.$grid.find('.bte-palette-swatch').each(function() {
                    var $swatch = $(this);
                    var property = $swatch.attr('data-property');
                    var color = PaletteManager.getColor(property);
                    
                    if (color) {
                        $swatch.find('.bte-swatch-visual').css('background-color', color.hex);
                    }
                });
                
                // Hide reset button
                self._updateResetButton();
                
                // Update header badges
                self._updateHeaderBadges();
                
                // Update panel changes count
                $(document).trigger('paletteColorChanged');
            });

            // Listen for save to clear dirty state
            $(document).on('themeEditorDraftSaved', function() {
                // Clear dirty classes
                self.$grid.find('.bte-palette-swatch').removeClass('bte-swatch-dirty');
                
                // Update modified state for all swatches (colors may now be modified)
                self.$grid.find('.bte-palette-swatch').each(function() {
                    var $swatch = $(this);
                    var property = $swatch.attr('data-property');
                    self._updateSwatchModifiedState(property);
                });
                
                // Update header badges (Changed -> Modified transition)
                self._updateHeaderBadges();
                
                self._updateResetButton();
                Logger.debug('palette-section', 'Dirty indicators cleared after save');
            });

            Logger.debug('palette-section', 'Events bound');
        },

        /**
         * Show/hide reset button based on dirty state
         */
        _updateResetButton: function() {
            var hasDirty = PaletteManager.hasDirtyChanges();
            var count = PaletteManager.getDirtyCount();
            
            var $resetBtn = this.element.find('.bte-palette-reset-btn');
            
            if (hasDirty && count > 0) {
                // Show button with count
                $resetBtn.show().find('.bte-reset-count').text('(' + count + ')');
                Logger.debug('palette-section', 'Reset button shown', {dirtyCount: count});
            } else {
                // Hide button
                $resetBtn.hide();
            }
        },

        /**
         * Return dirty/modified counts from PaletteManager for badge rendering.
         *
         * @returns {{ dirty: Number, modified: Number }}
         */
        _getBadgeCounts: function () {
            return {
                dirty:    PaletteManager.getDirtyCount(),
                modified: PaletteManager.getModifiedCount()
            };
        },

        /**
         * Update swatch visual state (modified border) after save/reset
         * 
         * Updates the "modified" class on a swatch based on whether its
         * current saved value differs from the theme default.
         * 
         * @param {String} property - CSS variable name
         */
        _updateSwatchModifiedState: function(property) {
            var $swatch = this.$grid.find('.bte-palette-swatch[data-property="' + property + '"]');
            if ($swatch.length === 0) {
                return;
            }
            
            var isModified = PaletteManager.isColorModified(property);
            $swatch.toggleClass('bte-swatch-modified', isModified);
            
            // Update tooltip
            var color = PaletteManager.getColor(property);
            var hexValue = color.value;  // Already HEX format (Breeze 3.0)
            $swatch.attr('title', this._buildSwatchTooltip(color.label, hexValue, color.usageCount, isModified));
        },

        /**
         * Build tooltip text for a color swatch.
         *
         * Used in both _createSwatch() (initial render) and
         * _updateSwatchModifiedState() (after save/reset) to keep the
         * tooltip format consistent.
         *
         * @param {String}  label       - Human-readable color name
         * @param {String}  hexValue    - Current HEX value, e.g. '#ff0000'
         * @param {Number}  usageCount  - Number of fields using this color
         * @param {Boolean} isModified  - Whether the color differs from its default
         * @returns {String}
         */
        _buildSwatchTooltip: function (label, hexValue, usageCount, isModified) {
            var tooltip = label + '\n' + hexValue + '\n' +
                'Used in ' + (usageCount || 0) + ' fields';

            if (isModified) {
                tooltip += '\n⚠️ Modified from default';
            }

            return tooltip;
        },

        /**
         * Update swatch color (called from external sources)
         * 
         * @param {String} property
         * @param {String} hexValue
         */
        updateSwatch: function (property, hexValue) {
            var $swatch = this.$grid.find('[data-property="' + property + '"]');
            
            if ($swatch.length === 0) {
                return;
            }

            // Update visual
            $swatch.find('.bte-swatch-visual').css('background-color', hexValue);

            // Update open Pickr if any
            var pickr = $swatch.data('palette-pickr-instance');
            if (pickr) {
                pickr.setColor(hexValue, true);
            }

            Logger.debug('palette-section', 'Swatch updated', {property: property, hex: hexValue});
        },

        /**
         * Highlight a specific color swatch (called from Quick Select)
         * 
         * @param {String} property - CSS variable to highlight
         */
        highlightColor: function(property) {
            // Remove previous highlights
            this.$grid.find('.bte-palette-swatch').removeClass('quick-select-active');
            
            // Add highlight to matching swatch
            var $swatch = this.$grid.find('.bte-palette-swatch[data-property="' + property + '"]');
            if ($swatch.length) {
                $swatch.addClass('quick-select-active');
                
                // Scroll into view if needed
                var swatchTop = $swatch.position().top;
                var containerScrollTop = this.$content.scrollTop();
                var containerHeight = this.$content.height();
                
                // If swatch is not visible, scroll to it
                if (swatchTop < 0 || swatchTop > containerHeight) {
                    this.$content.animate({
                        scrollTop: containerScrollTop + swatchTop - 50
                    }, 300);
                }
                
                Logger.debug('palette-section', 'Highlighted palette color', {property: property});
            }
        },

        /**
         * Normalize hex8 with full opacity: #rrggbbff → #rrggbb
         *
         * @param {String} hex
         * @returns {String}
         */
        _normalizeHexAlpha: function(hex) {
            if (hex && hex.length === 9 && hex.slice(-2).toLowerCase() === 'ff') {
                return hex.slice(0, 7);
            }
            return hex;
        },

        /**
         * Open Pickr popup for a palette swatch
         *
         * @param {jQuery} $swatch
         */
        _openPickrPopup: function($swatch) {
            var self = this;

            // Close any existing popup first
            this._closeAllPalettePickrPopups();

            var property = $swatch.attr('data-property');
            var color = PaletteManager.getColor(property);
            if (!color) {
                return;
            }

            var originalHex = color.hex;

            // Build popup: close button + Pickr container
            var $popup = $('<div class="bte-color-popup"></div>');
            var $closeBtn = $('<button type="button" class="bte-popup-close" aria-label="Close">&times;</button>');
            var $pickrContainer = $('<div class="bte-popup-pickr-container"></div>');
            var $pickrEl = $('<div class="bte-pickr-widget"></div>');

            $pickrContainer.append($pickrEl);
            $popup.append($closeBtn);
            $popup.append($pickrContainer);
            $('body').append($popup);

            self._positionPickrPopup($popup, $swatch);

            $closeBtn.on('click', function() {
                self._closeAllPalettePickrPopups();
            });

            require(['pickr'], function(Pickr) {
                if (!Pickr) {
                    $popup.remove();
                    return;
                }

                var pickr = Pickr.create({
                    el: $pickrEl[0],
                    theme: 'nano',
                    container: $pickrContainer[0],
                    inline: true,
                    showAlways: true,
                    autoReposition: false,
                    default: originalHex,
                    swatches: null,
                    lockOpacity: false,
                    components: {
                        palette: true,
                        preview: true,
                        opacity: true,
                        hue: true,
                        interaction: {
                            hex: true,
                            rgba: false,
                            hsla: false,
                            hsva: false,
                            cmyk: false,
                            input: true,
                            clear: false,
                            cancel: true,
                            save: false
                        }
                    }
                });

                $swatch.data('palette-pickr-instance', pickr);
                $swatch.data('palette-pickr-popup', $popup);

                // Guard: Pickr fires 'change' once during initialization with the
                // default colour — ignore it so simply opening the picker does not
                // create a dirty entry.
                var pickrInitialized = false;
                var badgesDebounceTimer = null;

                // Live commit: every user-driven colour change is persisted immediately.
                // CSS preview + dirty state update on every event; badge/panel updates
                // are debounced to avoid excessive re-renders while dragging sliders.
                pickr.on('change', function(color) {
                    if (!pickrInitialized) {
                        pickrInitialized = true;
                        return;
                    }

                    var hex = self._normalizeHexAlpha(color.toHEXA().toString());
                    $swatch.find('.bte-swatch-visual').css('background-color', hex);
                    $swatch.addClass('bte-swatch-dirty');
                    PaletteManager.updateColor(property, hex);

                    Logger.info('palette-section', 'Color changed (Pickr)', {property: property, hex: hex});

                    // Debounce badge/panel updates (~150 ms) to avoid flicker during drag
                    clearTimeout(badgesDebounceTimer);
                    badgesDebounceTimer = setTimeout(function() {
                        // Arm cooldown so a stray click after picker close can't
                        // accidentally trigger the Reset button
                        self._justChanged = true;
                        clearTimeout(self._justChangedTimer);
                        self._justChangedTimer = setTimeout(function() {
                            self._justChanged = false;
                        }, 500);

                        self._updateHeaderBadges();
                        $(document).trigger('paletteColorChanged');
                    }, 150);
                });

                // On cancel — restore original colour and close popup
                pickr.on('cancel', function() {
                    $swatch.find('.bte-swatch-visual').css('background-color', originalHex);
                    $swatch.removeClass('bte-swatch-dirty');
                    PaletteManager.updateColor(property, originalHex);
                    self._updateHeaderBadges();
                    $(document).trigger('paletteColorChanged');
                    self._closeAllPalettePickrPopups();
                });
            });
        },

        /**
         * Position popup to the right of the swatch
         *
         * @param {jQuery} $popup
         * @param {jQuery} $swatch
         */
        _positionPickrPopup: function($popup, $swatch) {
            var offset = $swatch.offset();
            var left = offset.left + $swatch.outerWidth() + 10;
            var top = offset.top;

            // Clamp to viewport
            var popupWidth = 220; // approximate, Pickr nano is ~200px
            if (left + popupWidth > $(window).width()) {
                left = offset.left - popupWidth - 10;
            }

            $popup.css({
                position: 'absolute',
                left: left + 'px',
                top: top + 'px',
                zIndex: 10001
            });
        },

        /**
         * Close all open palette Pickr popups
         */
        _closeAllPalettePickrPopups: function() {
            this.$grid.find('.bte-palette-swatch').each(function() {
                var $swatch = $(this);
                var pickr = $swatch.data('palette-pickr-instance');
                var $popup = $swatch.data('palette-pickr-popup');

                if (pickr) {
                    pickr.destroyAndRemove();
                    $swatch.removeData('palette-pickr-instance');
                }
                if ($popup) {
                    $popup.remove();
                    $swatch.removeData('palette-pickr-popup');
                }
            });
        },

        /**
         * Destroy widget
         */
        _destroy: function () {
            clearTimeout(this._justChangedTimer);
            this._closeAllPalettePickrPopups();
            this.$grid.off('click', '.bte-palette-swatch');
            this.element.off('click', '.bte-palette-reset-btn');
            $(document).off('paletteColorChanged.paletteSection paletteChangesReverted.paletteSection');
            $(document).off('click.bte-palette-pickr');
            $(document).off('keydown.bte-palette-pickr');
            
            this._super();
        }
    });

    // Expose highlightColor as a static method for external access
    $.swissup.paletteSection.highlightColor = function(property) {
        // Find the active palette section widget instance
        var $paletteSection = $('.bte-palette-section');
        if ($paletteSection.length && $paletteSection.data('swissup-paletteSection')) {
            $paletteSection.paletteSection('highlightColor', property);
        }
    };

    return $.swissup.paletteSection;
});
