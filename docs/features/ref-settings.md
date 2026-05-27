# Ref Settings — Option in Multiple Sections

Show a single setting in more than one section simultaneously. One value in DB, synchronized across all appearances in real time.

---

## Use Case

`primary_color` defined in `general` section also needs to appear in `typography` and `buttons` sections for contextual editing — without duplicating the setting or creating separate DB values.

---

## Syntax

Add a ref entry to any section's `settings[]`:

```json
{
  "id": "typography",
  "settings": [
    {
      "ref": "general.primary_color"
    }
  ]
}
```

`ref` format: `"sectionCode.fieldCode"` — points to the original setting.

---

## Overriding Display Fields

A ref entry can override display-only fields to give context. Structural fields are always inherited from the original and cannot be changed.

```json
{
  "ref": "general.primary_color",
  "label": "Heading Color",
  "description": "Controls color of all headings in this section",
  "help_text": "Same as the global Primary Color.",
  "placeholder": "#1979c3"
}
```

| Field | Override allowed |
|---|---|
| `label` | yes |
| `description` | yes |
| `help_text` | yes |
| `placeholder` | yes |
| `type` | **no** — always from original |
| `property` | **no** — always from original |
| `default` | **no** — always from original |
| `id` | **no** — always from original |
| `dependsOn` | **no** — always from original |
| `palette` | **no** — always from original |
| `format` | **no** — always from original |

---

## Behavior

- **One DB record** — value always stored under the original `sectionCode.fieldCode` key
- **Real-time sync** — changing the value in any section instantly updates all other appearances
- **Save/reset/restore** — always targets the original key; all copies reflect the change
- **Inheritance** — ref entries survive theme inheritance (`inheritParent: true`) and are resolved after merge
- **Missing target** — if `ref` points to a non-existent setting, the entry is silently skipped

---

## Full Example

```json
{
  "sections": [
    {
      "id": "general",
      "name": "General",
      "settings": [
        {
          "id": "primary_color",
          "label": "Primary Color",
          "type": "color",
          "property": "--color-primary",
          "default": "#1979c3"
        }
      ]
    },
    {
      "id": "typography",
      "name": "Typography",
      "settings": [
        {
          "ref": "general.primary_color",
          "description": "Sets the color for all heading elements"
        }
      ]
    },
    {
      "id": "buttons",
      "name": "Buttons",
      "settings": [
        {
          "ref": "general.primary_color",
          "label": "Button Background",
          "description": "Primary button background color"
        }
      ]
    }
  ]
}
```

Result: `primary_color` appears in all three sections. Changing in any section updates all. One DB record: `general.primary_color`.

---

## Notes for Theme Developers

- A ref entry does **not** need an `id` field — the original `id` is inherited automatically
- Multiple sections can ref the same setting simultaneously
- A ref can point to any setting in any section — not only within the same theme file (parent theme settings work too, as long as the target exists after inheritance merge)
- Circular refs (A refs B, B refs A) are not supported and will silently skip one of the entries
