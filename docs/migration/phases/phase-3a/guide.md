# Phase 3: Admin Editor Integration

**Duration:** 5-6 days (38.5 hours)  
**Risk Level:** 🟡 Medium  
**Dependencies:** Phase 1 ✅, Phase 2 ✅  
**Can Rollback:** ✅ Yes (incremental commits)  
**Status:** 🚧 IN PROGRESS

---

## 📊 Phase 3 Structure

Phase 3 is split into two sub-phases based on complexity analysis:

### **Phase 3A: Toolbar GraphQL Integration** (8.5 hours)
**Focus:** Connect toolbar components to GraphQL API  
**Status:** 🎯 Ready to execute  
**Documentation:** [`PHASE-3-IMPLEMENTATION-PLAN.md`](./PHASE-3-IMPLEMENTATION-PLAN.md)

1. ✅ ~~GraphQL client setup~~ (Already exists)
2. ✅ ~~Token authentication~~ (Already implemented)
3. ❌ **Connect toolbar components to real GraphQL data**
4. ❌ **Implement permission-based UI (ACL integration)**
5. ❌ **Add live preview with CSS injection**
6. ❌ **Implement error handling and loading states**

### **Phase 3B: Settings Editor Migration** (30 hours)
**Focus:** Migrate Theme Editor Panel to admin area  
**Status:** 📋 Planned (after 3A)  
**Documentation:** [`PHASE-3B-IMPLEMENTATION-PLAN.md`](./PHASE-3B-IMPLEMENTATION-PLAN.md)

1. ❌ **Rename frontend panel.js → settings-editor.js**
2. ❌ **Copy field handlers/renderers to admin (~7,500 lines)**
3. ❌ **Create admin settings-editor.js widget**
4. ❌ **Integrate into admin toolbar**
5. ❌ **Test all field types and permissions**

---

## 🎯 Phase 3A Goals (Toolbar)

**Primary Focus:** Connect existing admin toolbar components to GraphQL API and implement permission-based UI.

---

## 📊 Current State Analysis

### ✅ What's Already Done (Phase 1 & 2)

#### Infrastructure (100% complete):
- ✅ All 10 toolbar components created in `view/adminhtml/web/js/editor/toolbar/`
- ✅ GraphQL client with Bearer token auth: `view/adminhtml/web/js/graphql/client.js`
- ✅ All GraphQL queries defined: `view/adminhtml/web/js/graphql/queries/*.js`
- ✅ All GraphQL mutations defined: `view/adminhtml/web/js/graphql/mutations/*.js`
- ✅ ACL system with 4 permission levels (view/edit/publish/rollback)
- ✅ JWT token generation for admins (`AdminTokenGenerator`)
- ✅ Permissions passed to JavaScript via `window.breezeThemeEditorConfig.permissions`

#### Components Created (Phase 1):
```
view/adminhtml/web/js/editor/toolbar/
├── admin-link.js           ✅ Working
├── navigation.js           ✅ Working
├── device-switcher.js      ✅ Working
├── status-indicator.js     ✅ Needs GraphQL integration
├── publication-selector.js ✅ Needs GraphQL integration
├── scope-selector.js       ✅ Working
├── page-selector.js        ✅ Working
├── exit-button.js          ✅ Working
├── highlight-toggle.js     ✅ Working
└── toolbar-toggle.js       ✅ Working
```

### ❌ What's Missing (Phase 3 Tasks)

#### GraphQL Integration (60% of Phase 3):
1. **publication-selector.js** - Has TODO comments instead of real GraphQL calls
2. **status-indicator.js** - Shows static data instead of real-time updates
3. **Preview iframe** - Doesn't inject CSS from GraphQL

#### Permission-based UI (30% of Phase 3):
1. **Buttons** - Not disabled based on ACL permissions
2. **Tooltips** - No explanations for disabled elements
3. **View-only mode** - Elements not hidden for viewer role

#### Error Handling (10% of Phase 3):
1. **GraphQL errors** - 401/403 not handled properly
2. **Loading states** - No spinners during async operations
3. **Retry mechanism** - No way to retry failed requests

