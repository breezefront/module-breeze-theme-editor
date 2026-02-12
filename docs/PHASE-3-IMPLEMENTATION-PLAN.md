# Phase 3A Implementation Plan: Toolbar GraphQL Integration

**Date Created:** February 11, 2026  
**Date Updated:** February 12, 2026  
**Status:** Ready to Execute  
**Estimated Total Time:** 8.5 hours  
**Dependencies:** Phase 1 ✅, Phase 2 ✅

---

## 🎯 Overview

This plan provides step-by-step instructions to complete **Phase 3A: Toolbar GraphQL Integration**. This phase connects existing admin toolbar components to the GraphQL API and implements permission-based UI.

**Note:** Phase 3 is split into two parts:
- **Phase 3A (this plan):** Toolbar GraphQL integration - 8.5 hours
- **Phase 3B (separate plan):** Settings Editor migration - 30 hours (see `PHASE-3B-IMPLEMENTATION-PLAN.md`)

### Naming Convention Note

During planning, we decided to rename `panel.js` → `settings-editor.js` to better reflect its purpose (editing theme variables/settings) and distinguish it from future panels (e.g., selectors-panel, layout-panel).

**Renaming will happen in Phase 3B:**
- **Frontend:** `panel.js` → `settings-editor.js`
- **Admin:** Create as `settings-editor.js` from the start
- **Widget name (admin):** `breezeSettingsEditor`
- **DOM ID:** Keep `#theme-editor-panel` (generic container for all panels)
- **CSS classes:** Keep `.bte-panel-*` (shared by all panels)

This plan (Phase 3A) does not involve the settings editor panel - we're only working with toolbar components.

---

## 📋 Task Execution Order

### Priority Order (recommended):
1. **Task 5** → Create utilities first (foundation)
2. **Task 3** → Setup permissions system (requires utilities)
3. **Task 1** → Integrate publication-selector (requires permissions)
4. **Task 2** → Integrate status-indicator (simple, quick win)
5. **Task 4** → Add preview manager (visual feedback)
6. **Task 6** → Test everything (verification)

---

## 🔧 Task 5: Error Handling & Utilities (Start Here)

**Time:** 1 hour  
**Why First:** Other tasks depend on these utilities

### Step 5.1: Create error-handler.js

```bash
# Create utils directory
mkdir -p view/adminhtml/web/js/utils

# Create file
cat > view/adminhtml/web/js/utils/error-handler.js << 'EOF'
define(['jquery'], function($) {
    'use strict';
    
    return {
        handle: function(error, context) {
            console.error('[BTE Error]', context, error);
            
            var message = this._getErrorMessage(error);
            this._showError(message, context);
        },
        
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
        
        _showError: function(message, context) {
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
        }
    };
});
EOF
```

**Verify:**
```bash
# Check file exists and is valid JavaScript
node -c view/adminhtml/web/js/utils/error-handler.js
```

### Step 5.2: Create loading.js

```bash
cat > view/adminhtml/web/js/utils/loading.js << 'EOF'
define(['jquery'], function($) {
    'use strict';
    
    return {
        show: function(element) {
            var $el = $(element);
            $el.addClass('bte-loading');
            $el.find('button, input, select').prop('disabled', true);
            
            if (!$el.find('.bte-spinner').length) {
                $el.append('<div class="bte-spinner"><span>Loading...</span></div>');
            }
        },
        
        hide: function(element) {
            var $el = $(element);
            $el.removeClass('bte-loading');
            $el.find('button, input, select').prop('disabled', false);
            $el.find('.bte-spinner').remove();
        }
    };
});
EOF
```

**Verify:**
```bash
node -c view/adminhtml/web/js/utils/loading.js
```

### Step 5.3: Add loading CSS styles

```bash
cat >> view/adminhtml/web/css/editor.css << 'EOF'

/* Loading States */
.bte-loading {
    position: relative;
    opacity: 0.6;
    pointer-events: none;
}

.bte-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.9);
    padding: 10px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
}

.bte-spinner span {
    display: inline-block;
    font-size: 14px;
    color: #333;
}

.bte-spinner span::after {
    content: '...';
    animation: bte-dots 1.5s steps(4, end) infinite;
}

@keyframes bte-dots {
    0%, 25% { content: '.'; }
    50% { content: '..'; }
    75%, 100% { content: '...'; }
}
EOF
```

