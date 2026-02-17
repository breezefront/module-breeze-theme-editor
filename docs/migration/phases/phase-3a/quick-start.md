# Phase 3 Quick Start Guide

**Last Updated:** February 11, 2026  
**Status:** Ready to implement  
**Time Required:** 8.5 hours

---

## 🎯 What We're Doing

**Goal:** Connect existing admin toolbar components to GraphQL API and add permission-based UI.

**NOT doing:** Moving files, creating new components (already done in Phase 1)

---

## ✅ Prerequisites (Already Complete)

- ✅ Phase 1: All 10 toolbar components created
- ✅ Phase 2: ACL system + JWT authentication
- ✅ GraphQL client exists with Bearer auth
- ✅ All queries/mutations defined
- ✅ Permissions passed to JavaScript

---

## 📋 Task List (Execution Order)

### 1. Utilities First (1 hour) ⏭️ START HERE
**Files to create:**
- `view/adminhtml/web/js/utils/error-handler.js`
- `view/adminhtml/web/js/utils/loading.js`
- `view/adminhtml/web/js/utils/permissions.js`
- Update `view/adminhtml/web/css/editor.css`

**Why first:** Other tasks depend on these utilities

**Commands:**
```bash
mkdir -p view/adminhtml/web/js/utils
# Follow PHASE-3-IMPLEMENTATION-PLAN.md Task 5
```

---

### 2. Permissions System (2 hours)
**Changes:**
- Create `permissions.js` utility
- Add permission CSS styles
- Test in browser console

**Test:**
```javascript
require(['Swissup_BreezeThemeEditor/js/utils/permissions'], function(p) {
    console.log('Can publish:', p.canPublish());
});
```

---

### 3. Status Indicator (1.5 hours)
**File to modify:**
- `view/adminhtml/web/js/editor/toolbar/status-indicator.js`

**Changes:**
- Add GraphQL dependencies
- Implement `_refreshStatus()` method
- Add event listeners
- Add auto-refresh (30 sec)

**Quick win!** Simplest GraphQL integration

---

### 4. Publication Selector (2 hours)
**File to modify:**
- `view/adminhtml/web/js/editor/toolbar/publication-selector.js`

**Changes:**
- Add GraphQL dependencies
- Implement `_publishDraft()` method
- Implement `_loadPublications()` method
- Apply permissions to UI

**Most complex task** - leave for middle of session

---

### 5. Preview Manager (1.5 hours)
**Files to create:**
- `view/adminhtml/web/js/editor/preview-manager.js`

**Files to modify:**
- `view/adminhtml/web/js/editor/toolbar.js`

**Changes:**
- Create preview manager
- Inject CSS into iframe
- Refresh on save event

**Visual feedback** - great for morale boost

---

### 6. Testing (30 min)
**Browser console tests:**
- Permissions check
- Error handler test
- Loading spinner test
- Preview manager test

**Component tests:**
- Publish flow
- Status updates
- Preview CSS injection

**Permission tests:**
- Test all 4 ACL roles
- Verify buttons disabled
- Check tooltips

---

## 🚀 Quick Commands

**Clear cache:**
```bash
bin/magento cache:clean
rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor
```

**Create utils directory:**
```bash
mkdir -p view/adminhtml/web/js/utils
```

**Test permissions in browser:**
```javascript
require(['Swissup_BreezeThemeEditor/js/utils/permissions'], function(p) {
    console.log(p.getPermissions());
});
```

**Check GraphQL in Network tab:**
```
Filter: graphql
Look for: Authorization: Bearer <token>
```

---

## 📖 Documentation Files

**Detailed Plan:**
- `docs/PHASE-3-IMPLEMENTATION-PLAN.md` (650 lines)
  - Step-by-step instructions
  - Code examples for every change
  - Verification checkpoints

**Phase Overview:**
- `docs/admin-migration-phase-3.md` (rewritten)
  - Goals and objectives
  - Current state analysis
  - Success criteria

**Progress Tracking:**
- `docs/SESSION-PROGRESS.md`
  - What's complete
  - What's remaining
  - Time estimates

---

## ⚡ Pro Tips

1. **Start with utilities** - don't skip Task 5!
2. **Clear cache frequently** - stale JS causes confusion
3. **Test after each change** - don't accumulate errors
4. **Use browser console** - verify each utility works
5. **Check Network tab** - ensure GraphQL requests work
6. **Test permissions** - verify all 4 ACL roles

---

## ✅ Success Checklist

- [ ] All utilities created and tested
- [ ] Permissions system working
- [ ] Status indicator uses GraphQL
- [ ] Publication selector uses GraphQL
- [ ] Preview manager injects CSS
- [ ] All 4 ACL roles tested
- [ ] Zero console errors
- [ ] All manual tests pass

---

## 🎯 Expected Results

After Phase 3 completion:
- ✅ Publish button executes GraphQL mutation
- ✅ Publications list loads from API
- ✅ Status updates in real-time
- ✅ Preview shows draft CSS changes
- ✅ Buttons disabled based on permissions
- ✅ Tooltips explain disabled elements
- ✅ Error messages displayed correctly
- ✅ Loading spinners during async operations

---

## 📞 Need Help?

**Stuck?** Refer to:
1. `PHASE-3-IMPLEMENTATION-PLAN.md` - detailed instructions
2. `admin-migration-phase-3.md` - overview and context
3. Browser console - check for errors
4. Network tab - verify GraphQL requests

---

**Ready to start? Begin with Task 5 (Utilities)!**

Follow: `docs/PHASE-3-IMPLEMENTATION-PLAN.md` → Task 5

---

*Quick Start Guide Version: 1.0*  
*Last Updated: February 11, 2026*
