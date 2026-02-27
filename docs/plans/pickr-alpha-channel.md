# Pickr Alpha Channel (HEX8) Support Plan

**Дата створення:** 27 лютого 2026  
**Статус:** 📋 Готово до виконання  
**Пріоритет:** СЕРЕДНІЙ  
**Автор:** OpenCode AI

---

## Мета

Додати підтримку alpha-каналу в color picker (Pickr) для всіх color-полів.  
Формат збереження: `#rrggbbaa` (HEX8 — 8 символів).  
Backward compatible: існуючі 6-символьні `#rrggbb` значення читаються без змін.

---

## Контекст

Pickr v1.9.1 підтримує alpha з коробки, але зараз він навмисно вимкнений:

```js
// field-handlers/color.js:251,257
lockOpacity: true,
components.opacity: false,
```

При `lockOpacity: true` метод `toHEXA().toString()` повертає 6-символьний hex.  
При `lockOpacity: false` — повертає 8-символьний `#rrggbbaa`, якщо alpha < 1.

---

## Файли до зміни

### 1. `view/adminhtml/web/js/editor/panel/field-handlers/color.js`

**a) `isValidHex` (~рядок 111)** — розширити regex для hex8:
```js
// до:
isValidHex: function(value) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
}
// після:
isValidHex: function(value) {
    return /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);
}
```

**b) Pickr config (~рядок 251, 257):**
```js
// до:
lockOpacity: true,
// після:
lockOpacity: false,

// до:
opacity: false,
// після:
opacity: true,
```

**c) Зчитування значення з Pickr (~рядки 290, 342):**  
`color.toHEXA().toString()` вже дає 8 символів при alpha < 1. Перевірити чи немає обрізання рядка (`.slice(0, 7)` або аналогів).

---

### 2. `view/adminhtml/web/template/editor/panel/fields/color.html`

Перевірити placeholder/title поля вводу — оновити підказку формату з `#RRGGBB` на `#RRGGBB` або `#RRGGBBAA`.

---

### 3. `Model/Utility/ColorConverter.php`

**`isHex` (~рядок 168)** — додати 8-символьний варіант:
```php
// до:
return (bool) preg_match('/^#?[0-9A-Fa-f]{3,6}$/', $value);
// після:
return (bool) preg_match('/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/', $value);
```

**`normalizeHex` (~рядок 144)** — не розширювати 8-символьний hex:
```php
// Додати умову: якщо довжина вже 8 (без #) — не розширювати
```

**`hexToRgb` (~рядок 27)** — повертає `r, g, b` (без alpha).  
Якщо передано hex8, alpha ігнорується — це правильна поведінка для `format: 'rgb'`.  
Але при `format: 'rgba'` (якщо додамо в майбутньому) — треба буде додати підтримку.

---

### 4. `Model/Utility/ColorFormatter.php`

**`formatColorValue` (~рядок 65)** — при конвертації hex8 → rgb формат:
```php
// При format='rgb' і вхідному #rrggbbaa:
// повертати rgba(r, g, b, a) замість r, g, b
// (щоб не втрачати alpha в CSS)
```

---

### 5. `Model/Service/CssGenerator.php` (~рядок 329)

**`formatColor()`** — оновити для hex8:
- При `format = 'hex'` — повернути hex8 як є
- При `format = 'rgb'` і вхідний hex8 — повернути `rgba(r, g, b, a)`

---

### 6. `view/adminhtml/web/js/editor/utils/dom/color-utils.js`

**`isHexColor` (~рядок 202)** — додати 8-digit case:
```js
return /^[0-9a-fA-F]{3}$/.test(str)
    || /^[0-9a-fA-F]{6}$/.test(str)
    || /^[0-9a-fA-F]{8}$/.test(str);
```

**`normalizeHex` (~рядок 158)** — не обрізати 8-символьний hex і не розширювати його.

---

### 7. `view/adminhtml/web/js/editor/panel/css-preview-manager.js` (~рядок 337)

**`_formatColorValue()`** — live preview дзеркалить PHP-логіку.  
Оновити аналогічно до `CssGenerator.formatColor()`: підтримка hex8 для `rgb` формату → `rgba(r, g, b, a)`.

---

## Backward Compatibility

| Збережене значення | Поведінка |
|---|---|
| `#rrggbb` (6 символів) | Без змін — читається і зберігається як раніше |
| `--color-brand-primary` (palette ref) | Без змін |
| `r, g, b` (старий RGB формат) | Без змін — нормалізується при читанні |
| `#rrggbbff` (alpha = ff = 100%) | Функціонально = `#rrggbb`; опціонально нормалізувати до 6 символів |

---

## Питання відкриті

- Чи потрібен новий CSS формат `rgba` (`format: 'rgba'`) чи достатньо розширити `rgb`?
- Що робити з `#rrggbbff` (непрозорий hex8) — нормалізувати до `#rrggbb` чи зберігати як є?
- Чи потрібна підтримка alpha для palette ref (наприклад `--color-brand-primary` з opacity)?
