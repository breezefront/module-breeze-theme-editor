# Issue 011: Publish creates duplicate published rows due to user_id mismatch

## Summary

The `publishBreezeThemeEditor` mutation returns `500 Internal Server Error` with
the message `"No changes to publish"`, even though draft rows with real differences
exist in the DB.

The root cause is a **user_id mismatch** in the `breeze_theme_editor_value` table.
After the fix in issue 001, published rows are saved with `user_id = 0`. But the DB
still contains legacy published rows with `user_id = <admin_id>` (e.g. `1`) from
before that fix.

The unique constraint `UNQ_ALL` includes `user_id`:
```
UNIQUE KEY (theme_id, store_id, status_id, user_id, section_code, setting_code)
```

When `PublishService::publish()` calls `saveMultiple()` with `user_id=0`, MySQL finds
**no duplicate** (existing rows have `user_id=1`) and performs an `INSERT` instead of
an `UPDATE`. The result: both `user_id=0` and `user_id=1` rows exist simultaneously
for the same settings — corrupted published state.

On the **next** `compare()` call, `CompareProvider` loads ALL published rows (no
`user_id` filter). The `publishedMap` is built from up to 20 rows (10 with `user_id=1`
+ 10 with `user_id=0`), with undefined iteration order. Draft values appear to match
some of the duplicate published values → `$changes` comes out empty →
`hasChanges = false` → `"No changes to publish"`.

---

## Discovery log

Debugging added `RuntimeException` at different points in `CompareProvider::compare()`:

**Step 1** — exception before comparison logic:
```
BTE_DEBUG: themeId=5 storeId=3 userId=1 draftStatusId=1 publishedStatusId=2 draftRows=4
```
Confirmed: 4 draft rows found, status IDs correct.

**Step 2** — exception after full comparison logic:
```
BTE_DEBUG: publishedCount=10 draftCount=4 changesCount=4
  published_keys=[colors.footer-bg, colors.header-color, ...]
  draft_keys=[colors.button-color, colors.footer-bg, colors.header-panel-bg, colors.header-panel-color]
```
Confirmed: `CompareProvider` itself is correct — 4 real changes detected.

**Conclusion:** `CompareProvider` is not the bug. The problem is in `PublishService` —
`insertOnDuplicate` silently creates duplicate published rows instead of replacing
existing ones, corrupting the state that `compare()` reads on the next call.

---

## Root cause

### 1. `PublishService.php` — no cleanup of existing published rows before insert

`saveMultiple()` uses `INSERT ON DUPLICATE KEY UPDATE`. The duplicate key check is
based on `UNQ_ALL` which includes `user_id`. Legacy published rows have `user_id=1`,
new code inserts with `user_id=0` → no match → INSERT → duplicates.

After first publish: 10 old rows (`user_id=1`) + 4 new rows (`user_id=0`) = 14 rows.

### 2. `PublishService.php` — magic `user_id=0` is semantically wrong

`user_id=0` is not a real admin user. It was introduced in issue 001 as a "global/published"
sentinel, but it is not enforced by any FK — it is just a convention. This makes the code
fragile: any deviation (legacy rows, rollback, etc.) silently breaks the published state.

### 3. No DB transaction

The publish flow does:
1. `DELETE` all published rows
2. `INSERT` merged snapshot
3. `DELETE` draft rows

If step 2 fails, published values are already gone — the live site loses its settings
with no rollback possible.

---

## Affected files

| File | Problem |
|---|---|
| `Model/Service/PublishService.php` | No pre-publish cleanup; `user_id=0` magic; no transaction |
| `Model/Service/PublishService.php` (rollback) | Same issues in `rollback()` |
| `etc/db_schema.xml` | No FK from `user_id` to `admin_user`; column comment misleads |

---

## The Fix

### Design decision

Replace the `user_id=0` convention with a proper design:

