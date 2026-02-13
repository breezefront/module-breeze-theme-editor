# Stage 3 Browser Testing Checklist

**Date:** ______________  
**Tester:** ______________  
**Browser:** ______________  
**Magento Version:** ______________

---

## Pre-Testing Setup

- [ ] Cache cleared successfully
- [ ] Hard refresh in browser (Ctrl+Shift+R)
- [ ] Console opened (F12)
- [ ] Network tab visible

---

## 1. Initial Page Load

**URL:** Admin → Stores → Breeze → Theme Editor

### Console Logs Check
- [ ] `🎨 Renderer initialized`
- [ ] `📦 Metadata loader initialized`
- [ ] `✅ CSS Manager initialized`
- [ ] No JavaScript errors

### UI Check
- [ ] Publication selector button visible
- [ ] Button shows correct label (Draft/Published/Publication name)
- [ ] Badge shows correct info if applicable
- [ ] No visual glitches

**Notes:**
```



```

---

## 2. Open Dropdown

**Action:** Click publication selector button

### Check
- [ ] Dropdown opens smoothly
- [ ] Shows "Draft" option
- [ ] Shows "Published" option
- [ ] Shows publications list (if any exist)
- [ ] Checkmark on active option
- [ ] Meta text shows correctly (e.g., "3 changes")
- [ ] No console errors

**Notes:**
```



```

---

## 3. Switch to Draft

**Action:** Click "Draft" in dropdown

### Console Logs
- [ ] `🔄 Button updated: Draft`
- [ ] `🔄 Checkmarks updated: Draft`
- [ ] `📥 Loading draft CSS from GraphQL...`
- [ ] `✅ Draft CSS created dynamically`
- [ ] `📗 CSS Manager: Showing DRAFT`

### UI Check
- [ ] Button label changed to "Draft"
- [ ] Badge shows changes count (if any)
- [ ] Badge color is orange
- [ ] Checkmark moved to Draft
- [ ] Dropdown closed
- [ ] CSS changes applied (colors updated)
- [ ] No flickering

**Notes:**
```



```

---

## 4. Switch to Published

**Action:** Click publication selector → "Published"

### Console Logs
- [ ] `🔄 Button updated: Published`
- [ ] `🔄 Checkmarks updated: Published`
- [ ] `📕 CSS Manager: Showing PUBLISHED`

### UI Check
- [ ] Button label changed to "Published"
- [ ] Badge shows "Published" or removed
- [ ] Badge color is blue (if shown)
- [ ] Checkmark moved to Published
- [ ] Dropdown closed
- [ ] CSS reverted to published version
- [ ] No flickering

**Notes:**
```



```

---

## 5. Load a Publication

**Action:** Click publication selector → Select a publication (e.g., "Green Theme")

### Console Logs
- [ ] `🔄 Button updated: [Publication Name]`
- [ ] `🔄 Checkmarks updated: publication-[id]`
- [ ] `📦 Fetching publication CSS: [id]`
- [ ] `📝 Created style element: bte-publication-css-[id]`
- [ ] `✅ Updated style content: bte-publication-css-[id]`
- [ ] `📙 CSS Manager: Showing PUBLICATION [id]`

### UI Check
- [ ] Button label changed to publication title
- [ ] Badge shows publication date/meta
- [ ] Checkmark moved to selected publication
- [ ] Dropdown closed
- [ ] Publication CSS loaded
- [ ] Visual changes match publication theme
- [ ] No flickering

**Notes:**
```



```

---

## 6. Test Smart Badge Update

**Action:** Make a change in theme editor (e.g., change a color)

### Console Logs
- [ ] `🔄 Badge updated: [X] changes`
- [ ] No full render logs

### UI Check
- [ ] Badge number incremented
- [ ] Badge updated WITHOUT full re-render
- [ ] No flickering
- [ ] Button label unchanged
- [ ] Dropdown state unchanged
- [ ] Only badge updated

**Notes:**
```



```

---

## 7. Rapid Status Switching

**Action:** Quickly switch: Draft → Published → Draft → Published

### Check
- [ ] Each switch works correctly
- [ ] Console logs show smart updates
- [ ] No full re-renders (only button/checkmark updates)
- [ ] No flickering
- [ ] No layout shifts
- [ ] CSS changes apply smoothly
- [ ] No errors

**Notes:**
```



```

---

## 8. Switch Between Publications

**Action:** Load Publication 1 → Load Publication 2 → Back to Publication 1

### Console Logs
- [ ] Old publication CSS disabled
- [ ] New publication CSS enabled
- [ ] Correct publication IDs in logs

### UI Check
- [ ] Button updates to correct title each time
- [ ] Checkmark moves correctly
- [ ] CSS changes apply correctly
- [ ] Visual changes match each publication
- [ ] No errors

**Notes:**
```



```

---

## 9. Network Tab Check

**Action:** Reload page and observe Network tab

### Check
- [ ] renderer.js loads successfully (200 OK)
- [ ] metadata-loader.js loads successfully (200 OK)
- [ ] publication-selector.js loads successfully (200 OK)
- [ ] GraphQL queries succeed (200 OK)
- [ ] No 404 errors for JS files
- [ ] No CORS errors

**Notes:**
```



```

---

## 10. Edge Cases

### Empty Draft (No Changes)
- [ ] Switch to Draft with no changes
- [ ] No errors
- [ ] Badge shows appropriately
- [ ] CSS may be empty (OK)

### No Publications
- [ ] Open dropdown when no publications exist
- [ ] Shows Draft and Published only
- [ ] No errors
- [ ] Works correctly

### First Publication Load
- [ ] Load a publication for first time
- [ ] GraphQL query executes
- [ ] CSS loads and applies
- [ ] Subsequent loads use cache

**Notes:**
```



```

---

## 11. Performance Check

### Subjective Assessment
- [ ] Dropdown opens instantly
- [ ] Status switches feel smooth
- [ ] Badge updates without delay
- [ ] No perceived lag
- [ ] Animations smooth (if any)

### Console Performance
- [ ] No performance warnings
- [ ] No memory leaks visible
- [ ] Reasonable number of DOM operations

**Notes:**
```



```

---

## 12. Regression Testing

### Previously Working Features
- [ ] Publish button still works
- [ ] Permissions still respected
- [ ] Storage (localStorage) still works
- [ ] CSS Manager integration works
- [ ] DeviceFrame integration works
- [ ] Iframe navigation handling works

**Notes:**
```



```

---

## Summary

### Passed Tests: _____ / 50+

### Critical Issues Found:
1. 
2. 
3. 

### Minor Issues Found:
1. 
2. 
3. 

### Performance Notes:


### Recommendations:


---

## Final Verdict

- [ ] ✅ All tests passed - Ready for production
- [ ] ⚠️ Minor issues found - Fix recommended but not critical
- [ ] ❌ Critical issues found - Must fix before deployment

**Tested by:** ______________  
**Date:** ______________  
**Sign-off:** ______________

---

## Additional Notes





---

**Testing Guide Location:** `docs/refactoring/publication-selector/stage3-testing.md`  
**Quick Reference:** `docs/refactoring/publication-selector/QUICK-REFERENCE.md`
