# Issue 014: Scope chain never includes website leg — `websiteId` is never passed

**Severity:** High  
**Area:** `Model/Service/ValueInheritanceResolver.php`, `Model/Resolver/Query/Config.php`, `Model/Resolver/Query/Values.php`  
**Type:** Bug  
**Status:** Closed — `445d55d`

---

## Problem

When the editor reads settings for a **store view** scope (`stores/N`), the
expected inheritance chain is:

```
default/0  →  websites/W  →  stores/N
```

In practice the chain is always a single entry:

```
stores/N
```

This means values saved at the `default` or `websites` scope are **silently
ignored** — they never reach the store view. The scope selector in the UI works
correctly (saves/reads to the right scope), but inheritance across levels is
completely broken.

---

## Root Cause

`ValueInheritanceResolver::buildScopeChain()` requires a `$websiteId` argument
to build the full chain. When `$websiteId === 0` the method returns a
single-entry chain as a fallback:

```php
// ValueInheritanceResolver.php:39
public function buildScopeChain(ScopeInterface $scope, int $websiteId = 0): array
{
    if ($scope->getType() === ValueInterface::SCOPE_DEFAULT || $websiteId === 0) {
        return [$scope]; // ← always hits this branch
    }
    ...
}
```

All four call sites that use this method never pass `$websiteId`:

| File | Line | Call |
|------|------|------|
| `Model/Resolver/Query/Config.php` | 96 | `resolveAllValues($themeId, $scope, $statusId, null)` |
| `Model/Resolver/Query/Config.php` | 99 | `resolveAllValuesWithFallback($themeId, $scope, ...)` |
| `Model/Resolver/Query/Values.php` | 73 | `resolveAllValues($themeId, $scope, $statusId, null)` |
| `Model/Resolver/Query/Values.php` | 76 | `resolveAllValuesWithFallback($themeId, $scope, ...)` |

---

## Fix

`ValueInheritanceResolver` should resolve `$websiteId` internally via
`StoreManagerInterface` instead of requiring callers to pass it.

```php
// Inject StoreManagerInterface
public function __construct(
    private ValueService $valueService,
    private ThemeResolver $themeResolver,
    private ConfigProvider $configProvider,
    private ScopeFactory $scopeFactory,
    private ?StoreManagerInterface $storeManager = null  // optional → BC safe
) {}

// Auto-resolve websiteId from StoreManager
private function resolveWebsiteId(ScopeInterface $scope): int
{
    if (!$this->storeManager) {
        return 0;
    }
    if ($scope->getType() === ValueInterface::SCOPE_STORES) {
        try {
            return (int)$this->storeManager->getStore($scope->getScopeId())->getWebsiteId();
        } catch (\Exception $e) {
            return 0;
        }
    }
    return 0;
}

// buildScopeChain calls resolveWebsiteId when $websiteId is not provided
public function buildScopeChain(ScopeInterface $scope, int $websiteId = 0): array
{
    if ($websiteId === 0) {
        $websiteId = $this->resolveWebsiteId($scope);
    }
    ...
}
```

No changes required in `Config.php` or `Values.php` — the fix is internal.

---

## Affected Files

| File | Change |
|------|--------|
| `Model/Service/ValueInheritanceResolver.php` | Inject `StoreManagerInterface`; add `resolveWebsiteId()`; call it from `buildScopeChain()` |
| `etc/di.xml` | Wire `StoreManagerInterface` into `ValueInheritanceResolver` if needed |

---

## How to Test

1. Go to Theme Editor, switch scope selector to **All Store Views** (default/0)
2. Save a value (e.g. change header color to red)
3. Switch scope selector to any store view (`stores/N`)
4. The header color field must show **red** (inherited from default), not the theme default
5. Override the field in the store view — the store value must take priority
6. Switch to a website scope — it must also inherit the default value

---

## Status

| Step | Status |
|------|--------|
| Root cause identified | done |
| Fix applied | done — `445d55d` |
| Unit tests | done — 520 tests pass |
| Manual verification | pending |