**Checkpoint:**
- [ ] `error-handler.js` created
- [ ] `loading.js` created
- [ ] CSS updated with loading styles
- [ ] No syntax errors

---

## 🔐 Task 3: Permissions System

**Time:** 2 hours  
**Why Second:** Foundation for permission-based UI

### Step 3.1: Create permissions.js

```bash
cat > view/adminhtml/web/js/utils/permissions.js << 'EOF'
define(['jquery'], function($) {
    'use strict';
    
    return {
        getPermissions: function() {
            var config = window.breezeThemeEditorConfig || {};
            return config.permissions || {
                canView: false,
                canEdit: false,
                canPublish: false,
                canRollback: false
            };
        },
        
        canView: function() {
            return this.getPermissions().canView;
        },
        
        canEdit: function() {
            return this.getPermissions().canEdit;
        },
        
        canPublish: function() {
            return this.getPermissions().canPublish;
        },
        
        canRollback: function() {
            return this.getPermissions().canRollback;
        },
        
        getPermissionMessage: function(action) {
            var messages = {
                'edit': 'You need "Edit Themes" permission to perform this action.',
                'publish': 'You need "Publish Changes" permission to perform this action.',
                'rollback': 'You need "Rollback Changes" permission to perform this action.'
            };
            return messages[action] || 'You do not have permission for this action.';
        },
        
        applyToElement: function($element, action) {
            if (!this['can' + action.charAt(0).toUpperCase() + action.slice(1)]()) {
                $element.prop('disabled', true)
                    .addClass('bte-permission-denied')
                    .attr('title', this.getPermissionMessage(action));
            }
        }
    };
});
EOF
```

**Verify:**
```bash
node -c view/adminhtml/web/js/utils/permissions.js
```

### Step 3.2: Test permissions in browser console

Open editor page and run:
```javascript
// In browser console
require(['Swissup_BreezeThemeEditor/js/utils/permissions'], function(permissions) {
    console.log('Permissions:', permissions.getPermissions());
    console.log('Can Edit:', permissions.canEdit());
    console.log('Can Publish:', permissions.canPublish());
    console.log('Can Rollback:', permissions.canRollback());
});
```

**Expected Output:**
```javascript
Permissions: {canView: true, canEdit: true, canPublish: false, canRollback: false}
Can Edit: true
Can Publish: false
Can Rollback: false
```

### Step 3.3: Add permission CSS styles

```bash
cat >> view/adminhtml/web/css/editor.css << 'EOF'

/* Permission Denied States */
.bte-permission-denied {
    opacity: 0.5;
    cursor: not-allowed !important;
}

.bte-permission-denied:hover {
    background-color: #f5f5f5 !important;
}

.permission-notice {
    padding: 10px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    margin: 10px 0;
}

.permission-notice .help-text {
    display: block;
    font-size: 12px;
    color: #666;
    margin-top: 5px;
}
EOF
```

**Checkpoint:**
- [ ] `permissions.js` created and loads correctly
- [ ] Browser console test shows correct permissions
- [ ] CSS styles added
- [ ] No console errors

---

## 📰 Task 1: Publication Selector Integration

**Time:** 2 hours  
**Why Third:** Most complex component

### Step 1.1: Backup original file

```bash
cp view/adminhtml/web/js/editor/toolbar/publication-selector.js \
   view/adminhtml/web/js/editor/toolbar/publication-selector.js.backup
```

### Step 1.2: Add GraphQL dependencies

Edit `view/adminhtml/web/js/editor/toolbar/publication-selector.js`:

Find the `define([` block and add dependencies:
```javascript
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
```

### Step 1.3: Replace _publishDraft method

Find the `_publishDraft` method and replace with:
```javascript
/**
 * Publish draft changes via GraphQL
 * @private
 */
_publishDraft: function() {
    var self = this;
    
    // Check permission
    if (!permissions.canPublish()) {
        errorHandler.handle({
            message: permissions.getPermissionMessage('publish')
        }, 'publish-draft');
        return;
    }
    
    // Show loading
    loading.show(this.element);
    
    // Execute GraphQL mutation
    graphqlClient.mutate(publishMutation, {
        storeId: parseInt(this.options.storeId),
        themeId: parseInt(this.options.themeId)
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
                    storeId: self.options.storeId,
                    themeId: self.options.themeId
                });
                
                // Reload publications list
                self._loadPublications();
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
```

