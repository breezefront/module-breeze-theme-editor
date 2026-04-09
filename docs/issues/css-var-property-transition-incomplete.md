# Issue: Incomplete `css_var` → `property` Field Name Transition

**Severity:** Medium  
**Area:** `Model/Service/CssGenerator.php`, `etc/schema.graphqls`, `Model/Resolver/Query/AbstractConfigResolver.php`  
**Type:** Technical debt / API cleanup  
**Status:** ✅ Resolved

---

## Problem

The module was mid-transition from the legacy `css_var` field name (used in
old `settings.json` theme configs) to the new `property` field name. A
backward-compat shim existed in multiple places:

**`CssVariableBuilder.php`**
```php
// Support both 'property' (new) and legacy 'css_var'
$property = $field['property'] ?? $field['css_var'] ?? null;
```

**`AbstractConfigResolver.php`**
```php
'property' => $setting['property'] ?? $setting['css_var'] ?? null,
```

**`schema.graphqls` — `SaveBreezeThemeEditorPaletteValueInput`**
```graphql
cssVar: String! @deprecated(reason: "Use 'property' instead")
property: String!
```

---

## Impact

- Every CSS generation call checked two keys — minor overhead, but more
  importantly: it masked missing `property` fields silently by falling back
  to `css_var`, which could hide config errors.
- The `@deprecated cssVar` field in the GraphQL schema added noise.

---

## Resolution

All shims removed after auditing Breeze theme packages (0 occurrences of
`css_var` in `breeze-evolution` and `breeze-blank` `settings.json` files).

---

## Tracking

- [x] Audit Breeze theme packages for remaining `css_var` usage — **0 occurrences** in both `breeze-evolution` and `breeze-blank` `settings.json`. Ready to remove shim.
- [x] Remove `CssVariableBuilder.php` fallbacks (2 places: lines 89, 184)
- [x] Remove `AbstractConfigResolver.php` fallback (line 105)
- [x] Remove `PaletteProvider.php` fallbacks (lines 75, 132, 133)
- [x] Remove `PaletteResolver.php` fallback (line 114)
- [x] Remove deprecated `cssVar` from GraphQL schema (`schema.graphqls`) and `SavePaletteValue.php` resolver
- [x] Remove `data-css-var` fallback from `settings-editor.js` and `css-preview-manager.js`
- [x] Update all unit tests — replace `css_var` fixtures with `property`, remove backward-compat test cases
