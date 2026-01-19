/**
 * Publication Selector Widget
 * Main coordinator for UI, metadata loading, and publish functionality
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'Swissup_BreezeThemeEditor/js/toolbar/publication-selector/renderer',
    'Swissup_BreezeThemeEditor/js/toolbar/publication-selector/metadata-loader',
    'Swissup_BreezeThemeEditor/js/toolbar/publication-selector/publish-handler',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/storage-helper'
], function ($, widget, Renderer, MetadataLoader, PublishHandler, CssManager, StorageHelper) {
    'use strict';

    $.widget('swissup.publicationSelector', {
        options: {
            currentStatus: 'DRAFT',
            draftChangesCount: 0,
            currentPublicationId: null,
            currentPublicationTitle: null,
            lastPublishedAt: null,
            storeId: null,
            themeId: null
        },

        _create: function () {
            console.log('✅ Initializing Publication Selector');

            this._loadConfig();
            this._initModules();

            this.isDropdownOpen = false;

            this.renderer.render();
            this._bind();
            this._bindGlobalEvents();
            this.metadataLoader.load();
            this.metadataLoader.loadPublications();
        },

        _loadConfig: function() {
            var editorConfig = $('body').data('breeze-editor-config');
            if (editorConfig) {
                this.options.storeId = this.options.storeId || editorConfig.storeId;
                this.options.themeId = this.options.themeId || editorConfig.themeId;
            }

            // Initialize storage helper
            if (this.options.storeId && this.options.themeId) {
                StorageHelper.init(this.options.storeId, this.options.themeId);
            }

            this.options.currentStatus = StorageHelper.getCurrentStatus();
            this.options.currentPublicationId = StorageHelper.getCurrentPublicationId();
            this.options.currentPublicationTitle = StorageHelper.getCurrentPublicationTitle();

            console.log('📊 Config:', {
                storeId: this.options.storeId,
                themeId: this.options.themeId,
                currentStatus: this.options.currentStatus,
                'StorageHelper status': StorageHelper.getCurrentStatus()
            });
        },

        _initModules: function() {
            this.renderer = new Renderer(this.element, this.options);
            this.metadataLoader = new MetadataLoader(this.options, this.renderer);
            this.publishHandler = new PublishHandler(this.options, this.renderer, this.metadataLoader);
        },

        _bind: function () {
            var self = this;

            this.element.off('click');
            $(document).off('click.publicationSelector');

            this.element.on('click', '.toolbar-select', $.proxy(this._toggleDropdown, this));
            this.element.on('click', '[data-status]', $.proxy(this._switchStatus, this));
            this.element.on('click', '[data-publication-id]', $.proxy(this._loadPublication, this));
            this.element.on('click', '[data-action="publish"]', $.proxy(this.publishHandler.publish, this.publishHandler));
            this.element.on('click', '[data-action="load-more"]', $.proxy(this._loadMore, this));

            $(document).on('click.publicationSelector', function (e) {
                if (!self.element.is(e.target) && self.element.has(e.target).length === 0) {
                    self._closeDropdown();
                }
            });
        },

        /**
         * Bind global events (draft saved, published)
         */
        _bindGlobalEvents:  function() {
            var self = this;

            console.log('🎧 Binding global events for Publication Selector');

            // Listen: Draft saved → reload metadata
            $(document).on('themeEditorDraftSaved.publicationSelector', function(e, data) {
                console.log('📥 Draft saved event received:', data);
                self.metadataLoader.load();
            });

            // Listen: Published → reload metadata + publications
            $(document).on('themeEditorPublished.publicationSelector', function(e, data) {
                console.log('📥 Published event received:', data.publication);
                self.metadataLoader.load();
                self.metadataLoader.loadPublications();
            });

            console.log('✅ Global events bound');
        },

        _toggleDropdown: function (e) {
            e.preventDefault();
            e.stopPropagation();

            var isVisible = this.element.find('.toolbar-dropdown').hasClass('active');

            // ✅ Close all other dropdowns (sync with Page/Scope Selector)
            $('.toolbar-dropdown').removeClass('active');
            $('.toolbar-select').removeClass('active');

            if (!isVisible) {
                this._openDropdown();
            }
        },

        _openDropdown: function () {
            this.element.find('.toolbar-dropdown').addClass('active');
            this.element.find('.toolbar-select').addClass('active');
            this.isDropdownOpen = true;
            console.log('📂 Dropdown opened');
        },

        _closeDropdown:  function () {
            this.element.find('.toolbar-dropdown').removeClass('active');
            this.element.find('.toolbar-select').removeClass('active');
            this.isDropdownOpen = false;
        },

        _switchStatus: function (e) {
            e.preventDefault();
            var status = $(e.currentTarget).data('status');
            console.log('🔄 Switching to status:', status);

            StorageHelper.setCurrentStatus(status);
            StorageHelper.clearCurrentPublication();

            this.options.currentStatus = status;
            this.options.currentPublicationId = null;
            this.options.currentPublicationTitle = null;

            this.renderer.updateButton();
            this._closeDropdown();
            this.element.trigger('publicationStatusChanged', {status: status});
            
            // Update CSS manager
            CssManager.switchTo(status);
        },

        _loadPublication: function (e) {
            e.preventDefault();
            var publicationId = parseInt($(e.currentTarget).data('publication-id'), 10);
            console.log('📥 Loading publication:', publicationId);

            var publication = this.metadataLoader.publications.find(function (p) {
                return p.publicationId === publicationId;
            });

            if (!publication) {
                console.error('❌ Publication not found:', publicationId);
                return;
            }

            StorageHelper.setCurrentStatus('PUBLICATION');
            StorageHelper.setCurrentPublicationId(publicationId);
            StorageHelper.setCurrentPublicationTitle(publication.title);

            this.options.currentStatus = 'PUBLICATION';
            this.options.currentPublicationId = publicationId;
            this.options.currentPublicationTitle = publication.title;

            this.renderer.updateButton();
            this._closeDropdown();
            
            // Update CSS manager with publication CSS first, then load config
            CssManager.switchTo('PUBLICATION', publicationId).then(function() {
                console.log('✅ CSS switched to publication, now loading config');
                // Trigger config load after CSS is ready
                $(document).trigger('loadThemeEditorFromPublication', {publicationId: publicationId});
            }).catch(function(error) {
                console.error('❌ Failed to switch CSS to publication:', error);
                // Still try to load config even if CSS fails
                $(document).trigger('loadThemeEditorFromPublication', {publicationId: publicationId});
            });
        },

        _loadMore: function(e) {
            e.preventDefault();
            console.log('⬇️ Loading more publications');
            this.metadataLoader.loadMorePublications();
        },

        reloadPublications: function() {
            console.log('🔄 Reloading publications list');
            this.metadataLoader.loadPublications();
            this.metadataLoader.load();
        },

        reloadMetadata: function() {
            console.log('🔄 Reloading metadata (called from external)');
            this.metadataLoader.load();
        },

        _destroy: function () {
            $(document).off('click.publicationSelector');
            $(document).off('themeEditorDraftSaved.publicationSelector');
            $(document).off('themeEditorPublished.publicationSelector');
            this._super();
        }
    });

    return $.swissup.publicationSelector;
});
