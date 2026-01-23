/**
 * Publication Selector - Metadata Loader Module
 * Handles API calls for metadata and publications
 */
define([
    'jquery',
    'mage/translate',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-publications',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config'
], function ($, $t, getPublications, getConfig) {
    'use strict';

    function MetadataLoader(options, renderer) {
        this.options = options;
        this.renderer = renderer;
        this.publications = [];
        this.publicationsLoaded = false;
        this.currentPage = 1;
        this.pageSize = 5;
        this.totalCount = 0;
    }

    MetadataLoader.prototype = {
        load: function() {
            var self = this;
            if (!this.options.storeId || !this.options.themeId) {
                console.warn('⚠️ Cannot load metadata: storeId or themeId missing');
                return;
            }

            console.log('📥 Loading metadata...');

            getConfig(this.options.storeId, this.options.themeId, 'DRAFT')
                .then(function(data) {
                    var config = data.breezeThemeEditorConfig;
                    var oldCount = self.options.draftChangesCount;

                    self.options.draftChangesCount = config.metadata.draftChangesCount || 0;
                    self.options.lastPublishedAt = config.metadata.lastPublished || null;

                    console.log('📊 Metadata loaded:', {
                        oldCount: oldCount,
                        newCount: self.options.draftChangesCount,
                        lastPublishedAt: self.options.lastPublishedAt
                    });

                    // Force re-render to update Publish button visibility
                    self.renderer.render();

                    if (self.publicationsLoaded) {
                        self.renderPublications();
                    }
                })
                .catch(function(error) {
                    console.error('❌ Failed to load metadata:', error);
                });
        },

        loadPublications: function(append) {
            var self = this;
            if (!this.options.storeId || !this.options.themeId) {
                console.warn('⚠️ Cannot load publications');
                return;
            }

            console.log('📥 Loading publications (page %1)...', this.currentPage);

            getPublications(this.options.storeId, this.options.themeId, this.pageSize, this.currentPage)
                .then(function(data) {
                    if (append) {
                        // Append to existing (Load More)
                        self.publications = self.publications.concat(data.items || []);
                        console.log('➕ Appended publications: %1 total', self.publications.length);
                    } else {
                        // Replace (Initial load or refresh)
                        self.publications = data.items || [];
                        self.currentPage = 1;
                        console.log('✅ Publications loaded: %1', self.publications.length);
                    }

                    self.totalCount = data.total_count || 0;
                    self.publicationsLoaded = true;

                    self.renderPublications();
                    self._updateLoadMoreButton();
                })
                .catch(function(error) {
                    console.error('❌ Failed to load publications:', error);
                    self.publicationsLoaded = true;
                    self.renderPublicationsError();
                });
        },

        loadMorePublications: function() {
            if (this.publications.length >= this.totalCount) {
                console.log('ℹ️ All publications already loaded');
                return;
            }

            this.currentPage++;
            this.loadPublications(true);
        },

        renderPublications: function() {
            var html = '';

            if (this.publications.length === 0) {
                html = '<div class="dropdown-empty">' + $t('No publications yet') + '</div>';
            } else {
                this.publications.forEach(function(pub) {
                    var date = new Date(pub.publishedAt);
                    var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    var safeTitle = $('<div>').text(pub.title).html();
                    
                    // Check if this publication is currently active
                    var isActive = this.options.currentStatus === 'PUBLICATION' 
                                   && this.options.currentPublicationId === pub.publicationId;

                    html += '<a href="#" class="dropdown-item" data-publication-id="' + pub.publicationId + '">';
                    html += '  <span class="item-icon">📦</span>';
                    html += '  <span class="item-content">';
                    html += '    <span class="item-title">' + safeTitle + '</span>';
                    html += '    <span class="item-meta">' + dateStr + '</span>';
                    html += '  </span>';
                    
                    // Add checkmark if this publication is active
                    if (isActive) {
                        html += '  <span class="item-check">✓</span>';
                    }
                    
                    html += '</a>';
                }.bind(this)); // Bind context to access this.options
            }

            this.renderer.element.find('.publications-list').html(html);
            
            // Update checkmarks after rendering publications list
            if (this.renderer.updateCheckmarks) {
                this.renderer.updateCheckmarks();
            }
        },

        renderPublicationsError: function() {
            var html = '<div class="dropdown-error">' + $t('Failed to load publications') + '</div>';
            this.renderer.element.find('.publications-list').html(html);
        },

        _updateLoadMoreButton: function() {
            var $loadMore = this.renderer.element.find('[data-action="load-more"]');
            var $allLoaded = this.renderer.element.find('[data-status="all-loaded"]');
            var $count = $loadMore.find('.item-meta');

            if (this.publications.length >= this.totalCount) {
                // All loaded → hide "Load More", show "All Loaded"
                $loadMore.hide();
                $allLoaded.show();
                console.log('✅ All %1 publications loaded', this.totalCount);
            } else {
                // Show "Load More" with count
                $loadMore.show();
                $allLoaded.hide();
                $count.text($t('Showing %1 of %2')
                    .replace('%1', this.publications.length)
                    .replace('%2', this.totalCount));
            }
        }
    };

    return MetadataLoader;
});
