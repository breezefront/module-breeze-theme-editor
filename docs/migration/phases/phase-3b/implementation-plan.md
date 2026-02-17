# Phase 3B Implementation Plan: Settings Editor Migration

**Date Created:** February 12, 2026  
**Status:** Ready to Execute (after Phase 3A)  
**Estimated Total Time:** 30 hours  
**Dependencies:** Phase 3A ✅

---

## 🎯 Overview

This plan provides step-by-step instructions to migrate the Theme Editor Panel from frontend to admin area and rename it to "Settings Editor" to better reflect its purpose.

### What is Settings Editor?

The Settings Editor is the main panel where users edit **theme variables** (colors, typography, spacing, etc.). It contains:
- **Field handlers** (9 files, ~2,500 lines) - Logic for form fields
- **Field renderers** (15 files, ~1,000 lines) - UI for form fields
- **Palette manager** (470 lines) - Color palette system
- **CSS managers** (1,095 lines) - CSS generation and preview
- **Main widget** (935 lines) - Core panel functionality

**Total code to migrate:** ~7,500 lines

---

## 📋 Why "Settings Editor"?

Originally named `panel.js`, we're renaming to `settings-editor.js` because:
1. **Purpose clarity:** Edits theme **settings** (variables), not CSS selectors
2. **Future-proof:** Room for other panels (selectors-panel, layout-panel)
3. **Better semantics:** "Settings" is user-friendly, "variables" is technical

### Naming Decisions

**What we're renaming:**
- ✅ File: `panel.js` → `settings-editor.js`
- ✅ Template: `panel.html` → `settings-editor.html`
- ✅ Widget (frontend): `themeEditorPanel` → `themeSettingsEditor`
- ✅ Widget (admin): `breezeSettingsEditor` (new, follows admin naming)

**What we're keeping:**
- ✅ DOM ID: `#theme-editor-panel` (generic container for all panels)
- ✅ CSS classes: `.bte-panel-*` (shared by all panel types)
- ✅ CSS classes: `.bte-theme-editor-panel` (optional, can keep for BC)

**Rationale:**
- DOM ID `#theme-editor-panel` is a **container** that can hold any panel
- CSS classes are **shared** across all panel types
- Only file/widget names change to reflect specific panel purpose

---

## 📊 Migration Strategy

### Approach: Copy & Adapt (70% reusable)

We'll **copy** frontend code and **adapt** for admin, not rewrite from scratch.

**Why?**
- ✅ Frontend code already uses GraphQL
- ✅ Already has field handlers/renderers
- ✅ Proven architecture
- ✅ Only needs minor adaptations (remove AccessToken logic)

**Adaptations needed:**
1. **Authentication:** Already uses GraphQL with Bearer tokens (no changes)
2. **Initialization:** Admin creates iframe, frontend is inside iframe
3. **Widget naming:** `breezeSettingsEditor` (admin style)
4. **RequireJS paths:** `adminhtml/` instead of `frontend/`

**Percentage reusable:** ~70%
- 100% reusable: Field handlers, renderers, managers (copy as-is)
- 70% reusable: Main widget (small init changes)
- 0% reusable: AccessToken (delete, already replaced in Phase 2)

---

## 📂 File Structure

### Frontend (existing, will be renamed):
```
view/frontend/web/js/theme-editor/
├── panel.js (935 lines) → settings-editor.js
├── panel-state.js (156 lines)
├── palette-manager.js (470 lines)
├── css-preview-manager.js (628 lines)
├── css-manager.js (467 lines)
├── preset-selector.js (195 lines)
├── storage-helper.js (127 lines)
├── field-handlers/
│   ├── base.js (365 lines)
│   ├── color.js (659 lines)
│   ├── repeater.js (316 lines)
│   ├── select.js (248 lines)
│   ├── slider.js (171 lines)
│   ├── text.js (156 lines)
│   ├── boolean.js (154 lines)
│   ├── spacing.js (287 lines)
│   └── font.js (199 lines)
├── field-renderers/
│   ├── base.js (222 lines)
│   ├── color.js (103 lines)
│   ├── boolean.js (66 lines)
│   ├── select.js (78 lines)
│   ├── slider.js (89 lines)
│   ├── text.js (58 lines)
│   ├── spacing.js (112 lines)
│   ├── font.js (95 lines)
│   ├── repeater.js (134 lines)
│   └── (6 more simple renderers)
└── sections/
    └── palette-section-renderer.js (228 lines)
```