- Published rows use the **real `userId`** of the admin who performed the publish/rollback
- Add **FK** `breeze_theme_editor_value.user_id` → `admin_user.user_id` with `ON DELETE NO ACTION`
  (consistent with `FK_PUBLICATION_USER` on the publications table)
- Before saving new published rows: **DELETE ALL** existing published rows for
  `(themeId, storeId)` regardless of `user_id` — eliminates legacy data and future
  user_id drift
- Wrap the entire DB mutation in a **transaction** to prevent partial state on failure

### 1. `etc/db_schema.xml`

Add FK and update column comment:

```xml
<!-- Before -->
<column xsi:type="int" name="user_id" ... comment="Owner (0=published)"/>
<!-- no FK to admin_user -->
<!-- user_id=0 means "published/global" — no FK since 0 is not a valid admin user ID -->

<!-- After -->
<column xsi:type="int" name="user_id" ... comment="Owner admin user ID"/>
<constraint xsi:type="foreign" referenceId="FK_VALUE_USER"
    table="breeze_theme_editor_value" column="user_id"
    referenceTable="admin_user" referenceColumn="user_id"
    onDelete="NO ACTION"/>
```

### 2. `Model/Service/PublishService.php` — `publish()`

```php
// Inject ResourceConnection for transaction support
public function __construct(
    ...
    private \Magento\Framework\App\ResourceConnection $resourceConnection
) {}

public function publish(...): array
{
    $connection = $this->resourceConnection->getConnection();
    $connection->beginTransaction();
    try {
        // ... compare, create publication record, save changelog ...

        // Load current published snapshot (may include legacy user_id=1 rows)
        $currentPublished = $this->valueService->getValuesByTheme(
            $themeId, $storeId, $publishedStatusId, null
        );

        // Merge: current published overridden by draft values
        $mergedMap = [];
        foreach ($currentPublished as $val) {
            $mergedMap[$val['section_code'] . '.' . $val['setting_code']] = $val;
        }
        foreach ($draftValues as $val) {
            $mergedMap[$val['section_code'] . '.' . $val['setting_code']] = $val;
        }

        // Delete ALL existing published rows (any user_id)
        $this->valueService->deleteValues($themeId, $storeId, $publishedStatusId, null);

        // Insert clean merged snapshot with real userId
        $models = [];
        foreach ($mergedMap as $val) {
            $model = $this->valueRepository->create();
            // ...
            $model->setUserId($userId); // real admin, not magic 0
            $models[] = $model;
        }
        $this->valueRepository->saveMultiple($models);

        // Delete draft
        $this->valueService->deleteValues($themeId, $storeId, $draftStatusId, $userId);

        $connection->commit();
        return [...];
    } catch (\Exception $e) {
        $connection->rollBack();
        throw $e;
    }
}
```

Same pattern applied to `rollback()`.

### 3. DB — manual cleanup before `setup:upgrade`

The FK addition will fail if `user_id=0` rows exist. Delete them before running upgrade:

```sql
DELETE FROM breeze_theme_editor_value WHERE user_id = 0;
```

### Deployment order

```
1. Upload changed files via FileZilla (PublishService.php, db_schema.xml)
2. DELETE FROM breeze_theme_editor_value WHERE user_id = 0;  ← manual SQL on server
3. php8.1 bin/magento setup:upgrade
4. php8.1 bin/magento cache:flush
```

---

## Status

| Step | Status |
|---|---|
| Root cause identified (debug via RuntimeException) | done |
| `CompareProvider.php` debug code removed | done |
| `PublishService.php` merge+delete+insert logic added | done |
| `PublishService.php` transaction | **pending** |
| `PublishService.php` `setUserId(0)` → `setUserId($userId)` | **pending** |
| `etc/db_schema.xml` FK added | **pending** |
| DB manual cleanup (`user_id=0` rows deleted) | **pending** (manual, on server) |
| `setup:upgrade` run on server | **pending** |