---

---

## 📝 Why Two Sub-Phases?

### Initial Assumption (Wrong):
"Phase 3 is just connecting toolbar to GraphQL - 8 hours"

### Reality Discovered:
During planning, we found that the Theme Editor Panel (935 lines + ~7,500 lines of supporting code) needs to be migrated from frontend to admin. This panel is the **main editing interface** for theme variables.

### Decision:
Split Phase 3 into two manageable parts:
- **3A:** Toolbar integration (quick win, validates GraphQL approach)
- **3B:** Settings editor migration (big migration, needs 3A working first)

### Renaming: `panel.js` → `settings-editor.js`

We're renaming the panel to better reflect its purpose:

**Why "Settings Editor"?**
- **Purpose:** Edits theme **settings** (variables: colors, typography, spacing)
- **Future-proof:** Allows for other panels (selectors-panel, layout-panel)
- **User-friendly:** "Settings" is clearer than "Panel" or "Variables"

**What we're renaming:**
- ✅ File: `panel.js` → `settings-editor.js`
- ✅ Template: `panel.html` → `settings-editor.html`
- ✅ Widget (frontend): `themeEditorPanel` → `themeSettingsEditor`
- ✅ Widget (admin): `breezeSettingsEditor` (follows admin naming convention)

**What we're keeping:**
- ✅ DOM ID: `#theme-editor-panel` (generic container for all panels)
- ✅ CSS classes: `.bte-panel-*` (shared by all panel types)

**When:** Renaming happens in Phase 3B when we migrate to admin.

---

## 📋 Phase 3A Implementation Tasks (Toolbar)

**See detailed plan:** [`PHASE-3-IMPLEMENTATION-PLAN.md`](./PHASE-3-IMPLEMENTATION-PLAN.md)

### Task 1: Integrate GraphQL into publication-selector.js (2 hours)

**Current State:** Component has TODO comments for GraphQL integration

**File:** `view/adminhtml/web/js/editor/toolbar/publication-selector.js`

**Changes Required:**

#### 1.1 Add GraphQL dependencies
```javascript
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/publication-selector.html',
    'Swissup_BreezeThemeEditor/js/graphql/client',                    // NEW
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-publications',  // NEW
    'Swissup_BreezeThemeEditor/js/graphql/mutations/publish'          // NEW
], function ($, mageTemplate, template, graphqlClient, getPublicationsQuery, publishMutation) {
```

#### 1.2 Implement _publishDraft method
```javascript
/**
 * Publish draft changes
 * @private
 */
_publishDraft: function() {
    var self = this;
    
    // Show loading state
    this._setLoading(true);
    
    // Execute GraphQL mutation
    graphqlClient.mutate(publishMutation, {
        storeId: parseInt(this.options.storeId),
        themeId: parseInt(this.options.themeId)
    }).then(function(response) {
        if (response.data.publishBreezeThemeEditor.success) {
            // Update UI
            self.options.currentStatus = 'PUBLISHED';
            self.options.changesCount = 0;
            self._render();
            
            // Show success message
            self._showSuccess(response.data.publishBreezeThemeEditor.message);
            
            // Trigger event for other components
            $(document).trigger('bte:published', {
                publicationId: response.data.publishBreezeThemeEditor.publicationId
            });
        }
    }).catch(function(error) {
        self._handleError(error);
    }).finally(function() {
        self._setLoading(false);
    });
}
```

#### 1.3 Implement _loadPublications method
```javascript
/**
 * Load publications from GraphQL
 * @private
 */
_loadPublications: function() {
    var self = this;
    
    graphqlClient.query(getPublicationsQuery, {
        storeId: parseInt(this.options.storeId),
        themeId: parseInt(this.options.themeId),
        pageSize: 10,
        currentPage: this.options.publicationsPage || 1
    }).then(function(response) {
        var publications = response.data.breezeThemeEditorPublications.items;
        self.options.publications = self.options.publications.concat(publications);
        self._render();
    }).catch(function(error) {
        self._handleError(error);
    });
}
```

