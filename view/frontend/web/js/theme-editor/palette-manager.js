define([
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-palette-value',
    'Swissup_BreezeThemeEditor/js/theme-editor/storage-helper',
    'Swissup_BreezeThemeEditor/js/lib/toastify'
], function (savePaletteValueMutation, StorageHelper, Toastify) {
    'use strict';

    /**
     * Palette Manager - Central state management for color palettes
     * 
     * Responsibilities:
     * - Store palette configuration
     * - Handle color updates
     * - Notify subscribers about changes
     * - Save changes to backend
     */
    return {
        palettes: {},
        storeId: null,
        themeId: null,
        listeners: [],
        dirtyColors: {}, // Track unsaved changes with original values

        /**
         * Initialize palette manager
         * 
         * @param {Object} config - Config from breezeThemeEditorConfig
         */
        init: function(config) {
            if (!config || !config.palettes) {
                console.log('⚠️ No palettes found in config');
                return;
            }

            this.storeId = config.storeId || StorageHelper.getStoreId();
            this.themeId = config.themeId || StorageHelper.getThemeId();
            this.palettes = this._indexPalettes(config.palettes);
            this.dirtyColors = {}; // Reset dirty state on init (important for test isolation)
            this.listeners = []; // Reset listeners on init

            console.log('✅ Palette Manager initialized with', Object.keys(this.palettes).length, 'palettes');
        },

        /**
         * Index palettes for quick lookup
         * Creates flat map: cssVar -> color object
         * 
         * @param {Array} palettes
         * @returns {Object}
         */
        _indexPalettes: function(palettes) {
            var index = {};

            palettes.forEach(function(palette) {
                palette.groups.forEach(function(group) {
                    group.colors.forEach(function(color) {
                        // Store with full context
                        index[color.cssVar] = {
                            id: color.id,
                            label: color.label,
                            cssVar: color.cssVar,
                            value: color.value,
                            default: color.default,
                            usageCount: color.usageCount || 0,
                            hex: this.rgbToHex(color.value),
                            paletteId: palette.id,
                            groupId: group.id,
                            groupLabel: group.label
                        };
                    }.bind(this));
                }.bind(this));
            }.bind(this));

            return index;
        },

        /**
         * Get palette by ID
         * 
         * @param {String} paletteId
         * @returns {Object|null}
         */
        getPalette: function(paletteId) {
            var colors = [];

            Object.keys(this.palettes).forEach(function(cssVar) {
                var color = this.palettes[cssVar];
                if (color.paletteId === paletteId) {
                    colors.push(color);
                }
            }.bind(this));

            return colors.length > 0 ? colors : null;
        },

        /**
         * Get palette with full group structure for popup grid
         * 
         * @param {String} paletteId - Palette identifier (e.g., 'default')
         * @returns {Object|null} - { id, groups: [{id, label, colors: [...]}] }
         */
        getPaletteWithGroups: function(paletteId) {
            var groups = {};
            
            // Collect colors by group from flat indexed palette
            Object.keys(this.palettes).forEach(function(cssVar) {
                var color = this.palettes[cssVar];
                
                // Skip if different palette
                if (color.paletteId !== paletteId) {
                    return;
                }
                
                // Initialize group if not exists
                if (!groups[color.groupId]) {
                    groups[color.groupId] = {
                        id: color.groupId,
                        label: color.groupLabel,
                        colors: []
                    };
                }
                
                // Add color to group
                groups[color.groupId].colors.push({
                    id: color.id,
                    label: color.label,
                    cssVar: color.cssVar,
                    hex: color.hex,
                    value: color.value
                });
            }.bind(this));
            
            // Convert groups object to array
            var groupsArray = Object.values(groups);
            
            // Sort groups by predefined order (brand, neutral, state)
            var groupOrder = { brand: 1, neutral: 2, state: 3 };
            groupsArray.sort(function(a, b) {
                return (groupOrder[a.id] || 999) - (groupOrder[b.id] || 999);
            });
            
            return groupsArray.length > 0 ? {
                id: paletteId,
                groups: groupsArray
            } : null;
        },

        /**
         * Get all palettes
         * 
         * @returns {Object}
         */
        getAllPalettes: function() {
            return this.palettes;
        },

        /**
         * Get color by CSS variable
         * 
         * @param {String} cssVar
         * @returns {Object|null}
         */
        getColor: function(cssVar) {
            return this.palettes[cssVar] || null;
        },

        /**
         * Update color value
         * 
         * @param {String} cssVar - CSS variable name
         * @param {String} hexValue - HEX color value
         */
        updateColor: function(cssVar, hexValue) {
            var color = this.getColor(cssVar);
            if (!color) {
                console.warn('⚠️ Color not found:', cssVar);
                return;
            }

            var rgbValue = this.hexToRgb(hexValue);

            // Save original value on FIRST change
            if (!this.dirtyColors[cssVar]) {
                this.dirtyColors[cssVar] = {
                    original: {
                        hex: color.hex,
                        rgb: color.value
                    },
                    hex: hexValue,
                    rgb: rgbValue
                };
            } else {
                // Subsequent change - update new value, keep original
                this.dirtyColors[cssVar].hex = hexValue;
                this.dirtyColors[cssVar].rgb = rgbValue;
            }

            // Update local state
            color.value = rgbValue;
            color.hex = hexValue;

            console.log('🎨 Updating palette color:', cssVar, '=', hexValue, '(not saved yet)');

            // Notify subscribers immediately (for live CSS preview)
            this.notify(cssVar, hexValue, rgbValue);
        },

        /**
         * Subscribe to color changes
         * 
         * @param {Function} callback - Called with (cssVar, hexValue, rgbValue)
         */
        subscribe: function(callback) {
            this.listeners.push(callback);
        },

        /**
         * Unsubscribe from color changes
         * 
         * @param {Function} callback
         */
        unsubscribe: function(callback) {
            var index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        },

        /**
         * Notify all subscribers about color change
         * 
         * @param {String} cssVar
         * @param {String} hexValue
         * @param {String} rgbValue
         */
        notify: function(cssVar, hexValue, rgbValue) {
            this.listeners.forEach(function(callback) {
                try {
                    callback(cssVar, hexValue, rgbValue);
                } catch (e) {
                    console.error('❌ Error in palette listener:', e);
                }
            });
        },

        /**
         * Get dirty palette changes formatted for saveValues mutation
         * @returns {Array} [{sectionCode: '_palette', fieldCode: cssVar, value: rgb}]
         */
        getDirtyChanges: function() {
            var changes = [];
            for (var cssVar in this.dirtyColors) {
                var dirty = this.dirtyColors[cssVar];
                changes.push({
                    sectionCode: '_palette',
                    fieldCode: cssVar,
                    value: dirty.rgb
                });
            }
            console.log('📦 Palette dirty changes:', changes.length);
            return changes;
        },

        /**
         * Clear dirty state after successful save
         */
        markAsSaved: function() {
            var count = Object.keys(this.dirtyColors).length;
            this.dirtyColors = {};
            console.log('✅ Palette marked as saved, cleared', count, 'dirty colors');
        },

        /**
         * Check if there are unsaved palette changes
         * @returns {Boolean}
         */
        hasDirtyChanges: function() {
            return Object.keys(this.dirtyColors).length > 0;
        },

        /**
         * Get count of dirty colors
         * @returns {Number}
         */
        getDirtyCount: function() {
            return Object.keys(this.dirtyColors).length;
        },

        /**
         * Revert all dirty changes back to saved values
         * @returns {Number} Count of reverted colors
         */
        revertDirtyChanges: function() {
            if (!this.hasDirtyChanges()) {
                console.log('⚠️ No dirty changes to revert');
                return 0;
            }
            
            var revertedCount = 0;
            
            // Restore each dirty color to its original saved value
            for (var cssVar in this.dirtyColors) {
                var dirty = this.dirtyColors[cssVar];
                var color = this.getColor(cssVar);
                
                if (color && dirty.original) {
                    // Revert to original value
                    color.value = dirty.original.rgb;
                    color.hex = dirty.original.hex;
                    
                    // Notify subscribers to update UI (CSS preview)
                    this.notify(cssVar, dirty.original.hex, dirty.original.rgb);
                    
                    revertedCount++;
                }
            }
            
            // Clear dirty state
            this.dirtyColors = {};
            
            console.log('↩️ Reverted', revertedCount, 'palette changes');
            
            // Trigger event for UI update
            if (typeof $ !== 'undefined') {
                $(document).trigger('paletteChangesReverted', { count: revertedCount });
            }
            
            return revertedCount;
        },

        /**
         * Convert HEX to RGB string
         * 
         * @param {String} hex - "#1979c3"
         * @returns {String} - "25, 121, 195"
         */
        hexToRgb: function(hex) {
            // Remove # if present
            hex = hex.replace(/^#/, '');

            // Parse hex values
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);

            return r + ', ' + g + ', ' + b;
        },

        /**
         * Convert RGB string to HEX
         * 
         * @param {String} rgb - "25, 121, 195"
         * @returns {String} - "#1979c3"
         */
        rgbToHex: function(rgb) {
            // Parse RGB values
            var parts = rgb.split(',').map(function(part) {
                return parseInt(part.trim(), 10);
            });

            if (parts.length !== 3) {
                console.warn('⚠️ Invalid RGB format:', rgb);
                return '#000000';
            }

            var r = parts[0];
            var g = parts[1];
            var b = parts[2];

            // Convert to HEX
            var hex = '#' + 
                this._toHex(r) + 
                this._toHex(g) + 
                this._toHex(b);

            return hex;
        },

        /**
         * Convert single RGB component to HEX
         * 
         * @param {Number} c - RGB component (0-255)
         * @returns {String} - HEX component (00-ff)
         */
        _toHex: function(c) {
            var hex = c.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        },

        /**
         * Check if color value matches any palette color
         * 
         * @param {String} colorValue - HEX or RGB value
         * @returns {String|null} - CSS variable if match found, null otherwise
         */
        findMatchingColor: function(colorValue) {
            // Normalize to HEX for comparison
            var normalizedHex = this._normalizeColorToHex(colorValue);

            // Search through all palette colors
            for (var cssVar in this.palettes) {
                var color = this.palettes[cssVar];
                if (color.hex.toLowerCase() === normalizedHex.toLowerCase()) {
                    return cssVar;
                }
            }

            return null;
        },

        /**
         * Normalize any color format to HEX
         * 
         * @param {String} color
         * @returns {String}
         */
        _normalizeColorToHex: function(color) {
            if (color.startsWith('#')) {
                return color;
            }

            // Check if RGB format
            if (color.includes(',')) {
                return this.rgbToHex(color);
            }

            // Check if rgb() or rgba() format
            if (color.startsWith('rgb')) {
                var match = color.match(/\d+/g);
                if (match && match.length >= 3) {
                    return this.rgbToHex(match[0] + ', ' + match[1] + ', ' + match[2]);
                }
            }

            console.warn('⚠️ Unknown color format:', color);
            return '#000000';
        }
    };
});
