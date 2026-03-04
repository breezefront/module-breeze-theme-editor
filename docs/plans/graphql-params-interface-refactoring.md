# Plan: Refactor BreezeThemeEditorFieldParams to Interface + Concrete Types

**Status:** ✅ IMPLEMENTED (Phases 1–5 complete)  
**Estimated effort:** 7–9 hours + 2–3 h QA  
**Breaking change:** Yes — all GraphQL clients must update queries  
**Reference pattern:** `module-ajaxsearch` → `ItemTypeResolver` + `AjaxsearchItemInterface`  
**Decisions:** A2 (dead params — separate task), B1 (naming mismatch fixed in this PR)

## Implementation Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | `etc/schema.graphqls` — interface + 6 concrete types | ✅ Done |
| Phase 2 | `Model/Resolver/FieldParamsTypeResolver.php` — new TypeResolver | ✅ Done |
| Phase 3 | `AbstractConfigResolver::formatParams()` — match + 6 builders | ✅ Done |
| Phase 4 | JS queries — inline fragments replacing flat params block | ✅ Done |
| Phase 5 | Unit tests — updated + 2 new test files | ✅ Done |
| Phase 6 | Manual QA | ⏳ Pending |

### Key decisions made during implementation

- Empty interface confirmed working (`webonyx/graphql-php v15.20.1` installed)
- `_fieldType` underscore-prefix key confirmed stripped by Magento GraphQL serializer (not exposed to clients)
- JS renderer files (11 files: `range.js`, `font-picker.js`, etc.) — **no changes needed**: inline fragments produce the same flat JSON at runtime
- B1 fix: `allowedExtensions: [String!]` + `maxFileSize: Int` (old schema) → `acceptTypes: String` + `maxSize: Int` (new schema); PHP converts `allowedExtensions` array → dot-prefixed CSV string

---

## Context

See `docs/issues/graphql-params-god-object.md` for the architectural analysis.

**Decision:** Use **interface** (not union) — this is the Magento-native polymorphism
pattern. No `di.xml` required; type resolver is registered directly in `.graphqls`
via `@typeResolver(class: "...")`.

---

## Field Type → Params Mapping

This is the proposed grouping of field types into concrete param types:

| Concrete Type | Field types | Fields |
|---|---|---|
| `BreezeThemeEditorNumericParams` | `RANGE`, `NUMBER`, `SPACING` | min, max, step, unit |
| `BreezeThemeEditorSelectParams` | `SELECT`, `ICON_SET_PICKER` | options, maxItems |
| `BreezeThemeEditorFontPickerParams` | `FONT_PICKER` | options, fontWeights, fontStylesheets |
| `BreezeThemeEditorSocialLinksParams` | `SOCIAL_LINKS` | platforms |
| `BreezeThemeEditorImageUploadParams` | `IMAGE_UPLOAD` | sides, acceptTypes, maxSize |
| `BreezeThemeEditorCodeParams` | `CODE` | language, fallback |

> Note: `COLOR`, `TEXT`, `TEXTAREA`, `CHECKBOX`, `TOGGLE`, `HEADING` → `params: null`
> (no change — PHP already returns `null` for these, line 63 and line 219 of
> `AbstractConfigResolver.php`).

---

## Phase 1 — Schema (`etc/schema.graphqls`)

**File:** `etc/schema.graphqls`  
**Lines affected:** 244, 257–277

### 1.1 — Change the `params` field type on `BreezeThemeEditorField`

```diff
- params: BreezeThemeEditorFieldParams @doc(description: "Type-specific parameters")
+ params: BreezeThemeEditorFieldParamsInterface @doc(description: "Type-specific parameters")
```
*(line 244)*

### 1.2 — Replace the God Object type with interface + concrete types

**Remove** the entire `BreezeThemeEditorFieldParams` block (lines 257–272).

**Add** the following (after `BreezeThemeEditorFieldValidation` block):

