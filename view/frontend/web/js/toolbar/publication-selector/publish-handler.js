/**
 * Publication Selector - Publish Handler Module
 * Handles publish logic, confirmations, and toasts
 */
define([
    'jquery',
    'mage/translate',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/publish',
    'Swissup_BreezeThemeEditor/js/theme-editor/panel-state',
    'Swissup_BreezeThemeEditor/js/lib/toastify'
], function ($, $t, publishMutation, PanelState, Toastify) {
    'use strict';

    function PublishHandler(options, renderer, metadataLoader) {
        this.options = options;
        this.renderer = renderer;
        this.metadataLoader = metadataLoader;
    }

    PublishHandler.prototype = {
        publish: function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (this.options.draftChangesCount === 0) {
                console.warn('⚠️ No changes to publish');
                Toastify.show('notice', $t('No changes to publish'));
                return;
            }

            if (!this._confirmUnsavedChanges()) {
                return;
            }

            var title = prompt($t('Enter publication title: '));
            if (!title || !title.trim()) {
                console.log('❌ Publish cancelled (no title)');
                return;
            }

            this._executePublish(title.trim());
        },

        _confirmUnsavedChanges: function() {
            var hasUnsaved = PanelState.hasChanges();
            if (!hasUnsaved) {
                return true;
            }

            var unsavedCount = PanelState.getChangesCount();
            var message = $t('You have %1 unsaved change(s).\n\nPublish will ignore them. Continue?')
                .replace('%1', unsavedCount);

            var confirmed = confirm(message);
            if (confirmed) {
                console.log('📤 User chose: Publish only saved changes (ignoring %1 unsaved)', unsavedCount);
            } else {
                console.log('❌ Publish cancelled by user');
            }

            return confirmed;
        },

        _executePublish: function(title) {
            var self = this;
            var $button = this.renderer.element.find('.toolbar-select');

            console.log('📤 Publishing draft:', {
                title: title,
                storeId: this.options.storeId,
                themeId: this.options.themeId,
                savedChangesCount: this.options.draftChangesCount
            });

            // Show loading state
            $button.find('.select-label').text($t('Publishing...'));
            $button.prop('disabled', true);

            publishMutation(this.options.storeId, this.options.themeId, title)
                .then(function(data) {
                    console.log('✅ Published:', data);

                    if (data.publishBreezeThemeEditor.success) {
                        self._onSuccess(title, data);
                    } else {
                        self._onError(data.publishBreezeThemeEditor.message);
                    }
                })
                .catch(function(error) {
                    console.error('❌ Publish failed:', error);
                    self._onError(error.message);
                })
                .finally(function() {
                    $button.prop('disabled', false);
                    self.renderer.updateButton();
                });
        },

        _onSuccess: function(title, data) {
            Toastify.show('success', $t('Published successfully: %1').replace('%1', title));

            // Reset draft changes count
            this.options.draftChangesCount = 0;

            // Reload metadata and publications
            this.metadataLoader.load();
            this.metadataLoader.loadPublications();

            // Trigger event for Panel to update UI
            $(document).trigger('themeEditorPublished', {
                publication: data.publishBreezeThemeEditor.publication
            });
        },

        _onError: function(message) {
            Toastify.show('error', $t('Publish failed: %1').replace('%1', message));
        }
    };

    return PublishHandler;
});