### Step 1.4: Replace _loadPublications method

Find the `_loadPublications` method and replace with:
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
    });
},
```

### Step 1.5: Update _render method to check permissions

Find the `_render` method and update:
```javascript
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
    
    // Apply permission restrictions
    this._applyPermissions();
},

/**
 * Apply ACL permissions to UI elements
 * @private
 */
_applyPermissions: function() {
    var $publishBtn = this.element.find('[data-action="publish"]');
    var $rollbackBtns = this.element.find('[data-action="rollback"]');
    
    // Apply permissions
    if ($publishBtn.length) {
        permissions.applyToElement($publishBtn, 'publish');
    }
    
    if ($rollbackBtns.length) {
        $rollbackBtns.each(function() {
            permissions.applyToElement($(this), 'rollback');
        });
    }
},
```

### Step 1.6: Test in browser

1. Clear cache:
```bash
bin/magento cache:clean
rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor
```

2. Open editor in browser
3. Open console and check for:
```
✅ Publication selector initialized
✅ Loaded X publications
```

4. Click "Publish" button and verify:
   - Loading spinner appears
   - GraphQL mutation executes
   - Success message shown
   - Publications list reloads

**Checkpoint:**
- [ ] GraphQL dependencies added
- [ ] Publish method uses GraphQL
- [ ] Publications load from GraphQL
- [ ] Permissions applied correctly
- [ ] Loading states work
- [ ] Error handling works

---

## 📊 Task 2: Status Indicator Integration

**Time:** 1.5 hours  
**Why Fourth:** Quick win after complex task

### Step 2.1: Backup and update status-indicator.js

```bash
cp view/adminhtml/web/js/editor/toolbar/status-indicator.js \
   view/adminhtml/web/js/editor/toolbar/status-indicator.js.backup