```graphql
interface BreezeThemeEditorFieldParamsInterface
    @typeResolver(class: "Swissup\\BreezeThemeEditor\\Model\\Resolver\\FieldParamsTypeResolver")
    @doc(description: "Polymorphic params — concrete type depends on the field type") {
    # intentionally minimal — no fields common to all param types
    # Magento GraphQL allows empty interfaces (webonyx/graphql-php 15+)
}

type BreezeThemeEditorNumericParams implements BreezeThemeEditorFieldParamsInterface
    @doc(description: "Params for RANGE, NUMBER, SPACING field types") {
    min: Float
    max: Float
    step: Float
    unit: String
}

type BreezeThemeEditorSelectParams implements BreezeThemeEditorFieldParamsInterface
    @doc(description: "Params for SELECT, ICON_SET_PICKER field types") {
    options: [BreezeThemeEditorFieldOption!]
    maxItems: Int
}

type BreezeThemeEditorFontPickerParams implements BreezeThemeEditorFieldParamsInterface
    @doc(description: "Params for FONT_PICKER field type") {
    options: [BreezeThemeEditorFieldOption!]
    fontWeights: [String!]
    fontStylesheets: [BreezeThemeEditorFontStylesheet]
}

type BreezeThemeEditorSocialLinksParams implements BreezeThemeEditorFieldParamsInterface
    @doc(description: "Params for SOCIAL_LINKS field type") {
    platforms: [String!]
}

type BreezeThemeEditorImageUploadParams implements BreezeThemeEditorFieldParamsInterface
    @doc(description: "Params for IMAGE_UPLOAD field type") {
    sides: [String!]
    acceptTypes: String @doc(description: "MIME type filter, e.g. 'image/*'")
    maxSize: Int @doc(description: "Max file size in KB")
}

type BreezeThemeEditorCodeParams implements BreezeThemeEditorFieldParamsInterface
    @doc(description: "Params for CODE field type") {
    language: String
    fallback: String
}
```

Keep `BreezeThemeEditorFontStylesheet` and `BreezeThemeEditorFieldOption` types
unchanged.

> **Risk note:** If the Magento version in use ships `webonyx/graphql-php < 15`,
> the empty interface may throw. In that case, add a sentinel field:
> `fieldType: String @doc(description: "Internal — mirrors the parent field type")`
> to the interface and emit it from `formatParams()`.

---

## Phase 2 — New PHP File: `FieldParamsTypeResolver`

**File to create:** `Model/Resolver/FieldParamsTypeResolver.php`  
**Pattern:** mirrors `module-ajaxsearch/Model/Resolver/ItemTypeResolver.php`

```php
<?php

declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Query\Resolver\TypeResolverInterface;

class FieldParamsTypeResolver implements TypeResolverInterface
{
    private const TYPE_MAP = [
        'range'           => 'BreezeThemeEditorNumericParams',
        'number'          => 'BreezeThemeEditorNumericParams',
        'spacing'         => 'BreezeThemeEditorNumericParams',
        'select'          => 'BreezeThemeEditorSelectParams',
        'icon_set_picker' => 'BreezeThemeEditorSelectParams',
        'font_picker'     => 'BreezeThemeEditorFontPickerParams',
        'social_links'    => 'BreezeThemeEditorSocialLinksParams',
        'image_upload'    => 'BreezeThemeEditorImageUploadParams',
        'code'            => 'BreezeThemeEditorCodeParams',
    ];

    public function resolveType(array $data): string
    {
        $type = strtolower($data['_fieldType'] ?? '');

        return self::TYPE_MAP[$type]
            ?? throw new \LogicException(
                sprintf('No GraphQL params type registered for field type "%s"', $type)
            );
    }
}
```

> **Note:** `_fieldType` is a private key (underscore prefix) injected by
> `formatParams()` in Phase 3. It is not a GraphQL field — Magento strips
> underscore-prefixed keys before serialization.

---

## Phase 3 — Update PHP: `formatParams()` in `AbstractConfigResolver`

**File:** `Model/Resolver/Query/AbstractConfigResolver.php`  
**Method:** `formatParams()` lines 165–220

### 3.1 — Pass field `type` into `formatParams()`

The method currently receives `$setting` which contains `$setting['type']`.
No signature change needed — `$setting['type']` is already available (line 85
shows `strtoupper($setting['type'])` used elsewhere).

### 3.2 — Add `_fieldType` key and split by type

Replace the flat accumulator with a type-aware builder:

```php
protected function formatParams(array $setting): ?array
{
    $type = strtolower($setting['type'] ?? '');
    $params = match (true) {
        in_array($type, ['range', 'number', 'spacing']) => $this->buildNumericParams($setting),
        in_array($type, ['select', 'icon_set_picker'])  => $this->buildSelectParams($setting),
        $type === 'font_picker'                         => $this->buildFontPickerParams($setting),
        $type === 'social_links'                        => $this->buildSocialLinksParams($setting),
        $type === 'image_upload'                        => $this->buildImageUploadParams($setting),
        $type === 'code'                                => $this->buildCodeParams($setting),
        default                                         => [],
    };

    if (empty($params)) {
        return null;
    }

    // _fieldType drives FieldParamsTypeResolver::resolveType() — not a GraphQL field
    $params['_fieldType'] = $type;

    return $params;
}
```

