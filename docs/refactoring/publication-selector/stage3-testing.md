# Stage 3 - Modular Architecture Testing Guide

## 📦 Changes Overview

Stage 3 extracted functionality from the monolithic `publication-selector.js` into modular components:

**Before (Stage 2):**
- `publication-selector.js`: 799 lines (monolithic)

**After (Stage 3):**
- `publication-selector.js`: 537 lines (coordinator)
- `renderer.js`: 229 lines (UI module)
- `metadata-loader.js`: 148 lines (data module)

## 🎯 Testing Objectives

1. Verify modules initialize correctly
2. Confirm UI updates work (render, button, badge, checkmarks)
3. Test data loading (publications, GraphQL)
4. Ensure coordinator pattern works properly
5. Validate console logs show module activity

## 🧪 Test Steps

### Step 1: Open Theme Editor
```
URL: Admin → Stores → Breeze → Theme Editor
```

**Expected Console Logs:**
```
🎨 Renderer initialized
📦 Metadata loader initialized
✅ CSS Manager initialized
```

**Check:**
- [ ] No JavaScript errors in console
- [ ] Widget toolbar appears
- [ ] Publication selector button visible

---

### Step 2: Test Initial Render

**Action:** Observe the publication selector button on page load

**Check:**
- [ ] Button shows correct label (e.g., "Draft" or "Published")
- [ ] Badge shows correct changes count if any
- [ ] Badge has correct color (orange for draft, blue for published)

---

### Step 3: Open Dropdown

**Action:** Click the publication selector button

**Expected Console Logs:**
```
(Should show publications list or loading state)
```

**Check:**
- [ ] Dropdown opens without errors
- [ ] Shows "Draft" and "Published" options
- [ ] Shows publications list if any exist
- [ ] Checkmark appears on active status/publication
- [ ] Meta text shows "(X changes)" for draft if applicable

---

### Step 4: Switch to Draft

**Action:** Click "Draft" in dropdown

**Expected Console Logs:**
```
🔄 Button updated: Draft
🔄 Checkmarks updated: Draft
📥 Loading draft CSS from GraphQL...
✅ Draft CSS created dynamically
📗 CSS Manager: Showing DRAFT
```

**Check:**
- [ ] Button label changes to "Draft"
- [ ] Badge appears showing changes count
- [ ] Checkmark moves to Draft option
- [ ] CSS changes apply (colors update)
- [ ] Dropdown closes

---

### Step 5: Switch to Published

**Action:** Click publication selector → "Published"

**Expected Console Logs:**
```
🔄 Button updated: Published
🔄 Checkmarks updated: Published
📕 CSS Manager: Showing PUBLISHED
```

**Check:**
- [ ] Button label changes to "Published"
- [ ] Badge disappears or shows "Published"
- [ ] Checkmark moves to Published option
- [ ] CSS reverts to published version
- [ ] Dropdown closes

---

### Step 6: Load a Publication

**Action:** Click publication selector → Select a publication (e.g., "Green Theme")

**Expected Console Logs:**
```
🔄 Button updated: Green Theme
🔄 Checkmarks updated: publication-{id}
📦 Fetching publication CSS: {id}
📝 Created style element: bte-publication-css-{id}
✅ Updated style content: bte-publication-css-{id}
📙 CSS Manager: Showing PUBLICATION {id}
```

**Check:**
- [ ] Button label changes to publication title
- [ ] Badge shows publication date/meta
- [ ] Checkmark moves to selected publication
- [ ] Publication CSS loads and applies
- [ ] Visual changes match publication theme
- [ ] Dropdown closes

---

### Step 7: Update Changes Count

**Action:** Make a change in the theme editor (e.g., change a color)

**Expected Console Logs:**
```
🔄 Badge updated: X changes
```

**Check:**
- [ ] Badge updates WITHOUT full render
- [ ] Badge number increments correctly
- [ ] No flickering or full re-render
- [ ] Other UI elements remain unchanged

---

### Step 8: Test Smart Updates

**Action:** Rapidly switch between Draft → Published → Draft

**Expected Behavior:**
```
Only button and checkmarks update, not full dropdown re-render
```

**Check:**
- [ ] Button updates smoothly (label + class + badge)
- [ ] Checkmarks update independently
- [ ] No full dropdown re-render (unless needed)
- [ ] No flickering or layout shift
- [ ] Console logs show `🔄 Button updated` and `🔄 Checkmarks updated`

---

### Step 9: Test GraphQL Data Loading

**Action:** Open dropdown and check publications list

**Expected Console Logs:**
```
📦 Metadata loader initialized
(If not loaded) Loading publications from GraphQL...
```

**Check:**
- [ ] Publications load from GraphQL
- [ ] Publications formatted correctly with title, date, status
- [ ] MetadataLoader handles errors gracefully
- [ ] Empty state shows if no publications exist

---

### Step 10: Test Module Coordination

**Action:** Perform various operations and observe module interaction

