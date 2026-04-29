# Multi-Scope Support

Settings can be saved at three levels — **Default / Website / Store View** — following the same inheritance model as Magento's `core_config_data`.

---

## Scope Levels

| Scope | `scope` value | `scopeId` |
|---|---|---|
| All Store Views | `default` | `0` |
| Website | `websites` | website ID |
| Store View | `stores` | store view ID |

---

## Inheritance Chain

When reading settings for a store view, values are resolved in this order (lower entries override higher ones):

1. `scope='default', scopeId=0` — global defaults
2. `scope='websites', scopeId=W` — website-level overrides
3. `scope='stores', scopeId=X` — store view-level overrides (highest priority)

Writing always saves to the exact scope selected — no cascade.

---

## Database Schema

Both `breeze_theme_editor_value` and `breeze_theme_editor_publication` tables have a `scope VARCHAR(16) NOT NULL` column alongside `store_id` (which holds the `scopeId`).

This approach — identical to `core_config_data` — is required because MySQL `UNIQUE` constraints treat `NULL != NULL`, making nullable columns unsuitable for a unique index at the default scope.

```
scope='default'  → store_id = 0
scope='websites' → store_id = website_id
scope='stores'   → store_id = store_view_id
```

---

## GraphQL API

All queries and mutations use `scope` + `scopeId` instead of a plain `storeId`:

```graphql
enum BreezeThemeEditorScopeCode {
    default
    websites
    stores
}

# Example query
query {
    breezeThemeEditorConfig(scope: stores, scopeId: 1) {
        sections { ... }
    }
}

# Example mutation
mutation {
    saveBreezeThemeEditorValues(input: {
        scope: websites
        scopeId: 2
        values: [...]
    }) { ... }
}
```

### `CopyFromStore` mutation

```graphql
mutation {
    copyBreezeThemeEditorFromStore(input: {
        fromScope: stores
        fromScopeId: 1
        toScope: websites
        toScopeId: 2
    }) { ... }
}
```

---

## Iframe Preview

When **Default** or **Website** scope is selected, the live preview iframe loads the first active store view of that level — but all save/load GraphQL calls use the selected scope.