#### 1.4 Add error handling
```javascript
/**
 * Handle GraphQL errors
 * @private
 */
_handleError: function(error) {
    console.error('Publication selector error:', error);
    
    // Check for specific error types
    if (error.response?.status === 403) {
        this._showError('You do not have permission to perform this action.');
    } else if (error.response?.status === 401) {
        this._showError('Your session has expired. Please refresh the page.');
    } else {
        this._showError('An error occurred. Please try again.');
    }
}
```

**Acceptance Criteria:**
- [ ] Publish button executes GraphQL mutation
- [ ] Publications list loads from GraphQL
- [ ] Error messages displayed for 401/403
- [ ] Loading spinner shown during requests
- [ ] Success message after publish
- [ ] `bte:published` event triggered

---

### Task 2: Integrate GraphQL into status-indicator.js (1.5 hours)

**Current State:** Shows static data from initial config

**File:** `view/adminhtml/web/js/editor/toolbar/status-indicator.js`

**Changes Required:**

#### 2.1 Add GraphQL dependencies
```javascript
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/status-indicator.html',
    'Swissup_BreezeThemeEditor/js/graphql/client',               // NEW
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-statuses'  // NEW
], function ($, mageTemplate, template, graphqlClient, getStatusesQuery) {
```

#### 2.2 Implement real-time status updates
```javascript
/**
 * Refresh status from GraphQL
 * @private
 */
_refreshStatus: function() {
    var self = this;
    
    graphqlClient.query(getStatusesQuery, {
        storeId: parseInt(this.options.storeId),
        themeId: parseInt(this.options.themeId)
    }).then(function(response) {
        var statuses = response.data.breezeThemeEditorStatuses;
        
        self.options.status = statuses.currentStatus;
        self.options.changesCount = statuses.draftChangesCount;
        self.options.lastPublished = statuses.lastPublishedAt;
        
        self._render();
    }).catch(function(error) {
        console.error('Status indicator error:', error);
    });
}
```

#### 2.3 Listen for save/publish events
```javascript
_bindEvents: function() {
    var self = this;
    
    // Refresh status after save
    $(document).on('bte:saved', function() {
        self._refreshStatus();
    });
    
    // Refresh status after publish
    $(document).on('bte:published', function() {
        self._refreshStatus();
    });
}
```

**Acceptance Criteria:**
- [ ] Status updates after save/publish
- [ ] Changes count is accurate
- [ ] Last published date displayed
- [ ] Auto-refresh every 30 seconds (optional)

---

### Task 3: Implement Permission-based UI (2 hours)

**Current State:** All buttons enabled regardless of ACL

**Changes Required:**

#### 3.1 Create permissions utility helper
**File:** `view/adminhtml/web/js/utils/permissions.js` (NEW)

```javascript
define(['jquery'], function($) {
    'use strict';
    
    return {
        /**
         * Get permissions from config
         */
        getPermissions: function() {
            var config = window.breezeThemeEditorConfig || {};
            return config.permissions || {
                canView: false,
                canEdit: false,
                canPublish: false,
                canRollback: false
            };
        },
        
        /**
         * Check if user can edit
         */
        canEdit: function() {
            return this.getPermissions().canEdit;
        },
        
        /**
         * Check if user can publish
         */
        canPublish: function() {
            return this.getPermissions().canPublish;
        },
        
        /**
         * Check if user can rollback
         */
        canRollback: function() {
            return this.getPermissions().canRollback;
        },
        
        /**
         * Get permission message for tooltip
         */
        getPermissionMessage: function(action) {
            var messages = {
                'edit': 'You need "Edit Themes" permission to perform this action.',
                'publish': 'You need "Publish Changes" permission to perform this action.',
                'rollback': 'You need "Rollback Changes" permission to perform this action.'
            };
            return messages[action] || 'You do not have permission for this action.';
        }
    };
});
```

