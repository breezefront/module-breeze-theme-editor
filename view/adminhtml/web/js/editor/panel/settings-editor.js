define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/settings-editor.html',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/font-palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderer',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers',
    'Swissup_BreezeThemeEditor/js/editor/panel/preset-selector',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/palette-section-renderer',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/font-palette-section-renderer',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config-from-publication',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-values',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-value',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/discard-draft',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/panel/icon-registry'
], function (
    $,
    widget,
    mageTemplate,
    panelTemplate,
    PanelState,
    PaletteManager,
    FontPaletteManager,
    FieldRenderer,
    CssPreviewManager,
    CssManager,
    FieldHandlers,
    PresetSelector,
    PaletteSection,
    FontPaletteSection,
    Toastify,
    getConfig,
    getConfigFromPublication,
    saveValues,
    saveValue,
    discardDraft,
    StorageHelper,
    Logger,
    IconRegistry
) {
    'use strict';

    var log = Logger.for('panel/settings-editor');

    $.widget('swissup.themeSettingsEditor', {
        options: {
            title: 'Theme Settings',
            closeTitle: 'Close Panel',
            presetsLabel: 'Presets:',
            status: 'DRAFT'
        },

        _create: function () {
            log.info('Initializing Settings Editor (Admin)');

            // Admin config from ViewModel
            var config = window.breezeThemeEditorConfig || {};
            
            this.scope   = config.scope   || this.options.scope   || 'stores';
            this.scopeId = config.scopeId != null ? config.scopeId : (this.options.scopeId != null ? this.options.scopeId : 1);
            this.themeId = config.themeId || this.options.themeId || 0;
            this.themeName = config.themeName || 'current theme';
            this.adminUrl = config.adminUrl || '/admin';
            
            // Update title with scope info
            if (config.scopeId != null && config.themeName) {
                this.options.title = this.options.title
                    .replace('%1', this.scopeId)
                    .replace('%2', this.themeName);
            }

            // Store reference to navigation widget for closing panel
            this.$navigation = $('#toolbar-navigation');

            // Initialize storage helper (scoped by themeId for localStorage keys)
            if (this.themeId) {
                StorageHelper.init(this.scopeId, this.themeId);
            }

            this.template = mageTemplate(panelTemplate);
            this._render();
            this._bind();
            this._initPreview();
            this._initPanelTheme();
            
            // Read current mode from localStorage
            var currentStatus = StorageHelper.getCurrentStatus();
            this.options.status = currentStatus;
            
            log.info('Settings Editor initializing with mode: ' + currentStatus);
            
            // Load config based on current mode
            if (currentStatus === 'PUBLICATION') {
                var publicationId = StorageHelper.getCurrentPublicationId();
                if (publicationId && !isNaN(publicationId)) {
                    log.info('Loading config from publication #' + publicationId);
                    this._loadConfigFromPublication(publicationId);
                } else {
                    log.warn('PUBLICATION mode but no valid publication ID, falling back to DRAFT');
                    this.options.status = 'DRAFT';
                    this._loadConfig();
                }
            } else {
                log.info('Loading config with status: ' + currentStatus);
                this._loadConfig();
            }
        },

        _render: function () {
            var html = this.template({
                data: {
                    title: this.options.title,
                    closeTitle: this.options.closeTitle,
                    presetsLabel: this.options.presetsLabel
                }
            });

            this.element.html(html);

            this.$closeButton = this.element.find('.bte-panel-close');
            this.$themeToggle = this.element.find('.bte-panel-theme-toggle');
            this.$resetButton = this.element.find('.bte-reset-button');
            this.$saveButton = this.element.find('.bte-save-button');
            this.$sectionsContainer = this.element.find('.bte-sections-container');
            this.$paletteContainer = this.element.find('.bte-palette-container');
            this.$fontPaletteContainer = this.element.find('.bte-font-palette-container');
            this.$presetContainer = this.element.find('.bte-preset-container');
            this.$loader = this.element.find('.bte-panel-loader');
            this.$error = this.element.find('.bte-panel-error');
            this.$searchInput = this.element.find('.bte-search-input');
            this.$searchClear = this.element.find('.bte-search-clear');

            log.info('Theme Editor Panel rendered');
        },

        _bind: function () {
            var self = this;

            // Panel controls
            this.$closeButton.on('click', $.proxy(this._close, this));
            this.$themeToggle.on('click', $.proxy(this._togglePanelTheme, this));
            this.$resetButton.on('click', $.proxy(this._reset, this));
            this.$saveButton.on('click', $.proxy(this._save, this));

            // Search
            this._bindSearch();

            // Error handlers
            this.element.on('click', '.bte-error-retry', $.proxy(this._loadConfig, this));
            this.element.on('click', '.bte-error-toggle', $.proxy(this._toggleErrorDetails, this));
            this.element.on('click', '.bte-accordion-header', $.proxy(this._toggleSection, this));

            // ✅ Field changes with live badge updates
            FieldHandlers.init(this.element, function(fieldData) {
                log.debug('Panel callback triggered for: ' + fieldData.sectionCode + '.' + fieldData.fieldCode);
                log.debug('Panel callback fieldData: ' + JSON.stringify(fieldData));
                
                // Update changes counter
                self._updateChangesCount();

                // ✅ Update badges in real-time
                log.debug('Calling FieldHandlers.updateBadges...');
                var badgeUpdateResult = FieldHandlers.updateBadges(self.element, fieldData.sectionCode, fieldData.fieldCode);
                log.debug('FieldHandlers.updateBadges result: ' + badgeUpdateResult);
                
                log.debug('Badges updated');
            });

            // ✅ Listen for PanelState events (field-reset, field-restore, etc.)
            PanelState.addListener(function(eventType, data) {
                if (eventType === 'field-reset') {
                    log.debug('Panel handling field-reset event: ' + JSON.stringify(data));
                    
                    // Update field badges (hide "Changed" badge and reset button)
                    FieldHandlers.updateBadges(self.element, data.sectionCode, data.fieldCode);
                    
                    // Update Save button counter
                    self._updateChangesCount();
                    
                    // Update CSS preview with reset value
                    if (CssPreviewManager.isActive()) {
                        // Get field info to determine how to update CSS variable
                        var $field = self.element.find('[data-section="' + data.sectionCode + '"][data-field="' + data.fieldCode + '"]').first();
                        var fieldCssVar = $field.attr('data-property') || $field.attr('data-css-var');
                        var fieldType = ($field.attr('data-type') || '').toLowerCase();
                        
                        if (fieldCssVar && data.value !== undefined) {
                            // Check if reset value is palette reference (--color-*)
                            if (typeof data.value === 'string' && data.value.startsWith('--color-')) {
                                // Palette reference - remove from changes to allow cascade via var()
                                // This allows var(--color-brand-amber-dark-rgb) to resolve correctly
                                CssPreviewManager.removeVariable(fieldCssVar);
                                log.debug('Removed ' + fieldCssVar + ' from live preview (reset to palette ref: ' + data.value + ')');
                            } else {
                                // Direct value (HEX/RGB) - update changes with formatted value
                                var fieldData = {
                                    format: $field.attr('data-format'),
                                    defaultValue: $field.attr('data-default')
                                };
                                CssPreviewManager.setVariable(fieldCssVar, data.value, fieldType, fieldData);
                                log.debug('Updated ' + fieldCssVar + ' in live preview (reset to: ' + data.value + ')');
                            }
                        }
                        
                        // Refresh CSS output in iframe
                        CssPreviewManager.updatePreview();
                    }
                } else if (eventType === 'field-restore') {
                    log.debug('Panel handling field-restore event: ' + JSON.stringify(data));

                    // Update field badges immediately (reflects isDirty change)
                    FieldHandlers.updateBadges(self.element, data.sectionCode, data.fieldCode);

                    // Update Save button counter
                    self._updateChangesCount();

                    // Update CSS preview with restored default value
                    if (CssPreviewManager.isActive()) {
                        var $field = self.element.find('[data-section="' + data.sectionCode + '"][data-field="' + data.fieldCode + '"]').first();
                        var fieldCssVar = $field.attr('data-property') || $field.attr('data-css-var');
                        var fieldType = ($field.attr('data-type') || '').toLowerCase();

                        if (fieldCssVar && data.value !== undefined) {
                            if (typeof data.value === 'string' && data.value.startsWith('--color-')) {
                                CssPreviewManager.removeVariable(fieldCssVar);
                                log.debug('Removed ' + fieldCssVar + ' from live preview (restore to palette ref: ' + data.value + ')');
                            } else {
                                var fieldData = {
                                    format: $field.attr('data-format'),
                                    defaultValue: $field.attr('data-default')
                                };
                                CssPreviewManager.setVariable(fieldCssVar, data.value, fieldType, fieldData);
                                log.debug('Updated ' + fieldCssVar + ' in live preview (restore to: ' + data.value + ')');
                            }
                        }

                        CssPreviewManager.updatePreview();
                    }

                    // Auto-delete: remove the overridden value from draft so the default takes effect
                    log.info('Discarding override for ' + data.sectionCode + '.' + data.fieldCode);
                    discardDraft(self.scope, self.scopeId, [data.sectionCode], [data.fieldCode])
                        .then(function(result) {
                            if (result.discardBreezeThemeEditorDraft.success) {
                                log.info('Discard success: ' + data.sectionCode + '.' + data.fieldCode);

                                self._showToast('success', 'Field restored to default');

                                // Commit the change in state — clears isDirty, updates isModified
                                PanelState.markFieldAsSaved(data.sectionCode, data.fieldCode);

                                // Refresh badges: Modified badge (and restore button) should now disappear
                                FieldHandlers.updateBadges(self.element, data.sectionCode, data.fieldCode);

                                // Update counter again (isModified count may change)
                                self._updateChangesCount();

                                // Notify publication selector about draft change count
                                var fieldModified = PanelState.getModifiedCount();
                                var paletteModified = PaletteManager.getModifiedCount();
                                $(document).trigger('themeEditorDraftSaved', {
                                    scope:   self.scope,
                                    scopeId: self.scopeId,
                                    themeId: self.themeId,
                                    draftChangesCount: fieldModified + paletteModified
                                });
                            } else {
                                log.error('Discard failed: ' + result.discardBreezeThemeEditorDraft.message);
                                self._showToast('error', 'Failed to restore: ' + result.discardBreezeThemeEditorDraft.message);
                            }
                        })
                        .catch(function(error) {
                            log.error('Discard error for ' + data.sectionCode + '.' + data.fieldCode + ': ' + error);
                            self._showToast('error', 'Failed to restore field: ' + error.message);
                        });
                }
            });

            // ✅ Listen for palette changes to update counter
            $(document).on('paletteColorChanged', function() {
                self._updateChangesCount();
            });

            // ✅ Publication selector events
            $(document).on('publicationStatusChanged', function (e, data) {
                var validStatuses = ['DRAFT', 'PUBLISHED', 'PUBLICATION'];
                if (!data || !data.status || validStatuses.indexOf(data.status) === -1) {
                    log.warn('publicationStatusChanged: unknown status "' + (data && data.status) + '" - ignoring');
                    return;
                }
                log.info('Publication status changed to: ' + data.status);
                
                // ✅ ALWAYS update field editability (regardless of config reload)
                // This fixes the bug where fields remain disabled on first panel open
                setTimeout(function() {
                    self._updateFieldsEditability();
                }, 100);
                
                // Prevent duplicate loading if status hasn't actually changed
                if (self.options.status === data.status && data.status !== 'PUBLICATION') {
                    log.debug('Status unchanged, skipping config reload');
                    return;  // Skip reload, but editability already updated above
                }
                
                self.options.status = data.status;
                
                // Load config based on status type
                if (data.status === 'PUBLICATION') {
                    // PUBLICATION mode: load from specific historical publication
                    if (data.publicationId && !isNaN(data.publicationId)) {
                        log.info('Loading config from publication #' + data.publicationId);
                        self._loadConfigFromPublication(data.publicationId);
                    } else {
                        log.warn('PUBLICATION status but no valid publication ID, falling back to DRAFT');
                        self.options.status = 'DRAFT';
                        self._loadConfig();
                    }
                } else {
                    // DRAFT or PUBLISHED mode: load via standard config query
                    self._loadConfig();
                }
            });

            $(document).on('loadThemeEditorFromPublication', function (e, data) {
                log.info('Loading config from publication: ' + data.publicationId);
                self._loadConfigFromPublication(data.publicationId);
            });

            // Listen for scope changes (scope-selector triggers 'scopeChanged')
            $(document).on('scopeChanged', function (e, scope, scopeId, storeCode) {
                log.info('Scope changed to: ' + scope + ':' + scopeId + ' (' + storeCode + ')');

                // Update scope; clear themeId so backend resolves it from the new scope
                self.scope   = scope;
                self.scopeId = scopeId;
                self.themeId = null;

                // Re-init storage helper for new scope
                StorageHelper.init(scopeId, null);

                // Reset live preview (stale CSS no longer applies)
                CssPreviewManager.reset();

                // Reload config for new scope
                log.info('Reloading config for new scope');
                self._loadConfig();
            });

            $(document).on('openPublicationHistoryModal', function () {
                log.info('Opening publication history modal');
                self._showToast('notice', 'Publication history coming soon!');
            });

            $(document).on('themeEditorPublished', function (e, data) {
                log.info('Theme editor published: ' + JSON.stringify(data.publication));

                // Оновити UI
                PanelState.markAsSaved();
                self._updateChangesCount();
                self._refreshAllBadges();
                
                // Clear live preview changes (they're now saved to draft)
                CssPreviewManager.reset();
                
                // Reload page to get fresh published CSS
                // (Draft CSS in DOM is now outdated, published CSS needs server regeneration)
                log.info('Reloading page to apply published CSS...');
                setTimeout(function() {
                    window.location.reload();
                }, 1000);
            });

            $(document).on('bte:publishedDiscarded', function (e, data) {
                log.info('Published customizations discarded, refreshing preview...');

                // 1. Clear unsaved draft edits from live preview
                //    (they were built on top of the old published base)
                CssPreviewManager.reset();

                // 2. Switch iframe to PUBLISHED mode immediately.
                //    If the editor was in PUBLICATION mode, this removes the
                //    #bte-publication-css layer and re-enables #bte-theme-css-variables
                //    so the stale publication color stops showing right away.
                CssManager.showPublished();

                // 3. Refresh published CSS layer content from the server — the DB now
                //    has no published values so #bte-theme-css-variables becomes :root {}
                CssManager.refreshPublishedCss();

                // 4. Reload panel config so field values and badges reflect new state
                self._loadConfig();
            });
        },

        /**
         * Initialize CSS Preview Manager
         */
        _initPreview: function() {
            var self = this;
            setTimeout(function() {
                CssPreviewManager.init();
                
                // CSS Manager may already be initialized early in toolbar.js
                // Only initialize if not already done
                if (!CssManager.getCurrentStatus()) {
                    log.debug('CSS Manager not initialized yet, initializing now...');
                    CssManager.init(self.scopeId, self.themeId);
                } else {
                    log.debug('CSS Manager already initialized (early init from toolbar)');
                }
                
                // Sync panel status with CssManager status (from localStorage)
                // This ensures panel loads the correct config matching the CSS state
                setTimeout(function() {
                    var cssManagerStatus = CssManager.getCurrentStatus();
                    if (cssManagerStatus && cssManagerStatus !== self.options.status) {
                        log.debug('Syncing panel status with CssManager: ' + self.options.status + ' -> ' + cssManagerStatus);
                        self.options.status = cssManagerStatus;
                        
                        // Note: Publication Selector already reads from localStorage in _loadConfig()
                        // So UI should already match. If not, it will sync on first publicationStatusChanged event.
                    }
                }, 100);
            }, 500);
        },

        /**
         * Load theme config from GraphQL
         * Used for DRAFT and PUBLISHED modes
         * For PUBLICATION mode (historical), use _loadConfigFromPublication() instead
         */
        _loadConfig: function() {
            var self = this;

            this._showLoader('Loading configuration...');
            
            log.info('Loading config with status: ' + this.options.status);

            getConfig(this.scope, this.scopeId, this.options.status)
                .then(function(data) {
                    log.info('Config loaded for status "' + self.options.status + '"');
                    var config = data.breezeThemeEditorConfig;

                    // Update themeId and themeName from resolved metadata (important after scope switch)
                    if (config.metadata && config.metadata.themeId) {
                        self.themeId = config.metadata.themeId;
                        // Re-initialize storage with the resolved themeId so that
                        // open-sections state is saved/restored under the correct
                        // scoped key (bte_{scopeId}_{themeId}_open_sections).
                        // Without this, a scope-switch or an initial load where PHP
                        // returned themeId=0 would cause saves to go to the unscoped
                        // key "bte_open_sections", while the next F5 (which gets the
                        // real themeId from PHP) would read from the scoped key and
                        // find nothing — losing the accordion state.
                        StorageHelper.init(self.scopeId, self.themeId);
                        log.info('themeId resolved from metadata: ' + self.themeId);
                    }
                    if (config.metadata && config.metadata.themeName) {
                        self.themeName = config.metadata.themeName;
                        log.info('themeName resolved from metadata: ' + self.themeName);
                    }
                    self.config = config; // Store config for palette initialization
                    
                    // Initialize PaletteManager BEFORE rendering sections
                    // This ensures ColorRenderer can resolve palette references
                    if (config.palettes && config.palettes.length > 0) {
                        PaletteManager.init({
                            palettes: config.palettes,
                            scope:    self.scope,
                            scopeId:  self.scopeId,
                            themeId:  self.themeId
                        });
                        log.info('PaletteManager initialized with ' + config.palettes.length + ' palette(s)');
                    }

                    if (config.fontPalettes && config.fontPalettes.length > 0) {
                        FontPaletteManager.init(config.fontPalettes);
                        self._seedFontPaletteCurrentValues(config.sections);
                        log.info('FontPaletteManager initialized with ' + config.fontPalettes.length + ' font palette(s)');
                    }
                    
                    PanelState.init(config);
                    self._renderSections(config.sections);
                    self._hideLoader();
                    
                    // Sync form fields with live preview changes (if in DRAFT mode)
                    if (self.options.status === 'DRAFT') {
                        setTimeout(function() {
                            CssPreviewManager.syncFieldsFromChanges(self.element);
                        }, 100);
                    } else {
                        // Clear live preview in read-only modes (PUBLISHED)
                        CssPreviewManager.reset();
                    }
                })
                .catch(function(error) {
                    log.error('Failed to load config: ' + error);
                    // Pass the full error object to preserve extensions
                    self._showError(error);
                });
        },

        /**
         * Load config from specific publication (historical snapshot)
         * Used for PUBLICATION mode
         * For DRAFT/PUBLISHED modes, use _loadConfig() instead
         */
        _loadConfigFromPublication: function(publicationId) {
            var self = this;
            this._showLoader('Loading publication #' + publicationId + '...');

            getConfigFromPublication(publicationId)
                .then(function(config) {
                    log.info('Config loaded from publication');
                    
                    self.config = config; // Store config for palette initialization
                    
                    // Initialize PaletteManager BEFORE rendering sections
                    if (config.palettes && config.palettes.length > 0) {
                        PaletteManager.init({
                            palettes: config.palettes,
                            scope:    self.scope,
                            scopeId:  self.scopeId,
                            themeId:  self.themeId
                        });
                        log.info('PaletteManager initialized with ' + config.palettes.length + ' palette(s)');
                    }

                    if (config.fontPalettes && config.fontPalettes.length > 0) {
                        FontPaletteManager.init(config.fontPalettes);
                        self._seedFontPaletteCurrentValues(config.sections);
                        log.info('FontPaletteManager initialized with ' + config.fontPalettes.length + ' font palette(s)');
                    }
                    
                    // Clear live preview changes (publication mode is read-only)
                    CssPreviewManager.reset();
                    
                    PanelState.init(config);
                    self._renderSections(config.sections);
                    self._hideLoader();
                    // Show notification
                    self._showToast('success', 'Loaded publication:  ' + (config.metadata.lastPublished || 'Unknown date'));
                })
                .catch(function(error) {
                    log.error('Failed to load config from publication: ' + error);
                    self._showError(error);
                });
        },

        /**
         * Render sections dynamically
         */
        _renderSections: function(sections) {
            var html = '';

            sections.forEach(function(section) {
                html += '<div class="bte-accordion-section">';
                html += '<div class="bte-accordion-header" data-section="' + section.code + '">';
                html += IconRegistry.render(section.icon);
                html += '<span class="bte-section-label">' + section.label + '</span>';
                html += '<i class="bte-icon-chevron-down bte-accordion-arrow"></i>';
                html += '</div>';
                html += FieldRenderer.renderSection(section);
                html += '</div>';
            });

            this.$sectionsContainer.html(html);

            // Clear search when sections are re-rendered
            if (this.$searchInput) {
                this.$searchInput.val('');
                this.$searchClear.hide();
            }

            // Restore previously open sections; all closed by default on first visit
            var saved = StorageHelper.getOpenSections();
            if (saved && saved.length) {
                var self = this;
                saved.forEach(function(code) {
                    var $h = self.$sectionsContainer.find('.bte-accordion-header[data-section="' + code + '"]');
                    if ($h.length) {
                        $h.addClass('active');
                        self.$sectionsContainer.find('.bte-accordion-content[data-section="' + code + '"]').addClass('active').show();
                    }
                });
            }

            log.info('Rendered ' + sections.length + ' sections');

            // Initialize color palettes before updating editability so the widgets
            // are already bound to bte:editabilityChanged when it fires below.
            this._initPaletteSection();

            // Initialize font palettes (same reason — bind before event fires)
            this._initFontPaletteSection();

            // Disable fields if in read-only mode (PUBLISHED or PUBLICATION).
            // Must come AFTER palette/font-palette init so their bte:editabilityChanged
            // listeners are already registered.
            this._updateFieldsEditability();

            // Initialize preset selector
            this._initPresetSelector();

            // Preload Google Font stylesheets for any font_picker that already has
            // a non-default value referencing an external URL
            this._preloadFontStylesheets();
        },

        /**
         * Preload external font stylesheets for font_picker fields whose current
         * value requires an external stylesheet (e.g. Google Fonts).
         *
         * Called once after sections are rendered so that the preview iframe
         * already shows the correct font even before the user interacts.
         */
        _preloadFontStylesheets: function() {
            this.$sectionsContainer.find('.bte-font-picker').each(function() {
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
                        // Also load into admin document so the trigger button renders the correct font
                        if (!$('link[href="' + url + '"]', document).length) {
                            $('<link>', { rel: 'stylesheet', href: url }).appendTo(document.head);
                        }
                    }
                } catch (e) {
                    // ignore malformed JSON
                }
            });
        },

        /**
         * Update field editability based on current mode
         */
        _updateFieldsEditability: function() {
            var status = this.options.status;
            
            // Check editability based on local status instead of CssManager.isEditable()
            // CSS Manager may not be initialized yet on first load
            var isEditable = (status === 'DRAFT');

            log.debug('Updating fields editability: status=' + status + ' isEditable=' + isEditable);

            // Notify palette/font-palette section widgets so they manage their own state.
            // baseSectionRenderer._bindEditability() subscribes each widget to this event.
            $(document).trigger('bte:editabilityChanged', { isEditable: isEditable });

            if (isEditable) {
                // Enable all fields (DRAFT mode)
                this._enableAllFields();
                this.$saveButton.prop('disabled', false);
                this._updateChangesCount();
            } else {
                // Disable all fields (PUBLISHED or PUBLICATION mode)
                this._disableAllFields();
                this.$saveButton.prop('disabled', true);
                this.$resetButton.prop('disabled', true);
                
                // Show info message
                var mode = status === 'PUBLICATION' ? 'PUBLICATION' : 'PUBLISHED';
                log.debug('Fields disabled in ' + mode + ' mode');
            }
        },
        
        /**
         * Enable all input fields
         */
        _enableAllFields: function() {
            // Enable all standard inputs in sections
            this.$sectionsContainer.find('input, select, textarea, button').not('.bte-accordion-header').prop('disabled', false);
            
            // Remove disabled visual state from fields
            this.$sectionsContainer.find('.bte-field-wrapper').removeClass('bte-field-disabled');

            // ✅ Enable preset container
            this.$presetContainer.removeClass('bte-field-disabled');
            this.$presetContainer.find('input, select, button').prop('disabled', false);

            log.info('All fields enabled (palette/font-palette handled via bte:editabilityChanged)');
        },
        
        /**
         * Disable all input fields
         */
        _disableAllFields: function() {
            // Disable all standard inputs in sections
            this.$sectionsContainer.find('input, select, textarea, button').not('.bte-accordion-header').prop('disabled', true);
            
            // Add disabled visual state to fields
            this.$sectionsContainer.find('.bte-field-wrapper').addClass('bte-field-disabled');

            // ✅ Disable preset container
            this.$presetContainer.addClass('bte-field-disabled');
            this.$presetContainer.find('input, select, button').prop('disabled', true);

            log.info('All fields disabled (palette/font-palette handled via bte:editabilityChanged)');
        },

        /**
         * Toggle accordion section
         */
        _toggleSection: function (e) {
            var $header = $(e.currentTarget);
            var section = $header.data('section');
            var $content = this.element.find('.bte-accordion-content[data-section="' + section + '"]');
            var isActive = $header.hasClass('active');

            if (isActive) {
                $header.removeClass('active');
                $content.removeClass('active').slideUp(200);
            } else {
                $header.addClass('active');
                $content.addClass('active').slideDown(200);
            }

            // Save open sections state
            var openSections = [];
            this.$sectionsContainer.find('.bte-accordion-header.active').each(function() {
                openSections.push($(this).data('section'));
            });
            StorageHelper.setOpenSections(openSections);

            log.debug('Accordion toggled: ' + section + ' -> ' + !isActive);
        },

        /**
         * Bind search input events
         */
        _bindSearch: function () {
            var self = this;
            var debouncedFilter = this._debounce(function () {
                var query = self.$searchInput.val().trim();

                self._filterSections(query);
                self.$searchClear.toggle(query.length > 0);
            }, 250);

            this.$searchInput.on('input', debouncedFilter);
            this.$searchClear.on('click', $.proxy(this._clearSearch, this));
        },

        /**
         * Filter sections and fields by search query.
         * Searches against: section label, field label, field description.
         * HEADING-type fields are always hidden when search is active.
         *
         * @param {String} query
         */
        _filterSections: function (query) {
            var self = this;
            var normalized = query.toLowerCase();

            // Remove previous "no results" message
            this.$sectionsContainer.find('.bte-search-no-results').remove();

            if (!normalized) {
                // Restore: show everything, re-apply saved accordion state
                this.$sectionsContainer.find('.bte-accordion-section').show();
                this.$sectionsContainer.find('.bte-field-wrapper').show();

                var saved = StorageHelper.getOpenSections();

                this.$sectionsContainer.find('.bte-accordion-header').each(function () {
                    var $h = $(this);
                    var code = $h.data('section');
                    var $c = self.$sectionsContainer.find(
                        '.bte-accordion-content[data-section="' + code + '"]'
                    );

                    if (saved && saved.indexOf(code) !== -1) {
                        $h.addClass('active');
                        $c.addClass('active').show();
                    } else {
                        $h.removeClass('active');
                        $c.removeClass('active').hide();
                    }
                });

                log.debug('Search cleared — accordion state restored');
                return;
            }

            var totalVisible = 0;

            this.$sectionsContainer.find('.bte-accordion-section').each(function () {
                var $section = $(this);
                var $header  = $section.find('> .bte-accordion-header');
                var $content = $section.find('> .bte-accordion-content');
                var sectionLabel = $header.find('.bte-section-label').text().toLowerCase();
                var sectionMatches = sectionLabel.indexOf(normalized) !== -1;
                var visibleCount = 0;

                $content.find('.bte-field-wrapper').each(function () {
                    var $wrapper = $(this);

                    // HEADING fields are visual dividers — always hide during search
                    if ($wrapper.find('.bte-field-heading').length) {
                        $wrapper.hide();
                        return;
                    }

                    var labelText = $wrapper.find('.bte-field-label').first().text().toLowerCase();
                    var descText  = $wrapper.find('.bte-field-description').first().text().toLowerCase();
                    var matches   = sectionMatches ||
                                    labelText.indexOf(normalized) !== -1 ||
                                    descText.indexOf(normalized)  !== -1;

                    if (matches) {
                        $wrapper.show();
                        visibleCount++;
                    } else {
                        $wrapper.hide();
                    }
                });

                if (visibleCount > 0) {
                    $section.show();
                    $header.addClass('active');
                    $content.addClass('active').show();
                    totalVisible += visibleCount;
                } else {
                    $section.hide();
                }
            });

            if (totalVisible === 0) {
                this.$sectionsContainer.append(
                    '<p class="bte-search-no-results">No settings found for &ldquo;' +
                    $('<span>').text(query).html() +
                    '&rdquo;</p>'
                );
            }

            log.debug('Search "' + query + '" — ' + totalVisible + ' field(s) visible');
        },

        /**
         * Clear search input and restore accordion state
         */
        _clearSearch: function () {
            this.$searchInput.val('');
            this.$searchClear.hide();
            this._filterSections('');
        },

        /**
         * Returns a debounced version of the given function
         *
         * @param {Function} fn
         * @param {Number}   delay  milliseconds
         * @returns {Function}
         */
        _debounce: function (fn, delay) {
            var timer;

            return function () {
                var context = this,
                    args    = arguments;

                clearTimeout(timer);
                timer = setTimeout(function () {
                    fn.apply(context, args);
                }, delay);
            };
        },

        /**
         * Toggle error technical details
         */
        _toggleErrorDetails: function(e) {
            e.preventDefault();
            e.stopPropagation();

            var $btn = $(e.currentTarget);
            var $stack = $btn.siblings('.bte-error-stack');

            if ($stack.is(':visible')) {
                $stack.slideUp(200);
                $btn.text('Show technical details');
            } else {
                $stack.slideDown(200);
                $btn.text('Hide technical details');
            }
        },

        /**
         * Update changes count badge
         */
        _updateChangesCount: function() {
            var fieldChanges = PanelState.getChangesCount();
            var paletteChanges = PaletteManager.getDirtyCount();
            var totalChanges = fieldChanges + paletteChanges;
            
            // Update button text
            this.$saveButton.text('Save (' + totalChanges + ')');
            
            // Enable/disable reset button based on changes
            this.$resetButton.prop('disabled', totalChanges === 0);
            
            log.debug('Changes count updated: ' + fieldChanges + ' fields + ' + paletteChanges + ' palette = ' + totalChanges);
        },

        /**
         * Initialize panel theme from localStorage (default: light)
         */
        _initPanelTheme: function () {
            var saved = StorageHelper.getItem('panel_theme') || 'light';
            var $panel = this.element.closest('.bte-panel');

            if (saved === 'light') {
                $panel.addClass('bte-panel--light');
            } else {
                $panel.removeClass('bte-panel--light');
            }

            log.info('Panel theme initialized: ' + saved);
        },

        /**
         * Toggle panel between light and dark theme, persist to localStorage
         */
        _togglePanelTheme: function () {
            var $panel = this.element.closest('.bte-panel');
            var isLight = $panel.hasClass('bte-panel--light');

            if (isLight) {
                $panel.removeClass('bte-panel--light');
                StorageHelper.setItem('panel_theme', 'dark');
                log.info('Panel theme → dark');
            } else {
                $panel.addClass('bte-panel--light');
                StorageHelper.setItem('panel_theme', 'light');
                log.info('Panel theme → light');
            }
        },

        /**
         * Close panel using navigation widget API
         */
        _close: function () {
            log.info('Closing panel');
            
            // Get navigation widget instance
            var navigationWidget = this.$navigation.data('swissupBreezeNavigation');
            
            if (navigationWidget) {
                // Use widget API to deactivate (proper architecture)
                navigationWidget.deactivate('theme-editor');
                log.info('Panel closed via navigation.deactivate()');
            } else {
                log.error('Navigation widget not found - cannot close panel');
                log.error('Expected widget on: ' + this.$navigation.selector);
            }
        },

        /**
         * Reset changes
         */
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
                log.info('Reset complete');
            }
        },

        /**
         * Save changes
         */
        _save: function () {
            // Check both field changes AND palette changes
            if (!PanelState.hasChanges() && !PaletteManager.hasDirtyChanges()) {
                this._showToast('notice', 'No changes to save');
                return;
            }

            // Combine field changes + palette changes
            var values = PanelState.getChangesForSave();
            var paletteChanges = PaletteManager.getDirtyChanges();
            
            if (paletteChanges.length > 0) {
                values = values.concat(paletteChanges);
                log.debug('Including ' + paletteChanges.length + ' palette changes in save');
            }
            
            var self = this;

            log.debug('Saving values: ' + JSON.stringify(values));
            log.debug('Changes count BEFORE save: ' + PanelState.getChangesCount());

            this.$saveButton.prop('disabled', true).text('Saving...');

            saveValues(this.scope, this.scopeId, this.options.status, values)
                .then(function(data) {
                    log.info('Saved successfully');

                    if (data.saveBreezeThemeEditorValues.success) {
                        self._showToast('success', 'Settings saved successfully!');

                        log.debug('Changes count BEFORE markAsSaved: ' + PanelState.getChangesCount());
                        PanelState.markAsSaved();
                        
                        // Mark palette as saved
                        PaletteManager.markAsSaved();
                        
                        log.debug('Changes count AFTER markAsSaved: ' + PanelState.getChangesCount());

                        self._refreshAllBadges();

                        var fieldModified = PanelState.getModifiedCount();
                        var paletteModified = PaletteManager.getModifiedCount();
                        $(document).trigger('themeEditorDraftSaved', {
                            scope:   self.scope,
                            scopeId: self.scopeId,
                            themeId: self.themeId,
                            draftChangesCount: fieldModified + paletteModified
                        });
                        log.info('Save complete, event triggered');
                    } else {
                        self._showToast('error', 'Failed to save: ' + data.saveBreezeThemeEditorValues.message);
                    }
                })
                .catch(function(error) {
                    log.error('Save failed: ' + error);
                    self._showToast('error', 'Failed to save settings: ' + error.message);
                })
                .always(function() {
                    self.$saveButton.prop('disabled', false);//.text('Save');
                    self._updateChangesCount();
                });
        },

        /**
         * Refresh all field badges after save
         */
        _refreshAllBadges: function() {
            var self = this;

            Object.keys(PanelState.values).forEach(function(key) {
                var parts = key.split('.');
                if (parts.length === 2) {
                    FieldHandlers.updateBadges(self.element, parts[0], parts[1]);
                }
            });

            log.debug('All badges refreshed after save');
        },

        /**
         * Show loader
         */
        _showLoader: function(message) {
            this.$loader.show();
            this.$loader.find('.bte-loader-text').text(message || 'Loading...');
            this.$error.hide();
            this.$sectionsContainer.hide();

            this.$saveButton.prop('disabled', true);
            this.$resetButton.prop('disabled', true);

            log.debug('Loading: ' + (message || 'Loading...'));
        },

        /**
         * Hide loader
         */
        _hideLoader: function() {
            this.$loader.hide();
            this.$sectionsContainer.show();

            this.$saveButton.prop('disabled', false);
            this.$resetButton.prop('disabled', true);
            this._updateChangesCount();
        },

        /**
         * Show error message
         */
        _showError: function(errorData) {
            log.debug('_showError called with: ' + JSON.stringify(errorData));

            this.$loader.hide();
            this.$sectionsContainer.hide();

            var errorInfo = this._parseErrorData(errorData);
            log.debug('Parsed error info: ' + JSON.stringify(errorInfo));

            var displayMessage = this._getFriendlyMessage(errorInfo.message, errorInfo.debugMessage);
            log.debug('Display message: ' + displayMessage.message + ' Friendly: ' + displayMessage.isFriendly);

            this._updateErrorUI(displayMessage.message, errorInfo.debugMessage, displayMessage.isFriendly);

            this.$saveButton.prop('disabled', true);
            this.$resetButton.prop('disabled', true);

            this.$error.show();

            // Show toast notification for errors
            this._showErrorToast(errorInfo.message, errorInfo.debugMessage);

            log.error('Panel error: ' + JSON.stringify(errorData));
        },

        _showToast: function(type, message) {
            Toastify.show(type, message);
        },

        _showErrorToast: function(message, debugMessage) {
            var searchText = debugMessage || message;
            var isThemeConfigError = searchText.indexOf('configuration file not found') !== -1 ||
                                     searchText.indexOf('Theme editor configuration file not found') !== -1;
            var isInvalidToken = searchText.indexOf('Invalid access token') !== -1 ||
                                 searchText.indexOf('Access token required') !== -1;

            if (isThemeConfigError) {
                var toastMessage = this._getNoSettingsToastMessage();

                Toastify.show('warning', toastMessage, {
                    duration: 8000,
                    close: true,
                    gravity: 'top',
                    position: 'center'
                });

                log.info('Toast shown for unsupported theme');
            }

            if (isInvalidToken) {
                var adminUrl = this.adminUrl || '/admin';
                var tokenMessage = 'Your session has expired. <a href="' + adminUrl +
                    '" target="_blank" style="color: #fff; text-decoration: underline;">' +
                    'Login to Admin</a> or refresh the page.';

                Toastify.show('error', tokenMessage, {
                    duration: 10000,
                    close: true,
                    gravity: 'top',
                    position: 'center'
                });

                log.info('Toast shown for invalid token with admin link');
            }
        },

        /**
         * Return a short toast message for "no Theme Editor settings" errors,
         * tailored to the currently active scope.
         *
         * @return {string}
         */
        _getNoSettingsToastMessage: function() {
            var scope = this.scope || 'stores';

            if (scope === 'default') {
                return 'Theme Editor is not available at the "All Store Views" level. ' +
                       'Please select a specific store view.';
            }

            if (scope === 'websites') {
                return 'Theme Editor is not available for this website scope. ' +
                       'Please select a specific store view.';
            }

            // scope === 'stores'
            var themeName = this.themeName || 'this theme';
            return 'Theme Editor is not available for "' + themeName + '". ' +
                   'Please select a different store view.';
        },

        _parseErrorData: function(errorData) {
            var message = 'An unexpected error occurred';
            var debugMessage = null;

            if (typeof errorData === 'string') {
                message = errorData;
                log.debug('String error: ' + message);
                return { message: message, debugMessage: null };
            }

            if (errorData && errorData.message) {
                message = errorData.message;

                if (message.indexOf('GraphQL Error: ') === 0) {
                    message = message.substring(15);
                    log.debug('Removed GraphQL prefix: ' + message);
                }

                if (errorData.extensions && errorData.extensions.debugMessage) {
                    debugMessage = errorData.extensions.debugMessage;
                    log.debug('Found debugMessage in extensions: ' + debugMessage);
                }

                if (!debugMessage && errorData.graphqlErrors && errorData.graphqlErrors.length > 0) {
                    var firstError = errorData.graphqlErrors[0];
                    if (firstError.extensions && firstError.extensions.debugMessage) {
                        debugMessage = firstError.extensions.debugMessage;
                        log.debug('Found debugMessage in graphqlErrors: ' + debugMessage);
                    }
                }

                if (!debugMessage && errorData.stack && errorData.stack.indexOf('Error: ') !== -1) {
                    debugMessage = errorData.stack;
                    log.debug('Using stack trace: ' + debugMessage);
                }
            }

            log.debug('Final parsed: message=' + message + ' debugMessage=' + debugMessage);
            return { message: message, debugMessage: debugMessage };
        },

        _getFriendlyMessage: function(message, debugMessage) {
            var themeName = this.themeName || 'current theme';
            var scope = this.scope || 'stores';
            var searchText = debugMessage || message;

            // "configuration file not found" — scope-specific messages
            if (searchText.indexOf('configuration file not found') !== -1 ||
                searchText.indexOf('Theme editor configuration file not found') !== -1) {

                var noSettingsMessage;

                if (scope === 'default') {
                    noSettingsMessage =
                        'Theme Editor settings are not available at the "All Store Views" level.\n\n' +
                        'The theme assigned at the Default Config scope ("' + themeName + '") ' +
                        'doesn\'t support Theme Editor.\n\n' +
                        'Please select a specific store view from the dropdown that uses a supported Breeze theme.';
                } else if (scope === 'websites') {
                    noSettingsMessage =
                        'Theme Editor settings are not available for this website.\n\n' +
                        'The theme assigned to this website ("' + themeName + '") ' +
                        'doesn\'t support Theme Editor.\n\n' +
                        'Please select a specific store view from the dropdown.';
                } else {
                    noSettingsMessage =
                        'Theme Editor is not available for this store view.\n\n' +
                        'The assigned theme ("' + themeName + '") ' +
                        'doesn\'t have the required configuration file.';
                }

                log.debug('Scope-specific no-settings message for scope=' + scope);
                return { message: noSettingsMessage, isFriendly: true };
            }

            // Other known errors
            var friendlyMessages = {
                'Access token required': 'Your session has expired. Please refresh the page.',
                'Invalid access token': 'Your session has expired. Please refresh the page.',
                'Internal server error': 'The server encountered an error. Please try again later.'
            };

            for (var key in friendlyMessages) {
                if (searchText.indexOf(key) !== -1) {
                    log.debug('Found friendly message for: ' + key + ' in ' + (debugMessage ? 'debugMessage' : 'message'));
                    return {
                        message: friendlyMessages[key],
                        isFriendly: true
                    };
                }
            }

            log.debug('No friendly message found, using original message');
            return {
                message: message,
                isFriendly: false
            };
        },

        _updateErrorUI: function(message, debugMessage, hasFriendlyMessage) {
            var $details = this.$error.find('.bte-error-details');
            var $stack = this.$error.find('.bte-error-stack');
            var $toggle = this.$error.find('.bte-error-toggle');

            this.$error.find('.bte-error-message').text(message);
            log.debug('Set error message: ' + message);

            if (debugMessage) {
                $details.show();
                $stack.text(debugMessage);
                log.debug('Set debug message: ' + debugMessage);

                if (!hasFriendlyMessage) {
                    $stack.show();
                    $toggle.text('Hide technical details');
                    log.debug('Auto-expanded (generic error)');
                } else {
                    $stack.hide();
                    $toggle.text('Show technical details');
                    log.debug('Collapsed (friendly message)');
                }
            } else {
                $details.show();
                $stack.text('No additional technical information available. Check browser console for more details.');
                $stack.hide();
                $toggle.text('Show technical details');
                log.debug('No debugMessage, showing fallback');
            }
        },

        /**
         * Initialize palette section
         */
        _initPaletteSection: function() {
            if (!this.$paletteContainer || this.$paletteContainer.length === 0) {
                log.warn('Palette container not found');
                return;
            }

            // Destroy existing widget instance so re-init works after store switch
            if (this.$paletteContainer.data('swissup-paletteSection')) {
                log.debug('Destroying existing paletteSection widget before re-init');
                this.$paletteContainer.paletteSection('destroy');
            }

            // Check if config has palettes
            if (!this.config || !this.config.palettes || this.config.palettes.length === 0) {
                log.debug('No palettes in config, hiding palette section');
                this.$paletteContainer.hide();
                return;
            }

            // Ensure container is visible (may have been hidden by a previous blank-store load)
            this.$paletteContainer.show();

            log.info('Initializing Palette Section with ' + this.config.palettes.length + ' palettes');

            this.$paletteContainer.paletteSection({
                palettes: this.config.palettes,
                scope:    this.scope,
                scopeId:  this.scopeId,
                themeId:  this.themeId
            });

            log.info('Palette section initialized');
        },

        /**
         * Initialize font palette section
         */
        _initFontPaletteSection: function() {
            if (!this.$fontPaletteContainer || this.$fontPaletteContainer.length === 0) {
                log.warn('Font palette container not found');
                return;
            }

            // Destroy existing widget instance so re-init works after store switch
            if (this.$fontPaletteContainer.data('swissup-fontPaletteSection')) {
                log.debug('Destroying existing fontPaletteSection widget before re-init');
                this.$fontPaletteContainer.fontPaletteSection('destroy');
            }

            // Hide if no font palettes in config
            if (!this.config || !this.config.fontPalettes || this.config.fontPalettes.length === 0) {
                log.debug('No font palettes in config, hiding font palette section');
                this.$fontPaletteContainer.hide();
                return;
            }

            // Ensure container is visible (may have been hidden by a previous blank-store load)
            this.$fontPaletteContainer.show();

            log.info('Initializing Font Palette Section with ' + this.config.fontPalettes.length + ' palette(s)');

            this.$fontPaletteContainer.fontPaletteSection({
                fontPalettes: this.config.fontPalettes,
                sections:     this.config.sections || []
            });

            log.info('Font palette section initialized');
        },

        /**
         * Seed FontPaletteManager with the current (saved) values for each
         * font palette role field, so that FontPaletteManager.getCurrentValue()
         * returns the correct font BEFORE the sections are rendered.
         *
         * Must be called immediately after FontPaletteManager.init() and before
         * _renderSections(), because the font-picker renderer reads getCurrentValue()
         * to set the role swatch font-family on initial render.
         *
         * @param {Array} sections  config.sections from GraphQL response
         */
        _seedFontPaletteCurrentValues: function(sections) {
            (sections || []).forEach(function(section) {
                (section.fields || []).forEach(function(field) {
                    if (field.property && FontPaletteManager.getRole(field.property)) {
                        var val = (field.value !== null && field.value !== undefined)
                            ? field.value
                            : (field.default || '');
                        FontPaletteManager.setCurrentValue(field.property, val);
                    }
                });
            });
            log.debug('FontPaletteManager current values seeded from config');
        },

        /**
         * Initialize preset selector
         */
        _initPresetSelector: function() {
            var self = this;
            
            if (!this.$presetContainer || this.$presetContainer.length === 0) {
                log.warn('Preset container not found');
                return;
            }
            
            this.$presetContainer.presetSelector({
                scope:    this.scope,
                scopeId:  this.scopeId,
                themeId:  this.themeId,
                onApply:  $.proxy(this._onPresetApplied, this)
            });
            
            log.info('Preset selector initialized');
        },

        /**
         * Handle preset applied event
         */
        _onPresetApplied: function(result) {
            log.info('Preset applied: ' + result.appliedCount + ' values');
            
            // Update changes counter
            this._updateChangesCount();
            
            // Refresh all badges
            this._refreshAllBadges();
            
            // Refresh CSS preview
            CssPreviewManager.refresh();
            
            log.info('Panel updated after preset apply');
        },

        _destroy: function() {
            FieldHandlers.destroy(this.element);
            CssPreviewManager.destroy();
            PanelState.clear();
            this._super();
        }
    });

    return $.swissup.themeSettingsEditor;
});
