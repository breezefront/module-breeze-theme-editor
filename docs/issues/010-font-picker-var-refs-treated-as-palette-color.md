# Issue 010: font_picker CSS-var references incorrectly processed as palette colour vars

**Severity:** High  
**Area:** `Model/Service/CssGenerator.php`, `view/adminhtml/web/js/editor/panel/css-preview-manager.js`  
**Type:** Bug  
**Status:** Fixed — `HEAD`

---

## Problem

When a `font_picker` field stores a CSS custom property reference such as
`--primary-font` (a Font Palette role), two separate bugs caused incorrect
behaviour:

### Bug A — PHP: font_picker value fed into palette colour processing

`CssGenerator::buildPaletteVarsToEmit()` iterated over all saved field values
and, for any value starting with `--`, assumed it was a **palette colour**
reference and forwarded it to `processPaletteColor()`.

`font_picker` fields that reference a Font Palette role (e.g. `--primary-font`)
also start with `--`, so they were incorrectly picked up and caused broken CSS
output or a PHP error in `processPaletteColor()`.

### Bug B — JS: font preview not applied when value is a CSS variable

In `css-preview-manager.js`, the font picker preview applied the font via:

```js
$field[0].style.fontFamily = displayValue;
```

When `displayValue` is `--primary-font`, the browser does not interpret this
as a CSS variable and silently ignores it, so no font preview was shown.

---

## Root Cause

### PHP

`buildPaletteVarsToEmit()` had no type guard — it checked only whether the
value started with `--`, without verifying that the field was actually of type
`color`. The `$fieldMap` (which contains the `type` for each field) was not
passed to that method.

### JS

`style.fontFamily = value` cannot resolve CSS custom properties.
`style.setProperty('font-family', 'var(--primary-font)')` must be used instead.

---

## Fix

### PHP (`CssGenerator.php`)

- `$fieldMap` is now passed as the third argument to `buildPaletteVarsToEmit()`.
- Inside the loop a type guard was added: only fields with `type === 'color'`
  are forwarded to the palette colour path. `font_picker` and all other types
  are skipped.

```php
// BEFORE
private function buildPaletteVarsToEmit(array $values, array $config): array

// AFTER
private function buildPaletteVarsToEmit(array $values, array $config, array $fieldMap): array
// ...
$fieldType = strtolower($fieldMap[$key]['type'] ?? '');
if ($fieldType !== 'color') {
    continue;
}
```

### JS (`css-preview-manager.js`)

- Wrap `--`-prefixed values in `var(...)` before applying.
- Use `style.setProperty()` so CSS custom property references are resolved.

```js
// BEFORE
$field[0].style.fontFamily = displayValue;

// AFTER
var fontCssValue = displayValue.startsWith('--')
    ? 'var(' + displayValue + ')'
    : displayValue;
$field[0].style.setProperty('font-family', fontCssValue);
```

---

## Affected Files

| File | Change |
|------|--------|
| `Model/Service/CssGenerator.php` | Pass `$fieldMap` to `buildPaletteVarsToEmit()`; add `color`-type guard |
| `view/adminhtml/web/js/editor/panel/css-preview-manager.js` | Wrap CSS-var font references in `var()`; use `setProperty()` |

---

## How to Reproduce

1. In Font Palette, create a role `--primary-font` and assign a font
2. In Theme Settings, set a `font_picker` field to reference `--primary-font`
3. Save — observe JS preview not updating
4. Publish — observe that the PHP palette processing may throw or emit
   unexpected CSS for the font field

---

## How to Test

```bash
bin/phpunit vendor/swissup/module-breeze-theme-editor/Test/Unit/Model/Service/CssGeneratorTest.php
```

Also manually verify the font picker preview updates correctly when a
Font Palette role is selected as the field value.

---

## Status

| Step | Status |
|------|--------|
| Root cause identified | done |
| PHP fix applied (`buildPaletteVarsToEmit` type guard) | done |
| JS fix applied (`var()` wrapper + `setProperty`) | done |
| Verified on storefront | pending |

---

## Related

- Issue 003: Fonts not applied after publish — `formatFont()` missing `var()` wrapper (PHP side)
