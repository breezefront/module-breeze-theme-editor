# PHP-Only Settings: Live Preview via iframe Reload

Live preview for settings that have no `property` (CSS variable) — value is
consumed only by PHP templates via `$breezeThemeEditor->get()`.

Because the iframe is already rendered by PHP, a CSS injection cannot update
these values. Instead, the editor reloads the iframe after a debounce delay
(Shopify-style), passing the pending values through a JS-writable cookie that
PHP reads during the request.

---

## Architecture

```
User changes PHP-only field (no `property`)
    ↓
base.js: detects missing property → routes to PhpPreviewManager
    ↓
PhpPreviewManager.scheduleReload(section, field, value)
    ├── stores value in pendingChanges{}
    ├── writes pendingChanges to cookie `bte_php_preview` (JSON)
    ├── shows spinner overlay on iframe
    └── debounce 800ms → _executeReload()
            ↓
        iframeWindow.location.href = currentUrl (soft reload)
            ↓
        iframe `load` event fires
            ↓
        spinner hidden + CssPreviewManager.recreateLivePreviewStyle()
            (restores CSS var live-preview on top of reloaded page)

PHP side (every request in preview context):
    BreezeThemeEditorReader::get($path)
        ├── reads $_COOKIE['bte_php_preview'] (JSON)
        ├── if override exists for $path → return override value
        └── else → normal DB / default lookup
```

---

## Cookie: `bte_php_preview`

| Property  | Value |
|-----------|-------|
| Name      | `bte_php_preview` |
| Value     | JSON: `{"section/field": "value", ...}` |
| Scope     | JS-writable (`HttpOnly: false`) |
| SameSite  | `Lax` |
| Path      | `/` |
| Expiry    | Session (no `max-age`) |
| Written by | `PhpPreviewManager.js` |
| Read by   | `BreezeThemeEditorReader::get()` |

The cookie is cleared when:
- The editor panel is closed / page unloaded
- Draft is discarded
- Settings are published (overrides no longer needed)

---

## Files to Create / Modify

### New files

| File | Purpose |
|------|---------|
| `view/adminhtml/web/js/editor/panel/php-preview-manager.js` | Debounce, cookie write, iframe reload, spinner |

### Modified files

| File | Change |
|------|--------|
| `view/adminhtml/web/js/editor/panel/field-handlers/base.js` | Detect PHP-only field; route to `PhpPreviewManager` instead of `CssPreviewManager` |
| `Model/BreezeThemeEditorReader.php` (or `BreezeThemeEditor.php`) | Read `bte_php_preview` cookie in `get()` before DB lookup |
| `view/adminhtml/web/css/source/_editor.less` | Spinner/overlay styles for iframe during reload |

---

## JS: `php-preview-manager.js`

```js
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/iframe-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/bsync'
], function ($, CssPreviewManager, IframeHelper, Bsync) {

    var COOKIE_NAME = 'bte_php_preview';
    var DEBOUNCE_MS = 800;
    var pendingChanges = {};  // { 'section/field': 'value' }
    var debounceTimer  = null;
    var $spinner       = null;

    return {
        /**
         * Called from base.js when a PHP-only field changes.
         * Accumulates changes and schedules a debounced iframe reload.
         *
         * @param {string} sectionCode
         * @param {string} fieldCode
         * @param {string} value
         */
        scheduleReload: function (sectionCode, fieldCode, value) {
            pendingChanges[sectionCode + '/' + fieldCode] = value;
            this._writeCookie();
            this._showSpinner();

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(this._executeReload.bind(this), DEBOUNCE_MS);
        },

        /**
         * Write all pending overrides to the JS-writable cookie.
         */
        _writeCookie: function () {
            var json = JSON.stringify(pendingChanges);
            document.cookie = COOKIE_NAME + '=' +
                encodeURIComponent(json) +
                '; path=/; SameSite=Lax';
        },

        /**
         * Reload iframe at current URL. After load: hide spinner + restore CSS vars.
         */
        _executeReload: function () {
            var iframeWin = IframeHelper.getWindow();
            if (!iframeWin) { return; }

            var currentUrl = iframeWin.location.href;

            // Re-attach one-time load handler before triggering reload
            var $iframe = $('#bte-iframe');
            $iframe.one('load.bte-php-preview', function () {
                // Give css-manager time to fire bte:cssManagerReady
                Bsync.delay(200).then(function () {
                    CssPreviewManager.recreateLivePreviewStyle();
                    self._hideSpinner();
                });
            });

            iframeWin.location.href = currentUrl;
        },

        _showSpinner: function () {
            if (!$spinner || !$spinner.length) {
                $spinner = $('<div class="bte-php-preview-spinner"></div>');
                $('#bte-iframe').after($spinner);
            }
            $spinner.addClass('bte-php-preview-spinner--visible');
        },

        _hideSpinner: function () {
            if ($spinner) {
                $spinner.removeClass('bte-php-preview-spinner--visible');
            }
        },

        /**
         * Clear cookie and pending state (called on discard / publish / panel close).
         */
        reset: function () {
            pendingChanges = {};
            document.cookie = COOKIE_NAME + '=; path=/; max-age=0';
            this._hideSpinner();
            clearTimeout(debounceTimer);
        }
    };
});
```

