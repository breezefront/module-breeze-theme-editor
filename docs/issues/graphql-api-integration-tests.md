# Issue: No Integration Tests for Core API Workflows

**Severity:** Medium  
**Area:** `Test/GraphQl/`, GraphQL API  
**Type:** Testing gap / Plan

---

## Problem

All 28 PHP test files live under `Test/Unit/` and mock every dependency via
PHPUnit mock objects. This means no test ever:

- Touches the real database
- Goes through the Magento GraphQL stack (ACL plugin, resolver chain)
- Exercises the `saveValues → compare → publish → discard` lifecycle as a whole

The existing `tests/test-graphql-auth.sh` is interactive (requires manual
token input) and covers only authentication — not business workflows.

---

## Why Unit Tests Are Not Enough

| What unit tests miss | Real-world consequence |
|---|---|
| GraphQL middleware (ACL plugin) | A misconfigured `di.xml` could silently bypass auth |
| DB schema / migration issues | `Value::saveMultiple()` may fail on schema change |
| Cross-resolver state | `hasUnpublishedChanges` computed in `Config.php` depends on `CompareProvider` + real DB rows |
| `discardBreezeThemeEditorDraft` → `compare` consistency | Discard could leave orphaned rows undetected |
| `publications` pagination | `total_count` off-by-one not catchable without real data |

---

## Plan

### Target file

```
Test/GraphQl/ThemeEditorWorkflowTest.php
```

No fixture PHP files needed — the test cleans up via API in `tearDown()`.

---

### Test class structure

```
Swissup\BreezeThemeEditor\Test\GraphQl\ThemeEditorWorkflowTest
  extends Magento\TestFramework\TestCase\GraphQlAbstract
```

**`setUpBeforeClass()`** — runs once before the suite:

1. Use `Bootstrap::getObjectManager()->get(ThemeResolver::class)` to iterate
   all stores and find the first where `getThemeIdByStoreId()` returns a non-zero
   value (i.e., a store that has a Breeze Evolution theme assigned with
   `etc/theme_editor/settings.json`).
2. Call `breezeThemeEditorConfig(storeId)` and pick the first non-`HEADING`
   field — store its `sectionCode`, `fieldCode`, current `value`, and a
   safe test value to write.
3. Fail the whole suite with a clear message if no Breeze store is found
   (`markTestSkipped()`).

**`tearDown()`** — after every test:

```graphql
mutation {
  discardBreezeThemeEditorDraft(storeId: $storeId) {
    success
    discardedCount
  }
}
```

Wrapped in try/catch so a missing draft never causes a tearDown failure.

---

### 6 test methods

#### 1. `testGetConfigReturnsExpectedStructure`

Scenario: load config for the discovered store, inspect the response shape.

```graphql
query {
  breezeThemeEditorConfig(storeId: $storeId, status: DRAFT) {
    version
    sections { code label fields { code type } }
    metadata { themeId hasUnpublishedChanges draftChangesCount }
  }
}
```

Assertions:
- `sections` is non-empty
- `metadata.themeId` matches the discovered theme
- `metadata.hasUnpublishedChanges` is `false` (clean state)

---

#### 2. `testSaveValuesToDraftSetsUnpublishedFlag`

Scenario: save one field value to DRAFT, then reload config.

```graphql
mutation {
  saveBreezeThemeEditorValues(input: {
    storeId: $storeId
    status: DRAFT
    values: [{ sectionCode: $sc, fieldCode: $fc, value: $testValue }]
  }) {
    success
    values { fieldCode value isModified }
  }
}
```

Assertions after save:
- `success: true`
- `values[0].isModified: true`

Assertions on re-fetched config:
- `metadata.hasUnpublishedChanges: true`
- `metadata.draftChangesCount >= 1`

---

#### 3. `testDiscardDraftClearsUnpublishedFlag`

Scenario: save → discard → verify clean state.

Mutation:
```graphql
mutation {
  discardBreezeThemeEditorDraft(storeId: $storeId) {
    success
    discardedCount
  }
}
```

