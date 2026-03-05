/**
 * Publication Selector Widget (Admin)
 * Coordinator between Renderer, MetadataLoader, and CSS Manager
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/translate',
    'text!Swissup_BreezeThemeEditor/template/editor/publication-selector.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/permissions',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/error-handler',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/loading',
    'Swissup_BreezeThemeEditor/js/editor/css-manager',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/publish',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/rollback',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/discard-draft',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/discard-published',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/renderer',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/metadata-loader',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function ($, widget, $t, template, permissions, errorHandler, loading, cssManager, publishMutation, rollbackMutation, discardDraftMutation, discardPublishedMutation, PanelState, Toastify, StorageHelper, Renderer, MetadataLoader, Logger) {
    'use strict';

    var log = Logger.for('toolbar/publication-selector');

    $.widget('swissup.breezePublicationSelector', {
        options: {
            publications: [],
            currentStatus: 'DRAFT',
            changesCount: 0,
            publishedModifiedCount: 0,
            currentPublicationId: null,
            currentPublicationTitle: null,
            storeId: null,
            themeId: null,
            publicationsPage: 1,
            publicationsPageSize: 10
        },

        /**
         * Widget initialization
         */
        _create: function() {
            log.info('Initializing publication selector');
            
            // Get store and theme IDs
            var config = window.breezeThemeEditorConfig || {};
            this.storeId = config.storeId || this.options.storeId;
            this.themeId = config.themeId || this.options.themeId;
            
            // Initialize modules
            this._initModules();
            
            // Restore state from localStorage
            this._restoreState();
            
            // Initialize CSS Manager
            this._initCssManager();
            
            // Initial render and bind events
            this.renderer.render(this._getState());
            this._applyPermissions();
            this._bindEvents();
            this._bindGlobalEvents();
            
            // Load publications and draft metadata in parallel, render once when both complete
            this._loadInitialData();
            
            // Restore CSS state when ready
            this._setupCssStateRestoration();
            
            log.info('Publication selector initialized');
        },

        /**
         * Initialize modules (Renderer, MetadataLoader, StorageHelper)
         */
        _initModules: function() {
            // Initialize StorageHelper
            if (this.storeId && this.themeId) {
                StorageHelper.init(this.storeId, this.themeId);
            }
            
            // Initialize Renderer
            this.renderer = Object.create(Renderer).init({
                element: this.element,
                templateString: template
            });
            
            // Initialize MetadataLoader
            this.metadataLoader = Object.create(MetadataLoader).init({
                storeId: this.storeId,
                themeId: this.themeId,
                pageSize: this.options.publicationsPageSize
            });
        },

        /**
         * Restore state from localStorage
         */
        _restoreState: function() {
            this.options.currentStatus = StorageHelper.getCurrentStatus() || 'DRAFT';
            this.options.currentPublicationId = StorageHelper.getCurrentPublicationId();
            this.options.currentPublicationTitle = StorageHelper.getCurrentPublicationTitle();
            
            log.debug('State restored from localStorage: status=' + this.options.currentStatus + ' publicationId=' + this.options.currentPublicationId);
        },

        /**
         * Initialize CSS Manager
         */
        _initCssManager: function() {
            cssManager.init({
                storeId: this.storeId,
                themeId: this.themeId,
                iframeId: 'bte-iframe'
            });
        },

        /**
         * Setup CSS state restoration
         */
        _setupCssStateRestoration: function() {
            var self = this;
            if (cssManager.isReady()) {
                this._restoreCssState();
            } else {
                $(document).one('bte:cssManagerReady', function() {
                    self._restoreCssState();
                });
            }
        },

        /**
         * Restore CSS state from localStorage
         */
        _restoreCssState: function() {
            var self = this;
            
            if (this.options.currentStatus === 'PUBLICATION' && this.options.currentPublicationId) {
                cssManager.switchTo('PUBLICATION', this.options.currentPublicationId).then(function() {
                    log.info('Restored PUBLICATION mode: ' + self.options.currentPublicationId);
                }).catch(function(error) {
                    log.error('Failed to restore publication: ' + error);
                    self._fallbackToDraft();
                });
            } else if (this.options.currentStatus === 'PUBLISHED') {
                cssManager.switchTo('PUBLISHED').then(function() {
                    log.info('Restored PUBLISHED mode');
                }).catch(function(error) {
                    log.error('Failed to restore published state: ' + error);
                });
            } else if (this.options.currentStatus === 'DRAFT') {
                // Restore DRAFT mode - load draft CSS via GraphQL
                cssManager.switchTo('DRAFT').then(function() {
                    log.info('Restored DRAFT mode');
                }).catch(function(error) {
                    log.error('Failed to restore draft state: ' + error);
                });
            }
        },

        /**
         * Fallback to DRAFT if restoration fails
         */
        _fallbackToDraft: function() {
            this.options.currentStatus = 'DRAFT';
            this.options.currentPublicationId = null;
            this.options.currentPublicationTitle = null;
            StorageHelper.setCurrentStatus('DRAFT');
            StorageHelper.clearCurrentPublication();
            this.renderer.render(this._getState());
            this._applyPermissions();
        },

        /**
         * Bind UI event handlers
         */
        _bindEvents: function() {
            var self = this;
            
            // Toggle dropdown
            this.element.on('click', '.toolbar-select', function(e) {
                e.preventDefault();
                self._toggleDropdown();
            });

            // Switch status (Draft/Published)
            this.element.on('click', '[data-status]', function(e) {
                e.preventDefault();
                self._switchStatus($(this).data('status'));
            });

            // Publish changes
            this.element.on('click', '[data-action="publish"]', function(e) {
                e.preventDefault();
                self._publishChanges();
            });

            // Discard all saved draft changes
            this.element.on('click', '[data-action="discard-draft"]', function(e) {
                e.preventDefault();
                self._discardDraft();
            });

            // Reset all published customizations to theme defaults
            this.element.on('click', '[data-action="discard-published"]', function(e) {
                e.preventDefault();
                self._discardPublished();
            });

            // Publish this version (rollback to historical publication)
            this.element.on('click', '[data-action="rollback"]', function(e) {
                e.preventDefault();
                var $btn = $(this);
                self._rollbackTo(
                    parseInt($btn.data('publication-id')),
                    $btn.data('publication-title')
                );
            });

            // Load publication (exclude rollback/action buttons that also carry data-publication-id)
            this.element.on('click', '[data-publication-id]:not([data-action])', function(e) {
                e.preventDefault();
                self._loadPublication($(this).data('publication-id'));
            });

            // Load more publications
            this.element.on('click', '[data-action="load-more"]', function(e) {
                e.preventDefault();
                self._loadMorePublications();
            });

            // Close dropdown on outside click
            $(document).on('click', function(e) {
                if (!$(e.target).closest(self.element).length) {
                    self.renderer.closeDropdown();
                }
            });
        },

        /**
         * Bind global events
         */
        _bindGlobalEvents: function() {
            var self = this;
            
            // Iframe reloaded → restore CSS state
            $(document).on('bte:iframeReloaded', function() {
                log.info('Iframe reloaded, restoring CSS state...');
                self._restoreCssState();
            });
            
            // Draft saved → update changes count
            $(document).on('themeEditorDraftSaved', function(e, data) {
                if (data && typeof data.draftChangesCount !== 'undefined') {
                    self.options.changesCount = data.draftChangesCount;
                    self.renderer.render(self._getState());
                    self._applyPermissions();
                }
            });
            
            // Published → reload publications + reset changes count
            $(document).on('bte:published', function(e, data) {
                self.options.currentStatus = 'PUBLISHED';
                self.options.changesCount = 0;
                
                if (data && data.publicationId) {
                    var newPub = {
                        id: data.publicationId,
                        title: 'Publication #' + data.publicationId,
                        date: new Date().toLocaleString()
                    };
                    self.options.publications.unshift(newPub);
                }
                
                self.renderer.render(self._getState());
                self._applyPermissions();

                // Refresh publishedModifiedCount — PUBLISHED config changed after publish/rollback
                self.metadataLoader.loadMetadata().then(function(meta) {
                    if (meta) {
                        self.options.publishedModifiedCount = meta.modifiedCount || 0;
                        self.renderer.render(self._getState());
                        self._applyPermissions();
                    }
                }).catch(function() { /* non-critical, ignore */ });
            });
        },

        /**
         * Toggle dropdown visibility
         */
        _toggleDropdown: function() {
            var $dropdown = this.element.find('.toolbar-dropdown');
            var isVisible = $dropdown.is(':visible');
            
            $('.toolbar-dropdown').not($dropdown).hide();
            $dropdown.toggle();
            
            log.info(isVisible ? 'Closing dropdown' : 'Opening dropdown');
        },

        /**
         * Switch between Draft and Published status
         */
        _switchStatus: function(status) {
            if (status === this.options.currentStatus) {
                log.info('Already in ' + status + ' mode');
                this.renderer.closeDropdown();
                return;
            }
            
            var self = this;
            loading.show(this.element);
            
            cssManager.switchTo(status).then(function() {
                self.options.currentStatus = status;
                self.options.currentPublicationId = null;
                self.options.currentPublicationTitle = null;
                
                StorageHelper.setCurrentStatus(status);
                StorageHelper.clearCurrentPublication();
                
                self.renderer.render(self._getState());
                self._applyPermissions();
                self.renderer.closeDropdown();

                $(document).trigger('publicationStatusChanged', {
                    status: status,
                    publicationId: null
                });
                log.info('Switched to ' + status);
                
                loading.hide(self.element);
            }).catch(function(error) {
                log.error('Failed to switch status: ' + error);
                errorHandler.handle(error, 'switch-status');
                loading.hide(self.element);
            });
        },

        /**
         * Load a specific publication
         */
        _loadPublication: function(publicationId) {
            var publication = this.metadataLoader.findPublicationById(this.options.publications, publicationId);
            
            if (!publication) {
                log.error('Publication not found: ' + publicationId);
                return;
            }
            
            var self = this;
            loading.show(this.element);
            
            cssManager.switchTo('PUBLICATION', publicationId).then(function() {
                self.options.currentStatus = 'PUBLICATION';
                self.options.currentPublicationId = publicationId;
                self.options.currentPublicationTitle = publication.title;
                
                StorageHelper.setCurrentStatus('PUBLICATION');
                StorageHelper.setCurrentPublicationId(publicationId);
                StorageHelper.setCurrentPublicationTitle(publication.title);
                
                self.renderer.render(self._getState());
                self._applyPermissions();
                self.renderer.closeDropdown();
                
                $(document).trigger('publicationStatusChanged', {
                    status: 'PUBLICATION',
                    publicationId: publicationId
                });
                
                log.info('Publication loaded: ' + publication.title);
                loading.hide(self.element);
            }).catch(function(error) {
                log.error('Failed to load publication: ' + error);
                errorHandler.handle(error, 'load-publication');
                loading.hide(self.element);
            });
        },

        /**
         * Load publications and draft metadata in parallel on init.
         * Renders exactly once after both requests complete to avoid
         * a race condition where two concurrent renders could briefly
         * show stale state.
         */
        _loadInitialData: function() {
            var self = this;
            var resolved = {pub: false, meta: false, pubData: null, metaData: null};

            function finalize() {
                if (!resolved.pub || !resolved.meta) {
                    return;
                }

                if (resolved.pubData) {
                    self.options.publications = resolved.pubData.items;
                    self.totalPublications = resolved.pubData.total_count;
                    self.pageInfo = resolved.pubData.page_info;
                }

                if (resolved.metaData) {
                    self.options.changesCount = resolved.metaData.draftChangesCount;
                    self.options.publishedModifiedCount = resolved.metaData.modifiedCount || 0;
                }

                self.renderer.render(self._getState());
                self._applyPermissions();

                if (resolved.pubData) {
                    self.renderer.updateLoadMoreButton({
                        publications: self.options.publications,
                        totalPublications: self.totalPublications
                    });
                }

                log.info('Initial data loaded: ' + (resolved.pubData ? self.options.publications.length : 0) + ' publications, ' + self.options.changesCount + ' changes');
            }

            this.metadataLoader.loadPublications(1, null)
                .then(function(data) {
                    resolved.pub = true;
                    resolved.pubData = data;
                    finalize();
                })
                .catch(function(error) {
                    log.error('Failed to load publications: ' + error);
                    resolved.pub = true;
                    finalize();
                });

            this.metadataLoader.loadMetadata()
                .then(function(data) {
                    resolved.meta = true;
                    resolved.metaData = data;
                    finalize();
                })
                .catch(function(error) {
                    log.warn('Could not load draft metadata: ' + error);
                    resolved.meta = true;
                    finalize();
                });
        },

        /**
         * Load publications from GraphQL (used for Load More pagination)
         */
        _loadPublications: function() {
            var self = this;
            
            this.metadataLoader.loadPublications(this.options.publicationsPage, null).then(function(data) {
                if (self.options.publicationsPage === 1) {
                    self.options.publications = data.items;
                } else {
                    self.options.publications = self.options.publications.concat(data.items);
                }
                
                self.totalPublications = data.total_count;
                self.pageInfo = data.page_info;
                
                self.renderer.render(self._getState());
                self._applyPermissions();
                
                // Update Load More button visibility
                self.renderer.updateLoadMoreButton({
                    publications: self.options.publications,
                    totalPublications: self.totalPublications
                });
                
                log.info('Loaded ' + self.options.publications.length + ' / ' + self.totalPublications + ' publications');
            }).catch(function(error) {
                log.error('Failed to load publications: ' + error);
            });
        },

        /**
         * Load more publications (pagination)
         */
        _loadMorePublications: function() {
            if (this.options.publications.length >= this.totalPublications) {
                log.info('All publications loaded');
                return;
            }
            
            this.options.publicationsPage++;
            this._loadPublications();
        },

        /**
         * Publish draft changes
         */
        _publishChanges: function() {
            if (this.options.changesCount === 0) {
                Toastify.show('notice', $t('No changes to publish'));
                return;
            }
            
            if (!permissions.canPublish()) {
                errorHandler.handle({
                    message: permissions.getPermissionMessage('publish')
                }, 'publish-draft');
                return;
            }
            
            if (!this._confirmUnsavedChanges()) {
                return;
            }
            
            var title = prompt($t('Enter publication title:'));
            if (!title || !title.trim()) {
                return;
            }
            
            this._executePublish(title.trim());
        },

        /**
         * Check unsaved changes and confirm with user
         */
        _confirmUnsavedChanges: function() {
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
         * Execute publish mutation
         */
        _executePublish: function(title) {
            var self = this;
            
            loading.show(this.element);
            
            publishMutation(
                parseInt(this.storeId),
                parseInt(this.themeId),
                title,
                null,
                false
            ).then(function(response) {
                if (response && response.publishBreezeThemeEditor && response.publishBreezeThemeEditor.success) {
                    var result = response.publishBreezeThemeEditor;
                    
                    self.options.currentStatus = 'PUBLISHED';
                    self.options.changesCount = 0;
                    self.renderer.render(self._getState());
                    self._applyPermissions();
                    
                    Toastify.show('success', $t('Published successfully: %1').replace('%1', title));
                    
                    $(document).trigger('bte:published', {
                        publication: result.publication,
                        storeId: self.storeId,
                        themeId: self.themeId
                    });
                    
                    self.renderer.closeDropdown();
                    self.options.publicationsPage = 1;
                    self._loadPublications();
                } else {
                    self._onPublishError(response.publishBreezeThemeEditor.message || 'Publish failed');
                }
            }).catch(function(error) {
                self._onPublishError(error.message || 'Unknown error');
                loading.hide(self.element);
            });
        },

        /**
         * Handle publish error
         */
        _onPublishError: function(message) {
            Toastify.show('error', $t('Publish failed: %1').replace('%1', message));
            errorHandler.handle({ message: message }, 'publish-draft');
        },

        /**
         * Discard all saved draft changes after confirmation
         */
        _discardDraft: function() {
            if (this.options.changesCount === 0) {
                return;
            }

            var message = $t('Discard all %1 draft changes? This cannot be undone.')
                .replace('%1', this.options.changesCount);

            if (!confirm(message)) {
                return;
            }

            var self = this;
            loading.show(this.element);

            discardDraftMutation(
                parseInt(this.storeId),
                parseInt(this.themeId),
                null
            ).then(function(response) {
                if (response && response.discardBreezeThemeEditorDraft && response.discardBreezeThemeEditorDraft.success) {
                    self.options.changesCount = 0;
                    self.renderer.render(self._getState());
                    self._applyPermissions();

                    Toastify.show('success', $t('Draft changes discarded'));

                    $(document).trigger('bte:draftDiscarded', {
                        storeId: self.storeId,
                        themeId: self.themeId
                    });

                    self.renderer.closeDropdown();
                } else {
                    var errMsg = (response && response.discardBreezeThemeEditorDraft && response.discardBreezeThemeEditorDraft.message)
                        ? response.discardBreezeThemeEditorDraft.message
                        : 'Discard failed';
                    Toastify.show('error', $t('Discard failed: %1').replace('%1', errMsg));
                    errorHandler.handle({ message: errMsg }, 'discard-draft');
                }
                loading.hide(self.element);
            }).catch(function(error) {
                var errMsg = error.message || 'Unknown error';
                Toastify.show('error', $t('Discard failed: %1').replace('%1', errMsg));
                errorHandler.handle({ message: errMsg }, 'discard-draft');
                loading.hide(self.element);
            });
        },

        /**
         * Reset all published customizations to theme defaults after confirmation
         */
        _discardPublished: function() {
            if (this.options.publishedModifiedCount === 0) {
                return;
            }

            var message = $t(
                'This will reset %1 customized fields to theme defaults on the live site.\n\nThis cannot be undone.'
            ).replace('%1', this.options.publishedModifiedCount);

            if (!confirm(message)) {
                return;
            }

            this._executeDiscardPublished();
        },

        /**
         * Execute discardBreezeThemeEditorPublished GraphQL mutation
         */
        _executeDiscardPublished: function() {
            var self = this;
            loading.show(this.element);

            discardPublishedMutation(
                parseInt(this.storeId),
                parseInt(this.themeId)
            ).then(function(response) {
                if (response && response.discardBreezeThemeEditorPublished && response.discardBreezeThemeEditorPublished.success) {
                    self.options.publishedModifiedCount = 0;
                    self.renderer.render(self._getState());
                    self._applyPermissions();

                    Toastify.show('success', $t('Published customizations reset to defaults'));

                    $(document).trigger('bte:publishedDiscarded', {
                        storeId: self.storeId,
                        themeId: self.themeId
                    });

                    self.renderer.closeDropdown();
                } else {
                    var errMsg = (response && response.discardBreezeThemeEditorPublished && response.discardBreezeThemeEditorPublished.message)
                        ? response.discardBreezeThemeEditorPublished.message
                        : 'Reset failed';
                    Toastify.show('error', $t('Reset failed: %1').replace('%1', errMsg));
                    errorHandler.handle({ message: errMsg }, 'discard-published');
                }
                loading.hide(self.element);
            }).catch(function(error) {
                var errMsg = error.message || 'Unknown error';
                Toastify.show('error', $t('Reset failed: %1').replace('%1', errMsg));
                errorHandler.handle({ message: errMsg }, 'discard-published');
                loading.hide(self.element);
            });
        },

        /**
         * Initiate "Publish this version" flow for a historical publication
         */
        _rollbackTo: function(publicationId, publicationTitle) {
            if (!permissions.canRollback()) {
                errorHandler.handle({
                    message: permissions.getPermissionMessage('rollback')
                }, 'rollback');
                return;
            }

            // Warn about unsaved draft changes — rollback will discard them
            if (this.options.changesCount > 0 || PanelState.hasChanges()) {
                var unsavedCount = PanelState.hasChanges() ? PanelState.getChangesCount() : 0;
                var draftCount   = this.options.changesCount;

                var message = $t(
                    'Publishing this version will discard your current draft.\n\n' +
                    '%1 saved draft change(s) and %2 unsaved change(s) will be lost.\n\n' +
                    'Continue?'
                ).replace('%1', draftCount).replace('%2', unsavedCount);

                if (!confirm(message)) {
                    return;
                }
            }

            var defaultTitle = $t('Restoring: %1').replace('%1', publicationTitle);
            var title = prompt($t('Enter a title for this restore:'), defaultTitle);
            if (!title || !title.trim()) {
                return;
            }

            this._executeRollback(publicationId, title.trim());
        },

        /**
         * Execute rollback GraphQL mutation
         *
         * @param {Number} publicationId
         * @param {String} title
         */
        _executeRollback: function(publicationId, title) {
            var self = this;

            loading.show(this.element);

            rollbackMutation(publicationId, title, null)
                .then(function(response) {
                    if (response && response.rollbackBreezeThemeEditor && response.rollbackBreezeThemeEditor.success) {
                        var result = response.rollbackBreezeThemeEditor;

                        self.options.currentStatus = 'PUBLISHED';
                        self.options.changesCount  = 0;
                        self.renderer.render(self._getState());
                        self._applyPermissions();

                        Toastify.show('success', $t('Published: %1').replace('%1', title));

                        $(document).trigger('bte:published', {
                            publication: result.publication,
                            storeId: self.storeId,
                            themeId: self.themeId,
                            isRollback: true
                        });

                        self.renderer.closeDropdown();
                        self.options.publicationsPage = 1;
                        self._loadPublications();
                    } else {
                        var errMsg = (response && response.rollbackBreezeThemeEditor && response.rollbackBreezeThemeEditor.message)
                            ? response.rollbackBreezeThemeEditor.message
                            : 'Publish failed';
                        Toastify.show('error', $t('Publish failed: %1').replace('%1', errMsg));
                        errorHandler.handle({ message: errMsg }, 'rollback');
                    }
                    loading.hide(self.element);
                })
                .catch(function(error) {
                    var errMsg = error.message || 'Unknown error';
                    Toastify.show('error', $t('Publish failed: %1').replace('%1', errMsg));
                    errorHandler.handle({ message: errMsg }, 'rollback');
                    loading.hide(self.element);
                });
        },

        /**
         * Apply ACL permissions to UI
         */
        _applyPermissions: function() {
            var $publishBtn = this.element.find('[data-action="publish"]');
            var $rollbackBtns = this.element.find('[data-action="rollback"]');
            var $resetPublishedBtn = this.element.find('[data-action="discard-published"]');
            
            if ($publishBtn.length && !permissions.canPublish()) {
                permissions.applyToElement($publishBtn, 'publish');
            }
            
            if ($rollbackBtns.length && !permissions.canRollback()) {
                $rollbackBtns.each(function() {
                    permissions.applyToElement($(this), 'rollback');
                });
            }

            if ($resetPublishedBtn.length && !permissions.canResetPublished()) {
                permissions.applyToElement($resetPublishedBtn, 'resetPublished');
            }
        },

        /**
         * Get current state object
         */
        _getState: function() {
            return {
                status: this.options.currentStatus,
                currentPublicationId: this.options.currentPublicationId,
                currentPublicationTitle: this.options.currentPublicationTitle,
                publications: this.options.publications,
                totalPublications: this.totalPublications || 0,
                changesCount: this.options.changesCount,
                publishedModifiedCount: this.options.publishedModifiedCount,
                canPublish: permissions.canPublish() && 
                           this.options.changesCount > 0 && 
                           this.options.currentStatus === 'DRAFT',
                canRollback: permissions.canRollback(),
                canResetPublished: permissions.canResetPublished && permissions.canResetPublished()
            };
        },

        // ============ Public API ============

        /**
         * Update changes count
         */
        updateChangesCount: function(count) {
            this.options.changesCount = count;
            this.renderer.render(this._getState());
            this._applyPermissions();
        },

        /**
         * Set publication status
         */
        setStatus: function(status) {
            this.options.currentStatus = status;
            this.renderer.render(this._getState());
            this._applyPermissions();
        },

        /**
         * Add publication to list
         */
        addPublication: function(publication) {
            this.options.publications.unshift(publication);
            this.renderer.render(this._getState());
            this._applyPermissions();
        }
    });

    return $.swissup.breezePublicationSelector;
});