---

## JS: `base.js` change

In `handleChange()`, after extracting `fieldData`:

```js
// base.js — existing code (simplified):
handleChange: function ($input, callback, options) {
    var fieldData = this.extractFieldData($input);
    PanelState.setValue(fieldData.sectionCode, fieldData.fieldCode, fieldData.value);

    // NEW: route PHP-only fields to PhpPreviewManager
    if (!fieldData.property) {
        require(['Swissup_BreezeThemeEditor/js/editor/panel/php-preview-manager'],
            function (PhpPreviewManager) {
                PhpPreviewManager.scheduleReload(
                    fieldData.sectionCode,
                    fieldData.fieldCode,
                    fieldData.value
                );
            }
        );
    } else {
        CssPreviewManager.setVariable(
            fieldData.property, fieldData.value, fieldData.type, previewData
        );
    }

    callback(fieldData);
}
```

---

## PHP: `BreezeThemeEditorReader::get()`

```php
public function get(string $path): ?string
{
    // NEW: check preview cookie override first (only in preview context)
    $previewCookie = $_COOKIE['bte_php_preview'] ?? null;
    if ($previewCookie) {
        $overrides = json_decode(urldecode($previewCookie), true) ?? [];
        if (array_key_exists($path, $overrides)) {
            return (string) $overrides[$path];
        }
    }

    // existing DB + default lookup ...
}
```

> **Security note:** Cookie overrides are used only for live preview rendering.
> They never write to the database and are ignored during publish. The cookie
> has no `HttpOnly` flag so JS can manage it, and `SameSite=Lax` prevents
> cross-site submission.

---

## CSS: Spinner Overlay

```less
// _editor.less
.bte-php-preview-spinner {
    display: none;
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, .55);
    z-index: 10;
    align-items: center;
    justify-content: center;

    &::after {
        content: '';
        width: 32px;
        height: 32px;
        border: 3px solid #ccc;
        border-top-color: #1979c3;
        border-radius: 50%;
        animation: bte-spin .7s linear infinite;
    }

    &--visible {
        display: flex;
    }
}

@keyframes bte-spin {
    to { transform: rotate(360deg); }
}
```

The spinner is positioned `absolute` relative to the iframe wrapper (which must
be `position: relative`).

---

## settings.json — PHP-only field (no `property`)

```json
{
  "id": "sticky_header",
  "label": "Sticky Header",
  "type": "toggle",
  "default": "false"
}
```

No `property` key → editor routes preview through `PhpPreviewManager`. The
setting has no CSS output; its value is read in PHP:

```php
<?php if ($breezeThemeEditor?->is('header/sticky_header', 'true')): ?>
    <div class="sticky-header-placeholder"></div>
<?php endif; ?>
```

---

## Implementation Checklist

- [ ] Create `php-preview-manager.js`
- [ ] Modify `base.js`: detect missing `property`, route to `PhpPreviewManager`
- [ ] Modify `BreezeThemeEditorReader::get()`: read `bte_php_preview` cookie
- [ ] Add spinner CSS to `_editor.less`
- [ ] Verify iframe wrapper has `position: relative`
- [ ] Call `PhpPreviewManager.reset()` on: draft discard, publish, panel close
- [ ] Test: toggle field → spinner appears → 800ms → iframe reloads → PHP renders new value → CSS vars restored
- [ ] Test: rapid changes → only one reload fires (debounce works)
- [ ] Test: mixed session (CSS var field + PHP-only field changed together) → CSS changes survive reload
