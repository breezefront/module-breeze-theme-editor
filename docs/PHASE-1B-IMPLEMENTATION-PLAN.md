# Phase 1B: Critical Components Implementation Plan

**Created:** February 5, 2026  
**Status:** 🔄 Ready to Start  
**Estimated Time:** 16-20 hours  
**Priority:** HIGH - Blocking full admin editor functionality

---

## 🎯 Overview

Phase 1B adds 3 critical components that were identified as missing from the admin toolbar:

1. **Publication Selector** - Draft/Published switcher + history (CRITICAL for publishing)
2. **Scope Selector** - Store view switcher (CRITICAL for multi-store)
3. **Page Selector** - Page type navigator (IMPORTANT for testing)

Without these, admin editor is incomplete and cannot:
- ❌ Publish theme changes
- ❌ Work with multiple store views
- ❌ Navigate between page types for testing

---

## 📋 Implementation Checklist

### Step 1: Create Publication Selector Component ⏱️ 4-5 hours

**Files to create:**

#### 1.1 JavaScript Widget
**Path:** `view/adminhtml/web/js/editor/toolbar/publication-selector.js`  
**Reference:** `view/frontend/web/js/toolbar/publication-selector.js` (adapt from here)

**Key differences from frontend:**
- Remove token authentication
- Use admin session
- Integrate with admin GraphQL endpoint
- Add ACL permission checks (canPublish)

**Widget structure:**
```javascript
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

        _create: function() {
            console.log('🎨 Initializing publication selector', this.options);
            this._render();
            this._bindEvents();
            console.log('✅ Publication selector initialized');
        },

        _render: function() {
            var html = mageTemplate(template, {
                status: this.options.currentStatus,
                changesCount: this.options.changesCount,
                publications: this.options.publications,
                canPublish: this.options.changesCount > 0 && this.options.currentStatus === 'DRAFT'
            });
            this.element.html(html);
        },

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

        _toggleDropdown: function() {
            this.element.find('.toolbar-dropdown').toggle();
        },

        _closeDropdown: function() {
            this.element.find('.toolbar-dropdown').hide();
        },

        _switchStatus: function(status) {
            console.log('🔄 Switching to status:', status);
            this.options.currentStatus = status;
            this._render();
            this._closeDropdown();
            
            // TODO Phase 2: Trigger GraphQL query to load DRAFT or PUBLISHED data
            $(this.element).trigger('statusChanged', [status]);
        },

        _publishChanges: function() {
            console.log('📤 Publishing changes...');
            
            // TODO Phase 2: GraphQL mutation
            // For now, just simulate success
            alert('Publish functionality will be implemented in Phase 2 (GraphQL mutations)');
            
            // Update UI
            this.options.changesCount = 0;
            this.options.currentStatus = 'PUBLISHED';
            this._render();
            this._closeDropdown();
            
            $(this.element).trigger('published');
        },

        _loadPublication: function(publicationId) {
            console.log('📥 Loading publication:', publicationId);
            
            // TODO Phase 2: GraphQL query to load publication data
            alert('Load publication #' + publicationId + ' - will be implemented in Phase 2');
            
            this._closeDropdown();
        },

        _loadMorePublications: function() {
            console.log('📜 Loading more publications...');
            
            // TODO Phase 2: GraphQL query with pagination
            alert('Load more - will be implemented in Phase 2');
        },

        // Public API
        updateChangesCount: function(count) {
            this.options.changesCount = count;
            this._render();
        },

        setStatus: function(status) {
            this.options.currentStatus = status;
            this._render();
        }
    });

    return $.swissup.breezePublicationSelector;
});
```

**Estimated time:** 3 hours

#### 1.2 HTML Template
**Path:** `view/adminhtml/web/template/editor/publication-selector.html`