```

### Step 2.2: Add GraphQL dependencies

Edit `view/adminhtml/web/js/editor/toolbar/status-indicator.js`:

```javascript
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/status-indicator.html',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-statuses'
], function ($, mageTemplate, template, graphqlClient, getStatusesQuery) {
```

### Step 2.3: Add _refreshStatus method

Add new method to widget:
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
        if (response.data && response.data.breezeThemeEditorStatuses) {
            var statuses = response.data.breezeThemeEditorStatuses;
            
            // Update options
            self.options.status = statuses.currentStatus;
            self.options.changesCount = statuses.draftChangesCount;
            self.options.lastPublished = statuses.lastPublishedAt;
            
            // Re-render
            self._render();
            
            console.log('✅ Status updated:', statuses.currentStatus, 
                       'Changes:', statuses.draftChangesCount);
        }
    }).catch(function(error) {
        console.error('Failed to refresh status:', error);
    });
},
```

### Step 2.4: Add event listeners

Update `_create` method to add event listeners:
```javascript
_create: function() {
    console.log('🎨 Initializing status indicator', this.options);
    this._render();
    this._bindEvents();
    
    // Auto-refresh every 30 seconds
    this._startAutoRefresh();
    
    console.log('✅ Status indicator initialized');
},

/**
 * Bind event handlers
 * @private
 */
_bindEvents: function() {
    var self = this;
    
    // Refresh after save
    $(document).on('bte:saved', function() {
        self._refreshStatus();
    });
    
    // Refresh after publish
    $(document).on('bte:published', function() {
        self._refreshStatus();
    });
    
    // Manual refresh on click
    this.element.on('click', '[data-action="refresh"]', function(e) {
        e.preventDefault();
        self._refreshStatus();
    });
},

/**
 * Start auto-refresh timer
 * @private
 */
_startAutoRefresh: function() {
    var self = this;
    
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(function() {
        self._refreshStatus();
    }, 30000);
},

/**
 * Cleanup on destroy
 * @private
 */
_destroy: function() {
    if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
    }
    $(document).off('bte:saved bte:published');
},
```

### Step 2.5: Test in browser

1. Clear cache and refresh
2. Check console for:
```
✅ Status indicator initialized
✅ Status updated: DRAFT Changes: 5
```

3. Save a change and verify status updates
4. Publish and verify status changes to PUBLISHED

**Checkpoint:**
- [ ] GraphQL integration added
- [ ] Status refreshes on save/publish
- [ ] Auto-refresh works (30 seconds)
- [ ] Manual refresh works
- [ ] Console logs confirm updates

---

## 🖼️ Task 4: Preview Manager

**Time:** 1.5 hours  
**Why Fifth:** Visual feedback

### Step 4.1: Create preview-manager.js

```bash
cat > view/adminhtml/web/js/editor/preview-manager.js << 'EOF'
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
            
            console.log('🎨 Loading draft CSS...');
            
            // Load CSS from GraphQL
            graphqlClient.query(getCssQuery, {
                storeId: parseInt(storeId),
                status: 'DRAFT'
            }).then(function(response) {
                if (response.data && response.data.getThemeEditorCss) {
                    var css = response.data.getThemeEditorCss.css;
                    
                    if (css && css.trim()) {
                        self._injectCSS($iframe[0], css);
                        console.log('✅ Draft CSS injected into preview');
                    } else {
                        console.log('ℹ️ No draft CSS to inject');
                    }
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
EOF
```

**Verify:**
```bash
node -c view/adminhtml/web/js/editor/preview-manager.js
```

### Step 4.2: Integrate into toolbar.js

Edit `view/adminhtml/web/js/editor/toolbar.js`:

Add dependency:
```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/admin-link',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/device-switcher',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/status-indicator',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/navigation',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/scope-selector',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/page-selector',
    'Swissup_BreezeThemeEditor/js/editor/preview-manager'  // NEW
], function ($, /* ... */, previewManager) {
```

Add initialization in `_create`:
```javascript
_create: function () {
    console.log('🎨 Initializing admin toolbar', this.options);

    // ... existing initialization code

    // Initialize preview manager
    this._initializePreview();

    // Bind events
    this._bindEvents();

    console.log('✅ Admin toolbar initialized successfully');
},

/**
 * Initialize preview iframe with draft CSS
 * @private
 */
_initializePreview: function() {
    var config = this.options.config;
    
    // Wait for iframe to load
    $('#bte-iframe').on('load', function() {
        console.log('🎨 Iframe loaded, injecting draft CSS...');
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
    var config = this.options.config;
    
    // Refresh preview after save
    $(document).on('bte:saved', function(e, data) {
        console.log('🔄 Refreshing preview after save...');
        previewManager.refresh('bte-iframe', 
            data.storeId || config.storeId, 
            data.themeId || config.themeId
        );
    });
},
```

### Step 4.3: Test preview injection

1. Clear cache
2. Open editor
3. Check console for:
```
🎨 Iframe loaded, injecting draft CSS...
🎨 Loading draft CSS...
✅ Draft CSS injected into preview
```

4. Inspect iframe in DevTools:
```html
<head>
  ...
  <style id="bte-draft-css">
    /* Your draft CSS here */
  </style>
</head>
```

**Checkpoint:**
- [ ] `preview-manager.js` created
- [ ] Integrated into `toolbar.js`
- [ ] CSS injected on iframe load
- [ ] CSS refreshes after save
- [ ] Console logs confirm injection

---

## ✅ Task 6: Testing & Verification

**Time:** 30 minutes  
**Why Last:** Verify everything works

### Step 6.1: Browser Console Tests

Open editor and run each test:

**Test 1: Permissions**
```javascript
require(['Swissup_BreezeThemeEditor/js/utils/permissions'], function(permissions) {
    console.log('Permissions:', permissions.getPermissions());
});
// Expected: {canView: true, canEdit: true, canPublish: false, canRollback: false}
```

**Test 2: Error Handler**
```javascript
require(['Swissup_BreezeThemeEditor/js/utils/error-handler'], function(errorHandler) {
    errorHandler.handle({response: {status: 403}}, 'test');
});
// Expected: Alert with "You do not have permission..."
```

**Test 3: Loading**
```javascript
require(['Swissup_BreezeThemeEditor/js/utils/loading'], function(loading) {
    loading.show('#bte-toolbar');
    setTimeout(function() { loading.hide('#bte-toolbar'); }, 2000);
});
// Expected: Loading spinner appears for 2 seconds
```

**Test 4: Preview Manager**
```javascript
require(['Swissup_BreezeThemeEditor/js/editor/preview-manager'], function(previewManager) {
    var config = window.breezeThemeEditorConfig;
    previewManager.refresh('bte-iframe', config.storeId, config.themeId);
});
// Expected: Console logs CSS injection
```

### Step 6.2: Component Tests

**Test Publication Selector:**
1. Click "Publish" button
2. Verify loading spinner
3. Check GraphQL request in Network tab
4. Verify success/error message
5. Check publications list updates

**Test Status Indicator:**
1. Verify initial status display
2. Trigger save event: `$(document).trigger('bte:saved')`
3. Check status refreshes
4. Verify auto-refresh (wait 30 seconds)

**Test Preview:**
1. Open DevTools → Elements
2. Find iframe
3. Check for `<style id="bte-draft-css">`
4. Trigger save event
5. Verify CSS re-injected

### Step 6.3: Permission Tests

Create 4 test roles in admin:

**Role 1: Viewer (canView only)**
```
Expected:
- Publish button: disabled + tooltip
- Rollback buttons: disabled + tooltip
- Can see publications list
- Can view status
```

**Role 2: Editor (canView + canEdit)**
```
Expected:
- Publish button: disabled + tooltip
- Rollback buttons: disabled + tooltip
- Can see publications list
- Can view status
```

**Role 3: Publisher (canView + canEdit + canPublish)**
```
Expected:
- Publish button: enabled
- Rollback buttons: disabled + tooltip
- Can publish changes
```

**Role 4: Admin (all permissions)**
```
Expected:
- All buttons enabled
- Full functionality
```

### Step 6.4: Error Handling Tests

**Test 401 (Session Expired):**
1. Clear admin session
2. Try to publish
3. Verify error: "Your session has expired"

**Test 403 (Permission Denied):**
1. Login as viewer role
2. Try to publish
3. Verify error: "You do not have permission"

**Test Network Error:**
1. Disconnect internet
2. Try to publish
3. Verify error: "Network error"

### Step 6.5: Final Checklist

#### GraphQL Integration:
- [ ] Publication selector uses GraphQL
- [ ] Status indicator uses GraphQL
- [ ] Preview manager uses GraphQL
- [ ] Bearer token passed correctly
- [ ] All queries/mutations work

#### Permissions:
- [ ] Buttons disabled based on ACL
- [ ] Tooltips show permission messages
- [ ] View-only mode works
- [ ] Permission notices visible

#### Error Handling:
- [ ] 401 errors handled
- [ ] 403 errors handled
- [ ] Network errors handled
- [ ] Loading spinners work
- [ ] Error messages clear

#### Preview:
- [ ] Draft CSS injected on load
- [ ] CSS updates after save
- [ ] No cross-origin errors
- [ ] Changes visible in preview

#### Console:
- [ ] No JavaScript errors
- [ ] GraphQL requests logged
- [ ] Success messages shown
- [ ] No memory leaks

---

## 🎯 Success Criteria Met?

Phase 3 is complete when ALL checkboxes are checked:

**Core Functionality:**
- [ ] All 6 tasks completed
- [ ] All components use GraphQL
- [ ] Permissions system works
- [ ] Preview manager works
- [ ] Error handling works

**Testing:**
- [ ] All browser console tests pass
- [ ] All 4 ACL roles tested
- [ ] All error scenarios tested
- [ ] Zero console errors

**Documentation:**
- [ ] Code commented
- [ ] Console logs helpful
- [ ] Changes documented

---

## 🚀 Next Steps After Completion

1. **Commit changes:**
```bash
git add .
git commit -m "Phase 3: Frontend-Backend Integration complete"
```

2. **Update SESSION-PROGRESS.md:**
   - Mark Phase 3 as complete
   - Document any issues found
   - Update time estimates

3. **Proceed to Phase 4:**
   - Theme Editor UI (panels, fields, validation)
   - Or continue to Phase 5 (Publication system)

---

**Ready to begin implementation? Start with Task 5 (utilities)!**

*Implementation Plan Version: 1.0*  
*Last Updated: February 11, 2026*
