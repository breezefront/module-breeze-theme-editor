# Architecture Discussion: BreezeThemeEditorFieldParams God Object — Union Types vs Kitchen Sink

## Problem

`BreezeThemeEditorFieldParams` has become a "God Object" — a single type that
accumulates optional fields for every possible field type:

```graphql
type BreezeThemeEditorFieldParams {
    # range
    min: String
    max: String
    step: String
    unit: String
    # font_picker
    fontWeights: [String!]
    options: [BreezeThemeEditorFieldOption!]
    # file_upload
    allowedExtensions: [String!]
    maxFileSize: Int
    # select
    platforms: [String!]
    maxItems: Int
    sides: [String!]
    # ...
}
```

Each field type uses ~20% of this type. The rest are always `null`.
This is a classic GraphQL anti-pattern — `params` is polymorphic by nature,
but modeled as a flat, nullable-everything type.

---

## Option A — Union Types (Architecturally Correct)

```graphql
union BreezeThemeEditorFieldParams =
    BreezeThemeEditorRangeParams |
    BreezeThemeEditorSelectParams |
    BreezeThemeEditorFontPickerParams |
    BreezeThemeEditorFileUploadParams

type BreezeThemeEditorRangeParams {
    min: String
    max: String
    step: String
    unit: String
}

type BreezeThemeEditorFontPickerParams {
    options: [BreezeThemeEditorFieldOption!]
    fontWeights: [String!]
}

type BreezeThemeEditorSelectParams {
    options: [BreezeThemeEditorFieldOption!]
    maxItems: Int
    platforms: [String!]
}
```

Querying with inline fragments:

```graphql
params {
    ... on BreezeThemeEditorRangeParams { min max step unit }
    ... on BreezeThemeEditorFontPickerParams { options { value label } fontWeights }
}
```

**Pros:** Each field type has an explicit contract. New params don't pollute
unrelated types.

**Cons:** Breaking change — all existing GraphQL queries need fragment updates.
More PHP (`formatParams()` returns different types). More types in schema.

---

## Option B — Keep Kitchen Sink (Pragmatic)

Leave the type as-is. Used by Meta, GitHub, Shopify for internal/semi-internal
types. Acceptable if `params` is never a public API and field types are stable.

---

## Trade-off Summary

|                        | Union Types         | Kitchen Sink          |
|------------------------|---------------------|-----------------------|
| Architectural clarity  | ✅                  | ⚠️                   |
| Scope of change        | Large (all queries) | Minimal               |
| Extensibility          | ✅ Scales well      | ❌ Degrades over time |
| Breaking change        | Yes                 | No                    |

---

## Question

Should we refactor to Union Types now, or treat the current approach as
intentional technical debt?

If there are plans to grow the API publicly or add more field types —
refactoring now makes sense. If this is a stable internal editor — kitchen
sink is acceptable.