```html
<div class="bte-publication-selector">
    <button type="button" class="toolbar-select status-<%- status.toLowerCase() %>">
        <span class="select-label"><%- status %></span>
        
        <% if (changesCount > 0 && status === 'DRAFT') { %>
            <span class="select-badge">(<%- changesCount %> changes)</span>
        <% } %>
        
        <span class="select-arrow">
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M3.35355 2.64645L6.00003 0L6.70713 0.70711L3.35355 4.06062L0 0.70711L0.70711 0L3.35355 2.64645Z" fill="currentColor"/>
            </svg>
        </span>
    </button>

    <div class="toolbar-dropdown" style="display: none;">
        <div class="dropdown-header">
            <span>Switch Publication</span>
        </div>

        <div class="dropdown-content">
            <!-- Draft status -->
            <div class="dropdown-item-group <%= status === 'DRAFT' ? 'active' : '' %>">
                <a href="#" class="dropdown-item" data-status="DRAFT">
                    <span class="item-icon">🟡</span>
                    <span class="item-text">Draft</span>
                    <% if (changesCount > 0) { %>
                        <span class="item-meta"><%- changesCount %> changes</span>
                    <% } %>
                    <% if (status === 'DRAFT') { %>
                        <span class="item-check">✓</span>
                    <% } %>
                </a>

                <!-- Publish button (only when Draft + changes) -->
                <% if (canPublish) { %>
                    <div class="dropdown-publish-button-wrapper">
                        <button type="button" class="dropdown-publish-button" data-action="publish">
                            <span class="publish-icon">💾</span>
                            <span class="publish-label">Publish <%- changesCount %> changes</span>
                        </button>
                    </div>
                <% } %>
            </div>

            <!-- Published status -->
            <a href="#" class="dropdown-item <%= status === 'PUBLISHED' ? 'active' : '' %>" data-status="PUBLISHED">
                <span class="item-icon">🟢</span>
                <span class="item-text">Published</span>
                <% if (status === 'PUBLISHED') { %>
                    <span class="item-check">✓</span>
                <% } %>
            </a>

            <div class="dropdown-divider"></div>

            <!-- Recent Publications Section -->
            <% if (publications && publications.length > 0) { %>
                <div class="dropdown-section-title">Recent Publications</div>
                <div class="publications-list">
                    <% publications.forEach(function(pub) { %>
                        <a href="#" class="dropdown-item" data-publication-id="<%- pub.id %>">
                            <span class="item-icon">📦</span>
                            <span class="item-content">
                                <span class="item-title"><%- pub.title %></span>
                                <span class="item-meta"><%- pub.date %></span>
                            </span>
                        </a>
                    <% }); %>
                </div>

                <div class="dropdown-divider"></div>

                <!-- Load More Action -->
                <a href="#" class="dropdown-item dropdown-action" data-action="load-more">
                    <span class="item-icon">⬇️</span>
                    <span class="item-text">Load More Publications</span>
                </a>
            <% } %>
        </div>
    </div>
</div>
```

**Estimated time:** 1 hour

#### 1.3 Testing Checklist
- [ ] Widget initializes without errors
- [ ] Dropdown opens/closes on click
- [ ] Shows correct status (DRAFT/PUBLISHED)
- [ ] Shows changes count badge
- [ ] Publish button appears when Draft + changes > 0
- [ ] Can switch between Draft and Published
- [ ] Recent publications list displays
- [ ] "Load more" button works (even if stubbed)
- [ ] Console logs all actions
- [ ] No JavaScript errors

**Estimated time:** 30 minutes

---

### Step 2: Create Scope Selector Component ⏱️ 3-4 hours

**Files to create:**

#### 2.1 JavaScript Widget
**Path:** `view/adminhtml/web/js/editor/toolbar/scope-selector.js`  
**Reference:** `view/frontend/web/js/toolbar/scope-selector.js`

