# Issue: Missing Test Coverage

**Severity:** Medium  
**Area:** Multiple  
**Type:** Testing gap

---

## Overview

The module has good unit test coverage for its core data-transformation logic
(~290 test methods), but many classes involved in business logic, GraphQL
resolution, and utilities have no tests at all.

---

## PHP — Untested Classes (by risk)

### High risk (complex logic, mutations, no tests)

| Class | Why risky | Status |
|---|---|---|
| `Model/Service/PublishService.php` | Orchestrates publish/rollback — most critical mutation path | ✅ Covered (`PublishServiceTest.php`, 10 tests) |
| `Model/Service/CssGenerator.php` | Complex CSS output logic; 17 existing tests but selector/palette combinations may be incomplete | ✅ Covered (`CssGeneratorTest.php`, 36 tests) |
| `Model/Service/ValidationService.php` | Input validation — no test means invalid inputs may silently pass | ✅ Covered (`ValidationServiceTest.php`, 16 tests) |
| `Model/Resolver/Mutation/SaveValues.php` | Bulk save — common operation, no test | ✅ Covered (`SaveValuesTest.php`, 8 tests) |
| `Model/Resolver/Mutation/Publish.php` | Most visible user action, no test | ✅ Covered (`PublishTest.php`, 10 tests) |
| `Model/Resolver/Mutation/Rollback.php` | Destructive operation, no test | ✅ Covered (`RollbackTest.php`, 8 tests) |
| `ViewModel/AdminToolbar.php` | 515 lines, complex config assembly, no test | ⚠️ Partially deferred — most methods are thin delegation; only `getCurrentPageId()`, `getScopeSelectorData()`, `getThemeId()` have real branching logic worth testing |

### Medium risk

| Class | Notes |
|---|---|
| `Model/Resolver/Mutation/ApplyPreset.php` | — |
| `Model/Resolver/Mutation/CopyFromStore.php` | — |
| `Model/Resolver/Mutation/DiscardDraft.php` | — |
| `Model/Resolver/Mutation/ImportSettings.php` | — |
| `Model/Resolver/Mutation/ResetToDefaults.php` | — |
| `Model/Resolver/Query/Compare.php` | — |
| `Model/Resolver/Query/ConfigFromPublication.php` | — |
| `Model/Resolver/Query/Publication.php` | — |
| `Model/Resolver/Query/Publications.php` | — |
| `Model/Utility/ThemeResolver.php` | Called on every request |
| `Model/Utility/UserResolver.php` | ACL/auth logic |
| `Model/Utility/AdminUserLoader.php` | — |
| `Plugin/GraphQL/AclAuthorization.php` | ACL enforcement plugin |

### Low risk (thin classes / providers)

`AdminPageUrlProvider`, `FrontendPageUrlProvider`, `PageUrlProvider`,
`StoreDataProvider`, `StatusProvider`, `CompareProvider`,
all Controllers, all Observers.

---

## JS — Untested Modules (by risk)

| Module | Why risky |
|---|---|
| `graphql/client.js` | All GraphQL I/O (Bearer token auth, retry, error handling) |
| `editor/toolbar.js` | Top-level coordinator (~950 lines), no test |
| `editor/panel/settings-editor.js` | Main panel widget (~947 lines), no test |
| `editor/panel/css-preview-manager.js` | Live CSS preview — user-visible |
| `editor/panel/field-handler.js` / `field-handlers.js` | Field value change dispatch |
| `editor/panel/preset-selector.js` | Preset application |
| `editor/panel/panel-state.js` | Panel open/close/navigation state |
| `editor/utils/ui/error-handler.js` | All user-facing error messages |
| `editor/utils/core/logger.js` | — |
| All `graphql/queries/*.js` | GraphQL query wrappers |
| All `graphql/mutations/*.js` | GraphQL mutation wrappers |

### Already tested (JS)

`font-palette-manager-test.js`, `font-palette-section-renderer-test.js`,
`font-picker-test.js`, plus color-related utilities.

---

## Suggested Priority Order

1. `PublishService` — highest business impact, most complex
2. `CssGenerator` — add edge case tests (multiple selectors, palette references, `css_var` fallback)
3. `graphql/client.js` — foundation of all GraphQL communication
4. `Plugin/GraphQL/AclAuthorization.php` — ACL enforcement
5. `ValidationService` — input validation confidence
6. `ViewModel/AdminToolbar` — large class, feeds initial JS config
