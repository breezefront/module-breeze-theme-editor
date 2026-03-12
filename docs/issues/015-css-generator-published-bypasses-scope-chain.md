# Issue 015: `CssGenerator` PUBLISHED branch bypasses scope chain and theme hierarchy

**Severity:** High  
**Area:** `Model/Service/CssGenerator.php`  
**Type:** Bug  
**Status:** Closed — `7013886`

---

## Problem

When Magento requests the published CSS for the storefront (e.g. via
`getThemeEditorCss` with `status: PUBLISHED`), the generated CSS **ignores**:

1. **Scope chain inheritance** — values saved at `default` or `websites` scope
   are not included in the CSS of a store view.
2. **Theme hierarchy inheritance** — values saved for a parent theme are not
   included in the CSS of a child theme.

The DRAFT branch works correctly; only the PUBLISHED branch is broken.

---

## Root Cause

`CssGenerator::generate()` has two branches. The DRAFT branch correctly uses
`ValueInheritanceResolver::resolveAllValuesWithFallback()` which respects both
scope chain and theme hierarchy. The PUBLISHED branch calls
`ValueService::getValuesByTheme()` directly — a low-level method that performs
a flat single-scope DB query with no inheritance logic:

```php
// CssGenerator.php:41
if ($status === 'DRAFT') {
    // ✅ uses scope chain + theme hierarchy
    $values = $this->valueInheritanceResolver->resolveAllValuesWithFallback(
        $themeId, $scope, $statusId, $publishedStatusId, null
    );
} else {
    // ❌ flat single-scope DB query — no inheritance
    $values = $this->valueService->getValuesByTheme($themeId, $scope, $statusId, null);
}
```

Because issue #014 (`websiteId` not resolved in `buildScopeChain`) also affects
`ValueInheritanceResolver`, fixing this bug depends on fixing #014 first, or
both can be fixed together.

---

## Fix

Replace the PUBLISHED branch with the same `resolveAllValues()` call used
internally by the DRAFT path. `ValueService` is then no longer needed in
`CssGenerator` and can be removed from its constructor.

```php
// CssGenerator.php — after fix
if ($status === 'DRAFT') {
    $publishedStatusId = $this->statusProvider->getStatusId('PUBLISHED');
    $values = $this->valueInheritanceResolver->resolveAllValuesWithFallback(
        $themeId, $scope, $statusId, $publishedStatusId, null
    );
} else {
    // ✅ now also uses scope chain + theme hierarchy
    $values = $this->valueInheritanceResolver->resolveAllValues(
        $themeId, $scope, $statusId, null
    );
}
```

---

## Affected Files

| File | Change |
|------|--------|
| `Model/Service/CssGenerator.php` | Replace PUBLISHED branch; remove `ValueService` dependency |
| `Test/Unit/Model/Service/CssGeneratorTest.php` | Remove `ValueService` mock; update PUBLISHED test cases |

---

## How to Test

1. Go to Theme Editor, switch scope to **All Store Views** (default/0)
2. Change a setting (e.g. max content width) and publish
3. Switch scope to a store view and **do not** override that setting
4. Check the generated CSS for that store view — it must contain the value set
   at the default scope, not the theme default
5. Repeat for website scope
6. Repeat for a child theme — the CSS must contain values from the parent theme

---

## Status

| Step | Status |
|------|--------|
| Root cause identified | done |
| Depends on | [#014](014-scope-chain-website-id-not-resolved.md) — **Closed** |
| Fix applied | done — `7013886` |
| Unit tests updated | done — 42 mocks updated, regression tests 44-45 pass |
| Manual verification | pending |
