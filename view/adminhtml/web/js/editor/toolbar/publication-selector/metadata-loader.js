/**
 * Publication Selector Metadata Loader Module
 * Handles loading publications list and changes count via GraphQL
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-publications',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function($, getPublications, getConfig, Logger) {
    'use strict';

    var log = Logger.for('toolbar/publication-selector/metadata-loader');

    return {
        /**
         * Initialize loader
         * @param {Object} options
         * @param {number} options.storeId
         * @param {number} options.themeId
         * @param {number} options.pageSize
         */
        init: function(options) {
            this.storeId = options.storeId;
            this.themeId = options.themeId;
            this.pageSize = options.pageSize || 10;
            
            log.debug('Metadata loader initialized: storeId=' + this.storeId + ' themeId=' + this.themeId + ' pageSize=' + this.pageSize);
            
            return this;
        },

        /**
         * Load draft metadata (draftChangesCount) and published metadata (modifiedCount)
         * in parallel via two GraphQL requests.
         * Called on init and after published event to keep the counts in sync.
         *
         * @returns {Promise<Object>} Promise with {draftChangesCount, modifiedCount, lastPublished}
         */
        loadMetadata: function() {
            if (!this.storeId) {
                log.warn('Cannot load metadata: storeId missing');
                return $.Deferred().reject('Store ID missing').promise();
            }

            log.info('Loading draft + published metadata...');

            var storeId = parseInt(this.storeId);
            var themeId = parseInt(this.themeId) || null;

            var draftRequest = getConfig(storeId, themeId, 'DRAFT');
            var publishedRequest = getConfig(storeId, themeId, 'PUBLISHED');

            return $.when(draftRequest, publishedRequest).then(function(draftData, publishedData) {
                var draftMeta     = draftData.breezeThemeEditorConfig.metadata;
                var publishedMeta = publishedData.breezeThemeEditorConfig.metadata;

                var result = {
                    draftChangesCount: draftMeta.draftChangesCount || 0,
                    modifiedCount:     publishedMeta.modifiedCount  || 0,
                    lastPublished:     draftMeta.lastPublished       || null
                };

                log.debug(
                    'Metadata loaded: draftChangesCount=' + result.draftChangesCount +
                    ' modifiedCount=' + result.modifiedCount
                );

                return result;
            }).catch(function(error) {
                log.error('Failed to load metadata: ' + error);
                throw error;
            });
        },

        /**
         * Load publications list via GraphQL
         * @param {number} page - Page number (1-based)
         * @param {string|null} search - Optional search query
         * @returns {Promise<Object>} Promise with {items, total_count, page_info}
         */
        loadPublications: function(page, search) {
            page = page || 1;
            search = search || null;
            
            if (!this.storeId) {
                log.warn('Cannot load publications: storeId missing');
                return $.Deferred().reject('Store ID missing').promise();
            }
            
            log.info('Loading publications (page ' + page + ')...');
            
            var self = this;
            
            // Use getPublications function
            return getPublications(
                parseInt(this.storeId),
                parseInt(this.themeId) || null,
                this.pageSize,
                page,
                search
            ).then(function(data) {
                log.debug('Publications loaded: page=' + page + ' count=' + (data.items ? data.items.length : 0) + ' total=' + data.total_count);
                
                // Format publications for UI
                return {
                    items: self._formatPublications(data.items || []),
                    total_count: data.total_count || 0,
                    page_info: data.page_info || {}
                };
            }).catch(function(error) {
                log.error('Failed to load publications: ' + error);
                throw error;
            });
        },

        /**
         * Format publications for template
         * @private
         * @param {Array} items - Raw publication items from GraphQL
         * @returns {Array} Formatted publications
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
                    changesCount: pub.changesCount || 0,
                    // Extract emoji if present in title
                    emoji: this._extractEmoji(pub.title)
                };
            }, this);
        },

        /**
         * Extract emoji from title
         * @private
         * @param {string} title
         * @returns {string}
         */
        _extractEmoji: function(title) {
            if (!title) {
                return '';
            }
            var match = title.match(/[\u{1F300}-\u{1F9FF}]/u);
            return match ? match[0] : '';
        },

        /**
         * Find publication by ID in the list
         * @param {Array} publications - List of publications
         * @param {number|string} publicationId
         * @returns {Object|null}
         */
        findPublicationById: function(publications, publicationId) {
            if (!publications || !publications.length) {
                return null;
            }
            
            for (var i = 0; i < publications.length; i++) {
                if (publications[i].id == publicationId) {
                    return publications[i];
                }
            }
            
            return null;
        },

        /**
         * Get publication title by ID
         * @param {Array} publications - List of publications
         * @param {number|string} publicationId
         * @returns {string}
         */
        getPublicationTitle: function(publications, publicationId) {
            var publication = this.findPublicationById(publications, publicationId);
            return publication ? publication.title : 'Publication #' + publicationId;
        }
    };
});