**Widget structure:**
```javascript
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/scope-selector.html'
], function ($, mageTemplate, template) {
    'use strict';

    $.widget('swissup.breezeScopeSelector', {
        options: {
            websites: [],           // Hierarchical store data from ViewModel
            currentStoreId: null,   // Current store ID
            iframeSelector: '#bte-iframe'
        },

        _create: function() {
            console.log('🎨 Initializing scope selector', this.options);
            this._processHierarchy();
            this._render();
            this._bindEvents();
            console.log('✅ Scope selector initialized');
        },

        _processHierarchy: function() {
            // Add expanded states to hierarchy data
            this.options.websites.forEach(function(website) {
                website.isExpanded = true; // Expand by default
                website.groups.forEach(function(group) {
                    group.isExpanded = true;
                });
            });

            // Find current store name
            this.currentStoreName = this._findStoreName(this.options.currentStoreId);
        },

        _findStoreName: function(storeId) {
            var name = 'Unknown Store';
            this.options.websites.forEach(function(website) {
                website.groups.forEach(function(group) {
                    group.stores.forEach(function(store) {
                        if (store.id == storeId) {
                            name = store.name;
                        }
                    });
                });
            });
            return name;
        },

        _render: function() {
            var html = mageTemplate(template, {
                websites: this.options.websites,
                currentStoreId: this.options.currentStoreId,
                currentStoreName: this.currentStoreName
            });
            this.element.html(html);
        },

        _bindEvents: function() {
            var self = this;

            // Toggle dropdown
            this.element.on('click', '.toolbar-select', function(e) {
                e.preventDefault();
                self._toggleDropdown();
            });

            // Toggle website
            this.element.on('click', '.scope-header-website', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var $website = $(this).closest('.scope-website');
                var websiteId = $website.data('website-id');
                self._toggleWebsite(websiteId);
            });

            // Toggle group
            this.element.on('click', '.scope-header-group', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var $group = $(this).closest('.scope-group');
                var groupId = $group.data('group-id');
                self._toggleGroup(groupId);
            });

            // Select store
            this.element.on('click', '.scope-store', function(e) {
                e.preventDefault();
                var storeId = $(this).data('store-id');
                var storeCode = $(this).data('store-code');
                var storeName = $(this).find('.item-text').text();
                self._selectStore(storeId, storeCode, storeName);
            });

            // Close dropdown when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest(self.element).length) {
                    self._closeDropdown();
                }
            });
        },

        _toggleDropdown: function() {
            this.element.find('.toolbar-dropdown').toggle();
        },

        _closeDropdown: function() {
            this.element.find('.toolbar-dropdown').hide();
        },

        _toggleWebsite: function(websiteId) {
            var $website = this.element.find('[data-website-id="' + websiteId + '"]');
            var $groups = $website.find('.scope-groups').first();
            var $toggle = $website.find('.scope-header-website .scope-toggle').first();

            $groups.toggle();
            $toggle.text($groups.is(':visible') ? '▼' : '▶');
        },

        _toggleGroup: function(groupId) {
            var $group = this.element.find('[data-group-id="' + groupId + '"]');
            var $stores = $group.find('.scope-stores').first();
            var $toggle = $group.find('.scope-header-group .scope-toggle').first();

            $stores.toggle();
            $toggle.text($stores.is(':visible') ? '▼' : '▶');
        },

        _selectStore: function(storeId, storeCode, storeName) {
            console.log('🏪 Switching to store:', storeCode, '(ID: ' + storeId + ')');

            // Update current store
            this.options.currentStoreId = storeId;
            this.currentStoreName = storeName;

            // Reload iframe with new store
            var $iframe = $(this.options.iframeSelector);
            var currentUrl = $iframe.attr('src');
            var newUrl = this._updateUrlStoreParam(currentUrl, storeCode);
            
            console.log('🔄 Reloading iframe:', newUrl);
            $iframe.attr('src', newUrl);

            // Update UI
            this._render();
            this._closeDropdown();

            // Trigger event
            $(this.element).trigger('storeChanged', [storeId, storeCode]);
        },

        _updateUrlStoreParam: function(url, storeCode) {
            // Parse URL
            var urlObj = new URL(url, window.location.origin);
            
            // Update ___store parameter
            urlObj.searchParams.set('___store', storeCode);
            
            return urlObj.toString();
        }
    });

    return $.swissup.breezeScopeSelector;
});
```

