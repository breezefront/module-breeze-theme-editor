/**
 * Publication Selector Widget
 * 
 * Allows switching between Draft and Published states,
 * viewing publication history, and publishing changes.
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/publication-selector.html',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-publications',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/publish',
    'Swissup_BreezeThemeEditor/js/utils/permissions',
    'Swissup_BreezeThemeEditor/js/utils/error-handler',
    'Swissup_BreezeThemeEditor/js/utils/loading'
], function ($, mageTemplate, template, graphqlClient, getPublicationsQuery, publishMutation, permissions, errorHandler, loading) {
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
            
            // Get store and theme IDs from config
            var config = window.breezeThemeEditorConfig || {};
            this.storeId = config.storeId || this.options.storeId;
            this.themeId = config.themeId || this.options.themeId;
            
            this._render();
            this._bindEvents();
            
            // Load publications from GraphQL on init
            this._loadPublications();
            
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
                canPublish: permissions.canPublish() && 
                           this.options.changesCount > 0 && 
                           this.options.currentStatus === 'DRAFT',
                canRollback: permissions.canRollback()
            });
            this.element.html(html);
            
            // Apply permission restrictions after render
            this._applyPermissions();
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
            
            // Trigger event for other components to reload data
            $(document).trigger('bte:statusChanged', [status]);
            
            console.log('✅ Switched to ' + status);
        },

        /**
         * Apply ACL permissions to UI elements
         * @private
         */
        _applyPermissions: function() {
            var $publishBtn = this.element.find('[data-action="publish"]');
            var $rollbackBtns = this.element.find('[data-action="rollback"]');
            
            // Apply permissions to publish button
            if ($publishBtn.length && !permissions.canPublish()) {
                permissions.applyToElement($publishBtn, 'publish');
            }
            
            // Apply permissions to rollback buttons
            if ($rollbackBtns.length && !permissions.canRollback()) {
                $rollbackBtns.each(function() {
                    permissions.applyToElement($(this), 'rollback');
                });
            }
        },

        /**
         * Publish draft changes via GraphQL
         * @private
         */
        _publishChanges: function() {
            console.log('📤 Publishing changes...');
            
            if (this.options.changesCount === 0) {
                console.warn('⚠️ No changes to publish');
                return;
            }
            
            // Check permission
            if (!permissions.canPublish()) {
                errorHandler.handle({
                    message: permissions.getPermissionMessage('publish')
                }, 'publish-draft');
                return;
            }
            
            var self = this;
            
            // Show loading state
            loading.show(this.element);
            
            // Execute GraphQL mutation
            graphqlClient.mutate(publishMutation, {
                storeId: parseInt(this.storeId),
                themeId: parseInt(this.themeId)
            }).then(function(response) {
                if (response.data && response.data.publishBreezeThemeEditor) {
                    var result = response.data.publishBreezeThemeEditor;
                    
                    if (result.success) {
                        // Update UI
                        self.options.currentStatus = 'PUBLISHED';
                        self.options.changesCount = 0;
                        self._render();
                        
                        // Show success message
                        console.log('✅', result.message);
                        
                        // Trigger event for other components
                        $(document).trigger('bte:published', {
                            publicationId: result.publicationId,
                            storeId: self.storeId,
                            themeId: self.themeId
                        });
                        
                        // Reload publications list
                        self._loadPublications();
                        
                        self._closeDropdown();
                    } else {
                        errorHandler.handle({
                            message: result.message || 'Publish failed'
                        }, 'publish-draft');
                    }
                }
            }).catch(function(error) {
                errorHandler.handle(error, 'publish-draft');
            }).finally(function() {
                loading.hide(self.element);
            });
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
            
            // Trigger event - other components will handle loading the actual data
            // (This is intentional: publication-selector manages UI, panel handles data loading)
            $(this.element).trigger('publicationLoaded', [publicationId, publication]);
            
            this._closeDropdown();
            
            console.log('✅ Publication selected:', publication.title);
        },

        /**
         * Load publications from GraphQL
         * @private
         */
        _loadPublications: function() {
            var self = this;
            
            // Don't show loading for initial load (to avoid UI flicker)
            // loading.show(this.element);
            
            graphqlClient.query(getPublicationsQuery, {
                storeId: parseInt(this.storeId),
                themeId: parseInt(this.themeId),
                pageSize: 10,
                currentPage: this.options.publicationsPage || 1
            }).then(function(response) {
                if (response.data && response.data.breezeThemeEditorPublications) {
                    var publications = response.data.breezeThemeEditorPublications.items || [];
                    
                    // Append or replace
                    if (self.options.publicationsPage > 1) {
                        self.options.publications = self.options.publications.concat(publications);
                    } else {
                        self.options.publications = publications;
                    }
                    
                    self._render();
                    console.log('✅ Loaded', publications.length, 'publications');
                }
            }).catch(function(error) {
                console.error('Failed to load publications:', error);
                // Don't show error to user - publications are optional
            }).finally(function() {
                // loading.hide(self.element);
            });
        },

        /**
         * Load more publications (pagination)
         * @private
         */
        _loadMorePublications: function() {
            console.log('📜 Loading more publications...');
            
            // Increment page number
            this.options.publicationsPage = (this.options.publicationsPage || 1) + 1;
            
            // Load next page
            this._loadPublications();
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
