# Issue 004: Version dropdown locks after first save — requires page refresh

**Severity:** High  
**Area:** `view/adminhtml/web/js/editor/toolbar/publication-selector.js`  
**Type:** Bug  
**Status:** Fixed — `e186432`

---

## Problem

After saving a publication version for the first time (e.g. saving a set named
"test"), the dropdown with version history becomes unresponsive / locked. The
user has to manually refresh the editor page to continue working.

---

## Root Cause

An unclosed JSDoc block comment (`/**`) was swallowing the entire body of the
`_rollbackTo` method. This caused JavaScript to silently skip the method
definition, resulting in:

```
TypeError: self._rollbackTo is not a function
```

When the publish/save flow tried to call `_rollbackTo`, the thrown `TypeError`
propagated unhandled, leaving the publication-selector widget in a broken state
with the dropdown frozen.

Additionally, after a publish event (`bte:published`), the
`publishedModifiedCount` was never refreshed — so UI state stayed stale until
the next full page load.

```js
// BEFORE — unclosed JSDoc swallowed _rollbackTo body
/**
 * Initiate "Publish this version" flow for a historical publication
 * @param {number} publicationId
 * ...
 *   (no closing */ — entire method body treated as comment)
_rollbackTo: function(publicationId, publicationTitle) {
    // ... all code here was dead
},

// AFTER — closed JSDoc, method body restored
/**
 * Initiate "Publish this version" flow for a historical publication
 */
_rollbackTo: function(publicationId, publicationTitle) {
    // ... code executes correctly
},
```

---

## Affected File

| File | Change |
|------|--------|
| `view/adminhtml/web/js/editor/toolbar/publication-selector.js:700` | Close `/**` JSDoc block before `_rollbackTo`; add metadata reload in `bte:published` handler |

---

## How to Reproduce

1. Open the Theme Editor
2. Make any change to a setting
3. Click Save / publish for the first time — enter name e.g. "test"
4. Observe: the version dropdown becomes unresponsive
5. Open browser console — `TypeError: self._rollbackTo is not a function`

---

## How to Test

1. Make a change → save as a named version
2. The dropdown must remain interactive after save
3. Switching between saved versions in the dropdown must work without refresh
4. Check browser console — no TypeErrors related to `_rollbackTo`

---

## Status

| Step | Status |
|------|--------|
| Root cause identified | done |
| Fix applied — JSDoc closed | done — `e186432` |
| Fix applied — reload metadata after publish | done — `e186432` |
| Verified manually | pending |