**Estimated time:** 2.5 hours

#### 2.2 HTML Template
**Path:** `view/adminhtml/web/template/editor/scope-selector.html`

```html
<div class="bte-scope-selector">
    <button type="button" class="toolbar-select">
        <span class="select-text"><%- currentStoreName %></span>
        <span class="select-arrow">
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M3.35355 2.64645L6.00003 0L6.70713 0.70711L3.35355 4.06062L0 0.70711L0.70711 0L3.35355 2.64645Z" fill="currentColor"/>
            </svg>
        </span>
    </button>

    <div class="toolbar-dropdown" style="display: none;">
        <div class="dropdown-header">
            <span>Switch Store View</span>
        </div>

        <div class="dropdown-content scope-hierarchy">
            <% websites.forEach(function(website) { %>
                <div class="scope-website" data-website-id="<%- website.id %>">
                    <!-- Website Header -->
                    <div class="scope-header scope-header-website">
                        <span class="scope-toggle"><%- website.isExpanded ? '▼' : '▶' %></span>
                        <span class="scope-name"><%- website.name %></span>
                    </div>

                    <!-- Store Groups -->
                    <div class="scope-groups" style="<%= website.isExpanded ? '' : 'display: none;' %>">
                        <% website.groups.forEach(function(group) { %>
                            <div class="scope-group" data-group-id="<%- group.id %>">
                                <!-- Group Header -->
                                <div class="scope-header scope-header-group">
                                    <span class="scope-toggle"><%- group.isExpanded ? '▼' : '▶' %></span>
                                    <span class="scope-name"><%- group.name %></span>
                                </div>

                                <!-- Store Views -->
                                <div class="scope-stores" style="<%= group.isExpanded ? '' : 'display: none;' %>">
                                    <% group.stores.forEach(function(store) { %>
                                        <a href="#" 
                                           class="dropdown-item scope-store <%= store.id == currentStoreId ? 'active' : '' %>" 
                                           data-store-id="<%- store.id %>"
                                           data-store-code="<%- store.code %>">
                                            <span class="item-text"><%- store.name %></span>
                                            <% if (store.id == currentStoreId) { %>
                                                <span class="item-check">✓</span>
                                            <% } %>
                                        </a>
                                    <% }); %>
                                </div>
                            </div>
                        <% }); %>
                    </div>
                </div>
            <% }); %>
        </div>
    </div>
</div>
```

**Estimated time:** 1 hour

#### 2.3 Testing Checklist
- [ ] Widget initializes without errors
- [ ] Shows current store name
- [ ] Dropdown opens/closes
- [ ] Website headers expand/collapse
- [ ] Group headers expand/collapse
- [ ] Can click on store view
- [ ] Iframe reloads with new store parameter
- [ ] Active store highlighted with ✓
- [ ] No JavaScript errors

**Estimated time:** 30 minutes

---

### Step 3: Create Page Selector Component ⏱️ 2-3 hours

**Files to create:**

#### 3.1 JavaScript Widget
**Path:** `view/adminhtml/web/js/editor/toolbar/page-selector.js`