#### 3.2 Apply permissions to publication-selector.js
```javascript
define([
    // ... existing dependencies
    'Swissup_BreezeThemeEditor/js/utils/permissions'  // NEW
], function ($, mageTemplate, template, graphqlClient, /*...*/, permissions) {

    $.widget('swissup.breezePublicationSelector', {
        
        _render: function() {
            var html = mageTemplate(template, {
                status: this.options.currentStatus,
                changesCount: this.options.changesCount,
                publications: this.options.publications,
                canPublish: permissions.canPublish() && this.options.changesCount > 0,  // NEW
                canRollback: permissions.canRollback()  // NEW
            });
            this.element.html(html);
            
            // Disable buttons and add tooltips
            this._applyPermissions();
        },
        
        /**
         * Apply ACL permissions to UI elements
         * @private
         */
        _applyPermissions: function() {
            var $publishBtn = this.element.find('[data-action="publish"]');
            var $rollbackBtns = this.element.find('[data-action="rollback"]');
            
            // Disable publish button if no permission
            if (!permissions.canPublish()) {
                $publishBtn.prop('disabled', true)
                    .attr('title', permissions.getPermissionMessage('publish'));
            }
            
            // Disable rollback buttons if no permission
            if (!permissions.canRollback()) {
                $rollbackBtns.prop('disabled', true)
                    .attr('title', permissions.getPermissionMessage('rollback'));
            }
        }
    });
});
```

#### 3.3 Update publication-selector.html template
**File:** `view/adminhtml/web/template/editor/publication-selector.html`

```html
<div class="bte-publication-selector">
    <button class="toolbar-select" data-bind="css: statusClass">
        <span data-bind="text: statusLabel"></span>
        <span data-bind="visible: changesCount > 0, text: changesCount"></span>
        <span class="select-arrow">▼</span>
    </button>
    
    <div class="toolbar-dropdown" data-bind="visible: isOpen">
        <!-- Publish button - show only if canPublish -->
        <% if (data.canPublish) { %>
        <button data-action="publish" class="publish-button">
            Publish <%= data.changesCount %> changes
        </button>
        <% } else if (data.changesCount > 0) { %>
        <div class="permission-notice">
            <%= data.changesCount %> unpublished changes
            <span class="help-text">Contact admin to publish</span>
        </div>
        <% } %>
        
        <!-- Publications list -->
        <div class="publications-list">
            <% _.each(data.publications, function(pub) { %>
            <div class="publication-item">
                <a href="#" data-publication-id="<%= pub.id %>">
                    <%= pub.title %>
                </a>
                <% if (data.canRollback) { %>
                <button data-action="rollback" data-publication-id="<%= pub.id %>" 
                        title="Rollback to this version">
                    ↶
                </button>
                <% } %>
            </div>
            <% }); %>
        </div>
    </div>
</div>
```

**Acceptance Criteria:**
- [ ] Publish button disabled for view-only/editor roles
- [ ] Rollback buttons hidden for non-rollback roles
- [ ] Tooltips explain why buttons disabled
- [ ] Permission notices shown for unpublished changes
- [ ] View-only users see read-only interface

---

### Task 4: Preview CSS Injection (1.5 hours)

**Current State:** Iframe shows frontend but doesn't inject draft CSS

**Changes Required:**

#### 4.1 Create preview manager
**File:** `view/adminhtml/web/js/editor/preview-manager.js` (NEW)

