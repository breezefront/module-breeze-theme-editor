# Task 006: Implement light design for side columns (Figma)

**Priority:** High  
**Area:** `view/adminhtml/web/css/`, panel templates  
**Type:** UI Task  
**Status:** Pending

---

## Description

The designer prepared a light colour scheme for the Theme Editor side columns
(left and right panels). Currently the panels use a dark theme. The light
design should be applied to the side panels while the centre content (iframe
preview) remains unchanged.

Figma source:
https://www.figma.com/design/xpUrMtVCZEMWwarMKjlO8K/Breeze-Theme-Editor?node-id=0-1&p=f&m=dev

After this task is applied, the Content Builder team (Roma) will use the same
design system for the content editor columns.

---

## Scope

- Apply light background, typography, and control colours to the left panel
  (Theme Settings / Config groups)
- Apply the same to the right panel (Font Palette, Color Palette)
- Toolbar may keep its current dark theme or follow the Figma — confirm with
  designer
- A future dark/light toggle switch can be added later; for now default to
  light

---

## Acceptance Criteria

- [ ] Side columns match the Figma light design
- [ ] No visual regressions in the dark iframe toolbar area
- [ ] Works in both Chromium and Firefox
- [ ] Content Builder team can reuse the CSS without modification

---

## Files Likely Affected

| File | Expected change |
|------|----------------|
| `view/adminhtml/web/css/` | Add/update panel colour variables |
| Panel `.html` / `.phtml` templates | Update class names if needed |

---

## Status

| Step | Status |
|------|--------|
| Figma design reviewed | pending |
| CSS variables defined for light theme | pending |
| Side column styles updated | pending |
| Cross-browser check | pending |
| Handoff to Content Builder team | pending |