### Admin (to be created):
```
view/adminhtml/web/js/editor/panel/
├── settings-editor.js          (NEW - adapted from frontend panel.js)
├── panel-state.js              (COPY from frontend)
├── palette-manager.js          (COPY from frontend)
├── css-preview-manager.js      (COPY from frontend)
├── css-manager.js              (COPY from frontend)
├── preset-selector.js          (COPY from frontend)
├── storage-helper.js           (COPY from frontend)
├── field-handlers/             (COPY entire directory)
│   └── (9 files, no changes)
├── field-renderers/            (COPY entire directory)
│   └── (15 files, no changes)
└── sections/                   (COPY entire directory)
    └── (1 file, no changes)
```

### Templates:
```
view/frontend/web/template/theme-editor/
├── panel.html → settings-editor.html (RENAME)
└── (field templates - 15 files, no renames)

view/adminhtml/web/template/editor/panel/
├── settings-editor.html        (COPY from frontend)
└── (field templates - COPY 15 files)
```

---

## 🔧 Implementation Tasks

### Task 1: Rename Frontend Files (1 hour)

**Purpose:** Update frontend to use new naming before copying to admin.

#### Step 1.1: Rename main files

```bash
# Navigate to frontend theme-editor directory
cd view/frontend/web/js/theme-editor/

# Rename panel.js
git mv panel.js settings-editor.js

# Rename template
cd ../../template/theme-editor/
git mv panel.html settings-editor.html
```

#### Step 1.2: Update widget name in settings-editor.js

Edit `view/frontend/web/js/theme-editor/settings-editor.js`:

Find line 40:
```javascript
// OLD:
$.widget('swissup.themeEditorPanel', {

// NEW:
$.widget('swissup.themeSettingsEditor', {
```

Find last line (~934):
```javascript
// OLD:
return $.swissup.themeEditorPanel;

// NEW:
return $.swissup.themeSettingsEditor;
```

#### Step 1.3: Update RequireJS imports

**File 1:** `view/frontend/web/js/toolbar/navigation.js`

Find line 6:
```javascript
// OLD:
'Swissup_BreezeThemeEditor/js/theme-editor/panel',

// NEW:
'Swissup_BreezeThemeEditor/js/theme-editor/settings-editor',
```

Find line 18:
```javascript
// OLD:
widget: 'themeEditorPanel',

// NEW:
widget: 'themeSettingsEditor',
```

**File 2:** `view/frontend/web/js/theme-editor/settings-editor.js`

Find line 5:
```javascript
// OLD:
'text!Swissup_BreezeThemeEditor/template/theme-editor/panel.html',

// NEW:
'text!Swissup_BreezeThemeEditor/template/theme-editor/settings-editor.html',
```

#### Step 1.4: Update comments (optional)

Find and replace in all files:
```bash
cd view/frontend/web/js/theme-editor/
grep -r "panel\.js" . --include="*.js"
# Update comments manually (4-5 files)
```

**Files with comments:**
- `css-preview-manager.js` - Lines 417, 428
- `field-handlers/base.js` - Line 309
- `field-handlers/color.js` - Line 635
- `test/tests/field-badges-reset-test.js` - Line 87

Change `panel.js` → `settings-editor.js` in comments.

#### Step 1.5: Verify frontend still works

```bash
# Clear cache
bin/magento cache:clean
rm -rf pub/static/frontend/

# Test in browser
# Open frontend editor
# Check console: "✅ Initializing Theme Settings Editor"
```

**Checkpoint:**
- [ ] `settings-editor.js` renamed
- [ ] `settings-editor.html` renamed
- [ ] Widget name updated
- [ ] RequireJS imports updated
- [ ] Frontend editor still works
- [ ] No console errors

---

### Task 2: Copy Utilities & Managers to Admin (2 hours)

**Purpose:** Copy supporting files that need no changes.

#### Step 2.1: Create directory structure

```bash
mkdir -p view/adminhtml/web/js/editor/panel
mkdir -p view/adminhtml/web/js/editor/panel/field-handlers
mkdir -p view/adminhtml/web/js/editor/panel/field-renderers
mkdir -p view/adminhtml/web/js/editor/panel/sections
mkdir -p view/adminhtml/web/template/editor/panel
mkdir -p view/adminhtml/web/template/editor/panel/fields
```

#### Step 2.2: Copy manager files (no changes needed)

```bash
# These files work as-is because they use GraphQL already
cp view/frontend/web/js/theme-editor/panel-state.js \
   view/adminhtml/web/js/editor/panel/

cp view/frontend/web/js/theme-editor/palette-manager.js \
   view/adminhtml/web/js/editor/panel/

cp view/frontend/web/js/theme-editor/css-preview-manager.js \
   view/adminhtml/web/js/editor/panel/

cp view/frontend/web/js/theme-editor/css-manager.js \
   view/adminhtml/web/js/editor/panel/

cp view/frontend/web/js/theme-editor/preset-selector.js \
   view/adminhtml/web/js/editor/panel/

cp view/frontend/web/js/theme-editor/storage-helper.js \
   view/adminhtml/web/js/editor/panel/
```

