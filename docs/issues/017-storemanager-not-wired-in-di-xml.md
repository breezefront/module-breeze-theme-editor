# Issue 017: `StoreManagerInterface` not wired in `di.xml` — scope chain broken on production

**Severity:** Critical  
**Area:** `etc/di.xml`, `Model/Service/ValueInheritanceResolver.php`  
**Type:** Bug (incomplete fix from #014)  
**Status:** Closed — `fix(issue-017)`

---

## Problem

After installing the module on a production Magento instance, values saved under
**"All Store Views"** (`scope=default, store_id=0`) are **not applied** to any
store view on the frontend. The `<style id="bte-theme-css-variables">` tag is
either absent from the page HTML or contains an empty `:root {}` block.

---

## Root Cause

Fix #014 added `StoreManagerInterface` as an **optional** constructor argument
to `ValueInheritanceResolver`:

```php
public function __construct(
    ...
    private ?StoreManagerInterface $storeManager = null  // ← optional
) {}
```

However, **`etc/di.xml` was never updated** to wire this dependency.

Magento's DI container does **not** auto-inject optional (`nullable`) constructor
arguments unless they are explicitly declared in `di.xml`. Without the wire
entry, Magento leaves `$storeManager = null` on every production instance
(compiled DI mode).

The consequence: `resolveWebsiteId()` always returns `0` because it guards on
`$this->storeManager`:

```php
private function resolveWebsiteId(ScopeInterface $scope): int
{
    if ($scope->getType() === ValueInterface::SCOPE_STORES && $this->storeManager) {
        // ← never reached because $this->storeManager is null
        return (int) $this->storeManager->getStore($scope->getScopeId())->getWebsiteId();
    }
    return 0;
}
```

With `websiteId = 0`, `buildScopeChain(stores/N)` falls back to a single-entry
chain:

```php
if ($scope->getType() === ValueInterface::SCOPE_DEFAULT || $websiteId === 0) {
    return [$scope];  // ← [stores/N] only, default/0 never included
}
```

So `resolveAllValues()` queries only `stores/N` rows and finds nothing — the
value saved at `default/0` is silently skipped.

---

## Timeline / Discovery

The bug was discovered during live production debugging of a customer site
running **beta.2**:

```
storeManager in resolver: NULL     ← confirmed via Reflection
scope chain:
  stores/2                         ← single entry, default/0 missing
values count: 0                    ← CSS empty despite 19 rows in DB
```

The DB contained correct data (`scope='default', store_id=0, status='published'`)
saved by fix #016. Fix #015 correctly calls `resolveAllValues()`. But without
the DI wire, `resolveAllValues()` itself produces an empty result.

---

## Fix

Add the `<type>` entry to `etc/di.xml`:

```xml
<type name="Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver">
    <arguments>
        <argument name="storeManager" xsi:type="object">Magento\Store\Model\StoreManagerInterface</argument>
    </arguments>
</type>
```

---

## Affected Files

| File | Change |
|------|--------|
| `etc/di.xml` | Add `<type>` entry to wire `StoreManagerInterface` |

---

## Upgrade Instructions

After updating the module, run:

```bash
php bin/magento setup:di:compile
php bin/magento cache:flush
```

Without `setup:di:compile` the old compiled DI class will still inject `null`.

---

## How to Verify

```bash
# Should return 'bte-theme-css-variables'
curl -s https://your-store.com/ | grep -o 'bte-theme-css-variables'
```

Or in browser console:

```js
const el = document.getElementById('bte-theme-css-variables');
console.log('exists:', !!el);
console.log('content:', el?.textContent.trim().substring(0, 300));
```

---

## Relation to Other Issues

| Issue | Relation |
|-------|----------|
| #014 | Root fix — added `StoreManager` to resolver; this issue is its missing `di.xml` wire |
| #015 | Also required — PUBLISHED branch must call `resolveAllValues()` not flat query |
| #016 | Also required — admin must default to `default` scope, not `stores` |

All three fixes (#014, #015, #016) **plus this `di.xml` wire** are required for
"All Store Views" inheritance to work end-to-end.

---

## Status

| Step | Status |
|------|--------|
| Root cause identified | done — live production debugging |
| Fix applied | done |
| Manual verification | done — `bte-theme-css-variables` present on production after `di:compile` |