```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-css'
], function($, graphqlClient, getCssQuery) {
    'use strict';
    
    return {
        /**
         * Inject draft CSS into preview iframe
         */
        injectDraftCSS: function(iframeId, storeId, themeId) {
            var self = this;
            var $iframe = $('#' + iframeId);
            
            if (!$iframe.length) {
                console.error('Preview iframe not found:', iframeId);
                return;
            }
            
            // Load CSS from GraphQL
            graphqlClient.query(getCssQuery, {
                storeId: parseInt(storeId),
                status: 'DRAFT'
            }).then(function(response) {
                var css = response.data.getThemeEditorCss.css;
                
                if (css && css.trim()) {
                    self._injectCSS($iframe[0], css);
                    console.log('✅ Draft CSS injected into preview');
                } else {
                    console.log('ℹ️ No draft CSS to inject');
                }
            }).catch(function(error) {
                console.error('Failed to load draft CSS:', error);
            });
        },
        
        /**
         * Inject CSS into iframe document
         * @private
         */
        _injectCSS: function(iframe, css) {
            try {
                var doc = iframe.contentDocument || iframe.contentWindow.document;
                
                // Remove existing injected style
                var existingStyle = doc.getElementById('bte-draft-css');
                if (existingStyle) {
                    existingStyle.remove();
                }
                
                // Create new style element
                var style = doc.createElement('style');
                style.id = 'bte-draft-css';
                style.textContent = css;
                
                // Append to head
                doc.head.appendChild(style);
                
            } catch (e) {
                console.error('Failed to inject CSS into iframe:', e);
            }
        },
        
        /**
         * Refresh preview CSS
         */
        refresh: function(iframeId, storeId, themeId) {
            this.injectDraftCSS(iframeId, storeId, themeId);
        }
    };
});
```

#### 4.2 Initialize preview manager in toolbar.js
**File:** `view/adminhtml/web/js/editor/toolbar.js`

```javascript
define([
    // ... existing dependencies
    'Swissup_BreezeThemeEditor/js/editor/preview-manager'  // NEW
], function($, /* ... */, previewManager) {

    $.widget('swissup.breezeToolbar', {
        
        _create: function() {
            console.log('🎨 Initializing admin toolbar');
            
            // Initialize components
            this._initializeComponents();
            
            // Initialize preview manager
            this._initializePreview();
            
            // Listen for save events
            this._bindEvents();
        },
        
        /**
         * Initialize preview iframe with draft CSS
         * @private
         */
        _initializePreview: function() {
            var config = this.options.config;
            
            // Wait for iframe to load
            $('#bte-iframe').on('load', function() {
                previewManager.injectDraftCSS(
                    'bte-iframe',
                    config.storeId,
                    config.themeId
                );
            });
        },
        
        /**
         * Bind global events
         * @private
         */
        _bindEvents: function() {
            // Refresh preview after save
            $(document).on('bte:saved', function(e, data) {
                previewManager.refresh('bte-iframe', data.storeId, data.themeId);
            });
        }
    });
});
```

**Acceptance Criteria:**
- [ ] Draft CSS loads on iframe load
- [ ] Preview updates after save
- [ ] Console logs confirm CSS injection
- [ ] No cross-origin errors
- [ ] CSS changes visible in preview

---

### Task 5: Error Handling & Loading States (1 hour)

**Current State:** No error handling or loading indicators

**Changes Required:**

#### 5.1 Create error handler utility
**File:** `view/adminhtml/web/js/utils/error-handler.js` (NEW)

```javascript
define(['jquery'], function($) {
    'use strict';
    
    return {
        /**
         * Handle GraphQL error response
         */
        handle: function(error, context) {
            console.error('[BTE Error]', context, error);
            
            var message = this._getErrorMessage(error);
            this._showError(message, context);
            
            // Log to server if critical
            if (this._isCritical(error)) {
                this._logToServer(error, context);
            }
        },
        
        /**
         * Get user-friendly error message
         * @private
         */
        _getErrorMessage: function(error) {
            if (!error.response) {
                return 'Network error. Please check your connection.';
            }
            
            switch (error.response.status) {
                case 401:
                    return 'Your session has expired. Please refresh the page.';
                case 403:
                    return 'You do not have permission to perform this action.';
                case 500:
                    return 'Server error. Please try again later.';
                default:
                    return error.message || 'An unexpected error occurred.';
            }
        },
        
        /**
         * Show error message to user
         * @private
         */
        _showError: function(message, context) {
            // Use Magento's notification system
            if (window.require) {
                require(['Magento_Ui/js/modal/alert'], function(alert) {
                    alert({
                        title: 'Error',
                        content: message
                    });
                });
            } else {
                alert(message);
            }
        },
        
        /**
         * Check if error is critical
         * @private
         */
        _isCritical: function(error) {
            return error.response?.status >= 500;
        },
        
        /**
         * Log error to server
         * @private
         */
        _logToServer: function(error, context) {
            // TODO: Implement server-side error logging endpoint
            console.log('Would log to server:', error, context);
        }
    };
});
```

