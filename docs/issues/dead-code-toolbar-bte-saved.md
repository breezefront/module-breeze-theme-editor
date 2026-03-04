# Issue: Dead Code — Stale `bte:saved` Comment Block in `toolbar.js`

**Severity:** Low  
**Area:** `view/adminhtml/web/js/editor/toolbar.js:351–355`  
**Type:** Dead code / Cleanup

---

## Problem

A commented-out event handler block remains in `toolbar.js` with a stale
Phase 3B note:

```js
// Note: bte:saved event disabled - no Settings Editor yet (Phase 3B)
// $(document).on('bte:saved', function(e, data) {
//     ...
// });
```

Phase 3B (the Settings Editor) was completed. The `bte:saved` event is either
now handled elsewhere or no longer needed. This comment is misleading — it
implies the feature is "coming soon" but it was already delivered.

There is also a stale TODO comment at line 143:

```js
// TODO: Status indicator removed (duplicate of publication selector)
```

This note documents a decision already made but leaves a confusing empty line
where code used to be.

---

## Fix

Delete both comment blocks. The `bte:saved` block can be removed entirely if
the event is handled elsewhere; if it still needs to be re-enabled, create a
proper issue instead of leaving dead commented code.
