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

        loadPublications: function() {
            var self = this;
            if (!this.options.storeId || !this.options.themeId) {
                console.warn('⚠️ Cannot load publications');
                return;
            }

            console.log('📥 Loading publications...');

            getPublications(this.options.storeId, this.options.themeId, 5)
                .then(function(data) {
                    self.publications = data.items || [];
                    self.publicationsLoaded = true;
                    console.log('✅ Publications loaded:', self.publications.length);
                    self.renderPublications();
                })
                .catch(function(error) {
                    console.error('❌ Failed to load publications:', error);
                    self.publicationsLoaded = true;
                    self.renderPublicationsError();
                });
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

                    html += '<a href="#" class="dropdown-item" data-publication-id="' + pub.publicationId + '">';
                    html += '  <span class="item-icon">📦</span>';
                    html += '  <span class="item-content">';
                    html += '    <span class="item-title">' + safeTitle + '</span>';
                    html += '    <span class="item-meta">' + dateStr + '</span>';
                    html += '  </span>';
                    html += '</a>';
                });
            }

            this.renderer.element.find('.publications-list').html(html);
        },

        renderPublicationsError: function() {
            var html = '<div class="dropdown-error">' + $t('Failed to load publications') + '</div>';
            this.renderer.element.find('.publications-list').html(html);
        }
    };

    return MetadataLoader;
});
