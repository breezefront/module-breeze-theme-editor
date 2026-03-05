# Issue 001: PublishService saves published values with wrong user_id

## Summary

When an admin publishes theme settings, the resulting rows in `breeze_theme_editor_value`
are saved with `user_id = <admin_id>` (e.g. `2`) instead of `user_id = 0`.

The value `0` is the convention for "global / published" — not owned by any specific admin.
This causes published values to either:
- **fail silently** due to a FK constraint (`user_id` → `admin_user`) that rejects `0`,
- **disappear** when an admin user is deleted (cascading FK delete wipes their "published" rows),
- **accumulate duplicates** when multiple admins publish (each creates a separate row for the
  same setting, leading to non-deterministic last-write-wins on the storefront).

The net effect on the storefront: published CSS variable values are missing, so the browser
falls back to the theme default (e.g. `--base-color` stays `rgb(30, 41, 57)` instead of
showing the published green `#4FC13C`).

---

## Root Cause

### Bug 1 — `PublishService.php`: wrong `user_id` on published rows

**File:** `Model/Service/PublishService.php`

In `publish()` (line 74) and `rollback()` (line 151), the new published-status value models
are created with the admin's `$userId` instead of `0`:

```php
// BEFORE (buggy)
$model->setUserId($userId);   // e.g. 2 — admin who clicked "Publish"

// AFTER (correct)
$model->setUserId(0);         // 0 = published/global, no admin owner
```

### Bug 2 — `db_schema.xml`: FK constraint prevents `user_id = 0`

**File:** `etc/db_schema.xml`

The schema defines a foreign key from `breeze_theme_editor_value.user_id` to
`admin_user.user_id`. Because there is no admin user with `user_id = 0`, inserting
a published row with `user_id = 0` violates the constraint:

```
ERROR 1452: Cannot add or update a child row: a foreign key constraint fails
(CONSTRAINT `BREEZE_THEME_EDITOR_VALUE_USER_ID_ADMIN_USER_USER_ID`
 FOREIGN KEY (`user_id`) REFERENCES `admin_user` (`user_id`) ON DELETE CASCADE)
```

The `ON DELETE CASCADE` also means: if the admin who published is ever deleted from
`admin_user`, **all their published values are silently deleted** with them.

The FK on `user_id` is semantically wrong for published rows. It should be removed.

---

## How to Reproduce

### Option A — Unit test (preferred)

Add the following test to `Test/Unit/Model/Service/PublishServiceTest.php`.
It **fails on the buggy code** and **passes after the fix**.

```php
/**
 * BUG REPRODUCTION: published values must be saved with user_id=0, not the admin's userId.
 * When setUserId($userId) is called (e.g. 5), the FK to admin_user blocks user_id=0
 * and if the admin is deleted, all "published" values cascade-delete with them.
 */
public function testPublishSavesPublishedValuesWithUserIdZero(): void
{
    $userId = 5; // the admin who clicked Publish

    $this->compareProviderMock->method('compare')->willReturn([
        'hasChanges'   => true,
        'changesCount' => 1,
        'changes'      => [['sectionCode' => 'colors', 'fieldCode' => 'base-color',
                            'publishedValue' => null, 'draftValue' => '#4FC13C']],
    ]);
    $this->statusProviderMock->method('getStatusId')
        ->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
    $this->valueServiceMock->method('getValuesByTheme')
        ->willReturn([['section_code' => 'colors', 'setting_code' => 'base-color', 'value' => '#4FC13C']]);

    $publicationMock = $this->createMock(Publication::class);
    $publicationMock->method('getPublicationId')->willReturn(100);
    $this->publicationFactoryMock->method('create')->willReturn($publicationMock);

    $changelogMock = $this->createMock(Changelog::class);
    $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

    $valueMock = $this->createMock(Value::class);

    // THE CRITICAL ASSERTION: must be 0, NOT $userId (5)
    $valueMock->expects($this->once())
        ->method('setUserId')
        ->with(0);   // <-- fails if code passes $userId instead

    $this->valueRepositoryMock->method('create')->willReturn($valueMock);

    $this->publishService->publish(1, 1, $userId, 'Test');
}

/**
 * BUG REPRODUCTION (rollback): same issue in rollback path.
 */
public function testRollbackSavesPublishedValuesWithUserIdZero(): void
{
    $userId = 5;

    $oldPub = $this->createMock(Publication::class);
    $oldPub->method('getThemeId')->willReturn(1);
    $oldPub->method('getStoreId')->willReturn(1);
    $this->publicationRepositoryMock->method('getById')->willReturn($oldPub);

    $searchCriteria = $this->createMock(\Magento\Framework\Api\SearchCriteria::class);
    $this->searchCriteriaBuilderMock->method('addFilter')->willReturnSelf();
    $this->searchCriteriaBuilderMock->method('create')->willReturn($searchCriteria);

    $change = $this->createMock(Changelog::class);
    $change->method('getSectionCode')->willReturn('colors');
    $change->method('getSettingCode')->willReturn('base-color');
    $change->method('getNewValue')->willReturn('#4FC13C');

    $results = $this->createMock(\Swissup\BreezeThemeEditor\Api\Data\ChangelogSearchResultsInterface::class);
    $results->method('getItems')->willReturn([$change]);
    $this->changelogRepositoryMock->method('getList')->willReturn($results);

    $newPub = $this->createMock(Publication::class);
    $newPub->method('getPublicationId')->willReturn(101);
    $this->publicationFactoryMock->method('create')->willReturn($newPub);

    $this->statusProviderMock->method('getStatusId')->willReturn(2);

    $valueMock = $this->createMock(Value::class);

    // THE CRITICAL ASSERTION
    $valueMock->expects($this->once())
        ->method('setUserId')
        ->with(0);   // <-- fails if code passes $userId instead

    $this->valueRepositoryMock->method('create')->willReturn($valueMock);

    $changelogMock = $this->createMock(Changelog::class);
    $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

    $this->publishService->rollback(50, $userId, 'Rollback');
}
```

