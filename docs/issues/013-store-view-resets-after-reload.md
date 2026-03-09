# Issue 013: Selected store view resets to default after page reload

**Severity:** Medium  
**Area:** `ViewModel/AdminToolbar.php`, `publication-selector.js`  
**Type:** Bug  
**Status:** Fixed — `4ed0708`

---

## Problem

After pressing F5 (page reload) in the Theme Editor, the store scope selector
highlighted the **default store view** instead of the one the user had
previously selected. The editor then loaded settings and changes count for the
wrong store, giving the user incorrect data.

Additionally, when the user switched stores via the scope selector, the
**changes badge** and **publications dropdown** were not updated to reflect the
newly selected store.

---

## Root Cause

`AdminToolbar::getStoreId()` (ViewModel) did not follow the same priority chain
as the `AbstractEditor` JS component. It ignored the `bte_last_store_id` cookie
that the JS sets when a user selects a store, and always fell back to the
Magento default store.

Priority chain should be:
1. URL param `store`
2. `bte_last_store_id` cookie
3. StoreManager default

The ViewModel was skipping step 2.

---

## Fix

### ViewModel/AdminToolbar.php

```php
public function getStoreId(): int
{
    // 1. URL param
    $storeId = (int) $this->request->getParam('store');
    if ($storeId) return $storeId;

    // 2. Cookie (set by JS scope selector)
    $storeId = (int) $this->cookieManager->getCookie('bte_last_store_id');
    if ($storeId) return $storeId;

    // 3. StoreManager fallback
    return (int) $this->storeManager->getStore()->getId();
}
```

### publication-selector.js

Added `storeChanged` event listener to reload `changesCount` and `publications`
list for the newly selected store whenever the user switches scope.

---

## Affected Files

| File | Change |
|------|--------|
| `ViewModel/AdminToolbar.php` | Read `bte_last_store_id` cookie in `getStoreId()` |
| `view/adminhtml/web/js/editor/toolbar/publication-selector.js` | Add `storeChanged` listener |

---

## How to Test

1. Select a non-default store view in the scope selector
2. Press F5
3. The same store view must remain selected after reload
4. The changes badge and publications dropdown must show data for that store
5. Switching stores must update both the badge and the dropdown immediately

---

## Status

| Step | Status |
|------|--------|
| Root cause identified | done |
| ViewModel fix applied | done — `4ed0708` |
| JS storeChanged listener added | done — `4ed0708` |
| Manual verification | pending |
