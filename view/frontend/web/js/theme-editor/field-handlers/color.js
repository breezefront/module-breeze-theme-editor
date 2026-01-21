define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager'
], function ($, BaseHandler, PaletteManager) {
    'use strict';

    /**
     * Color Field Handler
     *
     * Handles sync between color picker and text input
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

            // Color picker → text input sync
            $element.on('change', '.bte-color-picker', function(e) {
                var $picker = $(e.currentTarget);
                var $textInput = $picker.siblings('.bte-color-input');

                // Sync value
                $textInput.val($picker.val());

                // Handle change (only once, from picker)
                BaseHandler.handleChange($picker, callback);
            });

            // Color text input → picker sync (with validation)
            $element.on('input', '.bte-color-input', function(e) {
                var $textInput = $(e.currentTarget);
                var value = $textInput.val();

                // Validate HEX format
                if (self.isValidHex(value)) {
                    var $picker = $textInput.siblings('.bte-color-picker');
                    $picker.val(value);

                    // Handle change
                    BaseHandler.handleChange($textInput, callback);
                } else {
                    console.log('⏳ Waiting for valid HEX:', value);
                }
            });

            // Initialize Quick Select palettes
            self._initQuickSelect($element, callback);

            console.log('✅ Color field handler initialized');
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
         * Initialize Quick Select palette for color fields
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        _initQuickSelect: function($element, callback) {
            var self = this;

            // Find all Quick Select containers
            $element.find('.bte-field-palette-quick-select').each(function() {
                var $container = $(this);
                var paletteId = $container.data('palette');
                var $grid = $container.find('.bte-palette-grid');
                var $field = $container.closest('.bte-field').find('.bte-color-picker');

                if (!paletteId) {
                    return;
                }

                // Get palette colors from PaletteManager
                var colors = PaletteManager.getPalette(paletteId);
                if (!colors || colors.length === 0) {
                    console.warn('⚠️ Palette not found:', paletteId);
                    return;
                }

                // Render swatches
                self._renderQuickSelectSwatches($grid, colors, $field);

                // Handle swatch clicks
                $grid.on('click', '.bte-palette-swatch', function(e) {
                    var $swatch = $(e.currentTarget);
                    var hexValue = $swatch.data('hex');
                    var cssVar = $swatch.data('css-var');

                    // Update field value
                    $field.val(hexValue);
                    $field.siblings('.bte-color-input').val(hexValue);

                    // Mark as selected in Quick Select
                    $grid.find('.bte-palette-swatch').removeClass('selected');
                    $swatch.addClass('selected');

                    // Highlight in main Palette section (cross-sync)
                    require(['Swissup_BreezeThemeEditor/js/theme-editor/sections/palette-section-renderer'], function(PaletteSectionRenderer) {
                        if (PaletteSectionRenderer && PaletteSectionRenderer.highlightColor) {
                            PaletteSectionRenderer.highlightColor(cssVar);
                        }
                    });

                    // Trigger change
                    BaseHandler.handleChange($field, callback);

                    console.log('🎨 Quick Select:', cssVar, '→', hexValue);
                });
            });

            // Subscribe to palette changes to keep Quick Select in sync
            PaletteManager.subscribe(function(cssVar, hexValue, rgbValue) {
                self._syncQuickSelectColors($element, cssVar, hexValue);
            });

            console.log('✅ Quick Select initialized');
        },

        /**
         * Render Quick Select swatches in grid
         *
         * @param {jQuery} $grid - Grid container
         * @param {Array} colors - Palette colors
         * @param {jQuery} $field - Color picker field
         */
        _renderQuickSelectSwatches: function($grid, colors, $field) {
            var currentValue = $field.val().toLowerCase();
            var html = '';
            var lastGroup = null;

            colors.forEach(function(color) {
                // Add group separator if group changes
                if (lastGroup && lastGroup !== color.groupId) {
                    html += '<div class="bte-palette-group-separator"></div>';
                }
                lastGroup = color.groupId;

                var isSelected = color.hex.toLowerCase() === currentValue ? 'selected' : '';
                var title = color.label + ' (' + color.hex + ')';

                html += '<div class="bte-palette-swatch ' + isSelected + '" ' +
                        'data-css-var="' + color.cssVar + '" ' +
                        'data-hex="' + color.hex + '" ' +
                        'title="' + title + '">' +
                        '<div class="bte-swatch-visual" ' +
                        'style="background-color: ' + color.hex + ';"></div>' +
                        '</div>';
            });

            $grid.html(html);
        },

        /**
         * Sync Quick Select colors when palette changes
         *
         * @param {jQuery} $element - Panel element
         * @param {String} cssVar - Changed CSS variable
         * @param {String} hexValue - New HEX value
         */
        _syncQuickSelectColors: function($element, cssVar, hexValue) {
            var $swatch = $element.find('.bte-palette-swatch[data-css-var="' + cssVar + '"]');
            if ($swatch.length) {
                $swatch.find('.bte-swatch-visual').css('background-color', hexValue);
                $swatch.data('hex', hexValue);
                $swatch.attr('title', $swatch.attr('title').replace(/\(#[0-9A-Fa-f]{6}\)/, '(' + hexValue + ')'));
                console.log('🔄 Synced Quick Select swatch:', cssVar, '→', hexValue);
            }
        },

        /**
         * Destroy handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            $element.off('change', '.bte-color-picker');
            $element.off('input', '.bte-color-input');
            $element.off('click', '.bte-palette-swatch');
        }
    };
});
