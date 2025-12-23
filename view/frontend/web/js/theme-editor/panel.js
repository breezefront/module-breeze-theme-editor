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
        options: {
            title: 'Theme Editor',
            closeTitle: 'Close Panel',
            presetsLabel: 'Presets: ',
            storeId: null,
            themeId: null,
            status: 'DRAFT'
        },

        _create: function () {
            console.log('✅ Initializing Theme Editor Panel');

            // Get config from global or options
            this.storeId = this.options.storeId || (window.BREEZE_EDITOR_CONFIG && window.BREEZE_EDITOR_CONFIG.storeId);
            this.themeId = this.options.themeId || (window.BREEZE_EDITOR_CONFIG && window.BREEZE_EDITOR_CONFIG.themeId);

            this.template = mageTemplate(panelTemplate);
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

            console.log('📋 Theme Editor Panel rendered');
        },

        _bind: function () {
            this.$closeButton.on('click', $.proxy(this._close, this));
            this.$resetButton.on('click', $.proxy(this._reset, this));
            this.$saveButton.on('click', $.proxy(this._save, this));

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
                    self._showError('Failed to load configuration:  ' + error.message);
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

            console.log('🔄 Accordion toggled:', section, '→', ! isActive);
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
            var count = PanelState.getChangesCount();
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
                    console.log('✅ Saved:', data);

                    if (data.saveBreezeThemeEditorValues.success) {
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
                    alert('Failed to save settings: ' + error.message);
                })
                .always(function() {
                    self.$saveButton.prop('disabled', false).text('Save');
                });
        },

        /**
         * Show loader
         */
        _showLoader: function(message) {
            // TODO: Implement loader UI
            console.log('⏳', message);
        },

        /**
         * Hide loader
         */
        _hideLoader: function() {
            // TODO: Hide loader UI
        },

        /**
         * Show error message
         */
        _showError: function(message) {
            // TODO: Implement error UI
            alert(message);
        },

        _destroy: function() {
            this.element.off('click input change');
            CssPreviewManager.destroy();
            PanelState.clear();
            this._super();
        }
    });

    return $.swissup.themeEditorPanel;
});
