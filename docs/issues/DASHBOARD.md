# Issues Dashboard

**Updated:** 2026-04-09

---

## Summary

| | Count |
|---|---|
| Total issues | 31 |
| Fixed / Closed | 29 |
| Pending | 2 |
| Bugs | 22 (22 closed, 0 open) |
| Tasks | 9 (7 done, 1 open, 1 deferred) |

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
| [014](014-scope-chain-website-id-not-resolved.md) | Scope chain never includes website leg — `websiteId` never passed | `445d55d` | **Closed** |
| [015](015-css-generator-published-bypasses-scope-chain.md) | `CssGenerator` PUBLISHED branch bypasses scope chain and theme hierarchy | `7013886` | **Closed** |
| [018](018-f5-color-preview-dot-not-updated.md) | Color preview dot not updated after F5 in DRAFT mode | `6b186d9` | **Closed** |
| [019](019-f5-save-counter-shows-zero.md) | "Save (0)" and disabled Reset button after F5 in DRAFT mode | `6dab435` | **Closed** |
| [020](020-font-picker-default-cssvar-not-reactive-to-palette-change.md) | `font_picker` з `default: "--role"` не реагує на зміни палітри шрифтів | `021add7` `05af7e1` | **Fixed** |
| [021](021-implicit-palette-link-inconsistent-preview.md) | Implicitly palette-linked color fields have inconsistent CSS preview | `ab67685` | **Closed** |
| [022](022-draft-css-stale-after-discard-draft.md) | Draft CSS у iframe залишається застарілим після discardDraft | `b95dc02` | **Closed** |
| [023](023-depends-field-visibility-not-implemented.md) | `dependsOn` field visibility — JS runtime not implemented | `7ace0c8` | **Fixed** |
| [017](017-storemanager-not-wired-in-di-xml.md) | `StoreManagerInterface` not wired in `di.xml` — scope chain broken on production | `c644633` | **Closed** |
| [024](024-font-palette-role-default-ignored-when-field-default-differs.md) | `font_palettes.fonts[].default` ignored — field shows `settings[].default` instead | `86e9b30` | **Fixed** |
| [025](025-font-palette-preview-not-updated-on-first-click.md) | Preview iframe не оновлюється при першому кліку на шрифт у Font Palette | `0ffbe27` | **Fixed** |
| [026](026-consumer-font-preview-not-updated-on-role-change.md) | Consumer font fields не оновлюють CSS preview при зміні ролі у Font Palette | `436a969` | **Fixed** |

---

## Tasks

| # | Task | Priority | Status |
|---|------|----------|--------|
| [006](006-light-design-side-columns.md) | Light design for side columns (Figma) | High | **Done** — `7c74231` |
| [007](007-config-groups-closed-by-default.md) | All config groups closed by default | Medium | **Done** — `b134b6b` |
| [008](008-icons-for-config-sections.md) | Add icons to config sections | Medium | **Done** — `689c6e3` |
| [009](009-delete-publication-versions.md) | Delete button for saved publication versions | Medium | **Done** — `71c9351` |
| [016](016-editor-defaults-to-stores-scope-not-default.md) | Editor opens in `stores` scope instead of `default` | Low | **Done** — `8071f79` |
| [css-var](css-var-property-transition-incomplete.md) | Incomplete `css_var` → `property` transition (shim cleanup) | Medium | **Done** — 2026-04-09 |
| [highlight](highlight-toggle-not-implemented.md) | Highlight toggle — button hidden pending Phase 2 implementation | Medium | **Deferred** — `f393219` |
| [error-log](error-handler-server-logging.md) | Client-side errors not logged server-side (TODO stub) | Low | **Open** |

---

## Undocumented / No Issue Number

| File | Issue | Status |
|------|-------|--------|
| [missing-test-coverage.md](missing-test-coverage.md) | Missing test coverage across multiple classes | **Ongoing** |

---

## Release target

Breeze Evolution 3.0 — released
