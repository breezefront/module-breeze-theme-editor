# Issue 019: "Save (0)" and disabled Reset button after F5 in DRAFT mode

**Severity:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/css-preview-manager.js`,  
          `view/adminhtml/web/js/editor/panel/settings-editor.js`  
**Type:** Bug  
**Status:** Open

---

## Summary

After pressing F5 (page reload) in DRAFT mode, the "Save" button shows
**"Save (0)"** and the "Reset" button stays **disabled**, even though draft
changes are present and correctly restored in the panel fields.

---

## Reproduction Steps

1. Open the Theme Editor in DRAFT mode.
2. Change any field (e.g. "Body Background" to `#804545`).
   - The "Save" button shows "Save (1)" and "Reset" becomes enabled.
3. Press F5.
4. Wait for the panel to reload.

**Expected:** "Save (1)" and "Reset" enabled.  
**Actual:** "Save (0)" and "Reset" disabled, even though the field shows `#804545`.

---

## Root Cause

The bug is caused by two independent timing problems that compound each other.

### Part A — `_updateChangesCount()` fires before `syncFieldsFromChanges()`

In `settings-editor.js`, the reload sequence inside `_loadConfig().then()` is:

```
Step 1:  PanelState.init(config)            ← all fields have isDirty = false
Step 2:  self._renderSections(config)
Step 3:  self._hideLoader()
           → _updateChangesCount()          ← "Save (0)" rendered here ❌
Step 4:  self._previewReady.then(function() {
             CssPreviewManager.syncFieldsFromChanges(self.element);
             // ← PanelState.setValue() called here, but _updateChangesCount()
             //   is NOT called afterwards                               ❌
         });
```

`_updateChangesCount()` at Step 3 reads `PanelState.getChangesCount()`, which
is `0` because `syncFieldsFromChanges()` has not run yet — it runs at Step 4,
after the Promise resolves. No code ever calls `_updateChangesCount()` again
after Step 4, so the button stays at "Save (0)".

### Part B — `syncFieldsFromChanges()` uses async `require()` for `PanelState`

Even if `_updateChangesCount()` were called after `syncFieldsFromChanges()` returns,
it would still read `0` because `PanelState.setValue()` is invoked inside an
**asynchronous** AMD `require()` callback:

```js
// css-preview-manager.js — syncFieldsFromChanges(), lines 688–707 (broken)
if (sectionCode && fieldCode) {
    require([                                   // ← async AMD load
        'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
        'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers'
    ], function(PanelState, FieldHandlers) {
        PanelState.setValue(sectionCode, fieldCode, stateValue);   // fires later ❌
        FieldHandlers.updateBadges(...);
    });
}
// syncFieldsFromChanges() returns here — PanelState not yet updated
```

This async load was introduced to avoid a **circular dependency** at module
definition time:

```
field-handlers.js  →  field-handlers/base.js  →  css-preview-manager.js
                                                       ↑
                                               (back-reference)
```

At **runtime**, however, all modules have already been initialized by RequireJS,
so a synchronous `require()` call reads from cache without triggering any
circular dependency. The same pattern (sync `require()` with `try/catch`) is
already used for `_paletteManager` in `setVariable()`.

---

## Fix

### Part A — `settings-editor.js`: call `_updateChangesCount()` after sync

```js
// BEFORE (settings-editor.js, lines 497–499)
self._previewReady.then(function() {
    CssPreviewManager.syncFieldsFromChanges(self.element);
});

// AFTER
self._previewReady.then(function() {
    CssPreviewManager.syncFieldsFromChanges(self.element);
    self._updateChangesCount();   // ← refresh button after PanelState is updated
});
```

This requires Part B to be fixed first (sync require), otherwise
`_updateChangesCount()` still runs before `PanelState.setValue()`.

### Part B — `css-preview-manager.js`: replace async `require()` with sync

```js
// BEFORE (lines 686–707) — async, PanelState updated in future microtask
if (sectionCode && fieldCode) {
    require([
        'Swissup_BreezeThemeEditor/js/editor/panel/panel-state',
        'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers'
    ], function(PanelState, FieldHandlers) {
        var stateValue = value;
        if (typeof stateValue === 'string' && /^var\(--/.test(stateValue)) {
            stateValue = stateValue.replace(/^var\((.+)\)$/, '$1');
        }
        PanelState.setValue(sectionCode, fieldCode, stateValue);
        FieldHandlers.updateBadges($panelElement, sectionCode, fieldCode);
    });
}

// AFTER — synchronous, safe at runtime (modules already in RequireJS cache)
if (sectionCode && fieldCode) {
    try {
        var PanelState    = require('Swissup_BreezeThemeEditor/js/editor/panel/panel-state');
        var FieldHandlers = require('Swissup_BreezeThemeEditor/js/editor/panel/field-handlers');
        var stateValue = value;
        if (typeof stateValue === 'string' && /^var\(--/.test(stateValue)) {
            stateValue = stateValue.replace(/^var\((.+)\)$/, '$1');
        }
        PanelState.setValue(sectionCode, fieldCode, stateValue);
        FieldHandlers.updateBadges($panelElement, sectionCode, fieldCode);
    } catch (e) {
        log.warn('syncFieldsFromChanges: PanelState/FieldHandlers not in cache yet: ' + e);
    }
}
```

### Why sync `require()` is safe here

The circular dependency only matters during the **initial module definition
phase** (when RequireJS first evaluates each file). By the time
`syncFieldsFromChanges()` is ever called, all modules have already been defined
and instantiated. RequireJS's synchronous `require()` simply reads the
already-resolved value from its internal module registry — no re-evaluation,
no circular issue.

This is the same rationale used for the existing sync require pattern in
`setVariable()`:

```js
// css-preview-manager.js — setVariable(), existing pattern (reference)
try {
    var PaletteManager = require('Swissup_BreezeThemeEditor/js/editor/panel/palette-manager');
    ...
} catch (e) { ... }
```

---

## Affected Files

| File | Change |
|------|--------|
| `view/adminhtml/web/js/editor/panel/css-preview-manager.js` | Replace async `require([…], cb)` with sync `require()` + `try/catch` in `syncFieldsFromChanges()` (lines 686–707) |
| `view/adminhtml/web/js/editor/panel/settings-editor.js` | Add `self._updateChangesCount()` after `syncFieldsFromChanges()` in `_previewReady.then()` callback (line 499) |

**Dependency:** Part B must be applied before Part A, or Part A will have no
effect (the button would still read `0` because `PanelState.setValue()` would
still be async).

---

## Tests

Covered by `view/adminhtml/web/js/test/tests/sync-fields-from-changes-test.js`:

| Test | Layer | What it verifies |
|------|-------|-----------------|
| 5 | PanelState isolated | `PanelState.getChangesCount() > 0` after `setValue()` is called |
| 6 | PanelState isolated | `var(--x)` value normalized to `--x` before `setValue()` |
| 7 | PanelState isolated | `getChangesCount()` reflects exact number of synced fields |
| 9 | Integration | Real `syncFieldsFromChanges()` on synthetic DOM → `getChangesCount() > 0` |

---

## How to Verify Manually

1. Open Theme Editor in DRAFT mode.
2. Change "Body Background" to `#804545` — "Save (1)" and "Reset" enabled.
3. Press F5 and wait for the panel to reload.
4. **Pass:** "Save (1)" and "Reset" enabled.  
   **Fail:** "Save (0)" and "Reset" disabled.
