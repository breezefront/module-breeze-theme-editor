# Issue: Highlight Toggle — UI Exists but Feature Is Not Implemented

**Severity:** Medium  
**Area:** `view/adminhtml/web/js/editor/toolbar/highlight-toggle.js:71`  
**Type:** Incomplete feature / UX

---

## Problem

The "highlight" toggle button is visible in the admin toolbar. Clicking it
persists the on/off state to localStorage. However, the actual overlay
functionality — visually highlighting editable elements inside the iframe —
is a TODO stub:

```js
// highlight-toggle.js:71
// TODO Phase 2: Enable/disable element overlay in iframe
```

The toggle click handler currently only saves state and updates the button
appearance. It never communicates with the iframe or activates any overlay.

---

## User Impact

Users clicking the highlight button see it "activate" (visual state change)
but nothing happens in the preview pane. This looks like a broken feature.

---

## Options for Resolution

### Option A — Implement the feature

When the toggle is enabled, send a `postMessage` to the iframe requesting
it to highlight all elements that have a corresponding `property` or `selector`
defined in the current config. The iframe can apply a CSS class or outline
to those elements.

This requires:
1. A `postMessage` protocol between toolbar and iframe
2. An iframe-side script to receive the message and apply highlights
3. Cleanup when the toggle is turned off

### Option B — Hide the button until implemented

If the feature is not prioritized, hide the toggle button from the toolbar
(remove from the template or set `display: none` conditionally) to avoid
presenting a broken control to users.

---

## Related

- `localStorage` key used: check `highlight-toggle.js` for the key name (used
  to restore state on page reload — if the button is hidden, this key should
  also be cleared or ignored).
