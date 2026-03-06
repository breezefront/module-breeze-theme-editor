define([
    'jquery',
    'jquery-ui-modules/widget',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/palette-section.html',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/badge-renderer',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/panel/icon-registry'
], function (
    $,
    widget,
    paletteTemplate,
    PaletteManager,
    BadgeRenderer,
    Logger,
    StorageHelper,
    IconRegistry
) {
    'use strict';

    /**
     * Palette Section Renderer
     * 
     * Renders color palette matrix in sidebar
     * - Matrix layout (5 colors per row)
     * - Groups separated by thick borders
     * - Native color picker on click
     * - Debounced save (500ms)
     */
    $.widget('swissup.paletteSection', {
        options: {
            palettes: [],
            storeId: null,
            themeId: null
        },

        _create: function () {
            Logger.info('palette-section', 'Initializing');

            // PaletteManager is always initialized by settings-editor before
            // _initPaletteSection() is called, so no need to re-init here.
            // The old guard "if (!PaletteManager.storeId)" was preventing
            // re-initialization after a store switch.

            this._render();

            // Guard flag: native color picker (Linux/GTK) fires a focus-return click
            // on the page when the OS dialog closes.  If the reset button was just
            // made visible by the colour-change badge update, that spurious click
            // would trigger an unwanted palette reset.  We suppress reset clicks for
            // 500 ms after any palette colour change.
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
            var tooltip = color.label + '\n' + 
                         hexValue + '\n' + 
                         'Used in ' + (color.usageCount || 0) + ' fields';
            if (isModified) {
                tooltip += '\n⚠️ Modified from default';
            }
            $swatch.attr('title', tooltip);

            // Create visual square
            var $visual = $('<div class="bte-swatch-visual"></div>');
            $visual.css('background-color', hexValue);

            // Create hidden color input
            var $input = $('<input type="color" class="bte-swatch-input">');
            $input.val(hexValue);
            $input.attr('data-property', color.property);

            $swatch.append($visual);
            $swatch.append($input);

            return $swatch;
        },

        /**
         * Bind event handlers
         */
        _bind: function () {
            var self = this;

            // Toggle accordion
            this.$header.on('click', function(e) {
                if ($(e.target).closest('.bte-palette-reset-btn').length) {
                    return; // let the delegated reset handler on this.element deal with it
                }

                var isActive = self.$header.hasClass('active');
                
                if (isActive) {
                    self.$header.removeClass('active');
                    self.$content.removeClass('active').slideUp(200);
                } else {
                    self.$header.addClass('active');
                    self.$content.addClass('active').slideDown(200);
                }

                StorageHelper.setItem('palette_open', isActive ? 'false' : 'true');
                Logger.debug('palette-section', 'Accordion toggled', {open: !isActive});
            });

            // Click on swatch container → trigger hidden input
            this.$grid.on('click', '.bte-palette-swatch', function(e) {
                if ($(e.target).hasClass('bte-swatch-input')) {
                    return; // Already clicking on input
                }

                var $swatch = $(this);
                var $input = $swatch.find('.bte-swatch-input');
                
                // Trigger native color picker
                $input.trigger('click');
            });

            // Color input — real-time live preview while OS picker is open
            this.$grid.on('input', '.bte-swatch-input', function(e) {
                var $input = $(e.currentTarget);
                var property = $input.attr('data-property');
                var hexValue = $input.val();

                // Update swatch visual immediately
                $input.closest('.bte-palette-swatch')
                    .find('.bte-swatch-visual')
                    .css('background-color', hexValue);

                // Mark swatch as dirty
                $input.closest('.bte-palette-swatch').addClass('bte-swatch-dirty');

                // Notify live preview (badges/events handled by change handler below)
                PaletteManager.updateColor(property, hexValue);
            });

            // Color input change
            this.$grid.on('change', '.bte-swatch-input', function(e) {
                var $input = $(e.currentTarget);
                var property = $input.attr('data-property');
                var hexValue = $input.val();

                Logger.info('palette-section', 'Color changed', {property: property, hex: hexValue});

                // Update visual
                var $swatch = $input.closest('.bte-palette-swatch');
                $swatch.find('.bte-swatch-visual').css('background-color', hexValue);
                
                // Mark swatch as dirty (yellow border)
                $swatch.addClass('bte-swatch-dirty');

                // Update via PaletteManager (NO auto-save now)
                PaletteManager.updateColor(property, hexValue);

                // Arm the cooldown: ignore reset-button clicks for the next 500 ms.
                // Native <input type="color"> on Linux/GTK dispatches a focus-return
                // click to the page after the OS colour dialog closes.  Without this
                // guard that click lands on the reset button if it just appeared.
                self._justChanged = true;
                clearTimeout(self._justChangedTimer);
                self._justChangedTimer = setTimeout(function() {
                    self._justChanged = false;
                }, 500);
                
                // Update header badges
                self._updateHeaderBadges();
                
                // Trigger event to update panel changes count & reset button
                $(document).trigger('paletteColorChanged');
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
            $(document).on('paletteColorChanged', function() {
                self._updateResetButton();
            });

            // Listen for revert to update UI
            $(document).on('paletteChangesReverted', function(e, data) {
                // Remove all dirty classes
                self.$grid.find('.bte-palette-swatch').removeClass('bte-swatch-dirty');
                
                // Update all swatch visuals to saved values
                self.$grid.find('.bte-palette-swatch').each(function() {
                    var $swatch = $(this);
                    var property = $swatch.attr('data-property');
                    var color = PaletteManager.getColor(property);
                    
                    if (color) {
                        $swatch.find('.bte-swatch-visual').css('background-color', color.hex);
                        $swatch.find('.bte-swatch-input').val(color.hex);
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
         * Update header badges (Changed + Reset + Modified)
         * 
         * Renders and updates badge HTML in palette header based on dirty
         * and modified counts. Uses BadgeRenderer for consistent styling.
         */
        _updateHeaderBadges: function() {
            var dirtyCount = PaletteManager.getDirtyCount();
            var modifiedCount = PaletteManager.getModifiedCount();
            
            // Render badges using BadgeRenderer
            var badgesHtml = BadgeRenderer.renderPaletteBadges(dirtyCount, modifiedCount);
            this.$badgesContainer.html(badgesHtml);
            
            Logger.debug('palette-section', 'Badges updated', {dirty: dirtyCount, modified: modifiedCount});
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
            var tooltip = color.label + '\n' + hexValue + '\n' + 
                         'Used in ' + (color.usageCount || 0) + ' fields';
            if (isModified) {
                tooltip += '\n⚠️ Modified from default';
            }
            $swatch.attr('title', tooltip);
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

            // Update input value
            $swatch.find('.bte-swatch-input').val(hexValue);

            // Update visual
            $swatch.find('.bte-swatch-visual').css('background-color', hexValue);

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
         * Destroy widget
         */
        _destroy: function () {
            clearTimeout(this._justChangedTimer);
            this.$header.off('click');
            this.$grid.off('click', '.bte-palette-swatch');
            this.$grid.off('change', '.bte-swatch-input');
            
            // Cleanup new handlers
            this.element.off('click', '.bte-palette-reset-btn');
            $(document).off('paletteColorChanged paletteChangesReverted');
            
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
