/**
 * Config Loader for Settings Editor Panel
 *
 * Responsible for loading theme configuration from GraphQL.
 * Handles both DRAFT/PUBLISHED mode (getConfig) and
 * PUBLICATION mode (getConfigFromPublication).
 *
 * Extracted from settings-editor.js (п.3.3 refactoring).
 *
 * @module Swissup_BreezeThemeEditor/js/editor/panel/config-loader
 */
define([
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/font-palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config-from-publication',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function (
    PanelState,
    PaletteManager,
    FontPaletteManager,
    CssPreviewManager,
    StorageHelper,
    Logger,
    getConfig,
    getConfigFromPublication,
    Constants
) {
    'use strict';

    var log = Logger.for('panel/config-loader');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    return {
        /**
         * Load theme config from GraphQL (DRAFT / PUBLISHED modes).
         *
         * @param {Object}   ctx              - Widget context (this)
         * @param {Function} onSuccess        - Called with the resolved config object
         * @param {Function} onError          - Called with the raw error
         */
        load: function (ctx, onSuccess, onError) {
            log.info('Loading config with status: ' + ctx.options.status);

            getConfig(ctx.scope, ctx.scopeId, ctx.options.status)
                .then(function (data) {
                    log.info('Config loaded for status "' + ctx.options.status + '"');
                    var config = data.breezeThemeEditorConfig;

                    // Update themeId / themeName resolved by the backend (e.g. after scope switch)
                    if (config.metadata && config.metadata.themeId) {
                        ctx.themeId = config.metadata.themeId;
                        StorageHelper.init(ctx.scopeId, ctx.themeId);
                        log.info('themeId resolved from metadata: ' + ctx.themeId);
                    }
                    if (config.metadata && config.metadata.themeName) {
                        ctx.themeName = config.metadata.themeName;
                        log.info('themeName resolved from metadata: ' + ctx.themeName);
                    }

                    ctx.config = config;

                    // Initialize PaletteManager BEFORE rendering sections
                    if (config.palettes && config.palettes.length > 0) {
                        PaletteManager.init({
                            palettes: config.palettes,
                            scope:    ctx.scope,
                            scopeId:  ctx.scopeId,
                            themeId:  ctx.themeId
                        });
                        log.info('PaletteManager initialized with ' + config.palettes.length + ' palette(s)');
                    }

                    if (config.fontPalettes && config.fontPalettes.length > 0) {
                        FontPaletteManager.init(config.fontPalettes);
                        this._seedFontPaletteCurrentValues(config.sections);
                        log.info('FontPaletteManager initialized with ' + config.fontPalettes.length + ' font palette(s)');
                    }

                    PanelState.init(config);

                    onSuccess(config);

                    // In DRAFT mode: chain sync on _previewReady Promise
                    if (ctx.options.status === PUBLICATION_STATUS.DRAFT) {
                        ctx._previewReady.then(function () {
                            CssPreviewManager.syncFieldsFromChanges(ctx.element);
                            ctx._updateChangesCount();
                        });
                    } else {
                        CssPreviewManager.reset();
                    }
                }.bind(this))
                .catch(function (error) {
                    log.error('Failed to load config: ' + error);
                    onError(error);
                });
        },

        /**
         * Load config from a specific historical publication (PUBLICATION mode).
         *
         * @param {Object}   ctx            - Widget context (this)
         * @param {number}   publicationId
         * @param {Function} onSuccess      - Called with the resolved config object
         * @param {Function} onError        - Called with the raw error
         */
        loadFromPublication: function (ctx, publicationId, onSuccess, onError) {
            log.info('Loading config from publication #' + publicationId);

            getConfigFromPublication(publicationId)
                .then(function (config) {
                    log.info('Config loaded from publication');

                    ctx.config = config;

                    if (config.palettes && config.palettes.length > 0) {
                        PaletteManager.init({
                            palettes: config.palettes,
                            scope:    ctx.scope,
                            scopeId:  ctx.scopeId,
                            themeId:  ctx.themeId
                        });
                        log.info('PaletteManager initialized with ' + config.palettes.length + ' palette(s)');
                    }

                    if (config.fontPalettes && config.fontPalettes.length > 0) {
                        FontPaletteManager.init(config.fontPalettes);
                        this._seedFontPaletteCurrentValues(config.sections);
                        log.info('FontPaletteManager initialized with ' + config.fontPalettes.length + ' font palette(s)');
                    }

                    // Publication mode is always read-only — clear live preview
                    CssPreviewManager.reset();

                    PanelState.init(config);

                    onSuccess(config);
                }.bind(this))
                .catch(function (error) {
                    log.error('Failed to load config from publication: ' + error);
                    onError(error);
                });
        },

        /**
         * Seed FontPaletteManager with the current (saved) values for each
         * font palette role field so that FontPaletteManager.getCurrentValue()
         * returns the correct font BEFORE the sections are rendered.
         *
         * Must be called immediately after FontPaletteManager.init() and before
         * SectionRenderer.render(), because the font-picker renderer reads
         * getCurrentValue() to set the role swatch font-family on initial render.
         *
         * Reads from the dedicated _font_palette section (auto-generated by the backend).
         *
         * @param {Array} sections  config.sections from GraphQL response
         */
        _seedFontPaletteCurrentValues: function (sections) {
            var fontSection = (sections || []).find(function (s) {
                return s.code === '_font_palette';
            });
            ((fontSection && fontSection.fields) || []).forEach(function (field) {
                if (field.property) {
                    var val = (field.value !== null && field.value !== undefined)
                        ? field.value : (field.default || '');
                    FontPaletteManager.setCurrentValue(field.property, val);
                }
            });
            log.debug('FontPaletteManager current values seeded from config');
        }
    };
});