#### Step 2.3: Copy field handlers (entire directory)

```bash
# Copy all 9 field handler files
cp -r view/frontend/web/js/theme-editor/field-handlers/* \
      view/adminhtml/web/js/editor/panel/field-handlers/
```

**Files copied (no changes):**
- `base.js` (365 lines)
- `color.js` (659 lines)
- `repeater.js` (316 lines)
- `select.js` (248 lines)
- `slider.js` (171 lines)
- `text.js` (156 lines)
- `boolean.js` (154 lines)
- `spacing.js` (287 lines)
- `font.js` (199 lines)

#### Step 2.4: Copy field renderers (entire directory)

```bash
# Copy all 15 field renderer files
cp -r view/frontend/web/js/theme-editor/field-renderers/* \
      view/adminhtml/web/js/editor/panel/field-renderers/
```

**Files copied (no changes):**
- All 15 renderer files (~1,000 lines total)

#### Step 2.5: Copy sections

```bash
cp -r view/frontend/web/js/theme-editor/sections/* \
      view/adminhtml/web/js/editor/panel/sections/
```

#### Step 2.6: Copy templates

```bash
# Main template
cp view/frontend/web/template/theme-editor/settings-editor.html \
   view/adminhtml/web/template/editor/panel/

# Field templates (15 files)
cp view/frontend/web/template/theme-editor/fields/* \
   view/adminhtml/web/template/editor/panel/fields/
```

#### Step 2.7: Verify files copied

```bash
# Check file counts
echo "Managers:" && ls -1 view/adminhtml/web/js/editor/panel/*.js | wc -l
# Expected: 6 files

echo "Field handlers:" && ls -1 view/adminhtml/web/js/editor/panel/field-handlers/*.js | wc -l
# Expected: 9 files

echo "Field renderers:" && ls -1 view/adminhtml/web/js/editor/panel/field-renderers/*.js | wc -l
# Expected: 15 files

echo "Templates:" && ls -1 view/adminhtml/web/template/editor/panel/fields/*.html | wc -l
# Expected: 15 files
```

**Checkpoint:**
- [ ] Directory structure created
- [ ] 6 manager files copied
- [ ] 9 field handler files copied
- [ ] 15 field renderer files copied
- [ ] 1 section file copied
- [ ] 16 template files copied (1 main + 15 fields)
- [ ] File counts match expected

---

### Task 3: Create Admin Settings Editor Widget (8 hours)

**Purpose:** Adapt frontend `settings-editor.js` for admin area.

#### Step 3.1: Create base file from frontend

```bash
# Copy frontend as starting point
cp view/frontend/web/js/theme-editor/settings-editor.js \
   view/adminhtml/web/js/editor/panel/settings-editor.js
```

#### Step 3.2: Update RequireJS paths

Edit `view/adminhtml/web/js/editor/panel/settings-editor.js`:

**Find the `define([` block (lines 1-18):**
```javascript
// OLD (frontend paths):
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/settings-editor.html',
    'Swissup_BreezeThemeEditor/js/theme-editor/panel-state',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderer',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/field-handlers',
    'Swissup_BreezeThemeEditor/js/theme-editor/preset-selector',
    'Swissup_BreezeThemeEditor/js/theme-editor/sections/palette-section-renderer',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config-from-publication',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-values',
    'Swissup_BreezeThemeEditor/js/theme-editor/storage-helper'
], function (/* ... */) {

// NEW (admin paths):
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/settings-editor.html',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderer',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers',
    'Swissup_BreezeThemeEditor/js/editor/panel/preset-selector',
    'Swissup_BreezeThemeEditor/js/editor/panel/sections/palette-section-renderer',
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config-from-publication',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-values',
    'Swissup_BreezeThemeEditor/js/editor/panel/storage-helper'
], function (/* ... */) {
```

**Pattern:** Replace `theme-editor/` with `editor/panel/` in all paths.

#### Step 3.3: Update widget name

Find line ~40:
```javascript
// OLD (frontend):
$.widget('swissup.themeSettingsEditor', {

// NEW (admin):
$.widget('swissup.breezeSettingsEditor', {
```

Find last line (~934):
```javascript
// OLD:
return $.swissup.themeSettingsEditor;

// NEW:
return $.swissup.breezeSettingsEditor;
```

#### Step 3.4: Update initialization logic

**Find `_create` method (line ~48):**

The frontend version reads config from `$('body').data('breeze-editor-config')`.

The admin version should read from `window.breezeThemeEditorConfig`:

```javascript
// OLD (frontend - line 51-67):
_create: function () {
    console.log('✅ Initializing Theme Editor Panel');

    var config = $('body').data('breeze-editor-config');
    if (config) {
        this.storeId = config.storeId;
        this.themeId = config.themeId;
        this.themeName = config.themeName || 'current theme';
        this.adminUrl = config.adminUrl || '/admin';
        // ...
    } else {
        this.storeId = this.options.storeId || 1;
        this.themeId = this.options.themeId || 0;
        // ...
    }
    // ...
},

// NEW (admin):
_create: function () {
    console.log('✅ Initializing Settings Editor (Admin)');

    // Admin config from ViewModel
    var config = window.breezeThemeEditorConfig || {};
    
    this.storeId = config.storeId || this.options.storeId || 1;
    this.themeId = config.themeId || this.options.themeId || 0;
    this.themeName = config.themeName || 'current theme';
    this.adminUrl = config.adminUrl || '/admin';
    
    // Update title with scope info
    if (config.storeId && config.themeName) {
        this.options.title = this.options.title
            .replace('%1', this.storeId)
            .replace('%2', this.themeName);
    }

    // Initialize storage helper
    if (this.storeId && this.themeId) {
        StorageHelper.init(this.storeId, this.themeId);
    }

    this.template = mageTemplate(panelTemplate);
    this._render();
    this._bind();
    this._initPreview();
    
    // Read current mode from localStorage
    var currentStatus = StorageHelper.getCurrentStatus();
    this.options.status = currentStatus;
    
    console.log('📍 Settings Editor initializing with mode:', currentStatus);
    
    // Load config based on current mode
    if (currentStatus === 'PUBLICATION') {
        var publicationId = StorageHelper.getCurrentPublicationId();
        if (publicationId && !isNaN(publicationId)) {
            console.log('📥 Loading config from publication #' + publicationId);
            this._loadConfigFromPublication(publicationId);
        } else {
            console.warn('⚠️ PUBLICATION mode but no valid publication ID, falling back to DRAFT');
            this.options.status = 'DRAFT';
            this._loadConfig();
        }
    } else {
        console.log('📥 Loading config with status:', currentStatus);
        this._loadConfig();
    }
},
```

**Key changes:**
- ✅ Console log updated: "Settings Editor (Admin)"
- ✅ Config source: `window.breezeThemeEditorConfig` instead of body data
- ✅ Rest stays the same (already uses GraphQL)

#### Step 3.5: Remove AccessToken references (if any)

**Search for AccessToken:**
```bash
grep -n "AccessToken\|accessToken\|access_token" view/adminhtml/web/js/editor/panel/settings-editor.js
```

**Expected:** No matches (frontend was already migrated to GraphQL in Phase 2)

If found, delete those lines. The GraphQL client already handles Bearer tokens.

#### Step 3.6: Update console logs for clarity

Find all console.log statements and add "(Admin)" prefix:

```javascript
// Examples:
console.log('✅ Settings Editor initialized (Admin)');
console.log('📥 Loading config (Admin)...');
console.log('💾 Saving changes (Admin)...');
```

This helps distinguish admin logs from frontend logs during debugging.

#### Step 3.7: Verify syntax

```bash
node -c view/adminhtml/web/js/editor/panel/settings-editor.js
```

**Expected:** No syntax errors

**Checkpoint:**
- [ ] File created from frontend copy
- [ ] RequireJS paths updated (theme-editor/ → editor/panel/)
- [ ] Widget name updated (breezeSettingsEditor)
- [ ] Initialization uses window.breezeThemeEditorConfig
- [ ] AccessToken removed (if present)
- [ ] Console logs updated
- [ ] No syntax errors

---

### Task 4: Integrate Settings Editor into Admin Toolbar (4 hours)

**Purpose:** Connect settings editor to admin toolbar navigation.

#### Step 4.1: Update navigation.js to load settings editor

Edit `view/adminhtml/web/js/editor/toolbar/navigation.js`:

**Add import (line ~6-10):**
```javascript
define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/navigation.html',
    'Swissup_BreezeThemeEditor/js/editor/panel/settings-editor'  // NEW
], function ($, widget, mageTemplate, template, settingsEditor) {
```

**Update panel configuration (line ~17-23):**

Find:
```javascript
panels: {
    'theme-editor-panel': {
        selector: '#theme-editor-panel',
        widget: 'themeEditorPanel',  // WRONG - this was placeholder
        widgetOptions: {}
    }
}
```

Replace with:
```javascript
panels: {
    'theme-editor-panel': {
        selector: '#theme-editor-panel',
        widget: 'breezeSettingsEditor',  // NEW - correct admin widget
        widgetOptions: {}
    }
}
```

