# Issues Dashboard

**Updated:** 2026-03-09

---

## Summary

| | Count |
|---|---|
| Total issues | 13 |
| Fixed / Closed | 12 |
| Pending | 1 |
| Bugs | 10 |
| Tasks | 4 (3 done, 1 pending) |

---

## Bugs

| # | Issue | Commit | Status |
|---|-------|--------|--------|
| [001](001-publish-service-wrong-user-id.md) | PublishService saves published values with wrong `user_id` | `fb1cb7a` | **Closed** |
| [002](002-publish-no-cache-invalidation.md) | Published changes not visible without manual cache flush | `e135ac9` `856b505` | **Closed** |
| [003](003-fonts-not-applied-after-publish.md) | Fonts not applied on storefront after publish | `af7049e` | **Closed** |
| [004](004-version-dropdown-locks-after-save.md) | Version dropdown locks after first save | `e186432` | **Closed** |
| [005](005-published-variant-differs-from-selected.md) | Published storefront shows different variant than selected | `e186432` | **Closed** |
| [010](010-font-picker-var-refs-treated-as-palette-color.md) | `font_picker` CSS-var refs incorrectly processed as palette colour | `23fe2a8` | **Closed** |
| [011](011-publish-duplicate-values-legacy-user-id.md) | Publish 500 error — duplicate rows from legacy `user_id=0` | `3a0d198` | **Closed** |
| [012](012-draft-does-not-inherit-published-values.md) | DRAFT values do not inherit PUBLISHED as base layer | `a5c7934` | **Closed** |
| [013](013-store-view-resets-after-reload.md) | Selected store view resets to default after page reload | `4ed0708` | **Closed** |
| — | Palette sections ignore stored `false` state on reload | `16de0a3` | **Closed** |

---

## Tasks

| # | Task | Priority | Status |
|---|------|----------|--------|
| [006](006-light-design-side-columns.md) | Light design for side columns (Figma) | High | **Pending** |
| [007](007-config-groups-closed-by-default.md) | All config groups closed by default | Medium | **Done** — `b134b6b` |
| [008](008-icons-for-config-sections.md) | Add icons to config sections | Medium | **Done** — `689c6e3` |
| [009](009-delete-publication-versions.md) | Delete button for saved publication versions | Medium | **Done** — `71c9351` |

---

## Pending — detail

### 006 · Light design for side columns
Apply the Figma light colour scheme to the left and right editor panels.  
Figma: https://www.figma.com/design/xpUrMtVCZEMWwarMKjlO8K/Breeze-Theme-Editor?node-id=0-1

**Blockers:** none  
**Notes:** After this is done, Content Builder team (Roma) applies the same design to the content editor.

---

## Release target

Breeze Evolution 3.0 — week of 2026-03-09
