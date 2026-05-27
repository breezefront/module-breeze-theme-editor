# Media Property — Responsive CSS Variables

Apply a CSS variable inside a `@media` block to enable responsive overrides per breakpoint.

---

## Use Case

A theme defines `--font-size: 16px` at root level, but needs `--font-size: 13px` on mobile. Instead of creating a separate CSS file or hardcoding breakpoints, add a `media` field to the setting:

```json
{
  "id": "font_size_mobile",
  "label": "Font Size (Mobile)",
  "type": "range",
  "property": "--font-size",
  "default": "13px",
  "media": "mobile"
}
```

Output CSS:

```css
@media (max-width: 767px) {
    :root {
        --font-size: 13px;
    }
}
```

---

## Syntax

Add `"media"` to any setting in `settings.json`:

```json
{
  "id": "my_field",
  "type": "range",
  "property": "--my-var",
  "default": "16px",
  "media": "mobile"
}
```

**`media`** accepts:
- A built-in alias (see table below)
- A raw CSS media query string: `"(max-width: 768px)"`

---

## Built-in Aliases

| Alias | Resolved query |
|---|---|
| `mobile` | `(max-width: 767px)` |
| `tablet` | `(max-width: 1023px)` |
| `desktop` | `(min-width: 1024px)` |

---

## Combining with `selector`

`media` and `selector` are fully independent and can coexist:

```json
{
  "id": "columns_gap_mobile",
  "type": "range",
  "property": "--columns-gap",
  "default": "8px",
  "selector": ".columns-container",
  "media": "mobile"
}
```

Output:

```css
@media (max-width: 767px) {
    .columns-container {
        --columns-gap: 8px;
    }
}
```

---

## CSS Output Order

Generated CSS is assembled in this order:

1. `@import` rules (web fonts)
2. `:root { }` — palette vars + no-media field vars
3. No-media custom selector blocks (e.g. `.hero { }`)
4. `@media` blocks — each query groups all selectors that share it

Multiple variables with the same `media` value are grouped into a single `@media` block:

```css
@media (max-width: 767px) {
    :root {
        --font-size: 13px;
        --line-height: 1.4;
    }
    .columns-container {
        --columns-gap: 8px;
    }
}
```

---

## Live Preview

The `media` value flows through the full live-preview pipeline:

1. PHP resolves alias → full query string in GraphQL response (`field.media`)
2. JS renderer emits `data-media="(max-width: 767px)"` on the field input
3. Field handler reads `data-media` → `fieldData.media`
4. `CssPreviewManager.setVariable()` stores `{ value, selector, media }` in the changes map
5. `_updateStyles()` wraps matching variables in a `@media` block in the preview `<style>` tag

Reset and restore operations also correctly preserve `media` context.

---

## Responsive Pattern — Multiple Breakpoints for One Variable

The common pattern is to define the **base value without `media`** and then override it at each breakpoint with separate settings:

```json
{
  "id": "typography",
  "name": "Typography",
  "settings": [
    {
      "id": "font_size",
      "label": "Font Size",
      "type": "range",
      "property": "--font-size",
      "default": "16px"
    },
    {
      "id": "font_size_tablet",
      "label": "Font Size — Tablet",
      "type": "range",
      "property": "--font-size",
      "default": "15px",
      "media": "tablet"
    },
    {
      "id": "font_size_mobile",
      "label": "Font Size — Mobile",
      "type": "range",
      "property": "--font-size",
      "default": "13px",
      "media": "mobile"
    }
  ]
}
```

Output CSS when all three are saved with non-default values:

```css
:root {
    --font-size: 18px;
}
@media (max-width: 1023px) {
    :root {
        --font-size: 15px;
    }
}
@media (max-width: 767px) {
    :root {
        --font-size: 13px;
    }
}
```

Each setting is an **independent DB row** with its own `id`. They share the same `property` (`--font-size`) but live at different breakpoints. The user sees three separate controls in the editor panel.

> **Tip:** Group responsive variants together in the section (base → tablet → mobile order) so they appear adjacent in the editor UI.

---

## Notes

- `media` is a **static field property** defined in `settings.json`. It is not stored in DB — only the `value` is.
- Alias map is hardcoded in `Model/Utility/MediaQueryResolver.php`. Raw queries bypass alias lookup and are passed through unchanged.
- A field without `media` behaves exactly as before — no `@media` wrapper.