**Update _initializePanel method (line ~247-275):**

Find the warning comment:
```javascript
// ⚠️ Panel not found: theme-editor-panel
// This is expected in Phase 1. Phase 3 will implement panel widgets.
```

Remove that comment and update:
```javascript
/**
 * Initialize panel widget if not already initialized
 * @private
 */
_initializePanel: function($panel, panelConfig) {
    var widgetName = panelConfig.widget || 'breezeSettingsEditor';
    
    // Check if widget is already initialized
    if ($panel.data(widgetName)) {
        console.log('✅ Panel already initialized:', widgetName);
        return;
    }
    
    // Get config for widget initialization
    var config = window.breezeThemeEditorConfig || {};
    var widgetOptions = $.extend({}, panelConfig.widgetOptions || {}, {
        storeId: config.storeId,
        themeId: config.themeId,
        themeName: config.themeName,
        adminUrl: config.adminUrl
    });
    
    // Initialize widget
    try {
        console.log('🎨 Initializing panel widget:', widgetName, widgetOptions);
        $panel[widgetName](widgetOptions);
        console.log('✅ Panel widget initialized:', widgetName);
    } catch (e) {
        console.error('❌ Failed to initialize panel widget:', widgetName, e);
    }
},
```

#### Step 4.2: Update ViewModel to include settings editor config

Edit `ViewModel/AdminToolbar.php`:

**Find the `getConfig()` method (line ~100-150):**

Add settings editor specific config:
```php
public function getConfig(): array
{
    $storeId = (int) $this->storeManager->getStore()->getId();
    $themeId = (int) $this->getThemeId();
    
    return [
        'storeId' => $storeId,
        'themeId' => $themeId,
        'themeName' => $this->getThemeName(),
        'graphqlEndpoint' => $this->getUrl('graphql'),
        'adminUrl' => $this->getUrl('adminhtml'),
        'token' => $this->adminTokenGenerator->generate(),
        'permissions' => $this->getPermissions(),
        
        // Settings Editor specific
        'settingsEditor' => [
            'title' => __('Theme Settings - Store %1 - %2', $storeId, $this->getThemeName()),
            'closeTitle' => __('Close Panel'),
            'presetsLabel' => __('Presets:'),
        ]
    ];
}
```

#### Step 4.3: Update template to include settings editor panel

Edit `view/adminhtml/web/template/editor/toolbar.html`:

**Find the panels container (should be around line 50-60):**

Verify it has the correct ID:
```html
<div id="theme-editor-panel" class="bte-panel" style="display: none;">
    <!-- Settings editor will be rendered here by JS -->
</div>
```

**Note:** The panel content is rendered by the `breezeSettingsEditor` widget, so this container should remain empty in the template.

#### Step 4.4: Test initialization

```bash
# Clear cache
bin/magento cache:clean
rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor

# Open admin editor in browser
# Open console
```

**Expected console output:**
```
🎨 Initializing admin toolbar
🎨 Initializing navigation
✅ Navigation initialized
🎨 Initializing panel widget: breezeSettingsEditor
✅ Initializing Settings Editor (Admin)
📍 Settings Editor initializing with mode: DRAFT
📥 Loading config with status: DRAFT
✅ Settings Editor initialized (Admin)
✅ Panel widget initialized: breezeSettingsEditor
```

#### Step 4.5: Test panel open/close

1. Click navigation tab "Theme Editor"
2. Verify panel slides in from right
3. Verify panel header shows title
4. Click close button
5. Verify panel slides out

**Checkpoint:**
- [ ] navigation.js imports settings-editor.js
- [ ] Panel config uses 'breezeSettingsEditor'
- [ ] _initializePanel method updated
- [ ] ViewModel includes settings editor config
- [ ] Template has panel container
- [ ] Console shows initialization logs
- [ ] Panel opens and closes correctly

---

### Task 5: Update Field Handlers & Renderers Paths (3 hours)

**Purpose:** Ensure field components load from correct admin paths.

#### Step 5.1: Check field-renderer.js

Frontend has a helper file `field-renderer.js` that loads renderers. Let's check if we need it:

```bash
# Check if it exists
ls view/frontend/web/js/theme-editor/field-renderer.js
```

If exists, copy to admin:
```bash
cp view/frontend/web/js/theme-editor/field-renderer.js \
   view/adminhtml/web/js/editor/panel/
```

Then edit to update paths:
```javascript
// Find all paths like:
'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/'

// Replace with:
'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/'
```

#### Step 5.2: Check field-handlers.js (loader)

```bash
# Check if it exists
ls view/frontend/web/js/theme-editor/field-handlers.js
```

