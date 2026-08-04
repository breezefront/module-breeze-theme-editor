# QA test plan — COLOR_BACKGROUND field (gradient support)

**Feature:** new `color_background` theme-editor field — solid color OR CSS gradient.
**PR:** breezefront/module-breeze-theme-editor #29 · **Issue:** #22

## Setup

1. Admin → **SWISSUP → Breeze → Theme Editor**.
2. Store-view switcher (top) → pick a store using a **Breeze theme that has a `color_background` field**.
   - On the dev instance: **Breeze Test** store → section **CSS Var Test** → field **Debug Panel Gradient**
     (renders on the "COLOR_BACKGROUND demo" box on the storefront).
3. If nothing shows: hard-refresh the page (**Ctrl+Shift+R**) to clear cached admin JS/CSS.

Pass criteria for the whole feature: the field's value drives the target element's
`background` live, the popup never throws in the console, and the saved value round-trips.

---

## 1. Field rendering

| # | Step | Expected |
|---|------|----------|
| 1.1 | Open the section containing the field | Field shows a **swatch** + a text input |
| 1.2 | Value is a gradient | Swatch shows the **gradient** (not a flat colour); input shows the `linear-gradient(...)` string, readable (light text on dark) |
| 1.3 | Value is a solid hex | Swatch shows the flat colour; input shows `#rrggbb` |

## 2. Popup / tabs

| # | Step | Expected |
|---|------|----------|
| 2.1 | Click the swatch | Popup opens; **✕** top-right does **not** overlap the tabs |
| 2.2 | Value was a gradient | Popup opens on the **Gradient** tab |
| 2.3 | Value was solid | Popup opens on the **Solid** tab |
| 2.4 | Switch **Solid** ↔ **Gradient** | Panes toggle, no layout jump, no horizontal scrollbar |
| 2.5 | Click ✕ / press **Esc** / click outside / click the storefront preview | Popup closes (value already applied) |

## 3. Solid tab

| # | Step | Expected |
|---|------|----------|
| 3.1 | Pick a colour in the Pickr | Swatch + target element update live to the solid colour |
| 3.2 | Click a **palette swatch** (if the field has a palette) | Value stored as the palette reference; target updates |
| 3.3 | Type a hex in the field input | Same live update |

## 4. Gradient tab — presets

| # | Step | Expected |
|---|------|----------|
| 4.1 | Click each of the 10 **preset** dots | Gradient bar + swatch + target element switch to that preset instantly |

## 5. Gradient tab — stops

| # | Step | Expected |
|---|------|----------|
| 5.1 | **Click the bar** at some point | A new stop is added at that position; handle appears |
| 5.2 | Press **+** | A stop is added (midpoint) |
| 5.3 | **Drag** a round handle along the bar | Stop moves; gradient updates live while dragging |
| 5.4 | **Click** a handle | It becomes active (enlarged/blue ring); Position field + colour picker target it |
| 5.5 | Edit **Position** number (e.g. 25) | Selected stop moves to 25%; clamps to 0–100 |
| 5.6 | Change **Selected stop color** in the Pickr | Only that stop recolours |
| 5.7 | Press **−** with a stop selected | Stop removed |
| 5.8 | Try to remove down to **1 stop** | Blocked — minimum 2 stops enforced |

## 6. Type & direction

| # | Step | Expected |
|---|------|----------|
| 6.1 | Select **Radial** | Value becomes `radial-gradient(circle, …)`; **Angle** row hides |
| 6.2 | Select **Linear** | Value becomes `linear-gradient(…)`; **Angle** row shows |
| 6.3 | Drag **Angle** slider (0–360°) | Angle in the value updates; number label follows; target rotates |

## 7. Persistence

| # | Step | Expected |
|---|------|----------|
| 7.1 | Build a gradient → **Save** | Draft saved; badge shows CHANGED/modified |
| 7.2 | Reload the editor | Field re-opens with the **same** gradient; popup lands on Gradient tab |
| 7.3 | **Publish** the draft | Storefront (outside editor) shows the gradient on the target element |
| 7.4 | **Reset / Restore to default** | Field returns to its configured default (solid or gradient) |

## 8. Edge / regression

| # | Step | Expected |
|---|------|----------|
| 8.1 | Rapidly click several presets, toggle Linear/Radial, add/drag/remove stops | **No console errors** (esp. no Pickr `appendChild`/`_swatchColors`) |
| 8.2 | Gradient with a `var(--color-…)` palette stop | Stored verbatim; `var()` survives round-trip |
| 8.3 | Paste a `repeating-linear-gradient(...)` / `conic-gradient(...)` into the input | Accepted as-is (valid CSS passes through) |
| 8.4 | Enter garbage (e.g. `abc`) in the input | Rejected as invalid (not a hex / not a gradient) |
| 8.5 | Light vs dark editor theme | Popup + input readable in both |

## Regression scope (should be unaffected)

- Plain **COLOR** fields keep working (solid picker + palette).
- Other field types (range, toggle, spacing, code…) unchanged.

## Console check

Open DevTools console before testing. **Zero** uncaught errors is required —
the earlier builds crashed with `Cannot read properties of null (reading 'appendChild')`
and `_swatchColors is not iterable`; both must stay gone.
