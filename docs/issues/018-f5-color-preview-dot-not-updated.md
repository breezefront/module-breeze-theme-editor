# Issue 018: Color preview dot not updated after F5 in DRAFT mode

**Severity:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/css-preview-manager.js`  
**Type:** Bug  
**Status:** Closed — `6b186d9`

---

## Summary

After pressing F5 (page reload) in DRAFT mode, draft color values are correctly
restored from `localStorage` into the text input (`.bte-color-input`), but the
color preview dot (`.bte-color-preview`) keeps showing the old server-saved
color instead of the draft value.

---

## Reproduction Steps

1. Open the Theme Editor in DRAFT mode.
2. Change a color field (e.g. "Body Background") to `#804545`.
   - The preview dot turns dark red immediately.
3. Press F5.
4. Wait for the panel to reload.

**Expected:** preview dot shows `#804545`.  
**Actual:** preview dot shows the old server-saved color (e.g. `#ffffff`), while
the text input correctly shows `#804545`.

---

## Root Cause

`syncFieldsFromChanges()` in `css-preview-manager.js` (line 657) contains this
branch that is supposed to update color fields after reload:

```js
// css-preview-manager.js — syncFieldsFromChanges(), line 657 (broken)
if ($field.attr('type') === 'color') {
    $field.val(displayValue);
    var $textInput = $field.closest('.bte-field-control').find('.bte-color-input');
    if ($textInput.length) {
        $textInput.val(displayValue);
    }
}
```

The selector `$('[data-property="--body-bg"]')` matches **two** elements
(both the trigger div and the text input share the same `data-property`
attribute — see the template below):

| Index | Element | `type` attr | `data-type` attr |
|-------|---------|-------------|-----------------|
| `[0]` | `div.bte-color-trigger` | *(none)* | `color` |
| `[1]` | `input.bte-color-input` | `text` | `color` |

`$field.attr('type')` reads the **first matched element** (`[0]`, the `div`),
which has no `type` attribute → returns `undefined`.  
`undefined === 'color'` is `false`, so the code falls to the `else` branch:

```js
} else {
    $field.val(displayValue);  // jQuery setter on both elements:
                               //   div.val()  → no-op         ✅ (harmless)
                               //   input.val() → sets text     ✅
}
```

The text input gets updated because jQuery's `.val()` setter runs on all elements
in the collection. However, **`.bte-color-preview`'s `background-color` is never
touched** — the preview dot stays at the old color.

The fix is to use `fieldType === 'color'`, which reads `data-type` via
`$field.data('type')` (already computed on line 614) and correctly
returns `'color'` from the first matched element.

---

## DOM Structure

From `view/adminhtml/web/template/editor/panel/fields/color.html`:

```html
<div class="bte-field-control">
  <div class="bte-color-picker-wrapper">

    <!-- [0] matched by $('[data-property="--body-bg"]') -->
    <div class="bte-color-trigger"
         data-property="--body-bg"
         data-type="color"        ← data-type IS 'color' ✅
         data-section="general"
         data-field="body_bg">
      <div class="bte-color-preview"
           style="background-color: #ffffff;">  ← must be updated ❌
      </div>
    </div>

    <!-- [1] matched by $('[data-property="--body-bg"]') -->
    <input type="text"            ← type IS 'text', not 'color' ❌
           class="bte-color-input"
           data-property="--body-bg"
           data-type="color"
           value="#ffffff"/>

  </div>
</div>
```

---

## Fix

**File:** `view/adminhtml/web/js/editor/panel/css-preview-manager.js`

Replace lines 656–665 (the color branch inside `syncFieldsFromChanges()`):

```js
// BEFORE (broken — condition never true, preview dot never updated)
if (displayValue !== null) {
    if ($field.attr('type') === 'color') {
        $field.val(displayValue);
        var $textInput = $field.closest('.bte-field-control').find('.bte-color-input');
        if ($textInput.length) {
            $textInput.val(displayValue);
        }
    } else if ($field.attr('type') === 'checkbox') {
        $field.prop('checked', value === '1' || value === true);
    } else {
        $field.val(displayValue);
        ...
    }
}
```

```js
// AFTER (fixed — uses data-type, updates both text input and preview dot)
if (displayValue !== null) {
    if (fieldType === 'color') {
        var $colorWrapper = $field.closest('.bte-field-control');
        var $textInput    = $colorWrapper.find('.bte-color-input');
        var $preview      = $colorWrapper.find('.bte-color-preview');
        if ($textInput.length) { $textInput.val(displayValue); }
        if ($preview.length)   { $preview.css('background-color', displayValue); }
    } else if ($field.attr('type') === 'checkbox') {
        $field.prop('checked', value === '1' || value === true);
    } else {
        $field.val(displayValue);
        ...
    }
}
```

`fieldType` is already assigned on line 614:

```js
var fieldType = $field.data('type');  // reads data-type="color" from div[0] ✅
```

---

## Affected Files

| File | Change |
|------|--------|
| `view/adminhtml/web/js/editor/panel/css-preview-manager.js` | Fix `syncFieldsFromChanges()` color branch: use `fieldType === 'color'`, add `$preview.css('background-color', displayValue)` |

---

## Tests

Covered by `view/adminhtml/web/js/test/tests/sync-fields-from-changes-test.js`:

| Test | Layer | What it verifies |
|------|-------|-----------------|
| 1 | Pure DOM | `.bte-color-preview` background-color set to draft value (fixed code path) |
| 2 | Pure DOM | `.bte-color-input` text value set to draft value |
| 3 | Pure DOM | Both elements updated when wrapper contains both children |
| 4 | Regression | Old `$field.attr('type') === 'color'` misses preview dot; new `fieldType === 'color'` hits it |
| 8 | Integration | Real `syncFieldsFromChanges()` on synthetic panel DOM updates `.bte-color-preview` |

---

## How to Verify Manually

1. Open Theme Editor in DRAFT mode.
2. Change "Body Background" to `#804545` — preview dot turns dark red.
3. Press F5 and wait for the panel to reload.
4. **Pass:** preview dot shows `#804545` (same dark red).  
   **Fail:** preview dot shows white or the old server-saved color.