### 3.3 — Private builder methods (replace the old flat logic)

```php
private function buildNumericParams(array $s): array
{
    $p = [];
    if (isset($s['min']))  { $p['min']  = (float)$s['min']; }
    if (isset($s['max']))  { $p['max']  = (float)$s['max']; }
    if (isset($s['step'])) { $p['step'] = (float)$s['step']; }
    if (isset($s['unit'])) { $p['unit'] = $s['unit']; }
    return $p;
}

private function buildSelectParams(array $s): array
{
    $p = [];
    if (isset($s['options']))  { $p['options']  = $this->formatOptions($s['options']); }
    if (isset($s['maxItems'])) { $p['maxItems'] = $s['maxItems']; }
    return $p;
}

private function buildFontPickerParams(array $s): array
{
    $p = [];
    if (isset($s['options'])) {
        $p['options'] = $this->formatOptions($s['options']);
        $stylesheets = [];
        foreach ($s['options'] as $option) {
            if (!empty($option['url'])) {
                $stylesheets[] = ['value' => $option['value'], 'url' => $option['url']];
            }
        }
        if (!empty($stylesheets)) {
            $p['fontStylesheets'] = $stylesheets;
        }
    }
    if (isset($s['fontWeights'])) { $p['fontWeights'] = $s['fontWeights']; }
    return $p;
}

private function buildSocialLinksParams(array $s): array
{
    $p = [];
    if (isset($s['platforms'])) { $p['platforms'] = $s['platforms']; }
    return $p;
}

private function buildImageUploadParams(array $s): array
{
    $p = [];
    if (isset($s['sides']))              { $p['sides']      = $s['sides']; }
    if (isset($s['allowedExtensions'])) {
        // map extension list → MIME string expected by image-upload.js
        $p['acceptTypes'] = implode(',', array_map(
            fn($ext) => '.' . ltrim($ext, '.'),
            $s['allowedExtensions']
        ));
    }
    if (isset($s['maxFileSize'])) { $p['maxSize'] = $s['maxFileSize']; }
    return $p;
}

private function buildCodeParams(array $s): array
{
    $p = [];
    if (isset($s['language'])) { $p['language'] = $s['language']; }
    if (isset($s['fallback']))  { $p['fallback']  = $s['fallback']; }
    return $p;
}
```

---

## Phase 4 — JS GraphQL Queries (2 files)

Both files have an identical `params { ... }` block. Replace with inline fragments.

### 4.1 `view/adminhtml/web/js/graphql/queries/get-config.js`
Lines 51–74 — replace:

```diff
- params {
-     min
-     max
-     step
-     unit
-     options {
-         label
-         value
-         icon
-         preview
-     }
-     language
-     fallback
-     fontWeights
-     fontStylesheets {
-         value
-         url
-     }
-     platforms
-     maxItems
-     allowedExtensions
-     maxFileSize
-     sides
- }
+ params {
+     __typename
+     ... on BreezeThemeEditorNumericParams { min max step unit }
+     ... on BreezeThemeEditorSelectParams {
+         options { label value icon preview }
+         maxItems
+     }
+     ... on BreezeThemeEditorFontPickerParams {
+         options { label value icon preview }
+         fontWeights
+         fontStylesheets { value url }
+     }
+     ... on BreezeThemeEditorSocialLinksParams { platforms }
+     ... on BreezeThemeEditorImageUploadParams { sides acceptTypes maxSize }
+     ... on BreezeThemeEditorCodeParams { language fallback }
+ }
```

### 4.2 `view/adminhtml/web/js/graphql/queries/get-config-from-publication.js`
Lines 43–66 — identical replacement as above.

> **JS consumers (11 renderer files) — NO changes needed.**
> Inline fragments produce the same flat JSON at runtime: `params.min`,
> `params.fontWeights`, etc. are still accessed the same way by the renderers.
> The `__typename` field is ignored by renderers.

---

## Phase 5 — Unit Tests

**File:** `Test/Unit/Model/Resolver/Query/AbstractConfigResolverFontStylesheetsTest.php`  
(313 lines, 5 test methods all `@covers formatParams`)

