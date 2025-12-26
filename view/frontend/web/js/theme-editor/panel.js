define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/panel.html',
    'Swissup_BreezeThemeEditor/js/theme-editor/panel-state',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderer',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
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
    getConfig,
    saveValues,
    publish
) {
    'use strict';

    $.widget('swissup.themeEditorPanel', {
        options:   {
            title: 'Theme Editor',
            closeTitle: 'Close Panel',
            presetsLabel: 'Presets:  ',
            status: 'DRAFT'
        },

        _create: function () {
            console.log('✅ Initializing Theme Editor Panel');

            // Get config from body data (set by toolbar.js)
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
                // Fallback to options
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

            this.$closeButton = this.element.find('.bte-panel-close');
            this.$resetButton = this.element.find('.bte-reset-button');
            this.$saveButton = this.element.find('.bte-save-button');
            this.$sectionsContainer = this.element.find('.bte-sections-container');
            this.$loader = this.element.find('.bte-panel-loader');
            this.$error = this.element.find('.bte-panel-error');

            console.log('📋 Theme Editor Panel rendered');
        },

        _bind: function () {
            this.$closeButton.on('click', $.proxy(this._close, this));
            this.$resetButton. on('click', $.proxy(this._reset, this));
            this.$saveButton.on('click', $.proxy(this._save, this));

            // Error retry button
            this.element.on('click', '.bte-error-retry', $.proxy(this._loadConfig, this));

            // Error details toggle
            this.element.on('click', '.bte-error-toggle', $. proxy(this._toggleErrorDetails, this));

            // Delegate events for dynamic content
            this.element.on('click', '.bte-accordion-header', $.proxy(this._toggleSection, this));
            this.element.on('input change', '.bte-color-picker', $.proxy(this._onFieldChange, this));
            this.element.on('input', '.bte-range-slider', $.proxy(this._onFieldChange, this));
            this.element.on('change', '.bte-font-picker', $.proxy(this._onFieldChange, this));
            this.element.on('change', '.bte-select', $.proxy(this._onFieldChange, this));
            this.element.on('input', '.bte-text-input', $.proxy(this._onFieldChange, this));
            this.element.on('change', '.bte-toggle-input', $.proxy(this._onFieldChange, this));
        },

        /**
         * Initialize CSS Preview Manager
         */
        _initPreview:  function() {
            setTimeout(function() {
                CssPreviewManager. init();
            }, 500);
        },

        /**
         * Load theme config from GraphQL
         */
        _loadConfig:  function() {
            var self = this;

            this._showLoader('Loading configuration...');

            getConfig(this.storeId, this.themeId, this. options.status)
                .done(function(data) {
                    console.log('✅ Config loaded:', data);

                    var config = data.breezeThemeEditorConfig;

                    // Initialize state
                    PanelState.init(config);

                    // Render fields
                    self._renderSections(config.sections);

                    self._hideLoader();
                })
                .fail(function(error) {
                    console.error('❌ Failed to load config:', error);

                    // Parse GraphQL errors
                    var errorData = error;

                    if (error.message && error.message. indexOf('GraphQL Error: ') !== -1) {
                        // Extract GraphQL error message
                        try {
                            var match = error.message.match(/GraphQL Error: (.*)/);
                            if (match) {
                                errorData = { message:  match[1] };
                            }
                        } catch (e) {
                            // Fallback to original error
                        }
                    }

                    self._showError(errorData);
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

            console.log('📋 Rendered', sections. length, 'sections');
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
         * Handle field change (unified)
         */
        _onFieldChange: function (e) {
            var $input = $(e.currentTarget);
            var sectionCode = $input.data('section');
            var fieldCode = $input.data('field');
            var cssVar = $input.data('css-var');
            var value = $input.val();

            if (! sectionCode || !fieldCode) {
                console.warn('Missing data attributes:', $input);
                return;
            }

            // Update state
            PanelState.setValue(sectionCode, fieldCode, value);

            // Live preview
            if (cssVar) {
                CssPreviewManager.setVariable(cssVar, value);
            }

            // Update UI badges
            this._updateChangesCount();

            console.log('🔄 Field changed:', sectionCode + '.' + fieldCode, '=', value);
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
        _reset:  function () {
            if (! PanelState.hasChanges()) {
                alert('No changes to reset');
                return;
            }

            if (confirm('Reset all changes to default values?')) {
                PanelState.reset();
                CssPreviewManager.reset();
                this._loadConfig(); // Reload to refresh UI
                console.log('✅ Reset complete');
            }
        },

        /**
         * Save changes
         */
        _save:  function () {
            if (!PanelState.hasChanges()) {
                alert('No changes to save');
                return;
            }

            var values = PanelState.getChangesForSave();
            var self = this;

            this.$saveButton.prop('disabled', true).text('Saving...');

            saveValues(this.storeId, this.themeId, this.options.status, values)
                .done(function(data) {
                    console. log('✅ Saved:', data);

                    if (data.saveBreezeThemeEditorValues. success) {
                        alert('Settings saved successfully!');
                        PanelState.markAsSaved();
                        CssPreviewManager.markAsSaved();
                        self._updateChangesCount();
                    } else {
                        alert('Failed to save:  ' + data.saveBreezeThemeEditorValues.message);
                    }
                })
                .fail(function(error) {
                    console.error('❌ Save failed:', error);
                    alert('Failed to save settings: ' + error. message);
                })
                .always(function() {
                    self.$saveButton.prop('disabled', false).text('Save');
                });
        },

        /**
         * Show loader
         */
        _showLoader: function(message) {
            this.$loader.show();
            this.$loader.find('.bte-loader-text').text(message || 'Loading...');
            this.$error.hide();
            this.$sectionsContainer.hide();

            // Disable buttons
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

            // Enable buttons (will be updated by _updateChangesCount)
            this.$saveButton.prop('disabled', false);
            this.$resetButton.prop('disabled', true);
        },

        /**
         * Show error message
         */
        _showError: function(errorData) {
            console.log('🔥 _showError called with:', errorData);

            // Hide loader and sections
            this.$loader.hide();
            this.$sectionsContainer. hide();

            // Parse error data
            var errorInfo = this._parseErrorData(errorData);
            console.log('🔥 Parsed error info:', errorInfo);

            // Apply friendly message if available
            var displayMessage = this._getFriendlyMessage(errorInfo. message, errorInfo.debugMessage);
            console.log('🔥 Display message:', displayMessage. message, 'Friendly:', displayMessage.isFriendly);

            // Update UI
            this._updateErrorUI(displayMessage. message, errorInfo.debugMessage, displayMessage. isFriendly);

            // Disable buttons
            this.$saveButton.prop('disabled', true);
            this.$resetButton.prop('disabled', true);

            // Show error state
            this.$error. show();

            console.error('❌ Panel error:', errorData);
        },

        /**
         * Parse error data and extract message + debugMessage
         *
         * @param {Object|String} errorData
         * @returns {Object} {message:  string, debugMessage: string|null}
         */
        _parseErrorData: function(errorData) {
            var message = 'An unexpected error occurred';
            var debugMessage = null;

            // Handle string errors
            if (typeof errorData === 'string') {
                message = errorData;
                console.log('📝 String error:', message);
                return { message: message, debugMessage: null };
            }

            // Handle object errors
            if (errorData && errorData.message) {
                message = errorData.message;

                // Remove "GraphQL Error:  " prefix
                if (message.indexOf('GraphQL Error: ') === 0) {
                    message = message. substring(15);
                    console.log('📝 Removed GraphQL prefix:', message);
                }

                // Priority 1: extensions.debugMessage (direct)
                if (errorData. extensions && errorData.extensions.debugMessage) {
                    debugMessage = errorData.extensions.debugMessage;
                    console.log('✅ Found debugMessage in extensions:', debugMessage);
                }

                // Priority 2: graphqlErrors[0].extensions.debugMessage
                if (!debugMessage && errorData.graphqlErrors && errorData. graphqlErrors.length > 0) {
                    var firstError = errorData.graphqlErrors[0];
                    if (firstError. extensions && firstError.extensions.debugMessage) {
                        debugMessage = firstError.extensions.debugMessage;
                        console.log('✅ Found debugMessage in graphqlErrors:', debugMessage);
                    }
                }

                // Priority 3: Use stack trace (only if it's a real stack)
                if (!debugMessage && errorData.stack && errorData. stack.indexOf('Error:') !== -1) {
                    debugMessage = errorData.stack;
                    console.log('✅ Using stack trace:', debugMessage);
                }
            }

            console.log('📊 Final parsed:', { message: message, debugMessage:  debugMessage });
            return { message: message, debugMessage: debugMessage };
        },

        /**
         * Get friendly message if available
         *
         * @param {String} message
         * @param {String|null} debugMessage
         * @returns {Object} {message: string, isFriendly: boolean}
         */
        _getFriendlyMessage: function(message, debugMessage) {
            var friendlyMessages = {
                'Theme editor configuration file not found':  'Theme configuration is not set up yet. Please contact your administrator.',
                'configuration file not found': 'Theme configuration is not set up yet. Please contact your administrator.',
                'Access token required': 'Your session has expired. Please refresh the page.',
                'Invalid access token':  'Your session has expired. Please refresh the page.',
                'Internal server error': 'The server encountered an error. Please try again later.'
            };

            // Check if we have a friendly message
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
                message:  message,
                isFriendly: false
            };
        },

        /**
         * Update error UI elements
         *
         * @param {String} message - Main error message to display
         * @param {String|null} debugMessage - Technical details
         * @param {Boolean} hasFriendlyMessage - Whether message is user-friendly
         */
        _updateErrorUI: function(message, debugMessage, hasFriendlyMessage) {
            var $details = this.$error.find('.bte-error-details');
            var $stack = this.$error.find('.bte-error-stack');
            var $toggle = this.$error.find('.bte-error-toggle');

            // Set main error message
            this.$error.find('.bte-error-message').text(message);
            console.log('📝 Set error message:', message);

            // Handle technical details
            if (debugMessage) {
                $details.show();
                $stack.text(debugMessage);
                console.log('📝 Set debug message:', debugMessage);

                // Auto-expand if no friendly message (generic error)
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
                // No debugMessage available
                $details.show();
                $stack.text('No additional technical information available. Check browser console for more details.');
                $stack.hide();
                $toggle.text('Show technical details');
                console.log('⚠️ No debugMessage, showing fallback');
            }
        },

        _destroy: function() {
            this. element.off('click input change');
            CssPreviewManager.destroy();
            PanelState.clear();
            this._super();
        }
    });

    return $.swissup.themeEditorPanel;
});