If exists, same process:
```bash
cp view/frontend/web/js/theme-editor/field-handlers.js \
   view/adminhtml/web/js/editor/panel/

# Edit paths: theme-editor/ → editor/panel/
```

#### Step 5.3: Update require paths in settings-editor.js

If field-renderer.js uses dynamic requires, no changes needed. But if settings-editor.js has hardcoded paths to specific handlers/renderers, update them:

```bash
# Search for hardcoded paths
grep -n "field-handlers/\|field-renderers/" view/adminhtml/web/js/editor/panel/settings-editor.js
```

Update any found paths.

#### Step 5.4: Test field rendering

```bash
# Clear cache
bin/magento cache:clean
rm -rf pub/static/adminhtml/

# Open admin editor
# Open settings panel
# Check console for field loading errors
```

**Expected:** All fields render without errors.

**Checkpoint:**
- [ ] field-renderer.js copied (if exists)
- [ ] field-handlers.js copied (if exists)
- [ ] Paths updated in loader files
- [ ] No console errors about missing modules
- [ ] Fields render correctly in panel

---

### Task 6: Update CSS for Settings Editor (2 hours)

**Purpose:** Ensure admin styles match frontend styles.

#### Step 6.1: Check if settings editor has specific CSS

```bash
# Check frontend CSS
ls view/frontend/web/css/source/panels/
```

**Expected files:**
- `_panels.less` - Generic panel styles (already in admin)
- `_theme-editor-panel.less` - Settings editor specific styles

#### Step 6.2: Copy settings editor CSS

```bash
# Create directory if needed
mkdir -p view/adminhtml/web/css/source/panels/

# Copy settings editor styles
cp view/frontend/web/css/source/panels/_theme-editor-panel.less \
   view/adminhtml/web/css/source/panels/_settings-editor-panel.less
```

#### Step 6.3: Update CSS class names (optional)

If you want to rename CSS classes from `.bte-theme-editor-panel` to `.bte-settings-editor-panel`:

Edit `view/adminhtml/web/css/source/panels/_settings-editor-panel.less`:
```less
// OLD:
.bte-theme-editor-panel {

// NEW:
.bte-settings-editor-panel {
```

**But:** This requires updating the template too. **Recommendation:** Keep `.bte-theme-editor-panel` for backward compatibility.

#### Step 6.4: Import CSS in main file

Edit `view/adminhtml/web/css/editor.css`:

```css
/* Add import */
@import 'source/panels/_settings-editor-panel.less';
```

#### Step 6.5: Verify styles applied

```bash
# Clear cache
bin/magento cache:clean
rm -rf pub/static/adminhtml/

# Open admin editor
# Inspect panel with DevTools
```

**Check:**
- [ ] Panel has correct width
- [ ] Header styled correctly
- [ ] Fields have proper spacing
- [ ] Buttons styled correctly
- [ ] Scrolling works

**Checkpoint:**
- [ ] CSS file copied
- [ ] CSS imported in main file
- [ ] Styles applied correctly
- [ ] Panel looks identical to frontend

---

### Task 7: Test & Debug (5 hours)

**Purpose:** Ensure everything works end-to-end.

#### Step 7.1: Functional tests

**Test 1: Panel Opens**
1. Click "Theme Editor" tab in navigation
2. Verify panel slides in
3. Check console for initialization logs
4. No errors

**Test 2: Config Loads**
1. Panel opens
2. Config loads from GraphQL
3. Fields populate with values
4. No GraphQL errors

**Test 3: Field Editing**
1. Change a color value
2. Verify preview updates
3. Check console for change events
4. No errors

**Test 4: Save Changes**
1. Edit multiple fields
2. Click "Save" button
3. Verify GraphQL mutation executes
4. Success message shown
5. Status indicator updates

**Test 5: Publish**
1. Save draft changes
2. Click "Publish" button
3. Verify GraphQL mutation
4. Changes published
5. Status changes to PUBLISHED

**Test 6: Publication History**
1. Open publication selector
2. Load previous publication
3. Settings editor loads old values
4. Preview shows old state

**Test 7: Permissions**
1. Login as viewer (canView only)
2. Panel opens but fields disabled
3. Save/publish buttons disabled
4. Tooltips explain permissions

#### Step 7.2: Error scenarios

**Test 8: Network Error**
1. Disconnect network
2. Try to save
3. Error message shown
4. No crash

**Test 9: Session Expired**
1. Clear admin session
2. Try to save
3. 401 error handled
4. Message: "Session expired"

**Test 10: Permission Denied**
1. Login as viewer
2. Try to publish (should be blocked)
3. 403 error handled
4. Message: "Permission denied"

#### Step 7.3: Browser console checks

**No errors:**
```javascript
// Should be empty or only warnings
console.log('Checking for errors...');
```

