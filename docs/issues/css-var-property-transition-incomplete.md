# Issue: Incomplete `css_var` → `property` Field Name Transition

**Severity:** Medium  
**Area:** `Model/Service/CssGenerator.php`, `etc/schema.graphqls`, `Model/Resolver/Query/AbstractConfigResolver.php`  
**Type:** Technical debt / API cleanup

---

## Problem

The module is mid-transition from the legacy `css_var` field name (used in
old `settings.json` theme configs) to the new `property` field name. A
backward-compat shim exists in multiple places:

**`CssGenerator.php:141`**
```php
// Support both 'property' (new) and legacy 'css_var'
$property = $field['property'] ?? $field['css_var'] ?? null;
```

**`AbstractConfigResolver.php:92`**
```php
'property' => $setting['property'] ?? $setting['css_var'] ?? null,
```

**`schema.graphqls` — `SaveBreezeThemeEditorPaletteValueInput`**
```graphql
cssVar: String! @deprecated(reason: "Use 'property' instead")
property: String!
```

The `@deprecated` annotation on `cssVar` in the GraphQL input type means
clients still using the old field name get a deprecation warning but it
continues to work.

---

## Impact

- Every CSS generation call checks two keys — minor overhead, but more
  importantly: it masks missing `property` fields silently by falling back
  to `css_var`, which can hide config errors.
- The `@deprecated cssVar` field in the GraphQL schema adds noise.
- The shim will need to stay as long as any installed Breeze theme still
  ships `settings.json` files with `css_var` instead of `property`.

---

## Fix

This cannot be fully resolved in this module alone — it requires coordinating
with the Breeze theme packages:

1. **Audit Breeze theme `settings.json` files** — identify all that still use
   `css_var`. The fix is trivial in the theme configs (rename the key).
2. **Once all maintained themes use `property`**, remove the `?? $field['css_var']`
   fallbacks from `CssGenerator` and `AbstractConfigResolver`.
3. **Remove the `cssVar` field** from `SaveBreezeThemeEditorPaletteValueInput`
   in `schema.graphqls` (breaking change for any client still sending `cssVar`).

---

## Tracking

- [x] Audit Breeze theme packages for remaining `css_var` usage — **0 occurrences** in both `breeze-evolution` and `breeze-blank` `settings.json`. Ready to remove shim.
- [ ] Remove `CssVariableBuilder.php` fallbacks (2 places: lines 89, 184)
- [ ] Remove `AbstractConfigResolver.php` fallback (line 105)
- [ ] Remove `PaletteProvider.php` fallbacks (lines 75, 132, 133)
- [ ] Remove `PaletteResolver.php` fallback (line 114)
- [ ] Remove deprecated `cssVar` from GraphQL schema (`schema.graphqls`)