```javascript
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/page-selector.html'
], function ($, mageTemplate, template) {
    'use strict';

    $.widget('swissup.breezePageSelector', {
        options: {
            pages: [],              // Page types from ViewModel
            currentPageId: null,    // Current page ID
            iframeBaseUrl: '',      // Base URL for iframe
            iframeSelector: '#bte-iframe'
        },

        _create: function() {
            console.log('🎨 Initializing page selector', this.options);
            this.currentPageLabel = this._findPageLabel(this.options.currentPageId);
            this._render();
            this._bindEvents();
            console.log('✅ Page selector initialized');
        },

        _findPageLabel: function(pageId) {
            var label = 'Unknown Page';
            this.options.pages.forEach(function(page) {
                if (page.id === pageId) {
                    label = page.label;
                }
            });
            return label;
        },

        _render: function() {
            var html = mageTemplate(template, {
                pages: this.options.pages,
                currentPageId: this.options.currentPageId,
                currentPageLabel: this.currentPageLabel
            });
            this.element.html(html);
        },

        _bindEvents: function() {
            var self = this;

            // Toggle dropdown
            this.element.on('click', '.toolbar-select', function(e) {
                e.preventDefault();
                self._toggleDropdown();
            });

            // Select page
            this.element.on('click', '[data-page-id]', function(e) {
                e.preventDefault();
                var pageId = $(this).data('page-id');
                self._selectPage(pageId);
            });

            // Close dropdown when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest(self.element).length) {
                    self._closeDropdown();
                }
            });
        },

        _toggleDropdown: function() {
            this.element.find('.toolbar-dropdown').toggle();
        },

        _closeDropdown: function() {
            this.element.find('.toolbar-dropdown').hide();
        },

        _selectPage: function(pageId) {
            console.log('📄 Switching to page:', pageId);

            // Find page data
            var pageData = null;
            this.options.pages.forEach(function(page) {
                if (page.id === pageId) {
                    pageData = page;
                }
            });

            if (!pageData) {
                console.error('❌ Page not found:', pageId);
                return;
            }

            // Update current page
            this.options.currentPageId = pageId;
            this.currentPageLabel = pageData.label;

            // Build new iframe URL
            var $iframe = $(this.options.iframeSelector);
            var currentUrl = $iframe.attr('src');
            var newUrl = this._buildPageUrl(pageData.url, currentUrl);

            console.log('🔄 Reloading iframe:', newUrl);
            $iframe.attr('src', newUrl);

            // Update UI
            this._render();
            this._closeDropdown();

            // Trigger event
            $(this.element).trigger('pageChanged', [pageId, pageData]);
        },

        _buildPageUrl: function(pageUrl, currentUrl) {
            // Parse current URL to preserve store and jstest params
            var urlObj = new URL(currentUrl, window.location.origin);
            var storeParam = urlObj.searchParams.get('___store');
            var jstestParam = urlObj.searchParams.get('jstest');

            // Build new URL with page path
            var newUrl = this.options.iframeBaseUrl + pageUrl;
            var newUrlObj = new URL(newUrl, window.location.origin);

            // Preserve store and jstest params
            if (storeParam) {
                newUrlObj.searchParams.set('___store', storeParam);
            }
            if (jstestParam) {
                newUrlObj.searchParams.set('jstest', jstestParam);
            }

            return newUrlObj.toString();
        }
    });

    return $.swissup.breezePageSelector;
});
```

**Estimated time:** 1.5 hours

#### 3.2 HTML Template
**Path:** `view/adminhtml/web/template/editor/page-selector.html`

```html
<div class="bte-page-selector">
    <button type="button" class="toolbar-select">
        <span class="select-text"><%- currentPageLabel %></span>
        <span class="select-arrow">
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M3.35355 2.64645L6.00003 0L6.70713 0.70711L3.35355 4.06062L0 0.70711L0.70711 0L3.35355 2.64645Z" fill="currentColor"/>
            </svg>
        </span>
    </button>

    <div class="toolbar-dropdown" style="display: none;">
        <div class="dropdown-header">
            <span>Switch Page Type</span>
        </div>

        <div class="dropdown-content">
            <% pages.forEach(function(page) { %>
                <a href="#" 
                   class="dropdown-item <%= page.id === currentPageId ? 'active' : '' %>" 
                   data-page-id="<%- page.id %>">
                    <span class="item-text"><%- page.label %></span>
                    <% if (page.id === currentPageId) { %>
                        <span class="item-check">✓</span>
                    <% } %>
                </a>
            <% }); %>
        </div>
    </div>
</div>
```

**Estimated time:** 30 minutes

