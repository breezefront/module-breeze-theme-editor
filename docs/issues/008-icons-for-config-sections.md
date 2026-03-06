# Task 008: Add icons to config sections

**Priority:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/`, CSS  
**Type:** UI Task  
**Status:** Done

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

- Each section header in the settings panel shows a small icon to the left
  of the section title
- Icons are defined per section via the `icon` field in `settings.json`
- Font Palette and Color Palette sections have default icons

---

## Implementation

### Approach chosen: Option A — Icon defined in `settings.json`

The `icon` field on a section is optional. When present, it is rendered by
`IconRegistry.render()`. When absent, no icon is shown (no fallback).

Icons are rendered via **Phosphor Icons** webfont
(`@phosphor-icons/web@2.1.1`, regular weight), loaded from CDN on first use.

### Supported `icon` field formats

| Format | Example | Renders as |
|--------|---------|------------|
| Named Phosphor icon | `"text-t"` | `<i class="ph ph-text-t">` |
| Raw inline SVG | `"<svg>…</svg>"` | inline SVG in `<span>` |
| Base64 data URI | `"data:image/svg+xml;base64,…"` | decoded inline SVG |
| Plain data URI | `"data:image/svg+xml,…"` | `<img src="…">` |

### Files changed

| File | Change |
|------|--------|
| `js/editor/panel/icon-registry.js` | **New** — CSS loader + render logic |
| `js/editor/panel/settings-editor.js` | Use `IconRegistry.render(section.icon)` |
| `js/editor/panel/sections/palette-section-renderer.js` | Prepend `palette` icon |
| `js/editor/panel/sections/font-palette-section-renderer.js` | Prepend `text-t` icon |
| `template/editor/panel/palette-section.html` | Remove 🎨 emoji |
| `css/source/panels/_theme-editor-panel.less` | `.bte-section-icon` SVG/img sizing |
| `css/source/panels/_palette-section.less` | `.bte-palette-title` flex layout |
| `css/source/panels/_font-picker.less` | `.bte-font-palette-title` flex layout |

---

## Acceptance Criteria

- [x] Each settings section header shows an icon (when `icon` is set in `settings.json`)
- [x] Font Palette section has an icon (`ph-text-t`)
- [x] Color Palette section has an icon (`ph-palette`)
- [x] Icons are aligned and sized consistently across all sections
- [x] Icons follow the toolbar colour scheme via `currentColor`

---

## Status

| Step | Status |
|------|--------|
| Decide icon source (settings.json vs static map) | done — `settings.json` (Option A) |
| Create `icon-registry.js` with Phosphor webfont | done |
| Add icon rendering to section header template | done |
| Add icons for palette sections | done |
| CSS alignment and sizing | done |
