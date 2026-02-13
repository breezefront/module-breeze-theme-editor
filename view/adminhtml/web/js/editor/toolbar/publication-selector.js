/**
 * Publication Selector Widget (Admin)
 * 
 * Simplified version for admin - loads publications via GraphQL,
 * switches CSS via css-manager module.
 */
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'mage/translate',
    'text!Swissup_BreezeThemeEditor/template/editor/publication-selector.html',
    'Swissup_BreezeThemeEditor/js/utils/permissions',
    'Swissup_BreezeThemeEditor/js/utils/error-handler',
    'Swissup_BreezeThemeEditor/js/utils/loading',
    'Swissup_BreezeThemeEditor/js/editor/css-manager',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-publications',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/publish',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/editor/storage-helper'
], function ($, widget, mageTemplate, $t, template, permissions, errorHandler, loading, cssManager, graphqlClient, getPublications, publishMutation, PanelState, Toastify, StorageHelper) {
    'use strict';

    $.widget('swissup.breezePublicationSelector', {
        options: {
            publications: [],           // Array loaded via GraphQL
            currentStatus: 'DRAFT',     // DRAFT | PUBLISHED | PUBLICATION
            changesCount: 0,            // Number of unsaved changes
            currentPublicationId: null, // Current publication ID
            currentPublicationTitle: null, // Current publication title
            storeId: null,
            themeId: null,
            publicationsPage: 1,        // Current page for pagination
            publicationsPageSize: 10    // Items per page
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
            
            // Initialize StorageHelper and restore state from localStorage
            if (this.storeId && this.themeId) {
                StorageHelper.init(this.storeId, this.themeId);
                
                // Restore state from localStorage
                this.options.currentStatus = StorageHelper.getCurrentStatus() || 'DRAFT';
                this.options.currentPublicationId = StorageHelper.getCurrentPublicationId();
                this.options.currentPublicationTitle = StorageHelper.getCurrentPublicationTitle();
                
                console.log('📦 State restored from localStorage:', {
                    status: this.options.currentStatus,
                    publicationId: this.options.currentPublicationId,
                    publicationTitle: this.options.currentPublicationTitle
                });
            }
            
            // Initialize CSS Manager
            cssManager.init({
                storeId: this.storeId,
                themeId: this.themeId,
                iframeId: 'bte-iframe'
            });
            
            this._render();
            this._bindEvents();
            this._bindGlobalEvents();
            
            // Load publications from GraphQL
            this._loadPublications();
            
            // Wait for CSS Manager to be ready before restoring state
            var self = this;
            if (cssManager.isReady()) {
                // Already ready - restore immediately
                this._restoreCssState();
            } else {
                // Wait for ready event
                $(document).one('bte:cssManagerReady', function() {
                    self._restoreCssState();
                });
            }
            
            console.log('✅ Publication selector initialized');
        },

        /**
         * Restore CSS state from localStorage
         * @private
         */
        _restoreCssState: function() {
            var self = this;
            
            console.log('🔄 Restoring CSS state from localStorage...');
            
            // Restore CSS state if PUBLICATION mode
            if (this.options.currentStatus === 'PUBLICATION' && this.options.currentPublicationId) {
                cssManager.switchTo('PUBLICATION', this.options.currentPublicationId).then(function() {
                    console.log('✅ Restored PUBLICATION mode:', self.options.currentPublicationId);
                }).catch(function(error) {
                    console.error('❌ Failed to restore publication:', error);
                    // Fallback to DRAFT if restoration fails
                    self.options.currentStatus = 'DRAFT';
                    self.options.currentPublicationId = null;
                    self.options.currentPublicationTitle = null;
                    StorageHelper.setCurrentStatus('DRAFT');
                    StorageHelper.clearCurrentPublication();
                    self._render();
                });
            } else if (this.options.currentStatus === 'PUBLISHED') {
                cssManager.switchTo('PUBLISHED').then(function() {
                    console.log('✅ Restored PUBLISHED mode');
                }).catch(function(error) {
                    console.error('❌ Failed to restore published state:', error);
                });
            }
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
                currentPublicationId: this.options.currentPublicationId,
                currentPublicationTitle: this.options.currentPublicationTitle,
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
         * Bind global events
         * @private
         */
        _bindGlobalEvents: function() {
            var self = this;
            
            // Listen: Draft saved → update changes count
            $(document).on('bte:saved', function(e, data) {
                console.log('📥 Draft saved event received');
                // Update changes count if provided
                if (data && typeof data.changesCount !== 'undefined') {
                    self.options.changesCount = data.changesCount;
                    self._render();
                }
            });
            
            // Listen: Published → reload publications + reset changes count
            $(document).on('bte:published', function(e, data) {
                console.log('📥 Published event received');
                self.options.currentStatus = 'PUBLISHED';
                self.options.changesCount = 0;
                
                // Add new publication to list if provided
                if (data && data.publicationId) {
                    var newPub = {
                        id: data.publicationId,
                        title: 'Publication #' + data.publicationId,
                        date: new Date().toLocaleString()
                    };
                    self.options.publications.unshift(newPub);
                }
                
                self._render();
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
            
            var self = this;
            
            // Show loading
            loading.show(this.element);
            
            // Switch CSS in preview
            cssManager.switchTo(status).then(function() {
                self.options.currentStatus = status;
                self.options.currentPublicationId = null; // Clear publication when switching to Draft/Published
                self.options.currentPublicationTitle = null;
                
                // Save to localStorage
                StorageHelper.setCurrentStatus(status);
                StorageHelper.clearCurrentPublication();
                
                self._render();
                self._closeDropdown();
                
                // Trigger event for other components to reload data
                $(document).trigger('bte:statusChanged', [status]);
                
                console.log('✅ Switched to ' + status);
                
                loading.hide(self.element);
            }).catch(function(error) {
                console.error('❌ Failed to switch status:', error);
                errorHandler.handle(error, 'switch-status');
                loading.hide(self.element);
            });
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
                Toastify.show('notice', $t('No changes to publish'));
                return;
            }
            
            // Check permission
            if (!permissions.canPublish()) {
                errorHandler.handle({
                    message: permissions.getPermissionMessage('publish')
                }, 'publish-draft');
                return;
            }
            
            // Check for unsaved changes
            if (!this._confirmUnsavedChanges()) {
                return;
            }
            
            // Prompt for title
            var title = prompt($t('Enter publication title:'));
            if (!title || !title.trim()) {
                console.log('❌ Publish cancelled (no title)');
                return;
            }
            
            this._executePublish(title.trim());
        },

        /**
         * Check if there are unsaved changes and confirm with user
         * @private
         * @returns {Boolean} - true if user confirmed or no unsaved changes
         */
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

        /**
         * Execute publish mutation
         * @private
         * @param {String} title - Publication title
         */
        _executePublish: function(title) {
            var self = this;
            
            console.log('📤 Publishing draft:', {
                title: title,
                storeId: this.storeId,
                themeId: this.themeId,
                savedChangesCount: this.options.changesCount
            });
            
            // Show loading state
            loading.show(this.element);
            
            // Use centralized mutation
            publishMutation(
                parseInt(this.storeId),
                parseInt(this.themeId),
                title,
                null, // description (optional)
                false // notifyUsers (optional)
            ).then(function(response) {
                if (response && response.publishBreezeThemeEditor) {
                    var result = response.publishBreezeThemeEditor;
                    
                    if (result.success) {
                        // Update UI
                        self.options.currentStatus = 'PUBLISHED';
                        self.options.changesCount = 0;
                        self._render();
                        
                        // Show success toast
                        Toastify.show('success', $t('Published successfully: %1').replace('%1', title));
                        
                        console.log('✅ Published:', result.publication);
                        
                        // Trigger event for other components
                        $(document).trigger('bte:published', {
                            publication: result.publication,
                            storeId: self.storeId,
                            themeId: self.themeId
                        });
                        
                        self._closeDropdown();
                        
                        // Reload publications list
                        self.options.publicationsPage = 1;
                        self._loadPublications();
                    } else {
                        self._onPublishError(result.message || 'Publish failed');
                    }
                }
            }).catch(function(error) {
                console.error('❌ Publish failed:', error);
                self._onPublishError(error.message || 'Unknown error');
                loading.hide(self.element);
            });
        },

        /**
         * Handle publish error
         * @private
         * @param {String} message - Error message
         */
        _onPublishError: function(message) {
            Toastify.show('error', $t('Publish failed: %1').replace('%1', message));
            errorHandler.handle({ message: message }, 'publish-draft');
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
            
            var self = this;
            
            // Show loading
            loading.show(this.element);
            
            // Switch CSS to publication
            cssManager.switchTo('PUBLICATION', publicationId).then(function() {
                // Update UI state
                self.options.currentStatus = 'PUBLICATION';
                self.options.currentPublicationId = publicationId;
                self.options.currentPublicationTitle = publication.title;
                
                // Save to localStorage
                StorageHelper.setCurrentStatus('PUBLICATION');
                StorageHelper.setCurrentPublicationId(publicationId);
                StorageHelper.setCurrentPublicationTitle(publication.title);
                
                self._render();
                self._closeDropdown();
                
                // Trigger event for other components
                $(document).trigger('bte:statusChanged', ['PUBLICATION', publicationId]);
                $(self.element).trigger('publicationLoaded', [publicationId, publication]);
                
                console.log('✅ Publication loaded:', publication.title);
                
                loading.hide(self.element);
            }).catch(function(error) {
                console.error('❌ Failed to load publication:', error);
                errorHandler.handle(error, 'load-publication');
                loading.hide(self.element);
            });
        },

        /**
         * Load publications from GraphQL
         * @private
         */
        _loadPublications: function() {
            var self = this;
            
            if (!this.storeId) {
                console.warn('⚠️ Cannot load publications: storeId missing');
                return;
            }
            
            console.log('📥 Loading publications (page ' + this.options.publicationsPage + ')...');
            
            // Use getPublications function
            getPublications(
                parseInt(this.storeId),
                parseInt(this.themeId) || null,
                this.options.publicationsPageSize,
                this.options.publicationsPage,
                null // search
            ).then(function(data) {
                console.log('✅ Publications loaded:', data);
                
                // Update publications list
                if (self.options.publicationsPage === 1) {
                    // First page - replace
                    self.options.publications = self._formatPublications(data.items || []);
                } else {
                    // Next pages - append
                    self.options.publications = self.options.publications.concat(
                        self._formatPublications(data.items || [])
                    );
                }
                
                // Store total count and page info
                self.totalPublications = data.total_count || 0;
                self.pageInfo = data.page_info || {};
                
                // Re-render
                self._render();
                
                console.log('✅ Loaded ' + self.options.publications.length + ' / ' + self.totalPublications + ' publications');
            }).catch(function(error) {
                console.error('❌ Failed to load publications:', error);
                // Don't show error to user - publications are optional
            });
        },

        /**
         * Format publications for template
         * @private
         */
        _formatPublications: function(items) {
            return items.map(function(pub) {
                var date = new Date(pub.publishedAt);
                return {
                    id: pub.publicationId,
                    title: pub.title || 'Publication #' + pub.publicationId,
                    date: date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    description: pub.description || '',
                    publishedBy: pub.publishedByName || pub.publishedByEmail || 'Unknown',
                    changesCount: pub.changesCount || 0
                };
            });
        },

        /**
         * Load more publications (pagination)
         * @private
         */
        _loadMorePublications: function() {
            console.log('📜 Loading more publications...');
            
            // Check if there are more pages
            if (this.options.publications.length >= this.totalPublications) {
                console.log('ℹ️ All publications loaded');
                return;
            }
            
            // Increment page and load
            this.options.publicationsPage++;
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
