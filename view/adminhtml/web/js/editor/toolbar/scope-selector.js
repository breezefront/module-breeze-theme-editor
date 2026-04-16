/**
 * Scope Selector Widget
 *
 * Allows switching between Default / Website / Store View scopes
 * with hierarchical display: Default → Website → Store Group → Store View
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/scope-selector.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/cookie-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/url-builder',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, mageTemplate, template, cookieManager, scopeManager, urlBuilder, Logger, Constants) {
    'use strict';

    var log = Logger.for('toolbar/scope-selector');

    $.widget('swissup.breezeScopeSelector', {
        options: {
            websites: [],            // Hierarchical store data from StoreDataProvider::getHierarchicalStores()
            currentScope: 'default',  // Active scope: 'default' | 'websites' | 'stores'
            currentScopeId: null,    // Active scope ID
            iframeSelector: Constants.SELECTORS.IFRAME,
            pageSelectorElement: Constants.SELECTORS.PAGE_SELECTOR,
            themeId: null
        },

        /**
         * Widget initialization
         * @private
         */
        _create: function () {
            log.debug('Initializing scope selector: ' + JSON.stringify(this.options));
            this._processHierarchy();
            this._render();
            this._bindEvents();
            log.info('Scope selector initialized');
        },

        /**
         * Process hierarchy data and resolve current display name
         * @private
         */
        _processHierarchy: function () {
            var self = this;

            // Add expanded states
            this.options.websites.forEach(function (entry) {
                if (entry.type === 'website') {
                    entry.isExpanded = true;
                    entry.groups.forEach(function (group) {
                        group.isExpanded = true;
                    });
                }
            });

            // Resolve current display name
            this.currentScopeName = this._findScopeName(
                this.options.currentScope,
                this.options.currentScopeId
            );
            log.debug('Current scope: ' + this.options.currentScope + ':' + this.options.currentScopeId + ' (' + this.currentScopeName + ')');
        },

        /**
         * Traverse the full websites → groups → stores hierarchy.
         *
         * The callback receives (entry, group, store):
         *   - entry-level visit  : group === null, store === null
         *   - store-level visit  : all three are populated
         *
         * @param {Function} callback
         * @private
         */
        _traverseScopes: function (callback) {
            this.options.websites.forEach(function (entry) {
                callback(entry, null, null);
                if (entry.type === 'website') {
                    entry.groups.forEach(function (group) {
                        group.stores.forEach(function (store) {
                            callback(entry, group, store);
                        });
                    });
                }
            });
        },

        /**
         * Find display name for a given scope + scopeId
         * @param {string} scope
         * @param {number} scopeId
         * @returns {string}
         * @private
         */
        _findScopeName: function (scope, scopeId) {
            var name = 'All Store Views';

            this._traverseScopes(function (entry, group, store) {
                if (!store) {
                    if (entry.type === 'default' && scope === 'default') {
                        name = entry.name;
                    }
                    if (entry.type === 'website' && scope === 'websites' && entry.scopeId == scopeId) {
                        name = entry.name;
                    }
                } else {
                    if (scope === 'stores' && store.scopeId == scopeId) {
                        name = store.name;
                    }
                }
            });

            return name;
        },

        /**
         * Find store code for a given scope entry (for iframe / cookie).
         * For 'stores' scope — returns the store's own code.
         * For 'websites' and 'default' scopes — resolves via defaultStoreId.
         * @param {string} scope
         * @param {number} scopeId
         * @returns {string}
         * @private
         */
        _findStoreCode: function (scope, scopeId) {
            var code = null;
            var defaultStoreId = this._findDefaultStoreId(scope, scopeId);

            this._traverseScopes(function (entry, group, store) {
                if (!store) { return; }
                if (scope === 'stores' && store.scopeId == scopeId) {
                    code = store.code;
                }
                if ((scope === 'default' || scope === 'websites') &&
                    store.scopeId == defaultStoreId && code === null) {
                    code = store.code;
                }
            });

            return code || 'default';
        },

        /**
         * Find defaultStoreId for iframe URL construction
         * @param {string} scope
         * @param {number} scopeId
         * @returns {number}
         * @private
         */
        _findDefaultStoreId: function (scope, scopeId) {
            var id = 0;

            this._traverseScopes(function (entry, group, store) {
                if (!store) {
                    if (entry.type === 'default' && scope === 'default') {
                        id = entry.defaultStoreId || 0;
                    }
                    if (entry.type === 'website' && scope === 'websites' && entry.scopeId == scopeId) {
                        id = entry.defaultStoreId || 0;
                    }
                } else {
                    if (scope === 'stores' && store.scopeId == scopeId) {
                        id = store.scopeId;
                    }
                }
            });

            return id;
        },

        /**
         * Render widget HTML
         * @private
         */
        _render: function () {
            var html = mageTemplate(template, {
                websites:       this.options.websites,
                currentScope:   this.options.currentScope,
                currentScopeId: this.options.currentScopeId,
                currentScopeName: this.currentScopeName
            });
            this.element.html(html);
        },

        /**
         * Bind event handlers
         * @private
         */
        _bindEvents: function () {
            var self = this;

            // Toggle dropdown
            this.element.on('click', Constants.SELECTORS.TOOLBAR_SELECT, function (e) {
                e.preventDefault();
                self._toggleDropdown();
            });

            // Select Default scope
            this.element.on('click', '.scope-default-item', function (e) {
                e.preventDefault();
                var name = $(this).find('.item-name').text();
                self._selectScope('default', 0, self._findStoreCode('default', 0), name);
            });

            // Select Website scope
            this.element.on('click', '.scope-website-item', function (e) {
                e.preventDefault();
                var scopeId = parseInt($(this).data('scope-id'), 10);
                var name    = $(this).find('.item-name').text();
                var code    = self._findStoreCode('websites', scopeId);
                self._selectScope('websites', scopeId, code, name);
            });

            // Toggle website subtree (click on header arrow)
            this.element.on('click', '.scope-header-website', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $website = $(this).closest('.scope-website');
                var websiteId = $website.data('website-id');
                self._toggleWebsite(websiteId);
            });

            // Toggle group
            this.element.on('click', '.scope-header-group', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $group = $(this).closest('.scope-group');
                var groupId = $group.data('group-id');
                self._toggleGroup(groupId);
            });

            // Select store view
            this.element.on('click', '.scope-store', function (e) {
                e.preventDefault();
                var scopeId   = parseInt($(this).data('scope-id'), 10);
                var storeCode = $(this).data('store-code');
                var name      = $(this).find('.item-name').text();
                self._selectScope('stores', scopeId, storeCode, name);
            });

            // Close dropdown when clicking outside
            $(document).on('click', function (e) {
                if (!$(e.target).closest(self.element).length) {
                    self._closeDropdown();
                }
            });
        },

        /**
         * Toggle dropdown visibility
         * @private
         */
        _toggleDropdown: function () {
            var $dropdown = this.element.find(Constants.SELECTORS.TOOLBAR_DROPDOWN);
            var $button   = this.element.find(Constants.SELECTORS.TOOLBAR_SELECT);
            var isVisible = $dropdown.is(':visible');

            // Close all other dropdowns first
            $(Constants.SELECTORS.TOOLBAR_DROPDOWN).not($dropdown).hide();
            $(Constants.SELECTORS.TOOLBAR_SELECT).not($button).removeClass('active');

            $dropdown.toggle();
            $button.toggleClass('active', !isVisible);

            log.info(isVisible ? 'Closing scope dropdown' : 'Opening scope dropdown');
        },

        /**
         * Close dropdown
         * @private
         */
        _closeDropdown: function () {
            this.element.find(Constants.SELECTORS.TOOLBAR_DROPDOWN).hide();
            this.element.find(Constants.SELECTORS.TOOLBAR_SELECT).removeClass('active');
        },

        /**
         * Toggle website expansion
         * @param {number} websiteId
         * @private
         */
        _toggleWebsite: function (websiteId) {
            var $website = this.element.find('[data-website-id="' + websiteId + '"]');
            var $groups  = $website.find('.scope-groups').first();
            var $toggle  = $website.find('.scope-header-website .scope-toggle').first();
            var isVisible = $groups.is(':visible');

            $groups.toggle();
            $toggle.text(isVisible ? '▶' : '▼');

            log.debug((isVisible ? 'Collapsed' : 'Expanded') + ' website: ' + websiteId);
        },

        /**
         * Toggle group expansion
         * @param {number} groupId
         * @private
         */
        _toggleGroup: function (groupId) {
            var $group  = this.element.find('[data-group-id="' + groupId + '"]');
            var $stores = $group.find('.scope-stores').first();
            var $toggle = $group.find('.scope-header-group .scope-toggle').first();
            var isVisible = $stores.is(':visible');

            $stores.toggle();
            $toggle.text(isVisible ? '▶' : '▼');

            log.debug((isVisible ? 'Collapsed' : 'Expanded') + ' group: ' + groupId);
        },

        /**
         * Select scope and reload iframe
         * @param {string} scope    - 'default' | 'websites' | 'stores'
         * @param {number} scopeId
         * @param {string} storeCode - store code for iframe / cookie
         * @param {string} name
         * @private
         */
        _selectScope: function (scope, scopeId, storeCode, name) {
            log.info('Switching to scope: ' + scope + ':' + scopeId + ' (' + storeCode + ')');

            if (scope === this.options.currentScope && scopeId == this.options.currentScopeId) {
                log.info('Already viewing this scope');
                this._closeDropdown();
                return;
            }

            // Update current scope
            this.options.currentScope   = scope;
            this.options.currentScopeId = scopeId;
            this.currentScopeName       = name;

            // Determine which store view to show in iframe
            var defaultStoreId = this._findDefaultStoreId(scope, scopeId);

            var $iframe    = $(this.options.iframeSelector);
            var currentSrc = $iframe.attr('src');

            // Replace /store/OLD_ID/ with /store/NEW_ID/
            // Also reset URL to homepage — encode '/' with uenc so it survives
            // Cloudflare / Apache without being decoded before reaching PHP.
            var newSrc = currentSrc
                .replace(/\/store\/\d+\//, '/store/' + defaultStoreId + '/')
                .replace(/\/url\/[^\/]+\//, '/url/' + urlBuilder.encodePathParam('/') + '/');

            log.info('Updating iframe src');
            log.debug('Old: ' + currentSrc);
            log.debug('New: ' + newSrc);

            // Set store cookie (needed for frontend store context)
            cookieManager.setStoreCookie(storeCode);

            // Save last scope to cookies (24h)
            cookieManager.setCookie('bte_last_scope', scope, {
                path: '/', maxAge: 86400, sameSite: 'Lax'
            });
            cookieManager.setCookie('bte_last_scope_id', scopeId, {
                path: '/', maxAge: 86400, sameSite: 'Lax'
            });

            // Sync PHP BackendSession cookie (bte_last_store_id).
            // All three scope variants naturally resolve to a concrete storeId:
            //   'stores'   → the store view's own ID
            //   'websites' → the website's default store ID
            //   'default'  → the installation's default store ID
            // Without this write, after logout→login PHP reads a stale cookie
            // and serves wrong settings for the previously-selected store.
            if (defaultStoreId > 0) {
                cookieManager.setCookie('bte_last_store_id', defaultStoreId, {
                    path: '/', maxAge: 86400, sameSite: 'Lax'
                });
                log.info('Synced bte_last_store_id: ' + defaultStoreId);
            } else {
                // Mapping failed (misconfigured store data) — remove stale value
                // so PHP falls through to its own default-store fallback.
                cookieManager.deleteCookie('bte_last_store_id');
                log.warn('bte_last_store_id cleared — defaultStoreId could not be resolved for scope: ' + scope + ':' + scopeId);
            }

            // Update iframe src and navigate to the new URL.
            // When the constructed URL is identical to the current src (e.g. "All Store Views"
            // resolves to the same preview store that is already loaded), setting the src
            // attribute to the same value is a browser no-op — the iframe won't reload.
            // In that case we navigate contentWindow directly, which always re-issues the
            // request regardless of whether the URL changed.
            if (newSrc !== currentSrc) {
                $iframe.attr('src', newSrc);
            } else {
                log.info('Forcing iframe reload — URL unchanged after scope switch');
                try {
                    $iframe[0].contentWindow.location.href = newSrc;
                } catch (e) {
                    // Cross-origin guard (should not happen in practice)
                    $iframe.attr('src', newSrc);
                }
            }

            // Update UI
            this._render();
            this._closeDropdown();

            // Update page selector - reset to homepage when scope changes
            var $pageSelector = $(this.options.pageSelectorElement);
            if ($pageSelector.length && $pageSelector.data('swissup-breezePageSelector')) {
                $pageSelector.breezePageSelector('updateStoreParam', storeCode);
                $pageSelector.breezePageSelector('resetToHomePage');
            }

            // Update scope manager (single source of truth for runtime scope state)
            scopeManager.update({
                scope:     scope,
                scopeId:   scopeId,
                storeCode: storeCode,
                themeId:   null  // backend will resolve themeId from new scope
            });

            // Trigger event for toolbar.js and settings-editor.js
            $(this.element).trigger(Constants.EVENTS.SCOPE_CHANGED, [scope, scopeId, storeCode]);
            log.info('Scope switched to: ' + name);
        },

        /**
         * Public API: Set current scope externally
         * @param {string} scope
         * @param {number} scopeId
         * @param {string} storeCode
         */
        setScope: function (scope, scopeId, storeCode) {
            log.info('Setting scope externally: ' + scope + ':' + scopeId);
            var name = this._findScopeName(scope, scopeId);
            this._selectScope(scope, scopeId, storeCode || this._findStoreCode(scope, scopeId), name);
        }
    });

    return $.swissup.breezeScopeSelector;
});
