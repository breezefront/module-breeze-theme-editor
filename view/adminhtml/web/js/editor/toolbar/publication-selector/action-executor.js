/**
 * ActionExecutor for Publication Selector
 *
 * Responsible for executing GraphQL mutation actions (publish, rollback,
 * discard-draft, discard-published, delete-publication) and handling the
 * standard loading/toast/event/error pattern for each.
 *
 * All methods receive the widget context (ctx) as the first argument so this
 * is a stateless plain object — it can be unit-tested without the widget.
 *
 * Extracted from publication-selector.js (п.3.4 refactoring).
 *
 * @module Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/action-executor
 */
define([
    'jquery',
    'mage/translate',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/permissions',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/error-handler',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/loading',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/publish',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/rollback',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/discard-draft',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/discard-published',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/delete-publication',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/publication-state',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/dialog'
], function (
    $,
    $t,
    permissions,
    errorHandler,
    loading,
    PanelState,
    Toastify,
    publishMutation,
    rollbackMutation,
    discardDraftMutation,
    discardPublishedMutation,
    deletePublicationMutation,
    StorageHelper,
    scopeManager,
    Logger,
    Constants,
    PublicationState,
    Dialog
) {
    'use strict';

    var log = Logger.for('toolbar/publication-selector/action-executor');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    return {

        // =====================================================================
        // Publish
        // =====================================================================

        /**
         * Guard + prompt for the "Publish" action.
         * Calls ctx._executePublish(title) if all checks pass.
         *
         * @param {Object} ctx - Widget context (this)
         */
        publishChanges: function (ctx) {
            if (ctx.options.changesCount === 0) {
                Toastify.show('notice', $t('No changes to publish'));
                return;
            }

            if (!permissions.canPublish()) {
                errorHandler.handle({
                    message: permissions.getPermissionMessage('publish')
                }, 'publish-draft');
                return;
            }

            var self = this;
            var hasUnsaved = PanelState.hasChanges();

            if (hasUnsaved) {
                var unsavedCount = PanelState.getChangesCount();
                var message = $t('You have %1 unsaved change(s).\n\nPublish will ignore them. Continue?')
                    .replace('%1', unsavedCount);

                Dialog.confirm(message, function () {
                    self._doPublish(ctx);
                });
            } else {
                self._doPublish(ctx);
            }
        },

        /**
         * Prompt for title and execute publish mutation.
         *
         * @param {Object} ctx - Widget context
         * @private
         */
        _doPublish: function (ctx) {
            var self = this;
            var suggested = this.suggestPublicationTitle(ctx.options.publications);
            Dialog.prompt($t('Enter publication title:'), suggested, function (title) {
                self.executePublish(ctx, title);
            });
        },

        /**
         * Execute publishBreezeThemeEditor GraphQL mutation.
         *
         * @param {Object} ctx   - Widget context
         * @param {string} title - Publication title
         */
        executePublish: function (ctx, title) {
            var self = this;

            loading.show(ctx.element);

            publishMutation(
                scopeManager.getScope(),
                scopeManager.getScopeId(),
                title,
                null,
                false
            ).then(function (response) {
                var result = response && response.publishBreezeThemeEditor;

                if (result && result.success) {
                    PublicationState.set(PUBLICATION_STATUS.PUBLISHED);
                    ctx.options.currentStatus = PublicationState.get();
                    ctx.options.changesCount  = 0;
                    ctx.renderer.render(ctx._getState());
                    ctx._applyPermissions();

                    Toastify.show('success', $t('Published successfully: %1').replace('%1', title));

                    $(document).trigger('bte:published', {
                        publication: result.publication,
                        scope:   scopeManager.getScope(),
                        scopeId: scopeManager.getScopeId(),
                        themeId: scopeManager.getThemeId()
                    });

                    ctx.renderer.closeDropdown();
                    ctx.options.publicationsPage = 1;
                    ctx._loadPublications();
                } else {
                    self._onPublishError(self._extractErrorMessage(result, 'Publish failed'));
                }
                loading.hide(ctx.element);
            }).catch(function (error) {
                self._onPublishError(self._extractErrorMessage(error, 'Unknown error'));
                loading.hide(ctx.element);
            });
        },

        /**
         * @param {string} message
         * @private
         */
        _onPublishError: function (message) {
            Toastify.show('error', $t('Publish failed: %1').replace('%1', message));
            errorHandler.handle({ message: message }, 'publish-draft');
        },

        // =====================================================================
        // Rollback
        // =====================================================================

        /**
         * Guard + prompt for the "Publish this version" (rollback) action.
         *
         * @param {Object} ctx              - Widget context
         * @param {number} publicationId
         * @param {string} publicationTitle
         */
        rollbackTo: function (ctx, publicationId, publicationTitle) {
            if (!permissions.canRollback()) {
                errorHandler.handle({
                    message: permissions.getPermissionMessage('rollback')
                }, 'rollback');
                return;
            }

            var self = this;

            if (ctx.options.changesCount > 0 || PanelState.hasChanges()) {
                var unsavedCount = PanelState.hasChanges() ? PanelState.getChangesCount() : 0;
                var draftCount   = ctx.options.changesCount;

                var message = $t(
                    'Publishing this version will discard your current draft.\n\n' +
                    '%1 saved draft change(s) and %2 unsaved change(s) will be lost.\n\n' +
                    'Continue?'
                ).replace('%1', draftCount).replace('%2', unsavedCount);

                Dialog.confirm(message, function () {
                    self._doRollback(ctx, publicationId, publicationTitle);
                });
            } else {
                self._doRollback(ctx, publicationId, publicationTitle);
            }
        },

        /**
         * Prompt for title and execute rollback mutation.
         *
         * @param {Object} ctx
         * @param {number} publicationId
         * @param {string} publicationTitle
         * @private
         */
        _doRollback: function (ctx, publicationId, publicationTitle) {
            var self = this;
            var defaultTitle = $t('Restoring: %1').replace('%1', publicationTitle);
            Dialog.prompt($t('Enter a title for this restore:'), defaultTitle, function (title) {
                self.executeRollback(ctx, publicationId, title);
            });
        },

        /**
         * Execute rollbackBreezeThemeEditor GraphQL mutation.
         *
         * @param {Object} ctx           - Widget context
         * @param {number} publicationId
         * @param {string} title
         */
        executeRollback: function (ctx, publicationId, title) {
            var self = this;

            loading.show(ctx.element);

            rollbackMutation(publicationId, title, null)
                .then(function (response) {
                    var result = response && response.rollbackBreezeThemeEditor;

                    if (result && result.success) {
                        PublicationState.set(PUBLICATION_STATUS.PUBLISHED);
                        ctx.options.currentStatus = PublicationState.get();
                        ctx.options.changesCount  = 0;
                        ctx.renderer.render(ctx._getState());
                        ctx._applyPermissions();

                        Toastify.show('success', $t('Published: %1').replace('%1', title));

                        $(document).trigger('bte:published', {
                            publication: result.publication,
                            scope:   scopeManager.getScope(),
                            scopeId: scopeManager.getScopeId(),
                            themeId: scopeManager.getThemeId(),
                            isRollback: true
                        });

                        ctx.renderer.closeDropdown();
                        ctx.options.publicationsPage = 1;
                        ctx._loadPublications();
                    } else {
                        var errMsg = self._extractErrorMessage(result, 'Publish failed');
                        Toastify.show('error', $t('Publish failed: %1').replace('%1', errMsg));
                        errorHandler.handle({ message: errMsg }, 'rollback');
                    }
                    loading.hide(ctx.element);
                })
                .catch(function (error) {
                    var errMsg = self._extractErrorMessage(error, 'Unknown error');
                    Toastify.show('error', $t('Publish failed: %1').replace('%1', errMsg));
                    errorHandler.handle({ message: errMsg }, 'rollback');
                    loading.hide(ctx.element);
                });
        },

        // =====================================================================
        // Discard Draft
        // =====================================================================

        /**
         * Guard + confirm + execute discardBreezeThemeEditorDraft mutation.
         *
         * @param {Object} ctx - Widget context
         */
        discardDraft: function (ctx) {
            if (ctx.options.changesCount === 0) {
                return;
            }

            var self = this;
            var message = $t('Discard all %1 draft changes? This cannot be undone.')
                .replace('%1', ctx.options.changesCount);

            Dialog.confirm(message, function () {
                self._doDiscardDraft(ctx);
            });
        },

        /**
         * Execute discardBreezeThemeEditorDraft mutation.
         *
         * @param {Object} ctx - Widget context
         * @private
         */
        _doDiscardDraft: function (ctx) {
            var self = this;
            loading.show(ctx.element);

            discardDraftMutation(
                scopeManager.getScope(),
                scopeManager.getScopeId(),
                null
            ).then(function (response) {
                var result = response && response.discardBreezeThemeEditorDraft;

                if (result && result.success) {
                    ctx.options.changesCount = 0;
                    ctx.renderer.render(ctx._getState());
                    ctx._applyPermissions();

                    Toastify.show('success', $t('Draft changes discarded'));

                    $(document).trigger('bte:draftDiscarded', {
                        scope:   scopeManager.getScope(),
                        scopeId: scopeManager.getScopeId(),
                        themeId: scopeManager.getThemeId(),
                        values:  result.values || []
                    });

                    ctx.renderer.closeDropdown();
                } else {
                    var errMsg = self._extractErrorMessage(result, 'Discard failed');
                    Toastify.show('error', $t('Discard failed: %1').replace('%1', errMsg));
                    errorHandler.handle({ message: errMsg }, 'discard-draft');
                }
                loading.hide(ctx.element);
            }).catch(function (error) {
                var errMsg = self._extractErrorMessage(error, 'Unknown error');
                Toastify.show('error', $t('Discard failed: %1').replace('%1', errMsg));
                errorHandler.handle({ message: errMsg }, 'discard-draft');
                loading.hide(ctx.element);
            });
        },

        // =====================================================================
        // Discard Published
        // =====================================================================

        /**
         * Guard + confirm + execute discardBreezeThemeEditorPublished mutation.
         *
         * @param {Object} ctx - Widget context
         */
        discardPublished: function (ctx) {
            if (ctx.options.publishedModifiedCount === 0) {
                return;
            }

            var self = this;
            var message = $t(
                'This will reset %1 customized fields to theme defaults on the live site.\n\nThis cannot be undone.'
            ).replace('%1', ctx.options.publishedModifiedCount);

            Dialog.confirm(message, function () {
                self.executeDiscardPublished(ctx);
            });
        },

        /**
         * Execute discardBreezeThemeEditorPublished GraphQL mutation.
         *
         * @param {Object} ctx - Widget context
         */
        executeDiscardPublished: function (ctx) {
            loading.show(ctx.element);

            discardPublishedMutation(
                scopeManager.getScope(),
                scopeManager.getScopeId()
            ).then(function (response) {
                var result = response && response.discardBreezeThemeEditorPublished;

                if (result && result.success) {
                    ctx.options.publishedModifiedCount   = 0;
                    PublicationState.set(PUBLICATION_STATUS.PUBLISHED);
                    StorageHelper.clearCurrentPublication();
                    ctx.options.currentStatus            = PublicationState.get();
                    ctx.options.currentPublicationId     = null;
                    ctx.options.currentPublicationTitle  = null;

                    ctx.renderer.render(ctx._getState());
                    ctx._applyPermissions();

                    Toastify.show('success', $t('Published customizations reset to defaults'));

                    $(document).trigger('bte:publishedDiscarded', {
                        scope:   scopeManager.getScope(),
                        scopeId: scopeManager.getScopeId(),
                        themeId: scopeManager.getThemeId(),
                        values:  result.values || []
                    });

                    ctx.renderer.closeDropdown();
                } else {
                    var errMsg = self._extractErrorMessage(result, 'Reset failed');
                    Toastify.show('error', $t('Reset failed: %1').replace('%1', errMsg));
                    errorHandler.handle({ message: errMsg }, 'discard-published');
                }
                loading.hide(ctx.element);
            }).catch(function (error) {
                var errMsg = self._extractErrorMessage(error, 'Unknown error');
                Toastify.show('error', $t('Reset failed: %1').replace('%1', errMsg));
                errorHandler.handle({ message: errMsg }, 'discard-published');
                loading.hide(ctx.element);
            });
        },

        // =====================================================================
        // Delete Publication
        // =====================================================================

        /**
         * Guard + confirm + execute deleteBreezeThemeEditorPublication mutation.
         *
         * @param {Object} ctx              - Widget context
         * @param {number} publicationId
         * @param {string} publicationTitle
         */
        deletePublication: function (ctx, publicationId, publicationTitle) {
            var self = this;
            var message = $t('Delete "%1"? This cannot be undone.')
                .replace('%1', publicationTitle || ('#' + publicationId));

            Dialog.confirm(message, function () {
                self._doDeletePublication(ctx, publicationId);
            });
        },

        /**
         * Execute deleteBreezeThemeEditorPublication mutation.
         *
         * @param {Object} ctx
         * @param {number} publicationId
         * @private
         */
        _doDeletePublication: function (ctx, publicationId) {
            loading.show(ctx.element);

            deletePublicationMutation(publicationId)
                .then(function (response) {
                    var result = response && response.deleteBreezeThemeEditorPublication;

                    if (result && result.success) {
                        ctx.options.publications = ctx.options.publications.filter(function (pub) {
                            return pub.id !== publicationId;
                        });

                        if (ctx.options.currentStatus === PUBLICATION_STATUS.PUBLICATION &&
                                ctx.options.currentPublicationId === publicationId) {
                            ctx._fallbackToDraft();
                        } else {
                            ctx.renderer.render(ctx._getState());
                            ctx._applyPermissions();
                            ctx.renderer.updateLoadMoreButton({
                                publications:      ctx.options.publications,
                                totalPublications: ctx.totalPublications ? ctx.totalPublications - 1 : 0
                            });
                        }

                        if (ctx.totalPublications) {
                            ctx.totalPublications--;
                        }

                        Toastify.show('success', $t('Publication deleted'));
                    } else {
                        var errMsg = this._extractErrorMessage(result, 'Delete failed');
                        Toastify.show('error', $t('Delete failed: %1').replace('%1', errMsg));
                        errorHandler.handle({ message: errMsg }, 'delete-publication');
                    }
                    loading.hide(ctx.element);
                }.bind(this))
                .catch(function (error) {
                    var errMsg = this._extractErrorMessage(error, 'Unknown error');
                    Toastify.show('error', $t('Delete failed: %1').replace('%1', errMsg));
                    errorHandler.handle({ message: errMsg }, 'delete-publication');
                    loading.hide(ctx.element);
                }.bind(this));
        },

        // =====================================================================
        // Pure helpers (unit-testable without widget context)
        // =====================================================================

        /**
         * Check whether a confirmation dialog must be shown before publishing
         * (when there are unsaved in-panel changes).
         *
         * @return {boolean} true  → publish may proceed, false → user cancelled
         */
        confirmUnsavedChanges: function () {
            var hasUnsaved = PanelState.hasChanges();

            if (!hasUnsaved) {
                return true;
            }

            var unsavedCount = PanelState.getChangesCount();
            var message = $t('You have %1 unsaved change(s).\n\nPublish will ignore them. Continue?')
                .replace('%1', unsavedCount);

            return confirm(message);
        },

        /**
         * Extract an error message from either a GraphQL result object or a
         * caught JS Error.  Covers both call-sites:
         *   - .then()  → result may be  { success: false, message: '...' }
         *   - .catch() → error is a JS Error with .message
         *
         * @param  {Object|Error|null} source
         * @param  {string}            fallback
         * @return {string}
         * @private
         */
        _extractErrorMessage: function (source, fallback) {
            return (source && source.message) ? source.message : (fallback || 'Unknown error');
        }
    };
});
