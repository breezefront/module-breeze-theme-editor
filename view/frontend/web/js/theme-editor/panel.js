define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/panel.html',
    'Swissup_BreezeThemeEditor/js/theme-editor/panel-state',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderer',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config-from-publication',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-values',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/publish'
], function (
    $,
    widget,
    mageTemplate,
    panelTemplate,
    PanelState,
    FieldRenderer,
    CssPreviewManager,
    FieldHandlers,
    Toastify,
    getConfig,
    getConfigFromPublication,
    saveValues,
    publish
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
                console.log('📊 Panel config:', {
                    storeId: this.storeId,
                    themeId: this.themeId,
                    themeName: config.themeName
                });
            } else {
                console.error('❌ Breeze editor config not found in body data!');
                this.storeId = this.options.storeId || 1;
                this.themeId = this.options.themeId || 0;
            }

            this. template = mageTemplate(panelTemplate);
            this._render();
            this._bind();
            this._initPreview();
            this._loadConfig();
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

            this.$closeButton = this. element.find('.bte-panel-close');
            this.$resetButton = this.element.find('.bte-reset-button');
            this.$saveButton = this.element.find('.bte-save-button');
            this.$sectionsContainer = this.element.find('.bte-sections-container');
            this.$loader = this. element.find('.bte-panel-loader');
            this.$error = this.element.find('.bte-panel-error');

            console.log('📋 Theme Editor Panel rendered');
        },

        _bind: function () {
            var self = this;

            // Panel controls
            this.$closeButton.on('click', $. proxy(this._close, this));
            this.$resetButton.on('click', $.proxy(this._reset, this));
            this.$saveButton.on('click', $. proxy(this._save, this));

            // Error handlers
            this.element.on('click', '.bte-error-retry', $. proxy(this._loadConfig, this));
            this.element.on('click', '.bte-error-toggle', $.proxy(this._toggleErrorDetails, this));
            this.element.on('click', '.bte-accordion-header', $.proxy(this._toggleSection, this));

            // ✅ Field changes with live badge updates
            FieldHandlers.init(this.element, function(fieldData) {
                // Update changes counter
                self._updateChangesCount();

                // ✅ Update badges in real-time
                FieldHandlers.updateBadges(self.element, fieldData. sectionCode, fieldData.fieldCode);
            });

            // ✅ Publication selector events
            $(document).on('publicationStatusChanged', function (e, data) {
                console.log('🔄 Publication status changed to:', data.status);
                self.options.status = data.status;
                self._loadConfig();
            });

            $(document).on('loadThemeEditorFromPublication', function (e, data) {
                console.log('📥 Loading config from publication:', data.publicationId);
                self._loadConfigFromPublication(data.publicationId);
            });

            $(document).on('openPublicationHistoryModal', function () {
                console.log('📜 Opening publication history modal');
                self._showToast('notice', 'Publication history coming soon!');
            });
        },

        /**
         * Initialize CSS Preview Manager
         */
        _initPreview: function() {
            setTimeout(function() {
                CssPreviewManager.init();
            }, 500);
        },

        /**
         * Load theme config from GraphQL
         */
        _loadConfig: function() {
            var self = this;

            this._showLoader('Loading configuration...');

            getConfig(this.storeId, this.themeId, this.options.status)
                .then(function(data) {
                    console.log('✅ Config loaded:', data);
                    var config = data.breezeThemeEditorConfig;
                    PanelState.init(config);
                    self._renderSections(config.sections);
                    self._hideLoader();
                })
                .catch(function(error) {
                    console.error('❌ Failed to load config:', error);
                    var errorData = error;
                    if (error.message && error.message.indexOf('GraphQL Error: ') !== -1) {
                        try {
                            var match = error.message.match(/GraphQL Error: (.*)/);
                            if (match) {
                                errorData = { message: match[1] };
                            }
                        } catch (e) {
                            // Fallback to original error
                        }
                    }
                    self._showError(errorData);
                });
        },

        /**
         * Load config from specific publication
         */
        _loadConfigFromPublication: function(publicationId) {
            var self = this;
            this._showLoader('Loading publication #' + publicationId + '...');

            getConfigFromPublication(this.storeId, this.themeId, publicationId)
                .then(function(config) {
                    console. log('✅ Config loaded from publication:', config);
                    PanelState.init(config);
                    self._renderSections(config. sections);
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
                html += '<div class="bte-accordion-header" data-section="' + section. code + '">';
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
        },

        /**
         * Toggle accordion section
         */
        _toggleSection: function (e) {
            var $header = $(e.currentTarget);
            var section = $header.data('section');
            var $content = this. element.find('.bte-accordion-content[data-section="' + section + '"]');
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
            var count = PanelState. getChangesCount();
            this.$saveButton.text('Save (' + count + ')');
            this.$resetButton.prop('disabled', count === 0);
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
            if (!PanelState.hasChanges()) {
                this._showToast('notice', 'No changes to save');
                return;
            }

            var values = PanelState.getChangesForSave();
            var self = this;

            this.$saveButton.prop('disabled', true).text('Saving...');

            saveValues(this.storeId, this.themeId, this.options.status, values)
                .then(function(data) {
                    console. log('✅ Saved:', data);

                    if (data.saveBreezeThemeEditorValues. success) {
                        self._showToast('success', 'Settings saved successfully!');
                        PanelState.markAsSaved();
                        CssPreviewManager.markAsSaved();
                        self._updateChangesCount();

                        // ✅ Update all field badges after save
                        self._refreshAllBadges();
                    } else {
                        self._showToast('error', 'Failed to save: ' + data.saveBreezeThemeEditorValues.message);
                    }
                })
                .catch(function(error) {
                    console.error('❌ Save failed:', error);
                    self._showToast('error', 'Failed to save settings: ' + error.message);
                })
                .finally(function() {
                    self.$saveButton.prop('disabled', false).text('Save');
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
            console.log('🔥 Display message:', displayMessage. message, 'Friendly:', displayMessage.isFriendly);

            this._updateErrorUI(displayMessage. message, errorInfo.debugMessage, displayMessage.isFriendly);

            this.$saveButton.prop('disabled', true);
            this.$resetButton. prop('disabled', true);

            this.$error.show();

            console.error('❌ Panel error:', errorData);
        },

        _showToast: function(type, message) {
            Toastify. show(type, message);
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
                        debugMessage = firstError. extensions.debugMessage;
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
            var friendlyMessages = {
                'Theme editor configuration file not found': 'Theme configuration is not set up yet. Please contact your administrator.',
                'configuration file not found': 'Theme configuration is not set up yet. Please contact your administrator.',
                'Access token required': 'Your session has expired. Please refresh the page.',
                'Invalid access token': 'Your session has expired. Please refresh the page.',
                'Internal server error': 'The server encountered an error. Please try again later.'
            };

            for (var key in friendlyMessages) {
                if (message.indexOf(key) !== -1 || (debugMessage && debugMessage.indexOf(key) !== -1)) {
                    console.log('✅ Found friendly message for:', key);
                    return {
                        message: friendlyMessages[key],
                        isFriendly: true
                    };
                }
            }

            console.log('⚠️ No friendly message found, using original');
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
                console. log('📝 Set debug message:', debugMessage);

                if (!hasFriendlyMessage) {
                    $stack.show();
                    $toggle.text('Hide technical details');
                    console. log('✅ Auto-expanded (generic error)');
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
                console. log('⚠️ No debugMessage, showing fallback');
            }
        },

        _destroy: function() {
            FieldHandlers.destroy(this.element);
            CssPreviewManager.destroy();
            PanelState.clear();
            this._super();
        }
    });

    return $. swissup.themeEditorPanel;
});