**Module loading:**
```javascript
// All should load
require(['Swissup_BreezeThemeEditor/js/editor/panel/settings-editor'], function(editor) {
    console.log('Settings editor loaded:', typeof editor);
});
```

**Widget initialized:**
```javascript
// Should return true
$('#theme-editor-panel').data('breezeSettingsEditor') !== undefined
```

#### Step 7.4: Network tab checks

**GraphQL requests:**
1. Open Network tab
2. Filter: "graphql"
3. Verify requests have `Authorization: Bearer <token>`
4. Verify successful responses (200 OK)

**No 404s:**
1. Filter: "404"
2. Should be empty
3. If found: missing file, fix path

#### Step 7.5: Performance checks

**Load time:**
- Panel should open in < 1 second
- Config should load in < 500ms
- Field changes should be instant (< 100ms)

**Memory leaks:**
1. Open/close panel 10 times
2. Check memory usage in DevTools
3. Should not increase significantly

#### Step 7.6: Cross-browser testing

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### Step 7.7: Debug common issues

**Issue: Panel doesn't open**
- Check console for JS errors
- Verify navigation.js loads settings-editor.js
- Check widget name matches ('breezeSettingsEditor')

**Issue: Fields don't render**
- Check field-handlers paths
- Verify field-renderers paths
- Check template paths

**Issue: Save fails**
- Check GraphQL endpoint
- Verify Bearer token present
- Check ACL permissions

**Issue: Preview doesn't update**
- Check css-preview-manager.js
- Verify iframe accessible
- Check for CORS errors

**Checkpoint:**
- [ ] All 10 functional tests pass
- [ ] All error scenarios handled
- [ ] No console errors
- [ ] No 404 errors in network tab
- [ ] Performance acceptable
- [ ] Works in all browsers
- [ ] Common issues documented

---

### Task 8: Update Admin Navigation to Include Settings Panel (1 hour)

**Purpose:** Make settings panel accessible from toolbar.

#### Step 8.1: Verify ViewModel navigation config

Edit `ViewModel/AdminToolbar.php`:

**Find `getNavigation()` method (line ~450-500):**

Ensure "Theme Editor" tab exists:
```php
public function getNavigation(): array
{
    return [
        [
            'id' => 'theme-editor',
            'title' => __('Theme Editor'),
            'icon' => 'icon-paint',
            'panelId' => 'theme-editor-panel',  // Links to settings editor
            'order' => 10
        ],
        // ... other tabs
    ];
}
```

#### Step 8.2: Update navigation template (if needed)

Check `view/adminhtml/web/template/editor/navigation.html`:

Verify "Theme Editor" tab triggers panel open:
```html
<li class="bte-nav-item" data-panel="theme-editor-panel">
    <a href="#" class="bte-nav-link">
        <i class="icon-paint"></i>
        <span>Theme Editor</span>
    </a>
</li>
```

#### Step 8.3: Test navigation

1. Open admin editor
2. Click "Theme Editor" tab
3. Verify settings panel opens
4. Close panel
5. Tab should deactivate

**Checkpoint:**
- [ ] Navigation includes "Theme Editor" tab
- [ ] Tab linked to correct panel ID
- [ ] Click opens settings editor
- [ ] Close deactivates tab

---

### Task 9: Documentation & Cleanup (4 hours)

**Purpose:** Document changes and clean up code.

#### Step 9.1: Update code comments

Add JSDoc comments to main widget:
```javascript
/**
 * Breeze Settings Editor Widget (Admin)
 * 
 * Main panel for editing theme variables (colors, typography, spacing, etc.)
 * in the admin area. Communicates with backend via GraphQL.
 * 
 * @widget breezeSettingsEditor
 * @namespace swissup
 * 
 * @example
 * $('#theme-editor-panel').breezeSettingsEditor({
 *     storeId: 1,
 *     themeId: 5
 * });
 */
$.widget('swissup.breezeSettingsEditor', {
    // ...
});
```

#### Step 9.2: Create PHASE-3B-COMPLETION.md

