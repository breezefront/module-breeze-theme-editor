/**
 * CssStateRestorer for Publication Selector
 *
 * Responsible for restoring the CSS preview state (DRAFT/PUBLISHED/PUBLICATION)
 * from localStorage on widget init and iframe reload, switching CSS modes on
 * user action, and loading a specific historical publication for preview.
 *
 * All methods receive the widget context (ctx) as the first argument so this
 * is a stateless plain object — it can be unit-tested without the widget.
 *
 * Extracted from publication-selector.js (п.3.4 refactoring).
 *
 * @module Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector/css-state-restorer
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/css-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/error-handler',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/loading',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/publication-state'
], function (
    $,
    cssManager,
    errorHandler,
    loading,
    StorageHelper,
    scopeManager,
    Logger,
    Constants,
    PublicationState
) {
    'use strict';

    var log = Logger.for('toolbar/publication-selector/css-state-restorer');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    return {

        // =====================================================================
        // Initialization
        // =====================================================================

        /**
         * Initialize cssManager for the given scope/theme context.
         * cssManager.init() now returns a Promise; errors are logged here so the
         * caller (_create) stays synchronous and does not need to chain .then().
         *
         * @param {Object} ctx - Widget context
         */
        initCssManager: function (ctx) {
            cssManager.init({
                scope:   scopeManager.getScope(),
                scopeId: scopeManager.getScopeId(),
                themeId: scopeManager.getThemeId(),
                iframeId: Constants.SELECTORS.IFRAME_ID
            }).catch(function (err) {
                log.error('CSS Manager init failed: ' + err);
            });
        },

        /**
         * Attach the one-time restoration — either immediately if cssManager is
         * already ready, or deferred until the bte:cssManagerReady event fires.
         *
         * @param {Object} ctx - Widget context
         */
        setupCssStateRestoration: function (ctx) {
            var self = this;

            if (cssManager.isReady()) {
                this.restoreCssState(ctx);
            } else {
                $(document).one('bte:cssManagerReady', function () {
                    self.restoreCssState(ctx);
                });
            }
        },

        // =====================================================================
        // State restoration
        // =====================================================================

        /**
         * Restore the CSS preview state that was persisted in localStorage.
         * Calls cssManager.switchTo() with the appropriate mode.
         *
         * @param {Object} ctx - Widget context
         */
        restoreCssState: function (ctx) {
            var self = this;
            var mode = this.determineCssMode(
                ctx.options.currentStatus,
                ctx.options.currentPublicationId
            );

            log.info('Restoring CSS state: mode=' + mode.mode +
                (mode.publicationId ? ' id=' + mode.publicationId : ''));

            var scopeCtx = { scope: scopeManager.getScope(), scopeId: scopeManager.getScopeId() };

            if (mode.mode === PUBLICATION_STATUS.PUBLICATION) {
                cssManager.switchTo(PUBLICATION_STATUS.PUBLICATION, mode.publicationId, scopeCtx)
                    .then(function () {
                        log.info('Restored PUBLICATION mode: ' + mode.publicationId);
                    })
                    .catch(function (error) {
                        log.error('Failed to restore publication: ' + error);
                        self.fallbackToDraft(ctx);
                    });
            } else if (mode.mode === PUBLICATION_STATUS.PUBLISHED) {
                cssManager.switchTo(PUBLICATION_STATUS.PUBLISHED, null, scopeCtx)
                    .then(function () {
                        log.info('Restored PUBLISHED mode');
                    })
                    .catch(function (error) {
                        log.error('Failed to restore published state: ' + error);
                    });
            } else {
                cssManager.switchTo(PUBLICATION_STATUS.DRAFT, null, scopeCtx)
                    .then(function () {
                        log.info('Restored DRAFT mode');
                    })
                    .catch(function (error) {
                        log.error('Failed to restore draft state: ' + error);
                    });
            }
        },

        /**
         * Fall back to DRAFT mode — used when a PUBLICATION restoration fails.
         *
         * @param {Object} ctx - Widget context
         */
        fallbackToDraft: function (ctx) {
            PublicationState.set(PUBLICATION_STATUS.DRAFT);
            ctx.options.currentStatus           = PublicationState.get();
            ctx.options.currentPublicationId    = null;
            ctx.options.currentPublicationTitle = null;

            StorageHelper.clearCurrentPublication();

            ctx.renderer.render(ctx._getState());
            ctx._applyPermissions();
        },

        // =====================================================================
        // Status switching
        // =====================================================================

        /**
         * Switch the CSS preview to a new status (DRAFT or PUBLISHED).
         * No-op when already in the requested status.
         *
         * @param {Object} ctx    - Widget context
         * @param {string} status - 'DRAFT' or 'PUBLISHED'
         */
        switchStatus: function (ctx, status) {
            if (status === ctx.options.currentStatus) {
                log.info('Already in ' + status + ' mode');
                ctx.renderer.closeDropdown();
                return;
            }

            loading.show(ctx.element);

            var scopeCtx = { scope: scopeManager.getScope(), scopeId: scopeManager.getScopeId() };

            cssManager.switchTo(status, null, scopeCtx).then(function () {
                PublicationState.set(status);
                ctx.options.currentStatus           = PublicationState.get();
                ctx.options.currentPublicationId    = null;
                ctx.options.currentPublicationTitle = null;

                StorageHelper.clearCurrentPublication();

                ctx.renderer.render(ctx._getState());
                ctx._applyPermissions();
                ctx.renderer.closeDropdown();

                log.info('Switched to ' + status);
                loading.hide(ctx.element);
            }).catch(function (error) {
                log.error('Failed to switch status: ' + error);
                errorHandler.handle(error, 'switch-status');
                loading.hide(ctx.element);
            });
        },

        /**
         * Load (preview) a specific historical publication by ID.
         *
         * @param {Object} ctx           - Widget context
         * @param {number} publicationId
         */
        loadPublication: function (ctx, publicationId) {
            var publication = ctx.metadataLoader.findPublicationById(
                ctx.options.publications,
                publicationId
            );

            if (!publication) {
                log.error('Publication not found: ' + publicationId);
                return;
            }

            loading.show(ctx.element);

            var scopeCtx = { scope: scopeManager.getScope(), scopeId: scopeManager.getScopeId() };

            cssManager.switchTo(PUBLICATION_STATUS.PUBLICATION, publicationId, scopeCtx).then(function () {
                PublicationState.set(PUBLICATION_STATUS.PUBLICATION);
                ctx.options.currentStatus           = PublicationState.get();
                ctx.options.currentPublicationId    = publicationId;
                ctx.options.currentPublicationTitle = publication.title;

                StorageHelper.setCurrentPublicationId(publicationId);
                StorageHelper.setCurrentPublicationTitle(publication.title);

                ctx.renderer.render(ctx._getState());
                ctx._applyPermissions();
                ctx.renderer.closeDropdown();

                log.info('Publication loaded: ' + publication.title);
                loading.hide(ctx.element);
            }).catch(function (error) {
                log.error('Failed to load publication: ' + error);
                errorHandler.handle(error, 'load-publication');
                loading.hide(ctx.element);
            });
        },

        // =====================================================================
        // Pure helper (unit-testable without widget context)
        // =====================================================================

        /**
         * Determine which CSS mode to restore based on persisted state.
         *
         * Returns { mode: string, publicationId: number|null }.
         *
         * @param  {string}      currentStatus        - 'DRAFT'|'PUBLISHED'|'PUBLICATION'
         * @param  {number|null} currentPublicationId
         * @return {{ mode: string, publicationId: number|null }}
         */
        determineCssMode: function (currentStatus, currentPublicationId) {
            if (currentStatus === PUBLICATION_STATUS.PUBLICATION && currentPublicationId) {
                return { mode: PUBLICATION_STATUS.PUBLICATION, publicationId: currentPublicationId };
            }

            if (currentStatus === PUBLICATION_STATUS.PUBLISHED) {
                return { mode: PUBLICATION_STATUS.PUBLISHED, publicationId: null };
            }

            // Default / DRAFT / unknown
            return { mode: PUBLICATION_STATUS.DRAFT, publicationId: null };
        }
    };
});