**Expected Behavior:**
```
Main coordinator delegates to modules:
- UI operations → Renderer
- Data operations → MetadataLoader
- Storage operations → StorageHelper
- CSS operations → CSSManager
```

**Check:**
- [ ] Renderer handles all UI updates
- [ ] MetadataLoader handles all GraphQL queries
- [ ] Main coordinator orchestrates flow
- [ ] No module overlap or conflicts
- [ ] Clear separation of concerns

---

## 🐛 Common Issues & Fixes

### Issue 1: Module Not Found Error
**Symptom:** `Cannot read property 'init' of undefined`
**Cause:** RequireJS path not configured correctly
**Fix:** Check that modules are in correct directory and RequireJS can find them

### Issue 2: No Console Logs
**Symptom:** Console logs from Stage 3 don't appear
**Cause:** Cache not cleared or old code still loaded
**Fix:** 
```bash
docker exec magento248local-phpfpm-1 bash -c "rm -rf var/cache var/view_preprocessed pub/static/adminhtml && php bin/magento cache:flush"
```
Then hard refresh browser (Ctrl+Shift+R)

### Issue 3: Dropdown Doesn't Render
**Symptom:** Click button, nothing happens
**Cause:** Renderer module not initialized or template missing
**Fix:** Check console for `🎨 Renderer initialized` log

### Issue 4: Publications Don't Load
**Symptom:** Dropdown shows loading forever
**Cause:** MetadataLoader GraphQL query failing
**Fix:** Check Network tab for GraphQL errors, verify endpoint

### Issue 5: Smart Updates Not Working
**Symptom:** Full re-render on every change instead of partial updates
**Cause:** Wrong update method called or renderer logic issue
**Fix:** Verify correct update methods used (`updateButton`, `updateBadge`, `updateCheckmarks`)

---

## 📊 Testing Results

**Date:** _________________  
**Tester:** _________________  
**Browser:** _________________  
**Magento Version:** _________________

### Module Initialization
- [ ] Renderer initialized
- [ ] MetadataLoader initialized  
- [ ] Coordinator initialized
- [ ] No errors in console

### UI Operations
- [ ] Initial render works
- [ ] Button updates correctly
- [ ] Badge updates correctly
- [ ] Checkmarks update correctly
- [ ] Dropdown opens/closes

### Data Operations
- [ ] Publications load from GraphQL
- [ ] Data formatting correct
- [ ] Error handling works
- [ ] Empty state handled

### Integration
- [ ] Module coordination works
- [ ] CSS Manager integration works
- [ ] StorageHelper integration works
- [ ] Event handling works

### Performance
- [ ] Smart updates faster than full render
- [ ] No flickering
- [ ] No layout shifts
- [ ] Smooth transitions

### Issues Found
1. 
2. 
3. 

### Notes


---

## ✅ Success Criteria

All of the following must pass:

1. ✅ All three modules initialize without errors
2. ✅ Console logs show module activity (Renderer, MetadataLoader)
3. ✅ UI updates work (button, badge, checkmarks)
4. ✅ Data loading works (publications from GraphQL)
5. ✅ Smart updates execute without full re-render
6. ✅ Module coordination follows expected patterns
7. ✅ No regression from Stage 2 functionality
8. ✅ Performance equal or better than Stage 2

---

## 🔍 Code Verification Checklist

Before testing, verify code structure:

### Main Coordinator (`publication-selector.js`)
- [ ] Line ~30-40: Renderer module initialized via `Object.create(Renderer).init()`
- [ ] Line ~40-50: MetadataLoader initialized via `Object.create(MetadataLoader).init()`
- [ ] All UI operations delegate to `this.renderer`
- [ ] All data operations delegate to `this.metadataLoader`
- [ ] Business logic remains in coordinator

### Renderer Module (`renderer.js`)
- [ ] Factory pattern: `return { init: function(...) {} }`
- [ ] Methods: `render`, `updateButton`, `updateBadge`, `updateCheckmarks`
- [ ] Methods: `showLoading`, `hideLoading`, `closeDropdown`
- [ ] Computed methods: `_getDisplayLabel`, `_getBadgeText`, `_getBadgeClass`, `_getMetaText`
- [ ] Console logs with 🎨, 🔄 emojis

### MetadataLoader Module (`metadata-loader.js`)
- [ ] Factory pattern: `return { init: function(...) {} }`
- [ ] Methods: `loadPublications`, `findPublicationById`, `getPublicationTitle`
- [ ] GraphQL query handling
- [ ] Data formatting with `_formatPublications`
- [ ] Console logs with 📦 emoji

---

## 🚀 Next Steps After Testing

If all tests pass:
1. ✅ Stage 3 implementation verified
2. Document any issues found
3. Consider creating pull request or final documentation
4. Update main README with new architecture

If tests fail:
1. Document specific failures
2. Debug using console logs
3. Fix issues in modules
4. Re-test after fixes
5. Create new commit with fixes