### 5.1 — All 5 test methods need `_fieldType` key added to assertions

Every `formatParams()` call in tests now also sets `$setting['type']` (must be
`'font_picker'` since all current tests cover font stylesheet logic) and all
expected `$params` arrays must include `'_fieldType' => 'font_picker'`.

### 5.2 — Add new test file for each builder method

Recommended: `Test/Unit/Model/Resolver/Query/AbstractConfigResolverParamsTest.php`

Cover at minimum:
- `buildNumericParams`: range, number, spacing (partial keys OK)
- `buildSelectParams`: with/without options and maxItems
- `buildFontPickerParams`: with/without fontStylesheets
- `buildSocialLinksParams`: with/without platforms
- `buildImageUploadParams`: allowedExtensions → acceptTypes conversion
- `buildCodeParams`: language + fallback
- `formatParams` returns `null` for types with no params (e.g., `color`, `text`)

### 5.3 — Add test for `FieldParamsTypeResolver`

New file: `Test/Unit/Model/Resolver/FieldParamsTypeResolverTest.php`

Cover:
- All known types resolve to correct GraphQL type name
- Unknown type throws `\LogicException`

---

## Phase 6 — Manual QA Checklist

After implementation, verify in the browser UI:

- [ ] `RANGE` field shows min/max/step sliders correctly
- [ ] `NUMBER` field respects min/max/unit
- [ ] `SPACING` field renders with unit switcher (px/rem/em/%)
- [ ] `SELECT` field renders options list
- [ ] `ICON_SET_PICKER` renders icon options
- [ ] `FONT_PICKER` renders font options + loads external stylesheets
- [ ] `SOCIAL_LINKS` shows correct platform icons
- [ ] `IMAGE_UPLOAD` respects acceptTypes and maxSize validation
- [ ] `CODE` field sets correct language mode
- [ ] `COLOR`, `TEXT`, `HEADING` — `params` is `null`, no errors in GraphQL response
- [ ] GraphQL Playground: `__typename` on `params` returns correct concrete type

---

## File Change Summary

| File | Action | Est. time |
|---|---|---|
| `etc/schema.graphqls` | Modify (lines 244, 257–277) | 30 min |
| `Model/Resolver/FieldParamsTypeResolver.php` | **Create new** | 30 min |
| `Model/Resolver/Query/AbstractConfigResolver.php` | Modify `formatParams()` + add 6 private methods | 2–3 h |
| `view/adminhtml/web/js/graphql/queries/get-config.js` | Modify params block | 20 min |
| `view/adminhtml/web/js/graphql/queries/get-config-from-publication.js` | Modify params block | 20 min |
| `Test/Unit/Model/Resolver/Query/AbstractConfigResolverFontStylesheetsTest.php` | Modify 5 tests | 1 h |
| `Test/Unit/Model/Resolver/Query/AbstractConfigResolverParamsTest.php` | **Create new** | 1.5 h |
| `Test/Unit/Model/Resolver/FieldParamsTypeResolverTest.php` | **Create new** | 1 h |

**Total code files touched: 8** (3 new, 5 modified)  
**Total estimated time: 7–9 hours** (+ 2–3 h QA)

---

## Open Questions Before Starting

1. **Empty interface:** Verify that the installed `webonyx/graphql-php` version
   supports empty interfaces. Run:
   ```bash
   composer show webonyx/graphql-php | grep versions
   ```
   If `< 15.0`, add a sentinel field `fieldType: String` to the interface and
   emit it from `formatParams()`.

2. **`_fieldType` stripping:** Confirm that Magento's GraphQL serialization
   strips keys not declared in the schema (underscore-prefix convention from
   `module-ajaxsearch` confirms this, but worth verifying for interface types).

---

## Out of Scope (separate tasks)

The following params exist in JS renderers but have no supply chain (PHP never
emits them, schema never defines them). Each needs individual analysis before
adding — some may be removed entirely:

| Param | Renderer | Current default |
|---|---|---|
| `params.allowedUnits` | `spacing.js:18` | `['px','rem','em','%']` |
| `params.linkedByDefault` | `spacing.js:22` | `true` |
| `params.schemes` | `color-scheme.js:14` | 3 hardcoded schemes |
| `params.addButtonLabel` | `repeater.js:21` | `'Add Item'` |
| `params.itemLabel` | `repeater.js:22` | `'Item'` |
| `params.collapsible` | `repeater.js:23` | `true` |
| `params.sortable` | `repeater.js:24` | `true` |
