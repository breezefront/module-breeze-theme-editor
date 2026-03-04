# Issue: Dead Code — `_loadAndInjectCSS` in `css-manager.js`

**Severity:** Low  
**Area:** `view/adminhtml/web/js/editor/css-manager.js:399–459`  
**Type:** Dead code / Cleanup

---

## Problem

A large method `_loadAndInjectCSS()` (~60 lines) is commented out with the note
"Kept for historical reference — can be removed later":

```js
/* 
 * DEPRECATED: Old method using preview-manager.injectCSS()
 * Now we work directly with iframe DOM and use correct IDs
 * 
 * Kept for historical reference - can be removed later
 *
_loadAndInjectCSS: function(status, publicationId) {
    ...
    previewManager.injectCSS(iframeId, css, styleId);
    previewManager.removeCSS(iframeId, ...);
    ...
},
*/
```

The method uses the old `preview-manager.injectCSS()` API which no longer
exists in the current implementation. It also has a `var css` declaration
duplicated on two lines — evidence it was never properly reviewed before being
deprecated.

---

## Fix

Delete lines 399–459 from `css-manager.js`.

No behavior change — the method is already commented out and unreachable.
