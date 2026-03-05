# Issue 005: Published storefront shows different variant than selected in editor

**Severity:** High  
**Area:** `view/adminhtml/web/js/editor/toolbar/publication-selector.js`  
**Type:** Bug  
**Status:** Likely fixed — `e186432`

---

## Problem

When a user selects a specific publication variant in the editor dropdown and
clicks Publish, the storefront displays a **different** (previously published)
variant instead of the one that was active in the editor.

Observed: editor showed one variant selected, but the storefront rendered the
old blue colour scheme from a previous publication.

---

## Root Cause (Likely)

The `_rollbackTo` method was silently dead due to an unclosed JSDoc comment
(see **Issue 004**). This meant that when the user attempted to switch the
active publication to a specific historical version and then publish it, the
rollback call failed silently with `TypeError: self._rollbackTo is not a
function`. The system fell back to the previously published state, making it
appear as if a different variant was being applied.

Additionally, `publishedModifiedCount` was not refreshed after publish events,
so the UI could show a stale active state — misleading the user about which
version was actually live.

---

## Affected File

| File | Change |
|------|--------|
| `view/adminhtml/web/js/editor/toolbar/publication-selector.js` | Restore `_rollbackTo` (fix JSDoc); reload metadata after `bte:published` |

---

## How to Reproduce

1. Publish a first version (e.g. blue theme)
2. Make changes and save as a second version
3. In the version dropdown, select the first version and click "Publish this"
4. Reload the storefront
5. Observe: the storefront may show the second version instead of the first

---

## How to Test

1. Create two distinct published versions (e.g. different header colors)
2. Switch between versions using the dropdown Publish button
3. After each publish, verify the storefront reflects the selected version
4. No page refresh of the editor should be required between actions

---

## Status

| Step | Status |
|------|--------|
| Root cause identified (`_rollbackTo` dead) | done |
| Fix applied — `e186432` | done |
| End-to-end manual verification | pending |

---

## Related

- Issue 004: Version dropdown locks after first save (`_rollbackTo` TypeError)
