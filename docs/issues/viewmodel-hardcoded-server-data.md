# Issue: ViewModel Returns Hardcoded Server-Side Data

**Severity:** Medium  
**Area:** `ViewModel/AdminToolbar.php`  
**Type:** Stale code / Incorrect behavior

---

## Problem

Three methods in `ViewModel/AdminToolbar` return hardcoded values instead of
real data. They are still called from `getToolbarConfig()`, injecting stale
values into the JS config on initial page load.

```php
// AdminToolbar.php:310 — always returns 'DRAFT' regardless of actual state
public function getCurrentPublicationStatus()
{
    return 'DRAFT'; // @todo Phase 2: Implement via GraphQL
}

// AdminToolbar.php:321 — always returns 0
public function getDraftChangesCount()
{
    return 0; // @todo Phase 2: Implement via GraphQL
}

// AdminToolbar.php:299 — always returns []
/** @deprecated Use GraphQL query 'getPublications' instead */
public function getPublications()
{
    return [];
}
```

These values feed into `getToolbarConfig()`:

```php
// AdminToolbar.php:459–512
'currentStatus'     => $this->getCurrentPublicationStatus(), // 'DRAFT' always
'draftChangesCount' => $this->getDraftChangesCount(),        // 0 always
'publications'      => $this->getPublications(),             // [] always
```

---

## Impact

The JS toolbar initializes with stale values before the first GraphQL call
completes. If the real status is `PUBLISHED` (e.g., user has no draft), the
toolbar briefly shows `DRAFT` with `0` changes.

In practice, the JS components re-fetch via GraphQL immediately on mount, so
the visual flicker is short. But it can cause incorrect initial state for
components that react to the config before the first GraphQL response.

---

## Fix

### Option A — Remove from PHP entirely (recommended)

Since all three values are fetched via GraphQL on the JS side anyway, simply
stop injecting them from PHP. Remove the calls in `getToolbarConfig()` and
delete the three methods.

```diff
- 'currentStatus'     => $this->getCurrentPublicationStatus(),
- 'draftChangesCount' => $this->getDraftChangesCount(),
- 'publications'      => $this->getPublications(),
```

Update any JS consumers that read these from the initial config to wait for
the GraphQL response instead.

### Option B — Implement real PHP lookups

Inject the required repositories and compute the real values server-side.
Higher effort; duplicates what GraphQL already provides.

---

## Related

- `getCurrentPublicationId()` (line 331) calls `$this->getPublications()` and
  will always return `null` once `getPublications()` returns `[]`.
  If `currentPublicationId` is used anywhere meaningful, it should also be
  fetched via GraphQL or removed.
