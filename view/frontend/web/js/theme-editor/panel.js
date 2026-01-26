define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/panel.html',
    'Swissup_BreezeThemeEditor/js/theme-editor/panel-state',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderer',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers',
    'Swissup_BreezeThemeEditor/js/theme-editor/preset-selector',
    'Swissup_BreezeThemeEditor/js/theme-editor/sections/palette-section-renderer',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config-from-publication',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-values',
    'Swissup_BreezeThemeEditor/js/theme-editor/storage-helper'
], function (
    $,
    widget,
    mageTemplate,
    panelTemplate,
    PanelState,
    PaletteManager,
    FieldRenderer,
    CssPreviewManager,
    CssManager,
    FieldHandlers,
    PresetSelector,
    PaletteSection,
    Toastify,
    getConfig,
    getConfigFromPublication,
    saveValues,
    StorageHelper
) {
    'use strict';

    $.widget('swissup.themeEditorPanel', {
        options: {
            title: 'Theme Editor',
            closeTitle: 'Close Panel',
            presetsLabel: 'Presets:',
            status: 'DRAFT'
        },

        _create: function () {
            console.log('✅ Initializing Theme Editor Panel');

            var config = $('body').data('breeze-editor-config');
            if (config) {
                this.storeId = config.storeId;
                this.themeId = config.themeId;
                this.themeName = config.themeName || 'current theme';
                this.adminUrl = config.adminUrl || '/admin';
                var scopeLabel = {
                    storeId: this.storeId,
                    themeName: this.themeName
                };
                this.options.title = this.options.title.replace('%1', scopeLabel.storeId).replace('%2', scopeLabel.themeName);
            } else {
                this.storeId = this.options.storeId || 1;
                this.themeId = this.options.themeId || 0;
                this.themeName = 'current theme';
                this.adminUrl = '/admin';
            }

            // Initialize storage helper
            if (this.storeId && this.themeId) {
                StorageHelper.init(this.storeId, this.themeId);
            }

            this.template = mageTemplate(panelTemplate);
            this._render();
            this._bind();
            this._initPreview();
            
            // Read current mode from localStorage (sync with Publication Selector)
            var currentStatus = StorageHelper.getCurrentStatus();
            this.options.status = currentStatus;
            
            console.log('📍 Panel initializing with mode:', currentStatus);
            
            // Load config based on current mode
            if (currentStatus === 'PUBLICATION') {
                // PUBLICATION mode: load from specific historical publication
                var publicationId = StorageHelper.getCurrentPublicationId();
                if (publicationId && !isNaN(publicationId)) {
                    console.log('📥 Loading config from publication #' + publicationId);
                    this._loadConfigFromPublication(publicationId);
                } else {
                    // Fallback: no valid publication ID found
                    console.warn('⚠️ PUBLICATION mode but no valid publication ID, falling back to DRAFT');
                    this.options.status = 'DRAFT';
                    this._loadConfig();
                }
            } else {
                // DRAFT or PUBLISHED mode: load via standard config query
                console.log('📥 Loading config with status:', currentStatus);
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
            this.$resetButton = this.element.find('.bte-reset-button');
            this.$saveButton = this.element.find('.bte-save-button');
            this.$sectionsContainer = this.element.find('.bte-sections-container');
            this.$paletteContainer = this.element.find('.bte-palette-container');
            this.$presetContainer = this.element.find('.bte-preset-container');
            this.$loader = this.element.find('.bte-panel-loader');
            this.$error = this.element.find('.bte-panel-error');

            console.log('📋 Theme Editor Panel rendered');
        },

        _bind: function () {
            var self = this;

            // Panel controls
            this.$closeButton.on('click', $.proxy(this._close, this));
            this.$resetButton.on('click', $.proxy(this._reset, this));
            this.$saveButton.on('click', $.proxy(this._save, this));

            // Error handlers
            this.element.on('click', '.bte-error-retry', $.proxy(this._loadConfig, this));
            this.element.on('click', '.bte-error-toggle', $.proxy(this._toggleErrorDetails, this));
            this.element.on('click', '.bte-accordion-header', $.proxy(this._toggleSection, this));

            // ✅ Field changes with live badge updates
            FieldHandlers.init(this.element, function(fieldData) {
                // Update changes counter
                self._updateChangesCount();

                // ✅ Update badges in real-time
                FieldHandlers.updateBadges(self.element, fieldData.sectionCode, fieldData.fieldCode);
            });

            // ✅ Listen for PanelState events (field-reset, etc.)
            PanelState.addListener(function(eventType, data) {
                if (eventType === 'field-reset') {
                    console.log('🔄 Panel handling field-reset event:', data);
                    
                    // Update field badges (hide "Changed" badge and reset button)
                    FieldHandlers.updateBadges(self.element, data.sectionCode, data.fieldCode);
                    
                    // Update Save button counter
                    self._updateChangesCount();
                    
                    // Update CSS preview
                    if (CssPreviewManager.isActive()) {
                        CssPreviewManager.updatePreview();
                    }
                }
            });

            // ✅ Listen for palette changes to update counter
            $(document).on('paletteColorChanged', function() {
                self._updateChangesCount();
            });

            // ✅ Publication selector events
            $(document).on('publicationStatusChanged', function (e, data) {
                console.log('🔄 Publication status changed to:', data.status);
                
                // Prevent duplicate loading if status hasn't actually changed
                if (self.options.status === data.status) {
                    console.log('⏭️ Status unchanged, skipping reload');
                    return;
                }
                
                self.options.status = data.status;
                self._loadConfig();
                
                // Update field editability after status change
                setTimeout(function() {
                    self._updateFieldsEditability();
                }, 100);
            });

            $(document).on('loadThemeEditorFromPublication', function (e, data) {
                console.log('📥 Loading config from publication:', data.publicationId);
                self._loadConfigFromPublication(data.publicationId);
            });

            $(document).on('openPublicationHistoryModal', function () {
                console.log('📜 Opening publication history modal');
                self._showToast('notice', 'Publication history coming soon!');
            });

            $(document).on('themeEditorPublished', function (e, data) {
                console.log('✅ Theme editor published:', data.publication);

                // Оновити UI
                PanelState.markAsSaved();
                self._updateChangesCount();
                self._refreshAllBadges();
                
                // Clear live preview changes (they're now saved to draft)
                CssPreviewManager.reset();
                
                // Reload page to get fresh published CSS
                // (Draft CSS in DOM is now outdated, published CSS needs server regeneration)
                console.log('🔄 Reloading page to apply published CSS...');
                setTimeout(function() {
                    window.location.reload();
                }, 1000);
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
                    console.log('⏳ CSS Manager not initialized yet, initializing now...');
                    CssManager.init(self.storeId, self.themeId);
                } else {
                    console.log('✅ CSS Manager already initialized (early init from toolbar)');
                }
                
                // Sync panel status with CssManager status (from localStorage)
                // This ensures panel loads the correct config matching the CSS state
                setTimeout(function() {
                    var cssManagerStatus = CssManager.getCurrentStatus();
                    if (cssManagerStatus && cssManagerStatus !== self.options.status) {
                        console.log('🔄 Syncing panel status with CssManager:', self.options.status, '→', cssManagerStatus);
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
            
            console.log('📥 Loading config with status:', this.options.status);

            getConfig(this.storeId, this.themeId, this.options.status)
                .then(function(data) {
                    console.log('✅ Config loaded for status "' + self.options.status + '":', data);
                    var config = data.breezeThemeEditorConfig;
                    self.config = config; // Store config for palette initialization
                    
                    // Initialize PaletteManager BEFORE rendering sections
                    // This ensures ColorRenderer can resolve palette references
                    if (config.palettes && config.palettes.length > 0) {
                        PaletteManager.init({
                            palettes: config.palettes,
                            storeId: self.storeId,
                            themeId: self.themeId
                        });
                        console.log('✅ PaletteManager initialized with', config.palettes.length, 'palette(s)');
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
                    console.error('❌ Failed to load config:', error);
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

            getConfigFromPublication(this.storeId, this.themeId, publicationId)
                .then(function(config) {
                    console.log('✅ Config loaded from publication:', config);
                    
                    self.config = config; // Store config for palette initialization
                    
                    // Initialize PaletteManager BEFORE rendering sections
                    if (config.palettes && config.palettes.length > 0) {
                        PaletteManager.init({
                            palettes: config.palettes,
                            storeId: self.storeId,
                            themeId: self.themeId
                        });
                        console.log('✅ PaletteManager initialized with', config.palettes.length, 'palette(s)');
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
                    console.error('❌ Failed to load config from publication:', error);
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
                html += '<i class="bte-icon-' + (section.icon || 'settings') + '"></i>';
                html += '<span class="bte-section-label">' + section.label + '</span>';
                html += '<i class="bte-icon-chevron-down bte-accordion-arrow"></i>';
                html += '</div>';
                html += FieldRenderer.renderSection(section);
                html += '</div>';
            });

            this.$sectionsContainer.html(html);

            // Open first section
            this.$sectionsContainer.find('.bte-accordion-header').first().addClass('active');
            this.$sectionsContainer.find('.bte-accordion-content').first().addClass('active').show();

            console.log('📋 Rendered', sections.length, 'sections');
            
            // Disable fields if in read-only mode (PUBLISHED or PUBLICATION)
            this._updateFieldsEditability();
            
            // Initialize color palettes (always visible, before presets)
            this._initPaletteSection();
            
            // Initialize preset selector
            this._initPresetSelector();
        },

        /**
         * Update field editability based on current mode
         */
        _updateFieldsEditability: function() {
            var isEditable = CssManager.isEditable();
            var status = this.options.status;
            
            console.log('🔒 Updating fields editability:', {status: status, isEditable: isEditable});
            
            if (isEditable) {
                // Enable all fields (DRAFT mode)
                this._enableAllFields();
                this.$saveButton.prop('disabled', false);
                this.$resetButton.prop('disabled', false);
            } else {
                // Disable all fields (PUBLISHED or PUBLICATION mode)
                this._disableAllFields();
                this.$saveButton.prop('disabled', true);
                this.$resetButton.prop('disabled', true);
                
                // Show info message
                var mode = status === 'PUBLICATION' ? 'PUBLICATION' : 'PUBLISHED';
                console.log('🔒 Fields disabled in ' + mode + ' mode');
            }
        },
        
        /**
         * Enable all input fields
         */
        _enableAllFields: function() {
            // Enable all standard inputs
            this.$sectionsContainer.find('input, select, textarea, button').not('.bte-accordion-header').prop('disabled', false);
            
            // Remove disabled visual state
            this.$sectionsContainer.find('.bte-field-wrapper').removeClass('bte-field-disabled');
            
            console.log('✅ All fields enabled');
        },
        
        /**
         * Disable all input fields
         */
        _disableAllFields: function() {
            // Disable all standard inputs
            this.$sectionsContainer.find('input, select, textarea, button').not('.bte-accordion-header').prop('disabled', true);
            
            // Add disabled visual state
            this.$sectionsContainer.find('.bte-field-wrapper').addClass('bte-field-disabled');
            
            console.log('🔒 All fields disabled');
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

            console.log('🔄 Accordion toggled:', section, '→', !isActive);
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
            
            console.log('📊 Changes count updated:', fieldChanges, 'fields +', paletteChanges, 'palette =', totalChanges);
        },

        /**
         * Close panel
         */
        _close: function () {
            console.log('❌ Closing panel');
            $('#toolbar-navigation .nav-item[data-id="theme-editor"]').click();
        },

        /**
         * Reset changes
         */
        _reset: function () {
            if (!PanelState.hasChanges()) {
                this._showToast('notice', 'No changes to reset');
                return;
            }

            if (confirm('Reset all changes to default values?')) {
                PanelState.reset();
                CssPreviewManager.reset();
                this._loadConfig();
                console.log('✅ Reset complete');
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
                console.log('💾 Including', paletteChanges.length, 'palette changes in save');
            }
            
            var self = this;

            console.log('💾 Saving values:', values);
            console.log('💾 Changes count BEFORE save:', PanelState.getChangesCount());

            this.$saveButton.prop('disabled', true).text('Saving...');

            saveValues(this.storeId, this.themeId, this.options.status, values)
                .then(function(data) {
                    console.log('✅ Saved:', data);

                    if (data.saveBreezeThemeEditorValues.success) {
                        self._showToast('success', 'Settings saved successfully!');

                        console.log('💾 Changes count BEFORE markAsSaved:', PanelState.getChangesCount());
                        PanelState.markAsSaved();
                        
                        // Mark palette as saved
                        PaletteManager.markAsSaved();
                        
                        console.log('💾 Changes count AFTER markAsSaved:', PanelState.getChangesCount());

                        self._refreshAllBadges();
                        $(document).trigger('themeEditorDraftSaved', {
                            storeId: self.storeId,
                            themeId: self.themeId
                        });
                        console.log('✅ Save complete, event triggered');
                    } else {
                        self._showToast('error', 'Failed to save: ' + data.saveBreezeThemeEditorValues.message);
                    }
                })
                .catch(function(error) {
                    console.error('❌ Save failed:', error);
                    self._showToast('error', 'Failed to save settings: ' + error.message);
                })
                .finally(function() {
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

            console.log('🔄 All badges refreshed after save');
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

            console.log('⏳', message);
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
            console.log('🔥 _showError called with:', errorData);

            this.$loader.hide();
            this.$sectionsContainer.hide();

            var errorInfo = this._parseErrorData(errorData);
            console.log('🔥 Parsed error info:', errorInfo);

            var displayMessage = this._getFriendlyMessage(errorInfo.message, errorInfo.debugMessage);
            console.log('🔥 Display message:', displayMessage.message, 'Friendly:', displayMessage.isFriendly);

            this._updateErrorUI(displayMessage.message, errorInfo.debugMessage, displayMessage.isFriendly);

            this.$saveButton.prop('disabled', true);
            this.$resetButton.prop('disabled', true);

            this.$error.show();

            // Show toast notification for errors
            this._showErrorToast(errorInfo.message, errorInfo.debugMessage);

            console.error('❌ Panel error:', errorData);
        },

        _showToast: function(type, message) {
            Toastify.show(type, message);
        },

        _showErrorToast: function(message, debugMessage) {
            // Check if this is a theme configuration error
            var searchText = debugMessage || message;
            var isThemeConfigError = searchText.indexOf('configuration file not found') !== -1 ||
                                     searchText.indexOf('Theme editor configuration file not found') !== -1;
            
            // Check if this is an invalid token error
            var isInvalidToken = searchText.indexOf('Invalid access token') !== -1 ||
                                searchText.indexOf('Access token required') !== -1;
            
            if (isThemeConfigError) {
                var themeName = this.themeName || 'this theme';
                var toastMessage = 'Theme Editor is not available for ' + themeName + '. Please switch to a different store.';
                
                Toastify.show('warning', toastMessage, {
                    duration: 8000,  // 8 seconds (longer than default)
                    close: true,     // Show close button
                    gravity: 'top',
                    position: 'center'
                });
                
                console.log('📢 Toast shown for unsupported theme');
            }
            
            if (isInvalidToken) {
                var adminUrl = this.adminUrl || '/admin';
                var message = 'Your session has expired. <a href="' + adminUrl + '" target="_blank" style="color: #fff; text-decoration: underline;">Login to Admin</a> or refresh the page.';
                
                Toastify.show('error', message, {
                    duration: 10000, // 10 seconds
                    close: true,     // Show close button
                    gravity: 'top',
                    position: 'center'
                });
                
                console.log('📢 Toast shown for invalid token with admin link');
            }
        },

        _parseErrorData: function(errorData) {
            var message = 'An unexpected error occurred';
            var debugMessage = null;

            if (typeof errorData === 'string') {
                message = errorData;
                console.log('📝 String error:', message);
                return { message: message, debugMessage: null };
            }

            if (errorData && errorData.message) {
                message = errorData.message;

                if (message.indexOf('GraphQL Error: ') === 0) {
                    message = message.substring(15);
                    console.log('📝 Removed GraphQL prefix:', message);
                }

                if (errorData.extensions && errorData.extensions.debugMessage) {
                    debugMessage = errorData.extensions.debugMessage;
                    console.log('✅ Found debugMessage in extensions:', debugMessage);
                }

                if (!debugMessage && errorData.graphqlErrors && errorData.graphqlErrors.length > 0) {
                    var firstError = errorData.graphqlErrors[0];
                    if (firstError.extensions && firstError.extensions.debugMessage) {
                        debugMessage = firstError.extensions.debugMessage;
                        console.log('✅ Found debugMessage in graphqlErrors:', debugMessage);
                    }
                }

                if (!debugMessage && errorData.stack && errorData.stack.indexOf('Error: ') !== -1) {
                    debugMessage = errorData.stack;
                    console.log('✅ Using stack trace:', debugMessage);
                }
            }

            console.log('📊 Final parsed:', { message: message, debugMessage: debugMessage });
            return { message: message, debugMessage: debugMessage };
        },

        _getFriendlyMessage: function(message, debugMessage) {
            var themeName = this.themeName || 'current theme';
            
            var friendlyMessages = {
                'Theme editor configuration file not found': 
                    'Theme Editor is not available for "' + themeName + '" theme.\n\n' +
                    'This theme doesn\'t have the required configuration file.\n\n' +
                    'Please select a different store from the dropdown above that uses a theme with Theme Editor support.',
                'configuration file not found': 
                    'Theme Editor is not available for "' + themeName + '" theme.\n\n' +
                    'This theme doesn\'t have the required configuration file.\n\n' +
                    'Please select a different store from the dropdown above that uses a theme with Theme Editor support.',
                'Access token required': 'Your session has expired. Please refresh the page.',
                'Invalid access token': 'Your session has expired. Please refresh the page.',
                'Internal server error': 'The server encountered an error. Please try again later.'
            };

            // Check debugMessage first (more specific), then message (generic)
            var searchText = debugMessage || message;
            
            for (var key in friendlyMessages) {
                if (searchText.indexOf(key) !== -1) {
                    console.log('✅ Found friendly message for:', key, 'in', debugMessage ? 'debugMessage' : 'message');
                    return {
                        message: friendlyMessages[key],
                        isFriendly: true
                    };
                }
            }

            console.log('⚠️ No friendly message found, using original message');
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
            console.log('📝 Set error message:', message);

            if (debugMessage) {
                $details.show();
                $stack.text(debugMessage);
                console.log('📝 Set debug message:', debugMessage);

                if (!hasFriendlyMessage) {
                    $stack.show();
                    $toggle.text('Hide technical details');
                    console.log('✅ Auto-expanded (generic error)');
                } else {
                    $stack.hide();
                    $toggle.text('Show technical details');
                    console.log('✅ Collapsed (friendly message)');
                }
            } else {
                $details.show();
                $stack.text('No additional technical information available. Check browser console for more details.');
                $stack.hide();
                $toggle.text('Show technical details');
                console.log('⚠️ No debugMessage, showing fallback');
            }
        },

        /**
         * Initialize palette section
         */
        _initPaletteSection: function() {
            var self = this;
            
            if (!this.$paletteContainer || this.$paletteContainer.length === 0) {
                console.log('⚠️ Palette container not found');
                return;
            }
            
            // Check if config has palettes
            if (!this.config || !this.config.palettes || this.config.palettes.length === 0) {
                console.log('ℹ️ No palettes in config, hiding palette section');
                this.$paletteContainer.hide();
                return;
            }
            
            console.log('🎨 Initializing Palette Section with', this.config.palettes.length, 'palettes');
            
            this.$paletteContainer.paletteSection({
                palettes: this.config.palettes,
                storeId: this.storeId,
                themeId: this.themeId
            });
            
            console.log('✅ Palette section initialized');
        },

        /**
         * Initialize preset selector
         */
        _initPresetSelector: function() {
            var self = this;
            
            if (!this.$presetContainer || this.$presetContainer.length === 0) {
                console.log('⚠️ Preset container not found');
                return;
            }
            
            this.$presetContainer.presetSelector({
                storeId: this.storeId,
                themeId: this.themeId,
                onApply: $.proxy(this._onPresetApplied, this)
            });
            
            console.log('✅ Preset selector initialized');
        },

        /**
         * Handle preset applied event
         */
        _onPresetApplied: function(result) {
            console.log('✅ Preset applied:', result.appliedCount, 'values');
            
            // Update changes counter
            this._updateChangesCount();
            
            // Refresh all badges
            this._refreshAllBadges();
            
            // Refresh CSS preview
            CssPreviewManager.refresh();
            
            console.log('✅ Panel updated after preset apply');
        },

        _destroy: function() {
            FieldHandlers.destroy(this.element);
            CssPreviewManager.destroy();
            PanelState.clear();
            this._super();
        }
    });

    return $.swissup.themeEditorPanel;
});