#### 5.2 Create loading indicator utility
**File:** `view/adminhtml/web/js/utils/loading.js` (NEW)

```javascript
define(['jquery'], function($) {
    'use strict';
    
    return {
        /**
         * Show loading spinner on element
         */
        show: function(element) {
            var $el = $(element);
            
            // Add loading class
            $el.addClass('bte-loading');
            
            // Disable buttons
            $el.find('button, input, select').prop('disabled', true);
            
            // Add spinner if not exists
            if (!$el.find('.bte-spinner').length) {
                $el.append('<div class="bte-spinner"></div>');
            }
        },
        
        /**
         * Hide loading spinner
         */
        hide: function(element) {
            var $el = $(element);
            
            // Remove loading class
            $el.removeClass('bte-loading');
            
            // Enable buttons
            $el.find('button, input, select').prop('disabled', false);
            
            // Remove spinner
            $el.find('.bte-spinner').remove();
        }
    };
});
```

#### 5.3 Apply to components
Update `publication-selector.js` to use utilities:

```javascript
define([
    // ... existing
    'Swissup_BreezeThemeEditor/js/utils/error-handler',
    'Swissup_BreezeThemeEditor/js/utils/loading'
], function($, /* ... */, errorHandler, loading) {

    $.widget('swissup.breezePublicationSelector', {
        
        _publishDraft: function() {
            var self = this;
            
            // Show loading
            loading.show(this.element);
            
            graphqlClient.mutate(publishMutation, {
                storeId: parseInt(this.options.storeId),
                themeId: parseInt(this.options.themeId)
            }).then(function(response) {
                // ... success handling
            }).catch(function(error) {
                errorHandler.handle(error, 'publish-draft');
            }).finally(function() {
                loading.hide(self.element);
            });
        }
    });
});
```

**Acceptance Criteria:**
- [ ] Loading spinner shown during async operations
- [ ] Buttons disabled during loading
- [ ] Error messages displayed to user
- [ ] 401/403 errors handled correctly
- [ ] Network errors show retry option

---

### Task 6: Testing & Polish (30 minutes)

**Testing Checklist:**

#### 6.1 GraphQL Integration Tests
- [ ] Publish mutation works
- [ ] Publications query works
- [ ] Status query works
- [ ] CSS query works
- [ ] Bearer token passed correctly
- [ ] Errors caught and handled

#### 6.2 Permission-based UI Tests
- [ ] View-only role: all buttons disabled
- [ ] Editor role: publish button disabled
- [ ] Publisher role: publish button enabled
- [ ] Admin role: all buttons enabled
- [ ] Tooltips show permission messages
- [ ] Permission notices visible

#### 6.3 Preview Tests
- [ ] Draft CSS injected on load
- [ ] Preview updates after save
- [ ] No cross-origin errors
- [ ] CSS changes visible immediately

#### 6.4 Error Handling Tests
- [ ] Network error: retry message shown
- [ ] 401 error: session expired message
- [ ] 403 error: permission denied message
- [ ] Loading spinners work correctly

#### 6.5 Browser Console Tests
- [ ] No JavaScript errors
- [ ] GraphQL requests logged (dev mode)
- [ ] Success/error messages logged
- [ ] No memory leaks

---

## 📂 Phase 3A: Files to Create/Modify

### New Files (4):
```
view/adminhtml/web/js/utils/
├── permissions.js           # ACL permission checks
├── error-handler.js         # Error handling utility
└── loading.js               # Loading state utility

view/adminhtml/web/js/editor/
└── preview-manager.js       # CSS injection into iframe
```

