define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'mage/translate',
    'text!Swissup_BreezeThemeEditor/template/toolbar/publication-selector.html',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-publications',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config'
], function ($, widget, mageTemplate, $t, publicationSelectorTemplate, getPublications, getConfig) {
    'use strict';

    $.widget('swissup.publicationSelector', {
        options: {
            currentStatus: 'DRAFT',
            draftChangesCount: 0,
            currentPublicationId:  null,
            currentPublicationTitle: null,
            lastPublishedAt: null,
            storeId: null,
            themeId: null
        },

        _create: function () {
            console.log('✅ Initializing Publication Selector');
            var editorConfig = $('body').data('breeze-editor-config');
            if (editorConfig) {
                this.options.storeId = this.options.storeId || editorConfig.storeId;
                this.options.themeId = this.options.themeId || editorConfig.themeId;
            }

            this.options.currentStatus = localStorage.getItem('bte_current_status') || this.options.currentStatus || 'DRAFT';
            this.options.currentPublicationId = parseInt(localStorage.getItem('bte_current_publication_id')) || this.options.currentPublicationId || null;
            this.options.currentPublicationTitle = localStorage.getItem('bte_current_publication_title') || this.options.currentPublicationTitle || null;

            console.log('📊 Config:', {
                storeId: this.options.storeId,
                themeId: this.options.themeId,
                currentStatus: this.options.currentStatus
            });

            this.template = mageTemplate(publicationSelectorTemplate);
            this.publications = [];
            this.isDropdownOpen = false;

            this._render();
            this._bind();
            this._loadMetadata();
            this._loadPublications();
        },

        /**
         * ✅ Завантажити metadata (draftChangesCount, lastPublishedAt) через GraphQL
         */
        _loadMetadata: function () {
            var self = this;

            if (!this.options.storeId || !this.options.themeId) {
                console.warn('⚠️ Cannot load metadata: storeId or themeId missing');
                return;
            }

            getConfig(this.options.storeId, this.options.themeId, 'DRAFT')
                .then(function (data) {
                    var config = data.breezeThemeEditorConfig;
                    self.options.draftChangesCount = config.metadata.draftChangesCount || 0;
                    self.options.lastPublishedAt = config.metadata.lastPublished || null;

                    console.log('📊 Metadata loaded:', {
                        draftChangesCount: self.options.draftChangesCount,
                        lastPublishedAt: self.options.lastPublishedAt
                    });

                    // Оновити badge
                    self._updateBadge();
                })
                .catch(function (error) {
                    console.error('❌ Failed to load metadata:', error);
                });
        },

        _render: function () {
            var html = this.template({
                data: {
                    label: this._getLabel(),
                    badge: this._getBadge(),
                    statusClass: this._getStatusClass(),
                    hasDropdown: true,
                    i18n: {
                        switchPublication: $t('Switch Publication'),
                        draft: $t('Draft'),
                        published: $t('Published'),
                        recentPublications: $t('Recent Publications'),
                        loading: $t('Loading...'),
                        viewAll: $t('View All Publications')
                    }
                }
            });

            this.element.html(html);

            this.$button = this.element.find('.toolbar-select');
            this.$dropdown = this.element.find('.toolbar-dropdown');
            this.$publicationsList = this.element.find('.publications-list');
        },

        _getLabel: function () {
            if (this.options.currentStatus === 'DRAFT') {
                return $t('Draft');
            }
            if (this.options.currentStatus === 'PUBLISHED') {
                return $t('Published');
            }
            if (this.options.currentStatus === 'PUBLICATION' && this.options.currentPublicationTitle) {
                return this.options.currentPublicationTitle;
            }
            return $t('Draft');
        },

        _getBadge: function () {
            var count = this.options.draftChangesCount;

            if (this.options.currentStatus === 'DRAFT') {
                return count > 0
                    ? $t('(%1 changes)').replace('%1', count)
                    : $t('(no changes)');
            }
            if (this.options.currentStatus === 'PUBLISHED') {
                return count > 0
                    ?  $t('(%1 unpublished)').replace('%1', count)
                    : $t('(live)');
            }
            if (this.options.currentStatus === 'PUBLICATION') {
                return $t('(loaded from history)');
            }
            return '';
        },

        _getStatusClass: function () {
            var map = {
                'DRAFT': 'status-draft',
                'PUBLISHED': 'status-published',
                'PUBLICATION': 'status-historical'
            };
            return map[this.options.currentStatus] || '';
        },

        /**
         * ✅ Оновити тільки badge (без full re-render)
         */
        _updateBadge: function () {
            var newBadge = this._getBadge();
            var $badge = this.$button.find('.select-badge');

            if (newBadge) {
                if ($badge.length) {
                    $badge.text(newBadge);
                } else {
                    this.$button.find('.select-label').after('<span class="select-badge">' + newBadge + '</span>');
                }
            } else {
                $badge.remove();
            }

            console.log('🔄 Badge updated:', newBadge);
        },

        _bind: function () {
            var self = this;

            // Unbind old events first
            this.$button.off('click');
            this.element.off('click');
            $(document).off('click.publicationSelector');

            // Toggle dropdown
            this.$button.on('click', $.proxy(this._toggleDropdown, this));

            // Close on outside click
            $(document).on('click.publicationSelector', function (e) {
                if (!self.element.is(e.target) && self.element.has(e.target).length === 0) {
                    self._closeDropdown();
                }
            });

            // Switch status
            this.element.on('click', '[data-status]', $.proxy(this._switchStatus, this));

            // Load publication
            this.element.on('click', '[data-publication-id]', $.proxy(this._loadPublication, this));

            // Open history
            this.element.on('click', '[data-action="history"]', $.proxy(this._openHistory, this));
        },

        _toggleDropdown: function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (this.isDropdownOpen) {
                this._closeDropdown();
            } else {
                this._openDropdown();
            }
        },

        _openDropdown: function () {
            this.$dropdown.slideDown(200);
            this.$button.addClass('active');
            this.isDropdownOpen = true;
            console.log('📂 Dropdown opened');
        },

        _closeDropdown: function () {
            this.$dropdown.slideUp(200);
            this.$button.removeClass('active');
            this.isDropdownOpen = false;
        },

        _loadPublications: function () {
            var self = this;

            if (!this.options.storeId || !this.options.themeId) {
                console.warn('⚠️ storeId or themeId not set');
                return;
            }

            console.log('📥 Loading publications... ', {
                storeId:  this.options.storeId,
                themeId: this.options.themeId
            });

            getPublications(this.options.storeId, this.options.themeId, 5)
                .then(function (data) {
                    self.publications = data.items || [];
                    console.log('✅ Publications loaded:', self.publications.length);
                    self._renderPublications();
                })
                .catch(function (error) {
                    console.error('❌ Failed to load publications:', error);
                    self._renderPublicationsError();
                });
        },

        _renderPublications: function () {
            var html = '';

            if (this.publications.length === 0) {
                html = '<div class="dropdown-empty">' + $t('No publications yet') + '</div>';
            } else {
                this.publications.forEach(function (pub) {
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

            this.$publicationsList.html(html);
        },

        _renderPublicationsError: function () {
            var html = '<div class="dropdown-error">' + $t('Failed to load publications') + '</div>';
            this.$publicationsList.html(html);
        },

        _switchStatus: function (e) {
            e.preventDefault();
            var status = $(e.currentTarget).data('status');

            console.log('🔄 Switching to status:', status);

            // ✅ Зберегти в localStorage
            localStorage.setItem('bte_current_status', status);
            localStorage.removeItem('bte_current_publication_id');
            localStorage.removeItem('bte_current_publication_title');

            this.options.currentStatus = status;
            this.options.currentPublicationId = null;
            this.options.currentPublicationTitle = null;

            this._render();
            this._bind();
            this._closeDropdown();

            this.element.trigger('publicationStatusChanged', { status: status });
        },

        _loadPublication: function (e) {
            e.preventDefault();
            var publicationId = parseInt($(e.currentTarget).data('publication-id'), 10);

            console.log('📥 Loading publication:', publicationId);

            var publication = this.publications.find(function (p) {
                return p.publicationId === publicationId;
            });

            if (!publication) {
                console.error('❌ Publication not found:', publicationId);
                return;
            }

            // ✅ Зберегти в localStorage
            localStorage.setItem('bte_current_status', 'PUBLICATION');
            localStorage.setItem('bte_current_publication_id', publicationId);
            localStorage.setItem('bte_current_publication_title', publication.title);

            this.options.currentStatus = 'PUBLICATION';
            this.options.currentPublicationId = publicationId;
            this.options.currentPublicationTitle = publication.title;

            this._render();
            this._bind();
            this._closeDropdown();

            this.element.trigger('publicationSelected', {
                publicationId: publicationId,
                publication: publication
            });
        },

        _openHistory: function (e) {
            e.preventDefault();
            console.log('📜 Opening publication history modal');

            this._closeDropdown();
            this.element.trigger('publicationHistoryRequested');
        },

        /**
         * ✅ Public method: оновити changes count (викликається з panel.js)
         */
        updateChangesCount: function (count) {
            console.log('🔄 Updating changes count:', count);

            this.options.draftChangesCount = count;
            this._updateBadge();
        },

        _destroy: function () {
            $(document).off('click.publicationSelector');
            this._super();
        }
    });

    return $.swissup.publicationSelector;
});