```markdown
# Phase 3B Completion Report

## Summary
Successfully migrated Theme Editor Panel to admin area and renamed to "Settings Editor".

## Files Created/Modified

### New Admin Files (31 files):
- view/adminhtml/web/js/editor/panel/settings-editor.js (935 lines)
- view/adminhtml/web/js/editor/panel/ (6 manager files, ~2,000 lines)
- view/adminhtml/web/js/editor/panel/field-handlers/ (9 files, ~2,500 lines)
- view/adminhtml/web/js/editor/panel/field-renderers/ (15 files, ~1,000 lines)
- view/adminhtml/web/template/editor/panel/ (16 template files)

### Modified Files (6 files):
- Frontend: panel.js → settings-editor.js (renamed)
- Frontend: panel.html → settings-editor.html (renamed)
- Frontend: toolbar/navigation.js (updated imports)
- Admin: toolbar/navigation.js (added settings editor integration)
- Admin: ViewModel/AdminToolbar.php (added settings editor config)
- Admin: editor.css (imported settings editor styles)

## Testing Results
- ✅ Panel opens/closes correctly
- ✅ Config loads from GraphQL
- ✅ Fields render and work
- ✅ Save/publish functions work
- ✅ Permissions enforced
- ✅ Preview updates in real-time
- ✅ Cross-browser compatible
- ✅ No console errors
- ✅ No 404 errors

## Time Spent
- Estimated: 30 hours
- Actual: [TO BE FILLED]

## Issues Found
- [TO BE FILLED]

## Next Steps
- Proceed to Phase 4 (if needed)
- Or Phase 5 (Publication system enhancements)
```

#### Step 9.3: Update main phase 3 documentation

Edit `docs/admin-migration-phase-3.md`:

Mark Phase 3B as complete:
```markdown
## Phase 3B: Settings Editor Migration

**Status:** ✅ COMPLETE  
**Time Spent:** [X hours]  
**Completion Date:** [DATE]

### What Was Done:
- Renamed frontend panel.js → settings-editor.js
- Created admin settings-editor.js widget
- Copied 30+ supporting files (handlers, renderers, managers)
- Integrated into admin toolbar
- Full testing completed

### Files Created:
- [List of files]

### Testing:
- All functional tests passed
- All error scenarios handled
- Cross-browser compatibility verified
```

#### Step 9.4: Clean up backup files

```bash
# Remove backup files created during development
rm view/adminhtml/web/js/editor/toolbar/publication-selector.js.backup
rm view/adminhtml/web/js/editor/toolbar/status-indicator.js.backup
rm view/frontend/web/js/theme-editor/settings-editor.js.backup

# Verify no other backups
find . -name "*.backup" -o -name "*.bak"
```

#### Step 9.5: Run final cache clear

```bash
# Clear all caches
bin/magento cache:clean
bin/magento cache:flush

# Remove static files
rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor
rm -rf var/view_preprocessed/

# Regenerate static files (optional)
bin/magento setup:static-content:deploy -f
```

**Checkpoint:**
- [ ] Code comments added
- [ ] Completion report created
- [ ] Main documentation updated
- [ ] Backup files removed
- [ ] Cache cleared
- [ ] Static files regenerated

---

## 🎯 Success Criteria

Phase 3B is complete when:

### Functionality:
- [ ] Settings editor opens from admin toolbar
- [ ] Config loads from GraphQL
- [ ] All field types render correctly
- [ ] Changes saved via GraphQL
- [ ] Publish functionality works
- [ ] Permissions enforced (ACL)
- [ ] Preview updates in real-time

### Code Quality:
- [ ] All files use correct RequireJS paths
- [ ] Widget name follows admin convention (breezeSettingsEditor)
- [ ] No frontend/admin path mixing
- [ ] Code commented and documented
- [ ] No console errors
- [ ] No 404 errors

### Testing:
- [ ] All 10 functional tests pass
- [ ] All error scenarios handled gracefully
- [ ] Works in Chrome, Firefox, Safari, Edge
- [ ] Performance acceptable (< 1s load time)
- [ ] Memory leaks checked

### Documentation:
- [ ] PHASE-3B-COMPLETION.md created
- [ ] admin-migration-phase-3.md updated
- [ ] SESSION-PROGRESS.md updated
- [ ] Code comments complete

---

## 📊 Estimated Time Breakdown

| Task | Description | Time |
|------|-------------|------|
| 1 | Rename frontend files | 1h |
| 2 | Copy utilities & managers | 2h |
| 3 | Create admin settings editor | 8h |
| 4 | Integrate into toolbar | 4h |
| 5 | Update field handlers paths | 3h |
| 6 | Update CSS | 2h |
| 7 | Test & debug | 5h |
| 8 | Update navigation | 1h |
| 9 | Documentation & cleanup | 4h |
| **Total** | | **30h** |

---

## 🚀 After Phase 3B

**What works:**
- ✅ Full admin editor with toolbar
- ✅ Settings editor panel (colors, typography, spacing)
- ✅ GraphQL integration
- ✅ ACL permissions
- ✅ Live preview
- ✅ Save & publish

**What's next (optional):**
- Phase 4: Additional panels (selectors, layout)
- Phase 5: Publication system enhancements
- Phase 6: Advanced features (import/export, presets)

---

**Ready to execute after Phase 3A is complete!**

*Plan Version: 1.0*  
*Created: February 12, 2026*
