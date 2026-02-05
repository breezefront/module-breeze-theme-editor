/**
 * Publication Selector Widget
 * 
 * Allows switching between Draft and Published states,
 * viewing publication history, and publishing changes.
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/publication-selector.html'
], function ($, mageTemplate, template) {
    'use strict';

    $.widget('swissup.breezePublicationSelector', {
        options: {
            publications: [],           // Array from ViewModel
            currentStatus: 'DRAFT',     // DRAFT | PUBLISHED
            changesCount: 0,            // Number of unsaved changes
            currentPublicationId: null, // Current publication ID
            graphqlEndpoint: '/graphql' // Admin GraphQL endpoint
        },

        /**
         * Widget initialization
         * @private
         */
        _create: function() {
            console.log('🎨 Initializing publication selector', this.options);
            this._render();
            this._bindEvents();
            console.log('✅ Publication selector initialized');
        },

        /**
         * Render widget HTML
         * @private
         */
        _render: function() {
            var html = mageTemplate(template, {
                status: this.options.currentStatus,
                changesCount: this.options.changesCount,
                publications: this.options.publications,
                canPublish: this.options.changesCount > 0 && this.options.currentStatus === 'DRAFT'
            });
            this.element.html(html);
        },

        /**
         * Bind event handlers
         * @private
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
                var status = $(this).data('status');
                self._switchStatus(status);
            });

            // Publish changes
            this.element.on('click', '[data-action="publish"]', function(e) {
                e.preventDefault();
                self._publishChanges();
            });

            // Load publication
            this.element.on('click', '[data-publication-id]', function(e) {
                e.preventDefault();
                var publicationId = $(this).data('publication-id');
                self._loadPublication(publicationId);
            });

            // Load more publications
            this.element.on('click', '[data-action="load-more"]', function(e) {
                e.preventDefault();
                self._loadMorePublications();
            });

            // Close dropdown when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest(self.element).length) {
                    self._closeDropdown();
                }
            });
        },

        /**
         * Toggle dropdown visibility
         * @private
         */
        _toggleDropdown: function() {
            var $dropdown = this.element.find('.toolbar-dropdown');
            var isVisible = $dropdown.is(':visible');
            
            // Close all other dropdowns first
            $('.toolbar-dropdown').not($dropdown).hide();
            
            // Toggle this dropdown
            $dropdown.toggle();
            
            console.log(isVisible ? '🔽 Closing publication dropdown' : '🔼 Opening publication dropdown');
        },

        /**
         * Close dropdown
         * @private
         */
        _closeDropdown: function() {
            this.element.find('.toolbar-dropdown').hide();
        },

        /**
         * Switch between Draft and Published status
         * @param {string} status - DRAFT or PUBLISHED
         * @private
         */
        _switchStatus: function(status) {
            console.log('🔄 Switching to status:', status);
            
            if (status === this.options.currentStatus) {
                console.log('ℹ️ Already in ' + status + ' mode');
                this._closeDropdown();
                return;
            }
            
            this.options.currentStatus = status;
            this._render();
            this._closeDropdown();
            
            // TODO Phase 2: Trigger GraphQL query to load DRAFT or PUBLISHED data
            $(this.element).trigger('statusChanged', [status]);
            
            console.log('✅ Switched to ' + status);
        },

        /**
         * Publish draft changes
         * @private
         */
        _publishChanges: function() {
            console.log('📤 Publishing changes...');
            
            if (this.options.changesCount === 0) {
                console.warn('⚠️ No changes to publish');
                return;
            }
            
            // TODO Phase 2: GraphQL mutation to publish
            // For now, just simulate success
            var message = 'Publish functionality will be implemented in Phase 2 (GraphQL mutations).\n\n' +
                         'This will save ' + this.options.changesCount + ' changes to production.';
            alert(message);
            
            // Simulate successful publish
            this.options.changesCount = 0;
            this.options.currentStatus = 'PUBLISHED';
            this._render();
            this._closeDropdown();
            
            $(this.element).trigger('published');
            console.log('✅ Changes published (simulated)');
        },

        /**
         * Load a specific publication
         * @param {number} publicationId
         * @private
         */
        _loadPublication: function(publicationId) {
            console.log('📥 Loading publication:', publicationId);
            
            // Find publication data
            var publication = null;
            this.options.publications.forEach(function(pub) {
                if (pub.id == publicationId) {
                    publication = pub;
                }
            });
            
            if (!publication) {
                console.error('❌ Publication not found:', publicationId);
                return;
            }
            
            // TODO Phase 2: GraphQL query to load publication data
            var message = 'Load publication functionality will be implemented in Phase 2.\n\n' +
                         'This would load: ' + publication.title;
            alert(message);
            
            this._closeDropdown();
            
            $(this.element).trigger('publicationLoaded', [publicationId, publication]);
        },

        /**
         * Load more publications (pagination)
         * @private
         */
        _loadMorePublications: function() {
            console.log('📜 Loading more publications...');
            
            // TODO Phase 2: GraphQL query with pagination
            alert('Load more publications will be implemented in Phase 2 (GraphQL pagination).');
        },

        /**
         * Public API: Update changes count
         * @param {number} count
         */
        updateChangesCount: function(count) {
            console.log('🔢 Updating changes count:', count);
            this.options.changesCount = count;
            this._render();
        },

        /**
         * Public API: Set publication status
         * @param {string} status - DRAFT or PUBLISHED
         */
        setStatus: function(status) {
            console.log('📝 Setting status:', status);
            this.options.currentStatus = status;
            this._render();
        },

        /**
         * Public API: Add publication to list
         * @param {object} publication
         */
        addPublication: function(publication) {
            console.log('➕ Adding publication:', publication);
            this.options.publications.unshift(publication);
            this._render();
        }
    });

    return $.swissup.breezePublicationSelector;
});