### Modified Files (4):
```
view/adminhtml/web/js/editor/toolbar/
├── publication-selector.js  # Add GraphQL + permissions
├── status-indicator.js      # Add GraphQL + real-time updates
└── toolbar.js               # Initialize preview manager

view/adminhtml/web/css/
└── editor.css               # Add loading + permission styles
```

---

## 📂 Phase 3B: Files to Create/Modify

### New Admin Files (~31 files):
```
view/adminhtml/web/js/editor/panel/
├── settings-editor.js       # Main widget (adapted from frontend)
├── panel-state.js           # COPY from frontend
├── palette-manager.js       # COPY from frontend
├── css-preview-manager.js   # COPY from frontend
├── css-manager.js           # COPY from frontend
├── preset-selector.js       # COPY from frontend
├── storage-helper.js        # COPY from frontend
├── field-handlers/          # COPY 9 files (~2,500 lines)
│   ├── base.js
│   ├── color.js
│   ├── repeater.js
│   └── (6 more)
├── field-renderers/         # COPY 15 files (~1,000 lines)
│   ├── base.js
│   ├── color.js
│   └── (13 more)
└── sections/                # COPY 1 file
    └── palette-section-renderer.js

view/adminhtml/web/template/editor/panel/
├── settings-editor.html     # COPY from frontend
└── fields/                  # COPY 15 template files
    └── (15 field templates)

view/adminhtml/web/css/source/panels/
└── _settings-editor-panel.less  # COPY from frontend
```

### Modified Frontend Files (3):
```
view/frontend/web/js/theme-editor/
├── panel.js → settings-editor.js  # RENAME
└── toolbar/navigation.js          # Update imports

view/frontend/web/template/theme-editor/
└── panel.html → settings-editor.html  # RENAME
```

### Modified Admin Files (3):
```
view/adminhtml/web/js/editor/toolbar/
└── navigation.js            # Add settings editor integration

ViewModel/
└── AdminToolbar.php         # Add settings editor config

view/adminhtml/web/css/
└── editor.css               # Import settings editor styles
```

---

## ⏱️ Time Breakdown Summary

### Phase 3A: Toolbar GraphQL Integration (8.5 hours)

| Task | Description | Time |
|------|-------------|------|
| Task 5 | Create utilities (error-handler, loading, permissions) | 1h |
| Task 3 | Setup permissions system | 2h |
| Task 2 | Status indicator GraphQL | 1.5h |
| Task 1 | Publication selector GraphQL | 2h |
| Task 4 | Preview manager | 1.5h |
| Task 6 | Testing & verification | 0.5h |
| **Subtotal** | **Phase 3A** | **8.5h** |

### Phase 3B: Settings Editor Migration (30 hours)

| Task | Description | Time |
|------|-------------|------|
| Task 1 | Rename frontend files | 1h |
| Task 2 | Copy utilities & managers | 2h |
| Task 3 | Create admin settings editor widget | 8h |
| Task 4 | Integrate into toolbar | 4h |
| Task 5 | Update field handlers paths | 3h |
| Task 6 | Update CSS | 2h |
| Task 7 | Test & debug | 5h |
| Task 8 | Update navigation | 1h |
| Task 9 | Documentation & cleanup | 4h |
| **Subtotal** | **Phase 3B** | **30h** |

### **Phase 3 Total:** 38.5 hours (~5-6 work days)

---

## 🚀 Implementation Strategy

### Phase 3A: Step-by-step approach

1. **Start with utilities** (Task 5) - Create helper functions first
2. **Setup permissions** (Task 3) - Permission system foundation
3. **Integrate GraphQL** (Task 2, 1) - Connect components to API (simple first)
4. **Add preview** (Task 4) - Enhance preview iframe
5. **Test everything** (Task 6) - Verify all functionality

### Phase 3B: Step-by-step approach

1. **Rename frontend** (Task 1) - Clean up naming first
2. **Copy files** (Task 2) - Get all supporting code in place
3. **Adapt main widget** (Task 3) - Core settings editor for admin
4. **Integrate** (Task 4, 5, 6) - Connect to toolbar, update paths, styling
5. **Test thoroughly** (Task 7, 8) - Full validation
6. **Document** (Task 9) - Clean up and finalize

