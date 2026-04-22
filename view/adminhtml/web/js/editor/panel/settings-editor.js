/**
 * Settings Editor Panel — Orchestrator
 *
 * Thin jQuery widget (~250 lines) that wires together the five focused
 * helper modules:
 *
 *   panel/config-loader       — GraphQL config loading
 *   panel/section-renderer    — accordion HTML + sub-widget init
 *   panel/field-editability   — enable/disable fields & read-only guard
 *   panel/search-handler      — search input filtering
 *   panel/error-presenter     — error panel + toast notifications
 *
 * п.3.3 refactoring of the original 1511-line god-class.
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/settings-editor.html',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/css-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers',
    'Swissup_BreezeThemeEditor/js/editor/panel/config-loader',
    'Swissup_BreezeThemeEditor/js/editor/panel/section-renderer',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-editability',
    'Swissup_BreezeThemeEditor/js/editor/panel/search-handler',
    'Swissup_BreezeThemeEditor/js/editor/panel/error-presenter',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-values',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/discard-draft',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/publication-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/depends-evaluator'
], function (
    $,
    widget,
    mageTemplate,
    panelTemplate,
    PanelState,
    PaletteManager,
    CssPreviewManager,
    CssManager,
    FieldHandlers,
    ConfigLoader,
    SectionRenderer,
    FieldEditability,
    SearchHandler,
    ErrorPresenter,
    saveValues,
    discardDraft,
    StorageHelper,
    configManager,
    scopeManager,
    Logger,
    Constants,
    PublicationState
    // depends-evaluator is a side-effect import: it self-registers DOM event
    // listeners for 'bte:sections-rendered' and 'bte:field-changed'.
) {
    'use strict';

    var log = Logger.for('panel/settings-editor');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    $.widget('swissup.themeSettingsEditor', {
        options: {
            title: 'Theme Settings',
            closeTitle: 'Close Panel',
            presetsLabel: 'Presets:',
            status: PUBLICATION_STATUS.DRAFT
        },

        _create: function () {
            log.info('Initializing Settings Editor (Admin)');

            // scopeManager and configManager are initialized by toolbar.js before any panel opens.
            // Standalone fallback: if panel is somehow loaded without toolbar, seed minimal defaults.
            if (!scopeManager.initialized()) {
                scopeManager.init({
                    scope:     'stores',
                    scopeId:   null,
                    themeId:   null,
                    storeCode: 'default',
                    themeName: null
                });
            }

            this.themeName = scopeManager.getThemeName('current theme');
            this.adminUrl  = configManager.getAdminUrl('/admin');

            if (scopeManager.getScopeId() != null && scopeManager.getThemeName()) {
                this.options.title = this.options.title
                    .replace('%1', scopeManager.getScopeId())
                    .replace('%2', this.themeName);
            }

            this.$navigation = $(Constants.SELECTORS.NAVIGATION);

            var themeId = scopeManager.getThemeId();
            if (themeId) {
                StorageHelper.init(scopeManager.getScopeId(), themeId);
            }

            this.template = mageTemplate(panelTemplate);
            this._render();
            this._bind();
            this._initPreview();
            this._initPanelTheme();

            this.options.status = PublicationState.get();

            log.info('Settings Editor initializing with mode: ' + this.options.status);

            if (this.options.status === PUBLICATION_STATUS.PUBLICATION) {
                var publicationId = StorageHelper.getCurrentPublicationId();
                if (publicationId && !isNaN(publicationId)) {
                    this._loadConfigFromPublication(publicationId);
                } else {
                    log.warn('PUBLICATION mode but no valid publication ID, falling back to DRAFT');
                    this.options.status = PUBLICATION_STATUS.DRAFT;
                    this._loadConfig();
                }
            } else {
                this._loadConfig();
            }
        },

        // ─── Render ─────────────────────────────────────────────────────────────

        _render: function () {
            var html = this.template({
                data: {
                    title:        this.options.title,
                    closeTitle:   this.options.closeTitle,
                    presetsLabel: this.options.presetsLabel
                }
            });

            this.element.html(html);

            this.$closeButton          = this.element.find('.bte-panel-close');
            this.$themeToggle          = this.element.find('.bte-panel-theme-toggle');
            this.$resetButton          = this.element.find('.bte-reset-button');
            this.$saveButton           = this.element.find('.bte-save-button');
            this.$sectionsContainer    = this.element.find('.bte-sections-container');
            this.$paletteContainer     = this.element.find('.bte-palette-container');
            this.$fontPaletteContainer = this.element.find('.bte-font-palette-container');
            this.$presetContainer      = this.element.find('.bte-preset-container');
            this.$loader               = this.element.find('.bte-panel-loader');
            this.$error                = this.element.find('.bte-panel-error');
            this.$searchInput          = this.element.find('.bte-search-input');
            this.$searchClear          = this.element.find('.bte-search-clear');

            log.info('Theme Editor Panel rendered');
        },

        // ─── Event binding ───────────────────────────────────────────────────────

        _bind: function () {
            var self = this;

            this.$closeButton.on('click', $.proxy(this._close, this));
            this.$themeToggle.on('click', $.proxy(this._togglePanelTheme, this));
            this.$resetButton.on('click', $.proxy(this._reset, this));
            this.$saveButton.on('click', $.proxy(this._save, this));

            SearchHandler.bind(this);

            this.element.on('click', '.bte-error-retry',   $.proxy(this._loadConfig, this));
            this.element.on('click', '.bte-error-toggle',  $.proxy(this._toggleErrorDetails, this));
            this.element.on('click', '.bte-accordion-header', $.proxy(this._toggleSection, this));

            FieldEditability.bindReadOnlyGuard(this);

            FieldHandlers.init(this.element, function (fieldData) {
                log.debug('Field change: ' + fieldData.sectionCode + '.' + fieldData.fieldCode);
                self._updateChangesCount();
                FieldHandlers.updateBadges(self.element, fieldData.sectionCode, fieldData.fieldCode);
                $(document).trigger('bte:field-changed', [{
                    element:   self.element,
                    fieldCode: fieldData.fieldCode,
                    value:     fieldData.value
                }]);
            });

            PanelState.addListener(function (eventType, data) {
                self._onPanelStateEvent(eventType, data);
            });

            $(document).on('paletteColorChanged', function () {
                self._updateChangesCount();
            });

            $(document).on('publicationStatusChanged', function (e, data) {
                self._onPublicationStatusChanged(data);
            });

            $(document).on('loadThemeEditorFromPublication', function (e, data) {
                log.info('Loading config from publication: ' + data.publicationId);
                self._loadConfigFromPublication(data.publicationId);
            });

            $(document).on('scopeChanged', function (e, scope, scopeId) {
                log.info('Scope changed to: ' + scope + ':' + scopeId);
                // configManager already updated by scope-selector.js before this event fires.
                StorageHelper.init(scopeId, null);
                CssPreviewManager.reset();
                self._loadConfig();
            });

            $(document).on('openPublicationHistoryModal', function () {
                self._showToast('notice', 'Publication history coming soon!');
            });

            $(document).on('themeEditorPublished', function (e, data) {
                log.info('Theme editor published: ' + JSON.stringify(data.publication));
                PanelState.markAsSaved();
                self._updateChangesCount();
                self._refreshAllBadges();
                CssPreviewManager.reset();
                setTimeout(function () { window.location.reload(); }, 1000);
            });

            $(document).on('bte:publishedDiscarded', function (e, data) {
                log.info('Published customizations discarded, refreshing preview...');
                CssPreviewManager.reset();
                CssManager.showPublished();
                CssManager.refreshPublishedCss();
                if (data && data.values && data.values.length >= 0) {
                    self._updatePanelFields(data.values);
                } else {
                    self._loadConfig();
                }
            });

            $(document).on('bte:draftDiscarded', function (e, data) {
                log.info('Draft discarded, refreshing panel...');
                PanelState.reset();
                PaletteManager.revertDirtyChanges();
                CssPreviewManager.reset();
                CssManager.refreshDraftCss();
                if (data && data.values && data.values.length >= 0) {
                    self._updatePanelFields(data.values);
                } else {
                    self._loadConfig();
                }
            });
        },

        // ─── Init helpers ────────────────────────────────────────────────────────

        _initPreview: function () {
            this._previewReady = CssPreviewManager.init();

            if (!CssManager.isReady()) {
                CssManager.init({
                    scope:   scopeManager.getScope(),
                    scopeId: scopeManager.getScopeId(),
                    themeId: scopeManager.getThemeId()
                });
            }
        },

        _initPanelTheme: function () {
            var saved  = StorageHelper.getItem('panel_theme') || 'light';
            var $panel = this.element.closest('.bte-panel');
            $panel.toggleClass('bte-panel--light', saved === 'light');
            log.info('Panel theme initialized: ' + saved);
        },

        // ─── Config loading ──────────────────────────────────────────────────────

        /**
         * Render sections from a loaded config and finalize the loading state.
         * Optionally run an extra callback before hiding the loader.
         *
         * @param {Object}        config
         * @param {Function|null} extraFn  - called with (config) after render, before hideLoader
         * @private
         */
        _applyConfig: function (config, extraFn) {
            SectionRenderer.render(this, config.sections);
            $(document).trigger('bte:sections-rendered', [{ element: this.element }]);
            if (typeof extraFn === 'function') {
                extraFn(config);
            }
            this._hideLoader();
        },

        _loadConfig: function () {
            var self = this;
            this._showLoader('Loading configuration...');

            ConfigLoader.load(this, function (config) {
                self._applyConfig(config);
            }, function (error) {
                self._showError(error);
            });
        },

        _loadConfigFromPublication: function (publicationId) {
            var self = this;
            this._showLoader('Loading publication #' + publicationId + '...');

            ConfigLoader.loadFromPublication(this, publicationId, function (config) {
                self._applyConfig(config, function (cfg) {
                    self._showToast('success', 'Loaded publication: ' + (cfg.metadata.lastPublished || 'Unknown date'));
                });
            }, function (error) {
                self._showError(error);
            });
        },

        // ─── Sections & fields ───────────────────────────────────────────────────

        _renderSections: function (sections) {
            SectionRenderer.render(this, sections);
            $(document).trigger('bte:sections-rendered', [{ element: this.element }]);
        },

        _updateFieldsEditability: function () {
            FieldEditability.update(this);
        },

        // ─── Accordion ───────────────────────────────────────────────────────────

        _toggleSection: function (e) {
            var $header  = $(e.currentTarget);
            var section  = $header.data('section');
            var $content = this.element.find('.bte-accordion-content[data-section="' + section + '"]');
            var isActive = $header.hasClass('active');

            if (isActive) {
                $header.removeClass('active');
                $content.removeClass('active').slideUp(200);
            } else {
                $header.addClass('active');
                $content.addClass('active').slideDown(200);
            }

            var openSections = [];
            this.$sectionsContainer.find('.bte-accordion-header.active').each(function () {
                openSections.push($(this).data('section'));
            });
            StorageHelper.setOpenSections(openSections);

            log.debug('Accordion toggled: ' + section + ' -> ' + !isActive);
        },

        // ─── Loader / error ──────────────────────────────────────────────────────

        _showLoader: function (message) {
            this.$loader.show();
            this.$loader.find('.bte-loader-text').text(message || 'Loading...');
            this.$error.hide();
            this.$sectionsContainer.hide();
            this.$saveButton.prop('disabled', true);
            this.$resetButton.prop('disabled', true);
            log.debug('Loading: ' + (message || 'Loading...'));
        },

        _hideLoader: function () {
            this.$loader.hide();
            this.$sectionsContainer.show();
            this.$saveButton.prop('disabled', false);
            this.$resetButton.prop('disabled', true);
            this._updateChangesCount();
        },

        _showError: function (errorData) {
            ErrorPresenter.show(this, errorData);
        },

        _toggleErrorDetails: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var $btn   = $(e.currentTarget);
            var $stack = $btn.siblings('.bte-error-stack');
            if ($stack.is(':visible')) {
                $stack.slideUp(200);
                $btn.text('Show technical details');
            } else {
                $stack.slideDown(200);
                $btn.text('Hide technical details');
            }
        },

        // ─── Toast ───────────────────────────────────────────────────────────────

        _showToast: function (type, message, opts) {
            ErrorPresenter.showToast(type, message, opts);
        },

        // ─── Changes counter ─────────────────────────────────────────────────────

        _updateChangesCount: function () {
            var total = PanelState.getChangesCount() + PaletteManager.getDirtyCount();
            this.$saveButton.text('Save (' + total + ')');
            this.$resetButton.prop('disabled', total === 0);
            log.debug('Changes count updated: ' + total);
        },

        _refreshAllBadges: function () {
            var self = this;
            Object.keys(PanelState.values).forEach(function (key) {
                var parts = key.split('.');
                if (parts.length === 2) {
                    FieldHandlers.updateBadges(self.element, parts[0], parts[1]);
                }
            });
            log.debug('All badges refreshed after save');
        },

        // ─── Panel theme ─────────────────────────────────────────────────────────

        _togglePanelTheme: function () {
            var $panel  = this.element.closest('.bte-panel');
            var isLight = $panel.hasClass('bte-panel--light');
            $panel.toggleClass('bte-panel--light', !isLight);
            StorageHelper.setItem('panel_theme', isLight ? 'dark' : 'light');
            log.info('Panel theme → ' + (isLight ? 'dark' : 'light'));
        },

        // ─── Close / Reset / Save ────────────────────────────────────────────────

        _close: function () {
            var nav = this.$navigation.data('swissupBreezeNavigation');
            if (nav) {
                nav.deactivate('theme-editor');
            } else {
                log.error('Navigation widget not found - cannot close panel');
            }
        },

        _reset: function () {
            if (!PanelState.hasChanges() && !PaletteManager.hasDirtyChanges()) {
                this._showToast('notice', 'No changes to reset');
                return;
            }
            if (confirm('Reset all changes to default values?')) {
                PanelState.reset();
                PaletteManager.revertDirtyChanges();
                CssPreviewManager.reset();
                this._loadConfig();
            }
        },

        _save: function () {
            if (!PanelState.hasChanges() && !PaletteManager.hasDirtyChanges()) {
                this._showToast('notice', 'No changes to save');
                return;
            }

            var values        = PanelState.getChangesForSave();
            var paletteChanges = PaletteManager.getDirtyChanges();
            if (paletteChanges.length > 0) {
                values = values.concat(paletteChanges);
            }

            var self = this;
            this.$saveButton.prop('disabled', true).text('Saving...');

            saveValues(scopeManager.getScope(), scopeManager.getScopeId(), this.options.status, values)
                .then(function (data) {
                    if (data.saveBreezeThemeEditorValues.success) {
                        self._showToast('success', 'Settings saved successfully!');
                        PanelState.markAsSaved();
                        PaletteManager.markAsSaved();
                        self._refreshAllBadges();

                        var fieldModified   = PanelState.getModifiedCount();
                        var paletteModified = PaletteManager.getModifiedCount();
                        $(document).trigger('themeEditorDraftSaved', {
                            scope:             scopeManager.getScope(),
                            scopeId:           scopeManager.getScopeId(),
                            themeId:           scopeManager.getThemeId(),
                            draftChangesCount: fieldModified + paletteModified
                        });
                    } else {
                        self._showToast('error', 'Failed to save: ' + data.saveBreezeThemeEditorValues.message);
                    }
                })
                .catch(function (error) {
                    self._showToast('error', 'Failed to save settings: ' + error.message);
                })
                .always(function () {
                    self.$saveButton.prop('disabled', false);
                    self._updateChangesCount();
                });
        },

        // ─── Preset ──────────────────────────────────────────────────────────────

        _onPresetApplied: function (result) {
            log.info('Preset applied: ' + result.appliedCount + ' values');
            this._updateChangesCount();
            this._refreshAllBadges();
            CssPreviewManager.refresh();
        },

        /**
         * Update panel field DOM elements from a values array returned by a mutation.
         * Skips fields not found in the DOM (e.g. palette / hidden fields).
         *
         * @param {Array} values - Array of { sectionCode, fieldCode, value }
         */
        _updatePanelFields: function (values) {
            log.info('Updating ' + (values ? values.length : 0) + ' panel fields from mutation response');

            (values || []).forEach(function (item) {
                var selector = '[data-section="' + item.sectionCode + '"][data-field="' + item.fieldCode + '"]';
                var $field = $(selector);

                if ($field.length && $field.val() !== item.value) {
                    $field.val(item.value).trigger('change');
                }
            });
        },

        // ─── PanelState event handler ────────────────────────────────────────────

        _onPanelStateEvent: function (eventType, data) {
            var self = this;

            if (eventType === 'field-reset') {
                log.debug('Panel handling field-reset: ' + JSON.stringify(data));
                FieldHandlers.updateBadges(self.element, data.sectionCode, data.fieldCode);
                self._updateChangesCount();

                if (CssPreviewManager.isActive()) {
                    self._applyFieldResetToPreview(data);
                    CssPreviewManager.updatePreview();
                }

            } else if (eventType === 'field-restore') {
                log.debug('Panel handling field-restore: ' + JSON.stringify(data));
                FieldHandlers.updateBadges(self.element, data.sectionCode, data.fieldCode);
                self._updateChangesCount();

                if (CssPreviewManager.isActive()) {
                    self._applyFieldResetToPreview(data);
                    CssPreviewManager.updatePreview();
                }

                log.info('Discarding override for ' + data.sectionCode + '.' + data.fieldCode);
                discardDraft(scopeManager.getScope(), scopeManager.getScopeId(), [data.sectionCode], [data.fieldCode])
                    .then(function (result) {
                        if (result.discardBreezeThemeEditorDraft.success) {
                            self._showToast('success', 'Field restored to default');
                            PanelState.markFieldAsSaved(data.sectionCode, data.fieldCode);
                            FieldHandlers.updateBadges(self.element, data.sectionCode, data.fieldCode);
                            self._updateChangesCount();

                            var fieldModified   = PanelState.getModifiedCount();
                            var paletteModified = PaletteManager.getModifiedCount();
                            $(document).trigger('themeEditorDraftSaved', {
                                scope:             scopeManager.getScope(),
                                scopeId:           scopeManager.getScopeId(),
                                themeId:           scopeManager.getThemeId(),
                                draftChangesCount: fieldModified + paletteModified
                            });
                        } else {
                            self._showToast('error', 'Failed to restore: ' + result.discardBreezeThemeEditorDraft.message);
                        }
                    })
                    .catch(function (error) {
                        self._showToast('error', 'Failed to restore field: ' + error.message);
                    });
            }
        },

        /**
         * Apply a field-reset / field-restore value to the CSS live preview.
         *
         * @param {Object} data  - PanelState event data { sectionCode, fieldCode, value }
         */
        _applyFieldResetToPreview: function (data) {
            var $field      = this.element.find('[data-section="' + data.sectionCode + '"][data-field="' + data.fieldCode + '"]').first();
            var fieldCssVar = $field.attr('data-property');
            var fieldType   = ($field.attr('data-type') || '').toLowerCase();

            if (!fieldCssVar || data.value === undefined) {
                return;
            }

            if (typeof data.value === 'string' && data.value.startsWith('--color-')) {
                CssPreviewManager.removeVariable(fieldCssVar);
            } else {
                CssPreviewManager.setVariable(fieldCssVar, data.value, fieldType, {
                    format:       $field.attr('data-format'),
                    defaultValue: $field.attr('data-default')
                });
            }
        },

        // ─── Publication status handler ──────────────────────────────────────────

        _onPublicationStatusChanged: function (data) {
            var self    = this;
            var validStatuses = [PUBLICATION_STATUS.DRAFT, PUBLICATION_STATUS.PUBLISHED, PUBLICATION_STATUS.PUBLICATION];
            if (!data || !data.status || validStatuses.indexOf(data.status) === -1) {
                log.warn('publicationStatusChanged: unknown status "' + (data && data.status) + '" - ignoring');
                return;
            }

            log.info('Publication status changed to: ' + data.status);

            // Always update field editability (fixes first-open regression)
            setTimeout(function () {
                self._updateFieldsEditability();
            }, 100);

            if (self.options.status === data.status && data.status !== PUBLICATION_STATUS.PUBLICATION) {
                log.debug('Status unchanged, skipping config reload');
                return;
            }

            self.options.status = data.status;

            if (data.status === PUBLICATION_STATUS.PUBLICATION) {
                if (data.publicationId && !isNaN(data.publicationId)) {
                    self._loadConfigFromPublication(data.publicationId);
                } else {
                    log.warn('PUBLICATION status but no valid publication ID, falling back to DRAFT');
                    self.options.status = PUBLICATION_STATUS.DRAFT;
                    self._loadConfig();
                }
            } else {
                self._loadConfig();
            }
        },

        // ─── Destroy ─────────────────────────────────────────────────────────────

        _destroy: function () {
            FieldHandlers.destroy(this.element);
            CssPreviewManager.destroy();
            PanelState.clear();
            this._super();
        }
    });

    return $.swissup.themeSettingsEditor;
});
