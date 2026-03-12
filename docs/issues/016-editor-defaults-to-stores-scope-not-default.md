# Issue 016: Editor opens in `stores` scope instead of `default` scope

**Severity:** Low  
**Area:** `ViewModel/AdminToolbar.php`, `view/adminhtml/web/js/editor/toolbar/scope-selector.js`  
**Type:** Task  
**Status:** Closed — `8071f79`

---

## Background

During the scope feature design (2026-03-09, Dmitry Deyev):

> "In 90% of cases store owners will want to edit default config settings.
> There is no real need to do that on store view level. If they have multistore
> with different themes then they will work on website level.
> Editing settings on store view level will be really rare."
>
> "Let's set default level as one enabled by default."

---

## Problem

When a fresh installation opens the Theme Editor for the first time (no session
and no URL param), the editor falls back to the `stores` scope:

```php
// ViewModel/AdminToolbar.php:217
public function getScope(): string
{
    ...
    return 'stores'; // ← should be 'default'
}
```

The `scope-selector.js` widget also hardcodes `currentScope: 'stores'` as its
option default.

This means first-time users edit at the store-view level, accumulating changes
that do not propagate to other store views. Any future attempt to move those
changes to the default scope requires manual work.

---

## Fix

### `ViewModel/AdminToolbar.php`

Change the fallback from `'stores'` to `'default'`:

```php
public function getScope(): string
{
    $valid = ['default', 'websites', 'stores'];

    $scope = (string)$this->request->getParam('scope', '');
    if (in_array($scope, $valid, true)) {
        return $scope;
    }

    $lastScope = (string)$this->backendSession->getScopeType();
    if (in_array($lastScope, $valid, true)) {
        return $lastScope;
    }

    return 'default'; // changed from 'stores'
}
```

### `view/adminhtml/web/js/editor/toolbar/scope-selector.js`

```js
options: {
    currentScope: 'default',  // changed from 'stores'
    currentScopeId: 0,
    ...
}
```

---

## Side Effects / Notes

- Users who have already selected a scope will not be affected — the session
  value takes priority over the fallback.
- The `stores` fallback for `getScopeId()` in the ViewModel should remain
  unchanged for multi-store setups where a store view must be resolved to
  build the iframe preview URL.
- This change only affects the **editing scope**, not the preview URL.

---

## Affected Files

| File | Change |
|------|--------|
| `ViewModel/AdminToolbar.php` | Return `'default'` as fallback in `getScope()` |
| `view/adminhtml/web/js/editor/toolbar/scope-selector.js` | Set `currentScope: 'default'` as widget default |

---

## How to Test

1. Clear all cookies and session data
2. Open the Theme Editor for the first time
3. The scope selector must show **All Store Views** (default scope) as active
4. Select a store view, reload the page — the store view must be remembered
5. Clear cookies again — editor must revert to All Store Views

---

## Status

| Step | Status |
|------|--------|
| Requirement confirmed | done |
| Fix applied | done — `8071f79` |
| Manual verification | pending |
