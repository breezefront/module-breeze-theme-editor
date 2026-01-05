/**
 * Publication Selector Widget
 * Main coordinator for UI, metadata loading, and publish functionality
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'Swissup_BreezeThemeEditor/js/toolbar/publication-selector/renderer',
    'Swissup_BreezeThemeEditor/js/toolbar/publication-selector/metadata-loader',
    'Swissup_BreezeThemeEditor/js/toolbar/publication-selector/publish-handler'
], function ($, widget, Renderer, MetadataLoader, PublishHandler) {
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
            this.metadataLoader.load();
            this.metadataLoader.loadPublications();
        },

        _loadConfig: function() {
            var editorConfig = $('body').data('breeze-editor-config');
            if (editorConfig) {
                this.options.storeId = this.options.storeId || editorConfig.storeId;
                this.options.themeId = this.options.themeId || editorConfig.themeId;
            }

            this.options.currentStatus = localStorage.getItem('bte_current_status') || 'DRAFT';
            this.options.currentPublicationId = parseInt(localStorage.getItem('bte_current_publication_id')) || null;
            this.options.currentPublicationTitle = localStorage.getItem('bte_current_publication_title') || null;

            console.log('📊 Config:', {
                storeId: this.options.storeId,
                themeId: this.options.themeId,
                currentStatus: this.options.currentStatus
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
            this.element.on('click', '[data-action="history"]', $.proxy(this._openHistory, this));
            this.element.on('click', '[data-action="publish"]', $.proxy(this.publishHandler.publish, this.publishHandler));

            $(document).on('click.publicationSelector', function (e) {
                if (!self.element.is(e.target) && self.element.has(e.target).length === 0) {
                    self._closeDropdown();
                }
            });
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

            localStorage.setItem('bte_current_status', status);
            localStorage.removeItem('bte_current_publication_id');
            localStorage.removeItem('bte_current_publication_title');

            this.options.currentStatus = status;
            this.options.currentPublicationId = null;
            this.options.currentPublicationTitle = null;

            this.renderer.updateButton();
            this._closeDropdown();
            this.element.trigger('publicationStatusChanged', {status: status});
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

            localStorage.setItem('bte_current_status', 'PUBLICATION');
            localStorage.setItem('bte_current_publication_id', publicationId);
            localStorage.setItem('bte_current_publication_title', publication.title);

            this.options.currentStatus = 'PUBLICATION';
            this.options.currentPublicationId = publicationId;
            this.options.currentPublicationTitle = publication.title;

            this.renderer.updateButton();
            this._closeDropdown();
            this.element.trigger('loadThemeEditorFromPublication', {publicationId: publicationId});
        },

        _openHistory: function (e) {
            e.preventDefault();
            console.log('📜 Opening publication history modal');
            this._closeDropdown();
            this.element.trigger('openPublicationHistoryModal');
        },

        updateChangesCount: function (count) {
            console.log('🔄 Updating changes count:', count);

            var oldCount = this.options.draftChangesCount;
            this.options.draftChangesCount = count;

            var shouldShowBefore = oldCount > 0 && this.options.currentStatus === 'DRAFT';
            var shouldShowAfter = count > 0 && this.options.currentStatus === 'DRAFT';

            if (shouldShowBefore !== shouldShowAfter) {
                console.log('🔄 Publish button visibility changed, re-rendering');
                this.renderer.render();
                this._bind();
                this.metadataLoader.renderPublications();
            } else {
                this.renderer.updateBadge();
            }
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
            this._super();
        }
    });

    return $.swissup.publicationSelector;
});
