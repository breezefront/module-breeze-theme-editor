# Issue 021: Implicitly palette-linked color fields have inconsistent CSS preview

**Severity:** Medium  
**Area:** `theme-frontend-breeze-evolution/etc/theme_editor/settings.json`,
`view/adminhtml/web/js/editor/panel/css-preview-manager.js`  
**Type:** Bug  
**Status:** Partially Fixed (race condition resolved; `settings.json` change pending)

---

## Summary

When the user changes a palette color (e.g. `--color-brand-secondary`) in the
palette editor, some color fields (e.g. `--header-panel-bg`) **sometimes**
update their CSS preview and **sometimes** do not — depending on the session
state.

The root cause is that these fields declare a hardcoded hex default in
`settings.json` (e.g. `"default": "#000d3a"`) instead of a palette variable
reference (e.g. `"default": "--color-brand-secondary"`).  The editor therefore
treats them as standalone hex fields and does not subscribe them to palette
updates.  The only link that exists is in the compiled Less/CSS, which makes
the behavior session-dependent.

---

## Reproduction

1. Open Theme Editor in DRAFT mode on a fresh session (no `localStorage` data).
2. **Do not** change the "Header Top Panel Background" field.
3. Open the Color Palette section and change `--color-brand-secondary` to any
   new color.
4. **Observe:** the header panel color in the iframe preview changes. ✅
5. Now change the "Header Top Panel Background" field to any hex value and
   change it back to the original `#000d3a`.
6. Again change `--color-brand-secondary` to a new value.
7. **Observe:** the header panel color in the iframe preview **does not
   change**. ❌

Alternatively: reload the page after making any edit — `localStorage` restores
the hex value and step 7 reproduces immediately.

---

## Root Cause (full analysis)

### Layer 0 — initialization race condition (fixed in module JS)

A second, independent root cause was discovered during investigation:
`css-preview-manager.init()` originally listened **only** for the iframe `load`
event to detect when `#bte-theme-css-variables` appeared in the DOM.

When `panel/css-manager.js` exhausted its 20-retry loop and created a synthetic
`#bte-theme-css-variables` placeholder, the iframe `load` event had **already
fired** — so `css-preview-manager`'s `tryInit()` was never re-triggered,
`$styleElement` stayed `null`, and **all** palette changes were silently
dropped regardless of `settings.json`.

**Fix applied** — see *Affected Files* below and the test file
`view/adminhtml/web/js/test/tests/css-preview-manager-init-race-test.js`.

Additionally, `panel/css-manager.js` cached `$livePreviewStyle` pointing at
`#bte-live-preview` during `init()` — before `css-preview-manager` had created
that element — leaving a stale empty jQuery reference.  This cache was removed.

### Layer 1 — the implicit CSS link

The evolution theme defines the variable chain in Less:

```less
// theme-frontend-breeze-evolution/web/css/theme/abstracts/_variables.less:68
@header-panel__background: ~"var(--color-brand-secondary)";

// theme-frontend-breeze-blank/web/css/abstracts/variables/_header.less:59
.lib-css(--header-panel-bg, @header-panel__background);
// → compiled: --header-panel-bg: var(--color-brand-secondary);
```

The **compiled stylesheet** therefore contains:

```css
:root { --header-panel-bg: var(--color-brand-secondary); }
```

However, `settings.json` declares the field as:

```json
{
  "id": "header-panel-bg",
  "type": "color",
  "default": "#000d3a",
  "property": "--header-panel-bg"
}
```

The editor only sees the hex default and never sets `data-palette-ref` on the
input, so `_updateFieldsReferencingPalette()` in `css-preview-manager.js`
never finds or updates this field.

### Layer 2 — why the cascade is inconsistent

When the palette changes, `css-preview-manager` injects into `#bte-live-preview`:

```css
:root { --color-brand-secondary: #newcolor; }
```

Whether `--header-panel-bg` visually changes in the iframe depends on what
else is present at higher specificity:

| Session state | `changes['--header-panel-bg']` in JS | Result |
|---|---|---|
| Fresh — field never touched | *(absent)* | ✅ compiled CSS `var()` cascades |
| Field was edited this session | `'#000d3a'` (hex) | ❌ hex overrides `var()` chain |
| Loaded from `localStorage` after F5 | `'#000d3a'` (hex) | ❌ hex overrides `var()` chain |
| Field saved to DB with a non-default value | *(absent from `changes`)* | ❌ `#bte-theme-css-variables` has static hex |

**Key detail — server-side CSS:** `CssVariableBuilder::buildSelectorBlocks()`
(line 84) skips any saved value that equals the field default:

```php
if ($default !== null && $this->valuesAreEqual($rawValue, $default)) {
    continue;  // not emitted — compiled CSS var() chain is the only definition
}
```

So `--header-panel-bg: #000d3a` appears in `#bte-theme-css-variables` only
when the user has **saved a different value**.  Once it appears there, it
permanently overrides the compiled `var()` chain.

**The DOM priority chain in the iframe:**

```
compiled theme stylesheet  (lowest)
  └─ :root { --header-panel-bg: var(--color-brand-secondary); }
#bte-theme-css-variables   (server-injected, above compiled)
  └─ :root { --header-panel-bg: #somehex; }   ← only if saved ≠ default
#bte-theme-css-variables-draft
  └─ (same, for draft rows)
#bte-live-preview          (highest — js-injected)
  └─ :root { --color-brand-secondary: #newcolor; }
           { --header-panel-bg: #000d3a; }     ← only if in changes{}
```

