# Issue: `badge-renderer.js` — Palette Badge Reuses Generic Template

**Severity:** Low  
**Area:** `view/adminhtml/web/js/editor/panel/badge-renderer.js:167`  
**Type:** UI / Minor TODO

---

## Problem

`renderPaletteSwatchModified()` reuses the generic "Modified" badge template
for palette color swatches, with a TODO noting a separate template may be
needed:

```js
// badge-renderer.js:166–168
renderPaletteSwatchModified: function(data) {
    // For now, reuse modified badge template
    // TODO: Create separate palette badge template if needed
    return this.renderModified(data);
}
```

---

## Assessment

This is a minor cosmetic issue. The generic "Modified" badge is functionally
correct for palette swatches. A separate template would only be needed if
palette swatches need distinct styling or additional data (e.g., showing the
color value inline in the badge).

---

## Resolution Options

- **Do nothing** — acceptable if the current badge appearance is satisfactory
- **Create a palette-specific template** if UX review identifies a need for
  distinct visual treatment (e.g., a small color swatch dot next to the badge)
