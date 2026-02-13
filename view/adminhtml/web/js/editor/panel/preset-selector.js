define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/preset-selector.html',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-presets',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/apply-preset',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/lib/toastify'
], function (
    $,
    widget,
    mageTemplate,
    presetTemplate,
    getPresets,
    applyPreset,
    PanelState,
    Toastify
) {
    'use strict';

    $.widget('swissup.presetSelector', {
        options: {
            storeId: null,
            themeId: null,
            presets: [],
            selectedPresetId: null,
            onApply: null
        },

        _create: function () {
            console.log('✅ Initializing Preset Selector');

            this.template = mageTemplate(presetTemplate);
            this._render();
            this._bind();
            this._loadPresets();
        },

        /**
         * Render initial HTML
         */
        _render: function () {
            var html = this.template({
                data: {
                    presets: this.options.presets
                }
            });

            this.element.html(html);

            // Cache selectors
            this.$header = this.element.find('.bte-preset-header');
            this.$content = this.element.find('.bte-preset-content');
            this.$select = this.element.find('.bte-preset-select');
            this.$preview = this.element.find('.bte-preset-preview');
            this.$description = this.element.find('.bte-preset-description');
            this.$changesCount = this.element.find('.bte-preset-changes-count');
            this.$applyBtn = this.element.find('.bte-preset-apply');
            this.$cancelBtn = this.element.find('.bte-preset-cancel');
            this.$dialog = this.element.find('.bte-preset-dialog');
            this.$dialogOverlay = this.element.find('.bte-dialog-overlay');
            this.$dialogConfirm = this.element.find('.bte-dialog-confirm');
            this.$dialogCancel = this.element.find('.bte-dialog-cancel');
            this.$unsavedCount = this.element.find('.bte-unsaved-count');
            
            // Collapsed by default
            this.$header.removeClass('active');
            this.$content.removeClass('active').hide();

            console.log('📋 Preset Selector rendered');
        },

        /**
         * Bind event handlers
         */
        _bind: function () {
            var self = this;
            
            // Toggle accordion
            this.$header.on('click', function() {
                var isActive = self.$header.hasClass('active');
                
                if (isActive) {
                    self.$header.removeClass('active');
                    self.$content.removeClass('active').slideUp(200);
                } else {
                    self.$header.addClass('active');
                    self.$content.addClass('active').slideDown(200);
                }
                
                console.log('🔄 Preset accordion toggled:', !isActive);
            });
            
            this.$select.on('change', $.proxy(this._onPresetSelected, this));
            this.$applyBtn.on('click', $.proxy(this._onApplyClick, this));
            this.$cancelBtn.on('click', $.proxy(this._onCancelClick, this));
            this.$dialogConfirm.on('click', $.proxy(this._onDialogConfirm, this));
            this.$dialogCancel.on('click', $.proxy(this._onDialogCancel, this));
            this.$dialogOverlay.on('click', $.proxy(this._onDialogCancel, this));
        },

        /**
         * Load presets from GraphQL
         */
        _loadPresets: function () {
            var self = this;

            console.log('⏳ Loading presets...');

            getPresets(this.options.storeId, this.options.themeId)
                .then(function (data) {
                    self.options.presets = data.breezeThemeEditorPresets || [];
                    console.log('✅ Loaded', self.options.presets.length, 'presets');

                    if (self.options.presets.length === 0) {
                        console.log('ℹ️ No presets available, hiding selector');
                        self.element.hide();
                        return;
                    }

                    self._renderOptions();
                })
                .catch(function (error) {
                    console.error('❌ Failed to load presets:', error);
                    self.element.hide();
                });
        },

        /**
         * Render dropdown options
         */
        _renderOptions: function () {
            var options = '<option value="">Select a preset...</option>';

            this.options.presets.forEach(function (preset) {
                options += '<option value="' + preset.id + '">' + preset.name + '</option>';
            });

            this.$select.html(options);
            console.log('📋 Rendered', this.options.presets.length, 'preset options');
        },

        /**
         * Handle preset selection
         */
        _onPresetSelected: function (e) {
            var presetId = $(e.currentTarget).val();

            if (!presetId) {
                this._hidePreview();
                return;
            }

            this.options.selectedPresetId = presetId;
            var preset = this._getPreset(presetId);

            if (!preset) {
                console.error('❌ Preset not found:', presetId);
                return;
            }

            console.log('🔍 Selected preset:', preset.name);
            this._showPreview(preset);
        },

        /**
         * Get preset by ID
         */
        _getPreset: function (presetId) {
            return this.options.presets.find(function (p) {
                return p.id === presetId;
            });
        },

        /**
         * Show expanded preview
         */
        _showPreview: function (preset) {
            // Set description
            var description = preset.description || 'No description available';
            this.$description.text(description);

            // Count changes
            var changesCount = this._countPresetSettings(preset);
            this.$changesCount.text('This will change ' + changesCount + ' settings');

            // Add checkmark to selected option
            this.$select.find('option:selected').text('✓ ' + preset.name);

            // Show preview
            this.$preview.slideDown(200);
        },

        /**
         * Hide preview
         */
        _hidePreview: function () {
            this.$preview.slideUp(200);
            this.options.selectedPresetId = null;

            // Remove checkmarks
            this.$select.find('option').each(function () {
                var $opt = $(this);
                var text = $opt.text().replace('✓ ', '');
                $opt.text(text);
            });
        },

        /**
         * Count preset settings
         */
        _countPresetSettings: function (preset) {
            // Get from GraphQL preset data or fallback
            if (preset.settings && Array.isArray(preset.settings)) {
                return preset.settings.length;
            }
            // Estimate based on description or default
            return 10; // Default estimate
        },

        /**
         * Handle Apply button click
         */
        _onApplyClick: function () {
            if (!this.options.selectedPresetId) {
                console.warn('⚠️ No preset selected');
                return;
            }

            // Check for unsaved changes
            if (this._hasUnsavedChanges()) {
                this._showOverwriteDialog();
            } else {
                // Apply with overwrite by default
                this._applyPreset(true);
            }
        },

        /**
         * Handle Cancel button click
         */
        _onCancelClick: function () {
            this.$select.val('').trigger('change');
            this._hidePreview();
        },

        /**
         * Check if there are unsaved changes
         */
        _hasUnsavedChanges: function () {
            return PanelState.getChangesCount() > 0;
        },

        /**
         * Show overwrite dialog
         */
        _showOverwriteDialog: function () {
            var changesCount = PanelState.getChangesCount();
            this.$unsavedCount.text(changesCount);

            // Reset radio selection
            this.$dialog.find('input[name="overwrite"][value="merge"]').prop('checked', true);

            // Show dialog
            this.$dialog.fadeIn(200);
        },

        /**
         * Hide overwrite dialog
         */
        _hideOverwriteDialog: function () {
            this.$dialog.fadeOut(200);
        },

        /**
         * Handle dialog confirm
         */
        _onDialogConfirm: function () {
            var overwriteMode = this.$dialog.find('input[name="overwrite"]:checked').val();
            var overwrite = (overwriteMode === 'overwrite');

            console.log('📋 Dialog confirmed, overwrite:', overwrite);

            this._hideOverwriteDialog();
            this._applyPreset(overwrite);
        },

        /**
         * Handle dialog cancel
         */
        _onDialogCancel: function () {
            console.log('❌ Dialog cancelled');
            this._hideOverwriteDialog();
        },

        /**
         * Apply preset
         */
        _applyPreset: function (overwrite) {
            var self = this;
            var presetId = this.options.selectedPresetId;
            var preset = this._getPreset(presetId);

            if (!preset) {
                console.error('❌ Preset not found');
                return;
            }

            console.log('💾 Applying preset:', preset.name, 'overwrite:', overwrite);

            // Disable buttons
            this.$applyBtn.prop('disabled', true).text('Applying...');

            applyPreset(
                this.options.storeId,
                this.options.themeId,
                presetId,
                'DRAFT',
                overwrite
            )
                .then(function (data) {
                    var result = data.applyBreezeThemeEditorPreset;

                    if (!result.success) {
                        console.error('❌ Apply failed:', result.message);
                        Toastify.show('error', 'Failed to apply preset: ' + result.message);
                        return;
                    }

                    console.log('✅ Preset applied:', result.appliedCount, 'values');

                    // Update panel fields
                    self._updatePanelFields(result.values);

                    // Hide preview
                    self._hidePreview();
                    self.$select.val('');

                    // Show success
                    Toastify.show('success', 'Preset applied: ' + result.appliedCount + ' settings changed');

                    // Trigger callback
                    if (self.options.onApply) {
                        self.options.onApply(result);
                    }
                })
                .catch(function (error) {
                    console.error('❌ Apply preset failed:', error);
                    Toastify.show('error', 'Failed to apply preset: ' + error.message);
                })
                .always(function () {
                    // Re-enable button
                    self.$applyBtn.prop('disabled', false).text('Apply Preset');
                });
        },

        /**
         * Update panel fields with preset values
         */
        _updatePanelFields: function (values) {
            console.log('🔄 Updating', values.length, 'fields');

            values.forEach(function (item) {
                var selector = '[data-section="' + item.sectionCode + '"][data-field="' + item.fieldCode + '"]';
                var $field = $(selector);

                if ($field.length) {
                    var currentValue = $field.val();

                    // Set new value
                    $field.val(item.value);

                    // Trigger change event if value changed
                    if (currentValue !== item.value) {
                        $field.trigger('change');
                        console.log('✅ Updated:', item.sectionCode + '.' + item.fieldCode);
                    }
                } else {
                    console.warn('⚠️ Field not found:', selector);
                }
            });

            console.log('✅ Panel fields updated');
        },

        /**
         * Destroy widget
         */
        _destroy: function () {
            this.$select.off('change');
            this.$applyBtn.off('click');
            this.$cancelBtn.off('click');
            this.$dialogConfirm.off('click');
            this.$dialogCancel.off('click');
            this.$dialogOverlay.off('click');
            this._super();
        }
    });

    return $.swissup.presetSelector;
});