#### 3.3 Testing Checklist
- [ ] Widget initializes without errors
- [ ] Shows current page label
- [ ] Dropdown opens/closes
- [ ] Can click on page type
- [ ] Iframe reloads with new page URL
- [ ] Store and jstest params preserved
- [ ] Active page highlighted with ✓
- [ ] No JavaScript errors

**Estimated time:** 30 minutes

---

### Step 4: Update Toolbar Coordinator ⏱️ 1 hour

**File:** `view/adminhtml/web/js/editor/toolbar.js`

**Changes:**

```javascript
// Add new dependencies
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/admin-link',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/device-switcher',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/status-indicator',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/navigation',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector',  // NEW
    'Swissup_BreezeThemeEditor/js/editor/toolbar/scope-selector',        // NEW
    'Swissup_BreezeThemeEditor/js/editor/toolbar/page-selector'          // NEW
], function ($) {
    'use strict';

    $.widget('swissup.breezeAdminToolbar', {
        options: {
            // Existing options
            storeId: null,
            themeId: null,
            
            // NEW: Publication selector data
            publications: [],
            currentStatus: 'DRAFT',
            changesCount: 0,
            
            // NEW: Scope selector data
            storeHierarchy: [],
            currentStoreId: null,
            
            // NEW: Page selector data
            pageTypes: [],
            currentPageId: null,
            iframeBaseUrl: ''
        },

        _create: function() {
            console.log('🎨 Initializing admin toolbar', this.options);
            this._initializeComponents();
            console.log('✅ Admin toolbar initialized successfully');
        },

        _initializeComponents: function() {
            // Existing components
            this._initAdminLink();
            this._initNavigation();
            this._initDeviceSwitcher();
            this._initStatusIndicator();
            
            // NEW components
            this._initPublicationSelector();
            this._initScopeSelector();
            this._initPageSelector();
        },

        // Existing methods...
        _initAdminLink: function() {
            $('#bte-admin-link').breezeAdminLink();
            console.log('✅ Admin link initialized');
        },

        _initNavigation: function() {
            $('#bte-navigation').breezeNavigation();
            console.log('✅ Navigation initialized');
        },

        _initDeviceSwitcher: function() {
            $('#bte-device-switcher').breezeDeviceSwitcher({
                iframeSelector: '#bte-iframe'
            });
            console.log('✅ Device switcher initialized');
        },

        _initStatusIndicator: function() {
            $('#bte-status').breezeStatusIndicator({
                status: this.options.currentStatus,
                changesCount: this.options.changesCount
            });
            console.log('✅ Status indicator initialized');
        },

        // NEW methods
        _initPublicationSelector: function() {
            $('#bte-publication-selector').breezePublicationSelector({
                publications: this.options.publications,
                currentStatus: this.options.currentStatus,
                changesCount: this.options.changesCount
            });
            console.log('✅ Publication selector initialized');
        },

        _initScopeSelector: function() {
            $('#bte-scope-selector').breezeScopeSelector({
                websites: this.options.storeHierarchy,
                currentStoreId: this.options.currentStoreId,
                iframeSelector: '#bte-iframe'
            });
            console.log('✅ Scope selector initialized');
        },

        _initPageSelector: function() {
            $('#bte-page-selector').breezePageSelector({
                pages: this.options.pageTypes,
                currentPageId: this.options.currentPageId,
                iframeBaseUrl: this.options.iframeBaseUrl,
                iframeSelector: '#bte-iframe'
            });
            console.log('✅ Page selector initialized');
        }
    });

    return $.swissup.breezeAdminToolbar;
});
```

**Testing:**
- [ ] All 7 components initialize without errors
- [ ] Console shows all initialization messages
- [ ] No "widget is not a function" errors

---

### Step 5: Update ViewModel ⏱️ 2 hours

**File:** `ViewModel/AdminToolbar.php`

**Add new methods:**

