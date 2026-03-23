/**
 * Publication Selector Widget (Admin)
 *
 * Thin orchestrator: delegates CSS-state logic to CssStateRestorer and all
 * GraphQL mutation actions to ActionExecutor.  Only coordination code lives
 * here — rendering, data-loading, event-wiring, and the public API.
 *
 * п.3.4 refactoring: extracted helpers
 *   - publication-selector/css-state-restorer.js
 *   - publication-selector/action-executor.js
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/translate',
    'text!Swissup_BreezeThemeEditor/template/editor/publication-selector.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/permissions',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/loading',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/renderer',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/metadata-loader',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/css-state-restorer',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/action-executor',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function (
    $,
    widget,
    $t,
    template,
    permissions,
    loading,
    StorageHelper,
    Renderer,
    MetadataLoader,
    CssStateRestorer,
    ActionExecutor,
    Logger,
    Constants
) {
    'use strict';

    var log = Logger.for('toolbar/publication-selector');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    $.widget('swissup.breezePublicationSelector', {
        options: {
            publications: [],
            currentStatus: PUBLICATION_STATUS.DRAFT,
            changesCount: 0,
            publishedModifiedCount: 0,
            currentPublicationId: null,
            currentPublicationTitle: null,
            scope: 'stores',
            scopeId: null,
            themeId: null,
            publicationsPage: 1,
            publicationsPageSize: 10
        },

        /**
         * Widget initialization
         */
        _create: function () {
            log.info('Initializing publication selector');

            // Get scope and theme IDs
            var config = window.breezeThemeEditorConfig || {};
            this.scope   = config.scope   || this.options.scope   || 'stores';
            this.scopeId = config.scopeId || this.options.scopeId;
            this.themeId = config.themeId || this.options.themeId;

            // Initialize modules
            this._initModules();

            // Restore state from localStorage
            this._restoreState();

            // Initialize CSS Manager
            CssStateRestorer.initCssManager(this);

            // Initial render and bind events
            this.renderer.render(this._getState());
            this._applyPermissions();
            this._bindEvents();
            this._bindGlobalEvents();

            // Load publications and draft metadata in parallel, render once when both complete
            this._loadInitialData();

            // Restore CSS state when ready
            CssStateRestorer.setupCssStateRestoration(this);

            log.info('Publication selector initialized');
        },

        /**
         * Initialize modules (Renderer, MetadataLoader, StorageHelper)
         */
        _initModules: function () {
            // Initialize StorageHelper
            if (this.scopeId && this.themeId) {
                StorageHelper.init(this.scopeId, this.themeId);
            }

            // Initialize Renderer
            this.renderer = Object.create(Renderer).init({
                element: this.element,
                templateString: template
            });

            // Initialize MetadataLoader
            this.metadataLoader = Object.create(MetadataLoader).init({
                scope:    this.scope,
                scopeId:  this.scopeId,
                themeId:  this.themeId,
                pageSize: this.options.publicationsPageSize
            });
        },

        /**
         * Restore state from localStorage
         */
        _restoreState: function () {
            this.options.currentStatus          = StorageHelper.getCurrentStatus() || PUBLICATION_STATUS.DRAFT;
            this.options.currentPublicationId   = StorageHelper.getCurrentPublicationId();
            this.options.currentPublicationTitle = StorageHelper.getCurrentPublicationTitle();

            log.debug('State restored from localStorage: status=' + this.options.currentStatus +
                ' publicationId=' + this.options.currentPublicationId);
        },

        /**
         * Bind UI event handlers
         */
        _bindEvents: function () {
            var self = this;

            // Toggle dropdown
            this.element.on('click', '.toolbar-select', function (e) {
                e.preventDefault();
                self._toggleDropdown();
            });

            // Switch status (Draft/Published)
            this.element.on('click', '[data-status]', function (e) {
                e.preventDefault();
                CssStateRestorer.switchStatus(self, $(this).data('status'));
            });

            // Publish changes
            this.element.on('click', '[data-action="publish"]', function (e) {
                e.preventDefault();
                ActionExecutor.publishChanges(self);
            });

            // Discard all saved draft changes
            this.element.on('click', '[data-action="discard-draft"]', function (e) {
                e.preventDefault();
                ActionExecutor.discardDraft(self);
            });

            // Reset all published customizations to theme defaults
            this.element.on('click', '[data-action="discard-published"]', function (e) {
                e.preventDefault();
                ActionExecutor.discardPublished(self);
            });

            // Publish this version (rollback to historical publication)
            this.element.on('click', '[data-action="rollback"]', function (e) {
                e.preventDefault();
                var $btn = $(this);
                ActionExecutor.rollbackTo(
                    self,
                    parseInt($btn.data('publication-id')),
                    $btn.data('publication-title')
                );
            });

            // Load publication (exclude rollback/action buttons that also carry data-publication-id)
            this.element.on('click', '[data-publication-id]:not([data-action])', function (e) {
                e.preventDefault();
                CssStateRestorer.loadPublication(self, $(this).data('publication-id'));
            });

            // Load more publications
            this.element.on('click', '[data-action="load-more"]', function (e) {
                e.preventDefault();
                self._loadMorePublications();
            });

            // Delete a historical publication
            this.element.on('click', '[data-action="delete-publication"]', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $btn = $(this);
                ActionExecutor.deletePublication(
                    self,
                    parseInt($btn.data('publication-id')),
                    $btn.data('publication-title')
                );
            });

            // Close dropdown on outside click
            $(document).on('click', function (e) {
                if (!$(e.target).closest(self.element).length) {
                    self.renderer.closeDropdown();
                }
            });
        },

        /**
         * Bind global events
         */
        _bindGlobalEvents: function () {
            var self = this;

            // Iframe reloaded → restore CSS state
            $(document).on('bte:iframeReloaded', function () {
                log.info('Iframe reloaded, restoring CSS state...');
                CssStateRestorer.restoreCssState(self);
            });

            // Switch to Draft when settings panel requests it (user clicked a disabled field)
            $(document).on('bte:requestSwitchToDraft', function () {
                if (self.options.currentStatus !== PUBLICATION_STATUS.DRAFT) {
                    CssStateRestorer.switchStatus(self, PUBLICATION_STATUS.DRAFT);
                }
            });

            // Draft saved → re-fetch real draftChangesCount from server to ensure
            // the Publish button appears even when client-side count is inaccurate
            // (e.g. palette/font changes whose saved value equals the theme default).
            $(document).on('themeEditorDraftSaved', function (e, data) {
                self.metadataLoader.loadMetadata().then(function (meta) {
                    self.options.changesCount = meta.draftChangesCount;
                    self.renderer.render(self._getState());
                    self._applyPermissions();
                }).catch(function () {
                    // Fallback to client-supplied count if the request fails
                    if (data && typeof data.draftChangesCount !== 'undefined') {
                        self.options.changesCount = data.draftChangesCount;
                        self.renderer.render(self._getState());
                        self._applyPermissions();
                    }
                });
            });

            // Scope changed → reload metadata and publications for new scope
            $(document).on('scopeChanged', function (e, scope, scopeId) {
                log.info('Scope changed to ' + scope + ':' + scopeId +
                    ', reloading publication selector data...');

                self.scope   = scope;
                self.scopeId = scopeId;
                self.themeId = null;

                // Update metadataLoader with new scope context
                self.metadataLoader.scope   = scope;
                self.metadataLoader.scopeId = scopeId;
                self.metadataLoader.themeId = null;

                // Re-init StorageHelper for the new scope to restore persisted state
                StorageHelper.init(scopeId, null);

                // Reset options to a clean state for the new scope
                self.options.changesCount            = 0;
                self.options.publishedModifiedCount  = 0;
                self.options.publications            = [];
                self.options.currentPublicationId    = null;
                self.options.currentPublicationTitle = null;
                self.options.publicationsPage        = 1;

                // Restore status from localStorage for the new scope
                self.options.currentStatus = StorageHelper.getCurrentStatus() || PUBLICATION_STATUS.DRAFT;

                self.renderer.render(self._getState());
                self._applyPermissions();

                // Fetch fresh publications and changesCount for the new scope
                self._loadInitialData();
            });

            // Published → reload publications + reset changes count
            $(document).on('bte:published', function (e, data) {
                self.options.currentStatus  = PUBLICATION_STATUS.PUBLISHED;
                self.options.changesCount   = 0;

                if (data && data.publicationId) {
                    var newPub = {
                        id:    data.publicationId,
                        title: 'Publication #' + data.publicationId,
                        date:  new Date().toLocaleString()
                    };
                    self.options.publications.unshift(newPub);
                }

                self.renderer.render(self._getState());
                self._applyPermissions();

                // Refresh publishedModifiedCount — PUBLISHED config changed after publish/rollback
                self.metadataLoader.loadMetadata().then(function (meta) {
                    if (meta) {
                        self.options.publishedModifiedCount = meta.modifiedCount || 0;
                        self.renderer.render(self._getState());
                        self._applyPermissions();
                    }
                }).catch(function () { /* non-critical, ignore */ });
            });
        },

        /**
         * Toggle dropdown visibility
         */
        _toggleDropdown: function () {
            var $dropdown = this.element.find('.toolbar-dropdown');
            var isVisible = $dropdown.is(':visible');

            $('.toolbar-dropdown').not($dropdown).hide();
            $dropdown.toggle();

            log.info(isVisible ? 'Closing dropdown' : 'Opening dropdown');
        },

        /**
         * Fall back to DRAFT — thin wrapper so ActionExecutor.deletePublication
         * and _bindGlobalEvents can call ctx._fallbackToDraft() transparently.
         */
        _fallbackToDraft: function () {
            CssStateRestorer.fallbackToDraft(this);
        },

        /**
         * Load publications and draft metadata in parallel on init.
         * Renders exactly once after both requests complete to avoid
         * a race condition where two concurrent renders could briefly
         * show stale state.
         */
        _loadInitialData: function () {
            var self = this;
            var resolved = { pub: false, meta: false, pubData: null, metaData: null };

            function finalize() {
                if (!resolved.pub || !resolved.meta) {
                    return;
                }

                if (resolved.pubData) {
                    self.options.publications = resolved.pubData.items;
                    self.totalPublications    = resolved.pubData.total_count;
                    self.pageInfo             = resolved.pubData.page_info;
                }

                if (resolved.metaData) {
                    self.options.changesCount           = resolved.metaData.draftChangesCount;
                    self.options.publishedModifiedCount = resolved.metaData.modifiedCount || 0;
                }

                self.renderer.render(self._getState());
                self._applyPermissions();

                if (resolved.pubData) {
                    self.renderer.updateLoadMoreButton({
                        publications:      self.options.publications,
                        totalPublications: self.totalPublications
                    });
                }

                log.info('Initial data loaded: ' +
                    (resolved.pubData ? self.options.publications.length : 0) +
                    ' publications, ' + self.options.changesCount + ' changes');
            }

            this.metadataLoader.loadPublications(1, null)
                .then(function (data) {
                    resolved.pub     = true;
                    resolved.pubData = data;
                    finalize();
                })
                .catch(function (error) {
                    log.error('Failed to load publications: ' + error);
                    resolved.pub = true;
                    finalize();
                });

            this.metadataLoader.loadMetadata()
                .then(function (data) {
                    resolved.meta     = true;
                    resolved.metaData = data;
                    finalize();
                })
                .catch(function (error) {
                    log.warn('Could not load draft metadata: ' + error);
                    resolved.meta = true;
                    finalize();
                });
        },

        /**
         * Load publications from GraphQL (used for Load More pagination)
         */
        _loadPublications: function () {
            var self = this;

            this.metadataLoader.loadPublications(this.options.publicationsPage, null)
                .then(function (data) {
                    if (self.options.publicationsPage === 1) {
                        self.options.publications = data.items;
                    } else {
                        self.options.publications = self.options.publications.concat(data.items);
                    }

                    self.totalPublications = data.total_count;
                    self.pageInfo          = data.page_info;

                    self.renderer.render(self._getState());
                    self._applyPermissions();

                    // Update Load More button visibility
                    self.renderer.updateLoadMoreButton({
                        publications:      self.options.publications,
                        totalPublications: self.totalPublications
                    });

                    log.info('Loaded ' + self.options.publications.length +
                        ' / ' + self.totalPublications + ' publications');
                })
                .catch(function (error) {
                    log.error('Failed to load publications: ' + error);
                });
        },

        /**
         * Load more publications (pagination)
         */
        _loadMorePublications: function () {
            if (this.options.publications.length >= this.totalPublications) {
                log.info('All publications loaded');
                return;
            }

            this.options.publicationsPage++;
            this._loadPublications();
        },

        /**
         * Apply ACL permissions to UI
         */
        _applyPermissions: function () {
            var $publishBtn        = this.element.find('[data-action="publish"]');
            var $rollbackBtns      = this.element.find('[data-action="rollback"]');
            var $resetPublishedBtn = this.element.find('[data-action="discard-published"]');

            if ($publishBtn.length && !permissions.canPublish()) {
                permissions.applyToElement($publishBtn, 'publish');
            }

            if ($rollbackBtns.length && !permissions.canRollback()) {
                $rollbackBtns.each(function () {
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
        _getState: function () {
            return {
                status:                  this.options.currentStatus,
                currentPublicationId:    this.options.currentPublicationId,
                currentPublicationTitle: this.options.currentPublicationTitle,
                publications:            this.options.publications,
                totalPublications:       this.totalPublications || 0,
                changesCount:            this.options.changesCount,
                publishedModifiedCount:  this.options.publishedModifiedCount,
                canPublish:              permissions.canPublish() &&
                                         this.options.changesCount > 0 &&
                                         this.options.currentStatus === PUBLICATION_STATUS.DRAFT,
                canRollback:             permissions.canRollback(),
                canResetPublished:       permissions.canResetPublished && permissions.canResetPublished(),
                canDeletePublication:    permissions.canPublish(),
                activePublicationId:     this.options.publications.length > 0
                    ? this.options.publications[0].id
                    : null
            };
        },

        // ===================== Public API =====================

        /**
         * Update changes count
         */
        updateChangesCount: function (count) {
            this.options.changesCount = count;
            this.renderer.render(this._getState());
            this._applyPermissions();
        },

        /**
         * Set publication status
         */
        setStatus: function (status) {
            this.options.currentStatus = status;
            this.renderer.render(this._getState());
            this._applyPermissions();
        },

        /**
         * Add publication to list
         */
        addPublication: function (publication) {
            this.options.publications.unshift(publication);
            this.renderer.render(this._getState());
            this._applyPermissions();
        }
    });

    return $.swissup.breezePublicationSelector;
});
