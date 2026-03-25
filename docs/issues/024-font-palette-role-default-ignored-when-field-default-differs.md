# Issue 024: `font_palettes.fonts[].default` ignored — field shows `settings[].default` instead

**Severity:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js`  
**Type:** Bug  
**Status:** Open

---

## Симптом

Тема-розробник змінює `default` для ролі `primary` у `font_palettes`:

```json
"font_palettes": {
  "default": {
    "fonts": [
      {
        "id": "primary",
        "label": "Primary",
        "property": "--primary-font",
        "default": "Arial, sans-serif"
      }
    ]
  }
}
```

При цьому `settings[]` для поля `primary-font` залишає старий default:

```json
{
  "id": "primary-font",
  "type": "font_picker",
  "default": "ui-sans-serif, system-ui, sans-serif, ...",
  "font_palette": "default"
}
```

**Очікувано:** Font Palette секція показує "Arial" як вибраний шрифт для ролі Primary,
trigger-кнопка відображається шрифтом Arial, CSS preview застосовує `--primary-font: Arial, sans-serif`.

**Фактично:** Показується "System UI" — значення з `settings[].default`, а не з
`font_palettes.fonts[].default`. Ролевий default повністю ігнорується.

---

## GraphQL відповідь (підтверджено)

```json
"sections": [{
  "code": "typography",
  "fields": [{
    "code": "primary-font",
    "value": null,
    "default": "ui-sans-serif, system-ui, ..."
  }]
}],
"fontPalettes": [{
  "id": "default",
  "fonts": [{
    "id": "primary",
    "property": "--primary-font",
    "default": "Arial, sans-serif"
  }]
}]
```

Два різних `default` для одного `--primary-font`:

| Джерело | Значення |
|---------|---------|
| `fontPalettes[].fonts[].default` | `"Arial, sans-serif"` ← авторитетний |
| `sections[].fields[].default` | `"ui-sans-serif, system-ui, ..."` ← старий |

---

## Причина

**Файл:** `font-palette-section-renderer.js:75–77` — метод `_buildRoleMap()`

```js
_buildRoleMap: function () {
    (this.options.sections || []).forEach(function (section) {
        (section.fields || []).forEach(function (field) {
            if (field.property && FontPaletteManager.getRole(field.property)) {

                var currentValue = (field.value !== null && field.value !== undefined)
                    ? field.value
                    : (field.default || '');    // ← береться field.default — WRONG

                FontPaletteManager.setCurrentValue(field.property, currentValue);
            }
        });
    });
}
```

При `field.value = null` (поле ніколи не збережено):
- `currentValue` = `field.default` = `"ui-sans-serif..."` (з `sections[].fields[]`)
- `FontPaletteManager.setCurrentValue('--primary-font', "ui-sans-serif...")` — перезаписує `_currentValues`

Тепер `FontPaletteManager.getCurrentValue('--primary-font')`:

```js
getCurrentValue: function(property) {
    if (_currentValues[property] !== undefined) {
        return _currentValues[property];  // ← повертає "ui-sans-serif..." — WRONG
    }
    var role = _rolesByProperty[property];
    return role ? role.default : '';      // ← "Arial, sans-serif" — ніколи не досягається
}
```

`role.default = "Arial, sans-serif"` затертий `field.default` ще до першого рендеру.

---

## Що ламається downstream

| Місце | Симптом |
|-------|---------|
| `font-picker.js:68` — `getCurrentValue(role.property)` | Отримує `"ui-sans-serif"` → trigger label = "System UI" |
| `font-picker.js:55` — `font.value === data.value` | `data.value = null` → жоден option не `selected` → `is-selected` визначається хибно |
| CSS preview `--primary-font` | Застосовується `ui-sans-serif` замість `Arial` |
| `font-palette-section-renderer.js:263` — `_buildRolePickerHtml` | Trigger label = "System UI", `is-selected` на System UI |

---

## Фікс

**Файл:** `font-palette-section-renderer.js:75–77`

При `field.value = null` — пріоритизувати `role.default` з `FontPaletteManager`
(авторитетний), а не `field.default` (застаріла копія).

```js
// BEFORE (рядок 75–77):
var currentValue = (field.value !== null && field.value !== undefined)
    ? field.value
    : (field.default || '');

// AFTER:
var role = FontPaletteManager.getRole(field.property);
var currentValue = (field.value !== null && field.value !== undefined)
    ? field.value
    : (role ? role.default : (field.default || ''));
```

`role` тут — той самий об'єкт що вже перевірявся в `if (FontPaletteManager.getRole(...))`,
тому повторний виклик просто використовує кешований `_rolesByProperty`.

---

## Зачіпає файли

| Файл | Зміна |
|------|-------|
| `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js` | `_buildRoleMap():75–77` — пріоритизувати `role.default` |

Зміни в PHP, GraphQL, `font-picker.js`, `panel-state.js` — **не потрібні**.

---

## Tracking

- [ ] Виправити `_buildRoleMap()` — пріоритизувати `role.default` над `field.default`
- [ ] Spec-тест: `field.value = null`, `role.default ≠ field.default` → `setCurrentValue` отримує `role.default`
- [ ] Перевірити вручну: `role.default = "Arial"` → trigger показує Arial, `is-selected` на Arial
- [ ] Перевірити: `field.value = "Roboto"` (збережено) → збережене значення не перезаписується
- [ ] Перевірити: після Save → Reload → значення відновлюється коректно
- [ ] Перевірити: `isModified` badge не з'являється при `value = null` (fresh open)