### Option B — Manual DB check (after a real publish)

```sql
-- After any Publish action, check what user_id the published rows have:
SELECT value_id, theme_id, store_id, status_id, user_id, section_code, setting_code, value
FROM breeze_theme_editor_value
WHERE status_id = 2;  -- 2 = PUBLISHED

-- Expected: user_id = 0
-- Buggy:    user_id = <admin_id, e.g. 2>
```

---

## Affected Files

| File | Change needed |
|---|---|
| `Model/Service/PublishService.php` | `setUserId($userId)` → `setUserId(0)` at lines 74 and 151 |
| `etc/db_schema.xml` | Remove `FK_VALUE_USER` constraint (line 61) |

---

## The Fix

### 1. `Model/Service/PublishService.php`

In both `publish()` and `rollback()`, when building the published-value models:

```php
// publish() — was line 74
- $model->setUserId($userId);
+ $model->setUserId(0); // 0 = published/global, not tied to a specific admin user

// rollback() — was line 151
- $model->setUserId($userId);
+ $model->setUserId(0); // 0 = published/global, not tied to a specific admin user
```

### 2. `etc/db_schema.xml`

Remove the FK constraint that incorrectly links `user_id` to `admin_user`:

```xml
<!-- REMOVE this line: -->
<constraint xsi:type="foreign" referenceId="FK_VALUE_USER"
    table="admin_user" column="user_id"
    referenceTable="admin_user" referenceColumn="user_id"
    onDelete="CASCADE"/>
```

Replace with a comment explaining the intent:

```xml
<!-- user_id=0 means "published/global" — no FK to admin_user since 0 is not a valid admin user ID -->
```

After updating `db_schema.xml`, run the Magento upgrade command to apply the schema change:

```bash
bin/magento setup:upgrade
```

Or drop the constraint manually on the live DB:

```sql
ALTER TABLE breeze_theme_editor_value
    DROP FOREIGN KEY BREEZE_THEME_EDITOR_VALUE_USER_ID_ADMIN_USER_USER_ID;
```

### 3. Data fix (existing polluted rows)

If published rows already exist with wrong `user_id`, fix them:

```sql
-- First drop the FK (see above), then:
UPDATE breeze_theme_editor_value
SET user_id = 0
WHERE status_id = 2;  -- 2 = PUBLISHED
```

---

## How to Test

### Run unit tests

```bash
# From the Magento root:
bin/phpunit vendor/swissup/module-breeze-theme-editor/Test/Unit/Model/Service/PublishServiceTest.php
```

The two new tests (`testPublishSavesPublishedValuesWithUserIdZero` and
`testRollbackSavesPublishedValuesWithUserIdZero`) should:
- **FAIL** on the original buggy code (`setUserId($userId)`)
- **PASS** after applying the fix (`setUserId(0)`)

### Verify on storefront

1. In BTE admin panel: make a change to any color setting, then click **Publish**
2. Verify the published row in the DB:
   ```sql
   SELECT user_id FROM breeze_theme_editor_value WHERE status_id = 2;
   -- Should return: 0
   ```
3. Clear Magento cache: `bin/magento cache:flush`
4. Reload the storefront — the published color should appear in
   `<style id="bte-theme-css-variables">` in the page source

---

## Status

| Step | Status |
|---|---|
| Root cause identified | done |
| Code fix applied (`PublishService.php`) | done |
| Schema fix applied (`db_schema.xml`) | done |
| DB FK constraint dropped (live DB) | done |
| Existing published rows corrected (`user_id 2→0`) | done |
| Missing published value inserted (theme 21, `base-color=#4FC13C`) | done (data patch) |
| Unit tests added | **pending** |
