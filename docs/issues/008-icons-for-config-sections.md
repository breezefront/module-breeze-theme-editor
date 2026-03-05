# Task 008: Add icons to config sections

**Priority:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/`, CSS  
**Type:** UI Task  
**Status:** Pending

---

## Description

Each config section (accordion group) in the Theme Settings panel should have
a representative icon next to its title. The Font Palette already has an icon
request noted ("add icon to font palette"). The same applies to all config
sections.

From the chat:
> add icon to sections  
> add icon to font palette

---

## Expected Behaviour

- Each section header in the settings panel shows a small SVG icon to the left
  of the section title
- Icons are defined per section, either in `settings.json` or as a static map
  by section code
- Font Palette section in particular needs an icon (currently has none)

---

## Options

### Option A — Icon defined in `settings.json`

Each section in `settings.json` can carry an optional `icon` field (SVG path
or icon name):

```json
{
  "sections": [
    {
      "code": "typography",
      "label": "Typography",
      "icon": "font",
      ...
    }
  ]
}
```

The renderer reads `section.icon` and injects an `<svg>` or `<img>` element
into the section header template.

### Option B — Static icon map by section code

A JS/CSS map from `sectionCode` to icon class or inline SVG. Simpler to
implement but less flexible for theme developers.

---

## Files Likely Affected

| File | Expected change |
|------|----------------|
| `view/adminhtml/web/js/editor/panel/sections/` | Update section renderer to render icon |
| `view/adminhtml/web/css/` | Icon styles (size, alignment, colour) |
| `settings.json` (theme config file) | Add `icon` field to sections (if Option A) |

---

## Acceptance Criteria

- [ ] Each settings section header shows an icon
- [ ] Font Palette section has an icon
- [ ] Icons are aligned and sized consistently across all sections
- [ ] Icons follow the light design (see Issue 006) colour scheme

---

## Status

| Step | Status |
|------|--------|
| Decide icon source (settings.json vs static map) | pending |
| Add icon rendering to section header template | pending |
| Add icons for all existing sections | pending |
| CSS alignment and sizing | pending |