```php
/**
 * Get publications list for publication selector
 * @return array
 */
public function getPublications()
{
    // TODO Phase 2: Real GraphQL query to fetch publications
    // For now, return mock data
    return [
        [
            'id' => 8,
            'title' => '🟣 Purple Theme (Current)',
            'date' => '2026-01-15 15:29:00'
        ],
        [
            'id' => 7,
            'title' => '🔴 Red Theme',
            'date' => '2026-01-14 15:29:00'
        ],
        [
            'id' => 6,
            'title' => '🟢 Green Theme',
            'date' => '2026-01-13 15:29:00'
        ],
        [
            'id' => 5,
            'title' => '🔵 Blue Theme',
            'date' => '2026-01-12 15:29:00'
        ],
    ];
}

/**
 * Get store hierarchy for scope selector
 * @return array
 */
public function getStoreHierarchy()
{
    $hierarchy = [];
    
    foreach ($this->storeManager->getWebsites() as $website) {
        $websiteData = [
            'id' => $website->getId(),
            'name' => $website->getName(),
            'groups' => []
        ];
        
        foreach ($website->getGroups() as $group) {
            $groupData = [
                'id' => $group->getId(),
                'name' => $group->getName(),
                'stores' => []
            ];
            
            foreach ($group->getStores() as $store) {
                $groupData['stores'][] = [
                    'id' => $store->getId(),
                    'code' => $store->getCode(),
                    'name' => $store->getName()
                ];
            }
            
            $websiteData['groups'][] = $groupData;
        }
        
        $hierarchy[] = $websiteData;
    }
    
    return $hierarchy;
}

/**
 * Get page types for page selector
 * @return array
 */
public function getPageTypes()
{
    return [
        [
            'id' => 'cms_index_index',
            'label' => __('Home Page'),
            'url' => '/'
        ],
        [
            'id' => 'catalog_category_view',
            'label' => __('Category Page'),
            'url' => '/gear.html'
        ],
        [
            'id' => 'catalog_product_view',
            'label' => __('Product Page'),
            'url' => '/joust-duffle-bag.html'
        ],
        [
            'id' => 'checkout_cart_index',
            'label' => __('Shopping Cart'),
            'url' => '/checkout/cart/'
        ],
        [
            'id' => 'checkout_index_index',
            'label' => __('Checkout'),
            'url' => '/checkout/'
        ],
        [
            'id' => 'customer_account_index',
            'label' => __('My Account'),
            'url' => '/customer/account/'
        ],
        [
            'id' => 'cms_page_view',
            'label' => __('CMS Page'),
            'url' => '/enable-cookies/'
        ],
    ];
}

/**
 * Get current page ID (detect from request)
 * @return string
 */
public function getCurrentPageId()
{
    // TODO: Detect from URL/request
    return 'cms_index_index';
}

/**
 * Get iframe base URL
 * @return string
 */
public function getIframeBaseUrl()
{
    return $this->storeManager->getStore()->getBaseUrl();
}
```

**Update `getToolbarConfig()` method:**

```php
public function getToolbarConfig()
{
    return [
        'storeId' => $this->getStoreId(),
        'themeId' => $this->getThemeId(),
        'currentStatus' => $this->getCurrentPublicationStatus(),
        'changesCount' => $this->getDraftChangesCount(),
        
        // NEW: Publication selector data
        'publications' => $this->getPublications(),
        
        // NEW: Scope selector data
        'storeHierarchy' => $this->getStoreHierarchy(),
        'currentStoreId' => $this->getStoreId(),
        
        // NEW: Page selector data
        'pageTypes' => $this->getPageTypes(),
        'currentPageId' => $this->getCurrentPageId(),
        'iframeBaseUrl' => $this->getIframeBaseUrl(),
    ];
}
```

**Testing:**
- [ ] ViewModel returns all required data
- [ ] getPublications() returns array
- [ ] getStoreHierarchy() returns nested structure
- [ ] getPageTypes() returns page list
- [ ] No PHP errors

---

### Step 6: Update Toolbar Template ⏱️ 30 minutes

**File:** `view/adminhtml/web/template/editor/toolbar.html`

**Add containers for new components in center section:**

