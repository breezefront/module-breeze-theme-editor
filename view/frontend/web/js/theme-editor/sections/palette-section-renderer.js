define([
    'jquery',
    'jquery-ui-modules/widget',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/sections/palette-section.html',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager'
], function (
    $,
    widget,
    paletteTemplate,
    PaletteManager
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
            console.log('✅ Initializing Palette Section');

            // Initialize PaletteManager if not already done
            if (!PaletteManager.storeId) {
                PaletteManager.init({
                    palettes: this.options.palettes,
                    storeId: this.options.storeId,
                    themeId: this.options.themeId
                });
            }

            this._render();
            this._bind();
        },

        /**
         * Render palette section
         */
        _render: function () {
            // Insert template
            this.element.html(paletteTemplate);

            // Cache selectors
            this.$header = this.element.find('.bte-palette-header');
            this.$content = this.element.find('.bte-palette-content');
            this.$grid = this.element.find('.bte-palette-grid');
            
            // Open by default
            this.$header.addClass('active');
            this.$content.addClass('active').show();

            // Render palettes
            this._renderPalettes();

            console.log('📋 Palette Section rendered');
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
            var $group = $('<div class="bte-palette-group"></div>');

            // Add thick border separator (except for first group)
            if (index > 0) {
                $group.addClass('bte-palette-group-separator');
            }

            // Add group label (optional, can be hidden via CSS)
            var $label = $('<div class="bte-palette-group-label">' + group.label + '</div>');
            $group.append($label);

            // Render colors in this group
            group.colors.forEach(function(color) {
                var $swatch = self._createSwatch(color);
                $group.append($swatch);
            });

            this.$grid.append($group);
        },

        /**
         * Create color swatch element
         * 
         * @param {Object} color
         * @returns {jQuery}
         */
        _createSwatch: function (color) {
            var hexValue = PaletteManager.rgbToHex(color.value);

            // Create swatch container
            var $swatch = $('<div class="bte-palette-swatch"></div>');
            $swatch.attr('data-css-var', color.cssVar);
            $swatch.attr('data-label', color.label);
            $swatch.attr('data-usage', color.usageCount || 0);

            // Add title tooltip
            var tooltip = color.label + '\n' + 
                         hexValue + '\n' + 
                         'Used in ' + (color.usageCount || 0) + ' fields';
            $swatch.attr('title', tooltip);

            // Create visual square
            var $visual = $('<div class="bte-swatch-visual"></div>');
            $visual.css('background-color', hexValue);

            // Create hidden color input
            var $input = $('<input type="color" class="bte-swatch-input">');
            $input.val(hexValue);
            $input.attr('data-css-var', color.cssVar);

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
            this.$header.on('click', function() {
                var isActive = self.$header.hasClass('active');
                
                if (isActive) {
                    self.$header.removeClass('active');
                    self.$content.removeClass('active').slideUp(200);
                } else {
                    self.$header.addClass('active');
                    self.$content.addClass('active').slideDown(200);
                }
                
                console.log('🔄 Palette accordion toggled:', !isActive);
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

            // Color input change
            this.$grid.on('change', '.bte-swatch-input', function(e) {
                var $input = $(e.currentTarget);
                var cssVar = $input.attr('data-css-var');
                var hexValue = $input.val();

                console.log('🎨 Color changed:', cssVar, '=', hexValue);

                // Update visual
                var $swatch = $input.closest('.bte-palette-swatch');
                $swatch.find('.bte-swatch-visual').css('background-color', hexValue);

                // Update via PaletteManager (handles save & notifications)
                PaletteManager.updateColor(cssVar, hexValue);
            });

            console.log('✅ Palette Section events bound');
        },

        /**
         * Update swatch color (called from external sources)
         * 
         * @param {String} cssVar
         * @param {String} hexValue
         */
        updateSwatch: function (cssVar, hexValue) {
            var $swatch = this.$grid.find('[data-css-var="' + cssVar + '"]');
            
            if ($swatch.length === 0) {
                return;
            }

            // Update input value
            $swatch.find('.bte-swatch-input').val(hexValue);

            // Update visual
            $swatch.find('.bte-swatch-visual').css('background-color', hexValue);

            console.log('🔄 Swatch updated:', cssVar, '=', hexValue);
        },

        /**
         * Destroy widget
         */
        _destroy: function () {
            this.$header.off('click');
            this.$grid.off('click', '.bte-palette-swatch');
            this.$grid.off('change', '.bte-swatch-input');
            this._super();
        }
    });

    return $.swissup.paletteSection;
});
