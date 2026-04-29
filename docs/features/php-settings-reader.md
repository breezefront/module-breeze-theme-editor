# PHP Settings Reader

Allows reading theme editor settings directly from PHP (`.phtml` templates) via the automatically injected `$breezeThemeEditor` variable — no explicit ViewModel injection needed.

---

## Usage

```php
// Get a setting value
$layout = $breezeThemeEditor?->get('my_section/hero_layout');

// Check for a specific value
if ($breezeThemeEditor?->is('my_section/hero_layout', 'fullwidth')) {
    // render full-width hero
}

// Switch on a value
switch ($breezeThemeEditor?->get('header/style')) {
    case 'sticky': /* ... */ break;
    case 'static': /* ... */ break;
    default:       /* ... */
}
```

The nullsafe operator `?->` is standard PHP 8 syntax and guards against `null` in the unlikely event DI fails to construct the helper.

---

## API

| Method | Signature | Description |
|---|---|---|
| `get` | `get(string $path): ?string` | Returns the published setting value, or `null` if not found |
| `is` | `is(string $path, string $value): bool` | Returns `true` if the setting equals `$value` |

`$path` format: `section_code/setting_id`

---

## Defining a PHP-Only Setting

A setting without a `property` key does not generate any CSS but is still readable from PHP:

```json
{
  "id": "my_section",
  "name": "Layout Settings",
  "settings": [
    {
      "id": "hero_layout",
      "type": "select",
      "label": "Hero Layout",
      "default": "contained",
      "options": [
        { "value": "contained", "label": "Contained" },
        { "value": "fullwidth",  "label": "Full Width" }
      ]
    }
  ]
}
```

---

## Scope & Caching

- Always reads **published** values for the **current store view**.
- Values are cached in-memory for the duration of the request.
- If a `.phtml` template is rendered inside a cached block, `$breezeThemeEditor->get()` is called once and the result is cached with the block HTML. Include the setting value in `getCacheKeyInfo()` of your block if the output depends on it.

---

## Limitations

- Read-only — cannot write values.
- Always uses `stores` scope (current store view); `websites` and `default` scope inheritance is resolved automatically on the server side.
- Only available in frontend templates (`etc/frontend/di.xml`); not injected in adminhtml.
- Always returns `PUBLISHED` values; draft values are not exposed.