```html
<!-- Center Section -->
<div class="bte-toolbar-center">
    <!-- NEW: Publication Selector -->
    <div id="bte-publication-selector"></div>
    
    <!-- NEW: Scope Selector -->
    <div id="bte-scope-selector"></div>
    
    <!-- NEW: Page Selector -->
    <div id="bte-page-selector"></div>
    
    <!-- Existing: Device Switcher -->
    <div id="bte-device-switcher"></div>
</div>
```

---

### Step 7: Full Testing ⏱️ 2 hours

#### 7.1 Clear Cache & Deploy
```bash
bin/magento cache:clean
bin/magento cache:flush
rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor
rm -rf var/view_preprocessed/pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor
```

#### 7.2 Browser Testing Checklist

**URL:** `https://magento248.local/admin/breeze_editor/editor/index`

**Visual Check:**
- [ ] Toolbar renders without layout breaks
- [ ] All 7 components visible (admin-link, navigation, device-switcher, status, publication, scope, page)
- [ ] No overlapping elements
- [ ] Proper spacing between components

**Publication Selector:**
- [ ] Shows "Draft (X changes)" or "Published"
- [ ] Dropdown opens on click
- [ ] Can switch Draft/Published
- [ ] Publish button appears when Draft + changes
- [ ] Recent publications list displays
- [ ] Load more button works

**Scope Selector:**
- [ ] Shows current store name
- [ ] Dropdown opens
- [ ] Websites expand/collapse
- [ ] Groups expand/collapse
- [ ] Can click store view
- [ ] Iframe reloads with new store
- [ ] Current store has ✓ checkmark

**Page Selector:**
- [ ] Shows current page label
- [ ] Dropdown opens
- [ ] All page types listed
- [ ] Can click page type
- [ ] Iframe loads new page
- [ ] Current page has ✓ checkmark

**Console Check:**
- [ ] No JavaScript errors
- [ ] All initialization logs present:
  ```
  🎨 Initializing admin toolbar
  ✅ Admin link initialized
  ✅ Navigation initialized
  ✅ Device switcher initialized
  ✅ Status indicator initialized
  ✅ Publication selector initialized
  ✅ Scope selector initialized
  ✅ Page selector initialized
  ✅ Admin toolbar initialized successfully
  ```

**Integration Check:**
- [ ] Store switching preserves jstest param
- [ ] Page switching preserves store context
- [ ] Device switcher still works
- [ ] Navigation buttons still work
- [ ] No conflicts between components

---

## 📊 Progress Tracking

Use this checklist to track completion:

- [ ] **Step 1:** Publication Selector (4-5 hours)
  - [ ] JavaScript widget created
  - [ ] HTML template created
  - [ ] Testing passed

- [ ] **Step 2:** Scope Selector (3-4 hours)
  - [ ] JavaScript widget created
  - [ ] HTML template created
  - [ ] Testing passed

- [ ] **Step 3:** Page Selector (2-3 hours)
  - [ ] JavaScript widget created
  - [ ] HTML template created
  - [ ] Testing passed

- [ ] **Step 4:** Toolbar coordinator updated (1 hour)
  - [ ] Dependencies added
  - [ ] Initialization methods added
  - [ ] Testing passed

- [ ] **Step 5:** ViewModel updated (2 hours)
  - [ ] New data methods added
  - [ ] getToolbarConfig() updated
  - [ ] Testing passed

- [ ] **Step 6:** Toolbar template updated (30 min)
  - [ ] Containers added
  - [ ] Layout verified

- [ ] **Step 7:** Full testing (2 hours)
  - [ ] Cache cleared
  - [ ] Browser testing complete
  - [ ] No errors found

**Total Estimated Time:** 16-20 hours  
**Total Actual Time:** ___ hours

---

## 🚀 Ready to Start?

Mark todo item as "in_progress" and begin with Step 1: Publication Selector.

Each component can be developed and tested independently before moving to the next.

---

**Document Status:** ✅ Ready for Implementation  
**Created:** February 5, 2026  
**Last Updated:** February 5, 2026
