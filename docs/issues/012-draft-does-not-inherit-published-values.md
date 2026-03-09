# Issue 012: DRAFT values do not inherit PUBLISHED as base layer

**Severity:** High  
**Area:** `Model/Service/ValueInheritanceResolver.php`, Config/Values/CssGenerator resolvers  
**Type:** Bug  
**Status:** Fixed — `a5c7934`

---

## Problem

When a user opened the Theme Editor in DRAFT mode, fields that had no draft
row showed the **theme default** value instead of the currently published value.

This meant the editor was lying to the user — the live storefront was showing
the published value, but the editor was showing a different (default) value for
all unmodified fields.

---

## Root Cause

`ValueInheritanceResolver` only returned rows for the requested status (DRAFT).
It had no fallback to merge the PUBLISHED snapshot underneath, so any field
without an explicit draft row fell through to the theme config default.

---

## Fix

Added `resolveAllValuesWithFallback()` to `ValueInheritanceResolver`:

1. Load all PUBLISHED rows → base layer
2. Load all DRAFT rows → overlay on top (draft wins on conflict)
3. Return merged result

`Config`, `Values`, and `CssGenerator` resolvers now call this method when
the requested status is DRAFT.

```php
// ValueInheritanceResolver.php
public function resolveAllValuesWithFallback(int $themeId, int $storeId, int $draftStatusId): array
{
    $published = $this->getValuesByStatus($themeId, $storeId, $this->getStatusId('PUBLISHED'));
    $draft     = $this->getValuesByStatus($themeId, $storeId, $draftStatusId);
    return array_merge($published, $draft); // draft keys overwrite published
}
```

---

## Affected Files

| File | Change |
|------|--------|
| `Model/Service/ValueInheritanceResolver.php` | Add `resolveAllValuesWithFallback()` |
| `Model/Resolver/Query/Config.php` | Use `resolveAllValuesWithFallback` for DRAFT |
| `Model/Resolver/Query/Values.php` | Same |
| `Model/Service/CssGenerator.php` | Same |

---

## How to Test

1. Publish a set of values (e.g. red header)
2. Open the editor — switch to Draft mode without making any changes
3. All fields must show the published values, not theme defaults
4. Make one change — only that field should differ from published
5. The live CSS preview must reflect published values for untouched fields

---

## Status

| Step | Status |
|------|--------|
| Root cause identified | done |
| Fix applied | done — `a5c7934` |
| Unit tests updated (Config, Values, CssGenerator) | done — `a5c7934` |
