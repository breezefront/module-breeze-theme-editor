# Task 007: All config groups closed by default

**Priority:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/`  
**Type:** UI Task  
**Status:** Pending

---

## Description

All config/settings groups (accordion sections) in the Theme Settings panel
should be **collapsed by default** when the editor is opened. Currently most
sections open expanded, making the panel feel overwhelming on first load.

Note: Color Palette and Font Palette sections already persist open/closed state
via localStorage (`b500632`). This task is about the **config settings groups**
in the main settings panel — these should default to closed on first visit.

---

## Expected Behaviour

- First visit: all config groups collapsed
- After user expands a group: state is persisted in localStorage (already done
  for palette sections — same pattern should be applied here)
- On subsequent visits: last-used state is restored

---

## Current Behaviour

Config groups in the settings panel always render expanded (`addClass('active').show()`
called unconditionally on render).

---

## Files Likely Affected

| File | Expected change |
|------|----------------|
| `view/adminhtml/web/js/editor/panel/settings-editor.js` | Default `active` state to `false` / read from localStorage |
| Config group renderer (find the component that renders group accordions) | Same pattern as `palette-section-renderer.js` and `font-palette-section-renderer.js` |

---

## Implementation Notes

Follow the same pattern used in `b500632` for palette sections:

```js
// Read stored state, default to closed (false) on first visit
var isOpen = StorageHelper.get('group_open_' + groupCode);
if (isOpen === null) {
    isOpen = false; // closed by default
}
if (isOpen !== 'false') {
    $section.addClass('active').show();
}

// Persist on toggle
$section.on('click', '.section-title', function () {
    var open = $section.hasClass('active');
    StorageHelper.set('group_open_' + groupCode, String(open));
});
```

---

## Acceptance Criteria

- [ ] All config groups are collapsed when editor is opened for the first time
- [ ] Expanding a group persists its state to localStorage
- [ ] Returning to the editor restores the last open/closed state per group
- [ ] Palette and Font Palette sections are not affected (already handled)

---

## Status

| Step | Status |
|------|--------|
| Identify which renderer handles config group accordions | pending |
| Implement closed-by-default with localStorage persistence | pending |
| Test first-visit behaviour | pending |
| Test state persistence across page reloads | pending |
