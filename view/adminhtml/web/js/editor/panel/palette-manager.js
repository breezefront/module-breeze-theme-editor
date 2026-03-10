define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/color-utils',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-palette-value',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, ColorUtils, savePaletteValueMutation, StorageHelper, Toastify, Logger) {
    'use strict';

    var log = Logger.for('panel/palette-manager');

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
        scope: 'stores',
        scopeId: null,
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
                log.warn('No palettes found in config');
                return;
            }

            this.scope   = config.scope   || 'stores';
            this.scopeId = config.scopeId;
            this.themeId = config.themeId || StorageHelper.getThemeId();
            this.palettes = this._indexPalettes(config.palettes);
            this.dirtyColors = {}; // Reset dirty state on init (important for test isolation)
            // NOTE: listeners are intentionally NOT reset here.
            // CssPreviewManager.subscribe() is called once during app boot; wiping listeners
            // on every _loadConfig() (store-switch, config reload) would silently disconnect
            // the live CSS preview from palette Pickr changes.

            // Convert legacy RGB dirty colors to HEX format (backward compatibility)
            for (var property in this.dirtyColors) {
                var dirty = this.dirtyColors[property];
                if (dirty.original && dirty.original.value && ColorUtils.isRgbColor(dirty.original.value)) {
                    dirty.original.value = ColorUtils.rgbToHex(dirty.original.value);
                }
                if (dirty.value && ColorUtils.isRgbColor(dirty.value)) {
                    dirty.value = ColorUtils.rgbToHex(dirty.value);
                }
            }

            log.info('Palette Manager initialized with ' + Object.keys(this.palettes).length + ' palettes');
        },

        /**
         * Index palettes for quick lookup
         * Creates flat map: property -> color object
         * 
         * @param {Array} palettes
         * @returns {Object}
         */
        _indexPalettes: function(palettes) {
            var index = {};

            palettes.forEach(function(palette) {
                palette.groups.forEach(function(group) {
                    group.colors.forEach(function(color) {
                        // Convert legacy RGB to HEX if needed (backward compatibility)
                        var hexValue = color.value;
                        if (ColorUtils.isRgbColor(color.value)) {
                            hexValue = ColorUtils.rgbToHex(color.value);
                        }
                        
                        // Store with full context (all values in HEX format)
                        index[color.property] = {
                            id: color.id,
                            label: color.label,
                            property: color.property,
                            value: hexValue,  // HEX format (Breeze 3.0)
                            default: color.default,
                            usageCount: color.usageCount || 0,
                            hex: hexValue,  // Same as value, kept for backward compatibility
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

            Object.keys(this.palettes).forEach(function(property) {
                var color = this.palettes[property];
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
            Object.keys(this.palettes).forEach(function(property) {
                var color = this.palettes[property];
                
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
                    property: color.property,
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
         * @param {String} property
         * @returns {Object|null}
         */
        getColor: function(property) {
            return this.palettes[property] || null;
        },

        /**
         * Update color value
         * 
         * @param {String} property - CSS variable name
         * @param {String} hexValue - HEX color value
         */
        updateColor: function(property, hexValue) {
            var color = this.getColor(property);
            if (!color) {
                log.warn('Color not found: ' + property);
                return;
            }

            // Save original value on FIRST change
            if (!this.dirtyColors[property]) {
                this.dirtyColors[property] = {
                    original: {
                        hex: color.hex,
                        value: color.value  // HEX format
                    },
                    hex: hexValue,
                    value: hexValue  // HEX format
                };
            } else {
                // Subsequent change - update new value, keep original
                this.dirtyColors[property].hex = hexValue;
                this.dirtyColors[property].value = hexValue;
            }

            // Update local state (both point to HEX)
            color.value = hexValue;
            color.hex = hexValue;

            log.debug('Updating palette color: ' + property + ' = ' + hexValue + ' (not saved yet)');

            // Notify subscribers immediately (for live CSS preview)
            this.notify(property, hexValue);
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
         * @param {String} property
         * @param {String} hexValue
         */
        notify: function(property, hexValue) {
            this.listeners.forEach(function(callback) {
                try {
                    callback(property, hexValue);
                } catch (e) {
                    log.error('Error in palette listener: ' + e);
                }
            });
        },

        /**
         * Get dirty palette changes formatted for saveValues mutation
         * @returns {Array} [{sectionCode: '_palette', fieldCode: property, value: hex}]
         */
        getDirtyChanges: function() {
            var changes = [];
            for (var property in this.dirtyColors) {
                var dirty = this.dirtyColors[property];
                changes.push({
                    sectionCode: '_palette',
                    fieldCode: property,
                    value: dirty.value  // HEX format (Breeze 3.0)
                });
            }
            log.debug('Palette dirty changes: ' + changes.length);
            return changes;
        },

        /**
         * Clear dirty state after successful save
         */
        markAsSaved: function() {
            var count = Object.keys(this.dirtyColors).length;
            this.dirtyColors = {};
            log.info('Palette marked as saved, cleared ' + count + ' dirty colors');
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
                log.warn('No dirty changes to revert');
                return 0;
            }
            
            var revertedCount = 0;
            
            // Restore each dirty color to its original saved value
            for (var property in this.dirtyColors) {
                var dirty = this.dirtyColors[property];
                var color = this.getColor(property);
                
                if (color && dirty.original) {
                    // Revert to original HEX value
                    color.value = dirty.original.value;
                    color.hex = dirty.original.hex;
                    
                    // Notify subscribers to update UI (CSS preview)
                    this.notify(property, dirty.original.hex);
                    
                    revertedCount++;
                }
            }
            
            // Clear dirty state
            this.dirtyColors = {};
            
            log.info('Reverted ' + revertedCount + ' palette changes');
            
            // Trigger event for UI update
            $(document).trigger('paletteChangesReverted', { count: revertedCount });
            
            return revertedCount;
        },

        /**
         * Convert HEX to RGB string
         * @deprecated Use ColorUtils.hexToRgb() directly
         * @param {String} hex - "#1979c3"
         * @returns {String} - "25, 121, 195"
         */
        hexToRgb: function(hex) {
            return ColorUtils.hexToRgb(hex);
        },

        /**
         * Convert RGB string to HEX
         * @deprecated Use ColorUtils.rgbToHex() directly
         * @param {String} rgb - "25, 121, 195"
         * @returns {String} - "#1979c3"
         */
        rgbToHex: function(rgb) {
            return ColorUtils.rgbToHex(rgb);
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
            for (var property in this.palettes) {
                var color = this.palettes[property];
                if (color.hex.toLowerCase() === normalizedHex.toLowerCase()) {
                    return property;
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
                return ColorUtils.rgbToHex(color);
            }

            // Check if rgb() or rgba() format
            if (color.startsWith('rgb')) {
                var match = color.match(/\d+/g);
                if (match && match.length >= 3) {
                    return ColorUtils.rgbToHex(match[0] + ', ' + match[1] + ', ' + match[2]);
                }
            }

            log.warn('Unknown color format: ' + color);
            return '#000000';
        },

        /**
         * Check if color is modified (saved value differs from default)
         * 
         * Compares current saved value with theme default value.
         * Used for showing "Modified" badge and orange border on swatches.
         * 
         * Note: Both color.value and color.default are now in HEX format ("#1979c3")
         * 
         * @param {String} property - CSS variable name (e.g., "--color-brand-primary")
         * @returns {Boolean} true if saved value differs from default
         */
        isColorModified: function(property) {
            var color = this.getColor(property);
            if (!color || !color.default) {
                return false;
            }

            // Use the saved (DB) value for comparison, not the current unsaved in-memory value.
            // If there are unsaved changes (color is dirty), the original saved value is stored
            // in dirtyColors[property].original.value. Otherwise color.value is the saved value.
            var savedValue = this.dirtyColors[property]
                ? this.dirtyColors[property].original.value
                : color.value;

            // Normalize both values to lowercase HEX for comparison
            var currentValue = ColorUtils.normalizeHex(savedValue);
            var defaultValue = ColorUtils.normalizeHex(color.default);

            return currentValue.toLowerCase() !== defaultValue.toLowerCase();
        },

        /**
         * Get count of modified colors (saved but different from defaults)
         * 
         * Iterates through all palette colors and counts how many have
         * saved values that differ from theme defaults.
         * Used for "Modified (N)" badge count in palette header.
         * 
         * @returns {Number} Count of colors where saved value != default
         */
        getModifiedCount: function() {
            var count = 0;
            for (var property in this.palettes) {
                if (this.isColorModified(property)) {
                    count++;
                }
            }
            return count;
        },

        /**
         * Get count of dirty colors (unsaved changes)
         * 
         * Returns number of palette colors with unsaved changes.
         * Used for "Changed (N)" badge count in palette header.
         * 
         * @returns {Number} Count of colors with unsaved changes
         */
        getDirtyCount: function() {
            return Object.keys(this.dirtyColors).length;
        }
    };
});
