# Issues Dashboard

**Updated:** 2026-03-05

---

## Summary

| | Count |
|---|---|
| Total issues | 9 |
| Fixed / Closed | 5 |
| Pending | 4 |
| Bugs | 5 |
| Tasks | 4 |

---

## Bugs

| # | Issue | Commit | Status |
|---|-------|--------|--------|
| [001](001-publish-service-wrong-user-id.md) | PublishService saves published values with wrong `user_id` | `c7c4abe` + data patch | **Closed** |
| [002](002-publish-no-cache-invalidation.md) | Published changes not visible without manual cache flush | `c7c4abe` | **Closed** |
| [003](003-fonts-not-applied-after-publish.md) | Fonts not applied on storefront after publish | `af7049e` | **Closed** |
| [004](004-version-dropdown-locks-after-save.md) | Version dropdown locks after first save | `e186432` | **Closed** |
| [005](005-published-variant-differs-from-selected.md) | Published storefront shows different variant than selected | `e186432` | **Closed** — needs manual verification |

---

## Tasks

| # | Task | Priority | Status |
|---|------|----------|--------|
| [006](006-light-design-side-columns.md) | Light design for side columns (Figma) | High | **Pending** |
| [007](007-config-groups-closed-by-default.md) | All config groups closed by default | Medium | **Pending** |
| [008](008-icons-for-config-sections.md) | Add icons to config sections | Medium | **Pending** |
| [009](009-delete-publication-versions.md) | Delete button for saved publication versions | Medium | **Pending** |

---

## Pending — detail

### 006 · Light design for side columns
Apply the Figma light colour scheme to the left and right editor panels.  
Figma: https://www.figma.com/design/xpUrMtVCZEMWwarMKjlO8K/Breeze-Theme-Editor?node-id=0-1

**Blockers:** none  
**Notes:** After this is done, Content Builder team (Roma) applies the same design to the content editor.

---

### 007 · Config groups closed by default
All accordion sections in the Theme Settings panel should be collapsed on first
load. Subsequent visits restore the last open/closed state from localStorage.

**Blockers:** none  
**Notes:** Palette and Font Palette sections already persist state (`b500632`). Use the same pattern.

---

### 008 · Icons for config sections
Each settings section header needs a small SVG icon. Includes Font Palette section.

**Blockers:** depends on 006 (light design) for correct icon colours  
**Notes:** Decide icon source — `settings.json` field vs static map by section code.

---

### 009 · Delete button for publication versions
Users need to clean up old saved versions from the dropdown. Requires a new
`deletePublication` GraphQL mutation + frontend button on non-active rows.

**Blockers:** none  
**Notes:** Active published version must be protected from deletion.

---

## Release target

Breeze Evolution 3.0 — week of 2026-03-09
