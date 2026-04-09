/**
 * Section Renderer for Settings Editor Panel
 *
 * Responsible for building the accordion HTML from config sections,
 * restoring accordion state, and initializing palette/font-palette/preset sub-widgets.
 * Also preloads external font stylesheets for font_picker fields.
 *
 * Extracted from settings-editor.js (п.3.3 refactoring).
 *
 * @module Swissup_BreezeThemeEditor/js/editor/panel/section-renderer
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderer',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/icon-registry',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/palette-section-renderer',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/font-palette-section-renderer'
], function (
    $,
    FieldRenderer,
    CssPreviewManager,
    IconRegistry,
    StorageHelper,
    scopeManager,
    Logger
    // palette-section-renderer and font-palette-section-renderer are side-effect
    // only imports: they register $.fn.paletteSection / $.fn.fontPaletteSection
) {
    'use strict';

    var log = Logger.for('panel/section-renderer');

    return {
        /**
         * Render accordion sections into the sections container.
         * Also restores open-sections state and initialises sub-widgets.
         *
         * @param {Object} ctx      - Widget context (this)
         * @param {Array}  sections - config.sections from GraphQL response
         */
        render: function (ctx, sections) {
            var html = '';

            sections.forEach(function (section) {
                html += '<div class="bte-accordion-section">';
                html += '<div class="bte-accordion-header" data-section="' + section.code + '">';
                html += IconRegistry.render(section.icon);
                html += '<span class="bte-section-label">' + section.label + '</span>';
                html += '<i class="bte-icon-chevron-down bte-accordion-arrow"></i>';
                html += '</div>';
                html += FieldRenderer.renderSection(section);
                html += '</div>';
            });

            ctx.$sectionsContainer.html(html);

            // Hide accordion sections that have no rendered fields
            ctx.$sectionsContainer.find('.bte-accordion-section').each(function () {
                if ($(this).find('.bte-field-wrapper').length === 0) {
                    $(this).hide();
                }
            });

            // Clear search when sections are re-rendered
            if (ctx.$searchInput) {
                ctx.$searchInput.val('');
                ctx.$searchClear.hide();
            }

            // Restore previously open sections; all closed by default on first visit
            var saved = StorageHelper.getOpenSections();
            if (saved && saved.length) {
                saved.forEach(function (code) {
                    var $h = ctx.$sectionsContainer.find('.bte-accordion-header[data-section="' + code + '"]');
                    if ($h.length) {
                        $h.addClass('active');
                        ctx.$sectionsContainer.find('.bte-accordion-content[data-section="' + code + '"]')
                            .addClass('active').show();
                    }
                });
            }

            log.info('Rendered ' + sections.length + ' sections');

            // Initialize sub-widgets BEFORE updating editability so they are
            // already bound to bte:editabilityChanged when it fires below.
            this.initPalette(ctx);
            this.initFontPalette(ctx);

            // Must come AFTER palette/font-palette init
            ctx._updateFieldsEditability();

            this.initPresetSelector(ctx);
            this.preloadFontStylesheets(ctx);
        },

        /**
         * Initialize the colour palette section widget.
         *
         * @param {Object} ctx - Widget context (this)
         */
        initPalette: function (ctx) {
            if (!ctx.$paletteContainer || ctx.$paletteContainer.length === 0) {
                log.warn('Palette container not found');
                return;
            }

            // Destroy existing instance so re-init works after store switch
            if (ctx.$paletteContainer.data('swissup-paletteSection')) {
                log.debug('Destroying existing paletteSection widget before re-init');
                ctx.$paletteContainer.paletteSection('destroy');
            }

            if (!ctx.config || !ctx.config.palettes || ctx.config.palettes.length === 0) {
                log.debug('No palettes in config, hiding palette section');
                ctx.$paletteContainer.hide();
                return;
            }

            ctx.$paletteContainer.show();

            log.info('Initializing Palette Section with ' + ctx.config.palettes.length + ' palettes');

            ctx.$paletteContainer.paletteSection({
                palettes: ctx.config.palettes,
                scope:    scopeManager.getScope(),
                scopeId:  scopeManager.getScopeId(),
                themeId:  scopeManager.getThemeId()
            });

            log.info('Palette section initialized');
        },

        /**
         * Initialize the font palette section widget.
         *
         * @param {Object} ctx - Widget context (this)
         */
        initFontPalette: function (ctx) {
            if (!ctx.$fontPaletteContainer || ctx.$fontPaletteContainer.length === 0) {
                log.warn('Font palette container not found');
                return;
            }

            // Destroy existing instance so re-init works after store switch
            if (ctx.$fontPaletteContainer.data('swissup-fontPaletteSection')) {
                log.debug('Destroying existing fontPaletteSection widget before re-init');
                ctx.$fontPaletteContainer.fontPaletteSection('destroy');
            }

            if (!ctx.config || !ctx.config.fontPalettes || ctx.config.fontPalettes.length === 0) {
                log.debug('No font palettes in config, hiding font palette section');
                ctx.$fontPaletteContainer.hide();
                return;
            }

            ctx.$fontPaletteContainer.show();

            log.info('Initializing Font Palette Section with ' + ctx.config.fontPalettes.length + ' palette(s)');

            ctx.$fontPaletteContainer.fontPaletteSection({
                fontPalettes: ctx.config.fontPalettes,
                sections:     ctx.config.sections || [],
                previewReady: ctx._previewReady
            });

            log.info('Font palette section initialized');
        },

        /**
         * Initialize the preset selector widget.
         *
         * @param {Object} ctx - Widget context (this)
         */
        initPresetSelector: function (ctx) {
            if (!ctx.$presetContainer || ctx.$presetContainer.length === 0) {
                log.warn('Preset container not found');
                return;
            }

            if (typeof ctx.$presetContainer.presetSelector !== 'function') {
                log.warn('presetSelector widget not yet registered — skipping preset init');
                return;
            }

            ctx.$presetContainer.presetSelector({
                scope:    scopeManager.getScope(),
                scopeId:  scopeManager.getScopeId(),
                themeId:  scopeManager.getThemeId(),
                onApply:  $.proxy(ctx._onPresetApplied, ctx)
            });

            log.info('Preset selector initialized');
        },

        /**
         * Preload external font stylesheets for font_picker fields whose current
         * value references an external stylesheet (e.g. Google Fonts).
         *
         * @param {Object} ctx - Widget context (this)
         */
        preloadFontStylesheets: function (ctx) {
            ctx.$sectionsContainer.find('.bte-font-picker').each(function () {
                var $select = $(this);
                var mapJson = $select.attr('data-font-stylesheets');
                if (!mapJson) {
                    return;
                }
                try {
                    var map = JSON.parse(mapJson);
                    var url = map[$select.val()];
                    if (url) {
                        // Load into preview iframe
                        CssPreviewManager.loadFont(url);
                        // Also load into admin document so the trigger button renders correctly
                        if (!$('link[href="' + url + '"]', document).length) {
                            $('<link>', { rel: 'stylesheet', href: url }).appendTo(document.head);
                        }
                    }
                } catch (e) {
                    // ignore malformed JSON
                }
            });
        }
    };
});