Assertions:
- `success: true`
- `discardedCount >= 1`
- Config after discard: `metadata.hasUnpublishedChanges: false`
- Config after discard: `metadata.draftChangesCount: 0`

---

#### 4. `testPublishDraftCreatesPublication`

Scenario: save → publish → verify publication created and draft is gone.

```graphql
mutation {
  publishBreezeThemeEditor(input: {
    storeId: $storeId
    title: "Integration Test Publication"
  }) {
    success
    publication {
      publicationId
      title
      changesCount
      isRollback
    }
  }
}
```

Assertions:
- `success: true`
- `publication.publicationId` is not null and > 0
- `publication.changesCount >= 1`
- `publication.isRollback: false`
- Config after publish: `metadata.hasUnpublishedChanges: false`

---

#### 5. `testPublicationsListContainsNewPublication`

Scenario: publish with a unique title → query publications list → find the new entry.

```graphql
query {
  breezeThemeEditorPublications(storeId: $storeId, pageSize: 5, currentPage: 1) {
    total_count
    items {
      publicationId
      title
      publishedAt
      changesCount
    }
    page_info { current_page page_size total_pages }
  }
}
```

Assertions:
- `total_count >= 1`
- The list contains an item whose `publicationId` matches the one returned
  by `publishBreezeThemeEditor`
- That item's `title` matches exactly what was passed to the mutation
- `publishedAt` is not null

---

#### 6. `testFullWorkflow`

Scenario: the complete lifecycle in one test — verify state after each step.

Steps and assertions:

| Step | Mutation / Query | Assert |
|---|---|---|
| 0. Initial config | `breezeThemeEditorConfig` | `hasUnpublishedChanges: false` |
| 1. Save to draft | `saveBreezeThemeEditorValues` | `success: true` |
| 2. Config after save | `breezeThemeEditorConfig` | `hasUnpublishedChanges: true`, `draftChangesCount: 1` |
| 3. Publish | `publishBreezeThemeEditor` | `success: true`, `publicationId > 0` |
| 4. Config after publish | `breezeThemeEditorConfig` | `hasUnpublishedChanges: false` |
| 5. Publications list | `breezeThemeEditorPublications` | new publication visible in list |

---

### Running the tests

```bash
cd /path/to/magento
php vendor/bin/phpunit \
  -c dev/tests/api-functional/phpunit.xml \
  vendor/swissup/module-breeze-theme-editor/Test/GraphQl/ThemeEditorWorkflowTest.php
```

Required environment variables (set in `phpunit.xml` or shell):

```
TESTS_BASE_URL=http://magento248.local
MAGENTO_ADMIN_USERNAME=admin
MAGENTO_ADMIN_PASSWORD=<password>
```

---

## Execution Steps

- [ ] 1. Create `Test/GraphQl/ThemeEditorWorkflowTest.php` with the class skeleton
- [ ] 2. Implement `setUpBeforeClass()` — store + field discovery via `ThemeResolver`
- [ ] 3. Implement `tearDown()` — `discardBreezeThemeEditorDraft` cleanup
- [ ] 4. Implement `testGetConfigReturnsExpectedStructure`
- [ ] 5. Implement `testSaveValuesToDraftSetsUnpublishedFlag`
- [ ] 6. Implement `testDiscardDraftClearsUnpublishedFlag`
- [ ] 7. Implement `testPublishDraftCreatesPublication`
- [ ] 8. Implement `testPublicationsListContainsNewPublication`
- [ ] 9. Implement `testFullWorkflow`
- [ ] 10. Run against `magento248.local` and fix any failures
- [ ] 11. Delete this issue file

---

## Success Criteria

- All 6 tests pass on a clean `magento248.local` instance with at least one
  store that has Breeze Evolution theme assigned
- `tearDown()` reliably leaves the DB in a clean state (no leaked draft rows)
- Tests are skipped (not failed) when no Breeze store is found
- No hardcoded `storeId` or `themeId` — values are always discovered at runtime
