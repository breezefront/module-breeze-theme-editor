# Phase 3: Toolbar Components Migration

**Duration:** 1-2 days (8-10 hours)  
**Risk Level:** 🟡 Medium  
**Dependencies:** Phase 1, Phase 2 complete  
**Can Rollback:** ✅ Yes

---

## 🎯 Goals

1. Move shared components to `view/base/web/js/toolbar/`
2. Adapt admin-specific components in `view/adminhtml/web/js/editor/toolbar/`
3. Migrate publication selector with admin auth
4. Add full device switcher functionality
5. Move jstest framework to `view/base/web/js/jstest/`
6. Preserve all existing toolbar functionality

---

## 📦 Component Migration Strategy

### Shared Components → `view/base/`

Move these context-agnostic components to base:

```
view/frontend/web/js/toolbar/         →  view/base/web/js/toolbar/
├── navigation.js                         ├── navigation.js
├── toolbar-toggle.js                     ├── toolbar-toggle.js
└── highlight-toggle.js                   └── highlight-toggle.js
```

**Why base?**
- ✅ No frontend-specific dependencies
- ✅ Pure UI logic (works with any selector)
- ✅ Reusable in admin context

### Admin-Specific Components → `view/adminhtml/`

Adapt these components for admin context:

```
view/adminhtml/web/js/editor/toolbar/
├── publication-selector.js    # From frontend, adapt GraphQL auth
├── page-selector.js            # Adapt for admin store context
├── scope-selector.js           # Adapt for admin store switcher
├── device-switcher.js          # Already created in Phase 1
└── status-indicator.js         # Already created in Phase 1
```

### Frontend-Only Components (Keep in Frontend)

These stay in frontend (not used in admin):

```
view/frontend/web/js/toolbar/
├── device-frame.js             # Frontend-specific iframe manipulation
├── admin-link.js               # Frontend → admin navigation
└── exit-button.js              # Frontend exit logic
```

---

## 📋 Key Tasks

### Task 1: Move Shared Components to Base (2 hours)

**Step 1:** Create base structure
```bash
mkdir -p view/base/web/js/toolbar
```

**Step 2:** Move files
```bash
git mv view/frontend/web/js/toolbar/navigation.js view/base/web/js/toolbar/
git mv view/frontend/web/js/toolbar/toolbar-toggle.js view/base/web/js/toolbar/
git mv view/frontend/web/js/toolbar/highlight-toggle.js view/base/web/js/toolbar/
```

**Step 3:** Update RequireJS paths in frontend toolbar.js
```javascript
// OLD
'Swissup_BreezeThemeEditor/js/toolbar/navigation'

// NEW
'Swissup_BreezeThemeEditor/js/toolbar/navigation'  // RequireJS auto-resolves from base
```

**Step 4:** Update admin toolbar.js to use base components
```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/toolbar/navigation',  // From base!
    // ...
], function ($, navigation) {
    // Works the same!
});
```

---

### Task 2: Adapt Publication Selector for Admin (3 hours)

**Copy from frontend and adapt GraphQL authentication:**

`view/adminhtml/web/js/editor/toolbar/publication-selector.js`

**Key Changes:**
```javascript
// OLD (frontend with token)
_getAuthHeaders: function() {
    return {
        'Authorization': 'Bearer ' + this.options.accessToken
    };
}

// NEW (admin with session)
_getAuthHeaders: function() {
    // Admin session handled automatically by Magento
    return {};
}

// Update GraphQL queries to check ACL
// No other changes needed - same UI, same logic!
```

**Test:**
- [ ] Publication selector loads publications list
- [ ] Can switch between drafts
- [ ] ACL permissions respected (from Phase 2)

---

### Task 3: Move Jstest Framework to Base (1 hour)

**Jstest tests toolbar components, so it belongs in admin/base:**

```bash
mkdir -p view/base/web/js/jstest
git mv view/frontend/web/js/jstest/* view/base/web/js/jstest/
```

**Update references in toolbar components:**
```javascript
// Works from both admin and frontend contexts
'Swissup_BreezeThemeEditor/js/jstest/framework'
```

---

### Task 4: Adapt Page & Scope Selectors (2 hours)

These need admin-specific data providers.

**Create:** `view/adminhtml/web/js/editor/toolbar/page-selector.js`
```javascript
// Copy from frontend, update data source
_getPages: function() {
    // Admin context: get pages from ViewModel or GraphQL
    var config = $('body').data('bte-admin-config');
    return config.availablePages;
}
```

**Create:** `view/adminhtml/web/js/editor/toolbar/scope-selector.js`
```javascript
// Similar adaptation for store switcher
```

---

## 📂 Final File Structure

After Phase 3 migration:

```
view/base/web/js/
├── jstest/
│   └── framework.js              ✅ Shared (admin + future frontend tests)
└── toolbar/
    ├── navigation.js             ✅ Shared (admin + frontend if needed)
    ├── toolbar-toggle.js         ✅ Shared
    └── highlight-toggle.js       ✅ Shared

view/adminhtml/web/js/editor/
├── toolbar.js                     🆕 Main coordinator
└── toolbar/
    ├── publication-selector.js    🆕 Adapted from frontend
    ├── page-selector.js           🆕 Adapted from frontend
    ├── scope-selector.js          🆕 Adapted from frontend
    ├── device-switcher.js         ✅ Created in Phase 1
    └── status-indicator.js        ✅ Created in Phase 1

view/frontend/web/js/toolbar/
├── device-frame.js               ⛔ Frontend-only (not migrated)
├── admin-link.js                 ⛔ Frontend-only
├── exit-button.js                ⛔ Frontend-only
├── publication-selector.js       ⛔ Deprecated (use admin version)
├── page-selector.js              ⛔ Deprecated
└── scope-selector.js             ⛔ Deprecated
```

---

## ✅ Testing Checklist

**Component Tests:**
- [ ] Navigation tabs switch panels correctly
- [ ] Device switcher changes iframe width (desktop/tablet/mobile)
- [ ] Publication selector loads and switches drafts
- [ ] Page selector changes iframe URL
- [ ] Scope selector switches store context
- [ ] Status indicator updates on save/publish
- [ ] Toolbar toggle works
- [ ] Highlight toggle works

**Integration Tests:**
- [ ] All components use admin session (no tokens)
- [ ] GraphQL queries respect ACL permissions
- [ ] Jstest framework accessible from admin
- [ ] Shared components work identically in admin
- [ ] No console errors
- [ ] No broken RequireJS dependencies

**Regression Tests:**
- [ ] Frontend toolbar still works (if keeping v1.x compatibility)
- [ ] All existing features preserved
- [ ] Performance acceptable (no lag)
- [ ] Palette system works
- [ ] Save button works
- [ ] Publish button works (with ACL check)
- [ ] No console errors

---

## ⏱️ Time: 8-10 hours

[← Phase 2](./admin-migration-phase-2.md) | [↑ Plan](./admin-migration-plan.md) | [Next: Phase 4 →](./admin-migration-phase-4.md)