### Rollback plan

If any task fails:
1. **Phase 3A failures:** 
   - Revert component changes (Git reset)
   - Keep utilities (helper functions don't break existing code)
   - Disable preview (comment out preview manager initialization)
   - Use static data (fall back to config-based data)

2. **Phase 3B failures:**
   - Revert to end of Phase 3A state
   - Frontend still works with old panel.js name
   - Admin toolbar works without settings editor panel
   - Can retry Phase 3B later without affecting 3A

---

## ✅ Success Criteria

### Phase 3A Complete When:

- ✅ All toolbar components use real GraphQL data
- ✅ Publish button executes mutation successfully
- ✅ Status indicator updates in real-time
- ✅ Permissions disable/hide UI elements correctly
- ✅ Preview iframe shows draft CSS changes
- ✅ Error messages displayed for all error types
- ✅ Loading states shown during async operations
- ✅ All 4 ACL roles tested (view/edit/publish/admin)
- ✅ Zero console errors in browser
- ✅ All manual tests passing

### Phase 3B Complete When:

- ✅ Settings editor opens from admin toolbar
- ✅ Config loads from GraphQL
- ✅ All field types render correctly
- ✅ Changes saved via GraphQL
- ✅ Publish functionality works
- ✅ Permissions enforced (ACL)
- ✅ Preview updates in real-time
- ✅ Frontend renamed to settings-editor successfully
- ✅ All 31+ files copied/created correctly
- ✅ Cross-browser compatibility verified
- ✅ Documentation complete

### **Phase 3 (Both A+B) Complete When:**
- ✅ Full admin editor with working toolbar
- ✅ Settings editor panel fully functional
- ✅ GraphQL integration complete
- ✅ ACL permissions working end-to-end
- ✅ Live preview operational
- ✅ Save & publish working
- ✅ Zero console errors
- ✅ All tests passing
- ✅ Status indicator updates in real-time
- ✅ Permissions disable/hide UI elements correctly
- ✅ Preview iframe shows draft CSS changes
- ✅ Error messages displayed for all error types
- ✅ Loading states shown during async operations
- ✅ All 4 ACL roles tested (view/edit/publish/admin)
- ✅ Zero console errors in browser
- ✅ All manual tests passing

---

## 📝 Notes

**Architecture Decision:** No `view/base/` directory used. All admin components remain in `view/adminhtml/` for better separation and independent evolution (decision made in Phase 1).

**Naming Decision:** Renamed `panel.js` → `settings-editor.js` in Phase 3B to better reflect purpose (editing theme settings/variables) and distinguish from future panels (selectors-panel, layout-panel).

**Token System:** Admin uses JWT tokens generated by `AdminTokenGenerator`, passed through `window.breezeThemeEditorConfig.token`. Frontend token system (AccessToken) remains separate.

**ACL Integration:** Permissions checked in backend (GraphQL resolvers) AND frontend (UI disabled/hidden). Defense in depth approach.

**Migration Strategy:** Copy & adapt approach for Phase 3B (~70% code reusable). Frontend code already uses GraphQL, only needs minor path/initialization changes for admin.

---

## 📚 Related Documentation

- **Phase 3A Details:** [`PHASE-3-IMPLEMENTATION-PLAN.md`](./PHASE-3-IMPLEMENTATION-PLAN.md) - Step-by-step toolbar integration
- **Phase 3B Details:** [`PHASE-3B-IMPLEMENTATION-PLAN.md`](./PHASE-3B-IMPLEMENTATION-PLAN.md) - Step-by-step settings editor migration  
- **Quick Reference:** [`PHASE-3-QUICK-START.md`](./PHASE-3-QUICK-START.md) - Quick start guide

---

[← Phase 2](./admin-migration-phase-2.md) | [↑ Plan](./admin-migration-plan.md) | [Next: Phase 4 →](./admin-migration-phase-4.md)