Changing `--color-brand-secondary` only propagates to `--header-panel-bg`
when **neither** `#bte-theme-css-variables` nor `#bte-live-preview` contain
a direct hex override for `--header-panel-bg`.

---

## Scope

17 color fields in evolution's `settings.json` have a hex default that exactly
matches a palette color.  Fields with an **unambiguous** 1-to-1 palette match:

| Field | Hex default | Palette variable |
|-------|-------------|-----------------|
| `colors/header-panel-bg` | `#000d3a` | `--color-brand-secondary` |
| `colors/base-color` | `#1e2939` | `--color-neutral-800` |
| `colors/link-color` | `#3160e2` | `--color-blue` |
| `colors/input-border-color` | `#101828` | `--color-neutral-900` |

Fields whose hex is **ambiguous** (shared by multiple palette vars):

| Field | Hex | Matches |
|-------|-----|---------|
| `body-bg`, `surface-bg`, `popover-bg`, `header-bg`, `input-bg`, `button-color`, `header-panel-color` | `#ffffff` | `--color-white` or literal white |
| `focus-ring-color`, `button-bg`, `input-outline-color`, `checkbox-color` | `#000000` | `--color-brand` or `--color-black` |

---

## Fix

**File:** `theme-frontend-breeze-evolution/etc/theme_editor/settings.json`

Change the `"default"` for unambiguous fields from a hardcoded hex to the
corresponding palette CSS variable reference:

```json
// BEFORE
{ "id": "header-panel-bg", "type": "color", "default": "#000d3a", ... }

// AFTER
{ "id": "header-panel-bg", "type": "color", "default": "--color-brand-secondary", ... }
```

With this one-line change per field:

1. **JS renderer** (`field-renderers/color.js:21`) detects
   `value.startsWith('--color-')` → sets `data.paletteRef` → renders
   `data-palette-ref="--color-brand-secondary"` in the DOM.
2. **`_updateFieldsReferencingPalette()`** (`css-preview-manager.js:148`)
   finds the input by `data-palette-ref` and updates the picker UI whenever
   the palette changes — in every session state.
3. **CSS generator** (`CssVariableBuilder`) emits
   `--header-panel-bg: var(--color-brand-secondary)` instead of a hex
   literal — the server CSS no longer breaks the cascade.
4. **`PaletteProvider::calculateUsageCounts()`** (`PaletteProvider.php:172`)
   correctly counts the field as a consumer of `--color-brand-secondary`.

No changes are required in the module PHP or JS — both already handle
`--color-*` reference defaults.

### Caveat — existing saved values

If a user has already saved `--header-panel-bg: #000d3a` to the database,
`buildSelectorBlocks()` will compare `'#000d3a'` with the new default
`'--color-brand-secondary'` — they are not equal — and will emit
`--header-panel-bg: #000d3a` in the server CSS, breaking the cascade again.
A one-time data migration (or a manual "Reset to default" in the editor) is
needed to restore the palette link for such installations.

---

## Affected Files

### Module (`module-breeze-theme-editor`) — Layer 0 race fix ✅

| File | Change |
|------|--------|
| `view/adminhtml/web/js/editor/css-manager.js` | Added `iframeDocument` to `bte:cssManagerReady` payload |
| `view/adminhtml/web/js/editor/panel/css-manager.js` | Added `bte:cssManagerReady` event after `init()` succeeds; removed stale `$livePreviewStyle` cache |
| `view/adminhtml/web/js/editor/panel/css-preview-manager.js` | Rewrote `init()`: dual-trigger (`bte:cssManagerReady` primary + `#bte-iframe load` fallback), `resolved` guard |
| `view/adminhtml/web/js/test/tests/css-preview-manager-init-race-test.js` | New: 6 tests covering all race-condition scenarios |

### Evolution theme (`theme-frontend-breeze-evolution`) — Layer 1 fix ⏳

| File | Repo | Change |
|------|------|--------|
| `etc/theme_editor/settings.json` | `theme-frontend-breeze-evolution` | Change `"default"` for unambiguous fields to palette var ref |

---

## Tracking

- [x] **Race condition fixed** — `bte:cssManagerReady` event added to both css-manager
      files; `css-preview-manager.init()` uses it as primary trigger with
      `resolved` guard; stale `$livePreviewStyle` cache removed from
      `panel/css-manager.js`
- [x] **Tests written** — `css-preview-manager-init-race-test.js` (6 tests)
- [ ] Change `header-panel-bg` default: `#000d3a` → `--color-brand-secondary`
      (`theme-frontend-breeze-evolution/etc/theme_editor/settings.json`)
- [ ] Evaluate remaining unambiguous fields (`base-color`, `link-color`,
      `input-border-color`) — confirm the Less variable chain before changing
- [ ] Decide policy for ambiguous fields (`#ffffff`, `#000000`)
- [ ] Verify manually: change `--color-brand-secondary` → header panel updates
      in all three session states (fresh / after edit / after F5)
- [ ] Check dirty-state: field with palette-ref default is not marked as
      "changed" on fresh open
