# Issue 003: Fonts not applied on storefront after publish

**Severity:** High  
**Area:** `Model/Service/CssGenerator.php`  
**Type:** Bug  
**Status:** Fixed — `af7049e`

---

## Problem

After setting a font (e.g. Times New Roman) in the Font Picker and publishing,
the selected font does not appear on the storefront. The browser falls back to
the default font.

Specifically, fields that reference a Font Palette role (e.g. `--primary-font`)
were producing broken CSS:

```css
/* BEFORE (buggy) — missing var() wrapper */
--base-font-family: --primary-font, sans-serif;
```

instead of:

```css
/* AFTER (correct) */
--base-font-family: var(--primary-font), sans-serif;
```

---

## Root Cause

In `CssGenerator::formatFont()` (PHP), a font value that starts with `--`
(i.e. a CSS custom property reference) was output as-is without wrapping it
in `var()`. The JavaScript side (`_formatFont()` in the JS editor) already had
this guard, but the PHP side was missing it.

```php
// CssGenerator.php — BEFORE (buggy)
// No check for '--' prefix, so '--primary-font' was used raw
return $fontFamily . ', ' . $fallback;

// CssGenerator.php — AFTER (correct)
if (str_starts_with($fontFamily, '--')) {
    $fontFamily = 'var(' . $fontFamily . ')';
}
return $fontFamily . ', ' . $fallback;
```

---

## Affected File

| File | Change |
|------|--------|
| `Model/Service/CssGenerator.php` | Add `str_starts_with('--')` guard in `formatFont()` |

---

## How to Reproduce

1. In Font Palette, create a role `--primary-font` and assign a font
2. In Theme Settings, set a font field to reference `--primary-font` (palette role)
3. Publish
4. Check generated CSS: `--base-font-family` will be `--primary-font, sans-serif`
   instead of `var(--primary-font), sans-serif`
5. Storefront shows default font

---

## How to Test

```bash
bin/phpunit vendor/swissup/module-breeze-theme-editor/Test/Unit/Model/Service/CssGeneratorTest.php
```

Tests 37 and 38 (added in `af7049e`) cover:
- `--primary-font` reference → `var(--primary-font)`
- `--secondary-font` reference → `var(--secondary-font)`

---

## Status

| Step | Status |
|------|--------|
| Root cause identified | done |
| Fix applied (`CssGenerator.php`) | done — `af7049e` |
| Regression tests added (tests 37–38) | done — `af7049e` |
| Verified on storefront | pending |
