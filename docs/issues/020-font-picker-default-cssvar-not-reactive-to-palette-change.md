# Issue 020: `font_picker` з `"default": "--role"` не реагує на зміни палітри шрифтів

**Severity:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js`,
`view/adminhtml/web/template/editor/panel/fields/font-picker.html`  
**Type:** Bug  
**Status:** Open

---

## Симптом

Поле `font_picker` з конфігурацією:

```json
{
  "id": "base-font-family",
  "type": "font_picker",
  "default": "--secondary-font",
  "font_palette": "default"
}
```

При першому відкритті панелі поле відображає правильний шрифт (той, що зараз
призначений ролі `--secondary-font` в палітрі шрифтів).

**Але** коли користувач змінює роль `--secondary-font` в секції Font Palette
(вибирає інший шрифт для цієї ролі), кнопка-тригер поля `font_picker`
**не оновлюється** — показує попередній шрифт замість нового.

---

## Відтворення

1. Налаштувати поле в `settings.json` з `"default": "--secondary-font"` і
   `"font_palette": "default"` — **без** збереженого значення у БД
2. Відкрити Theme Editor → панель Settings → переконатись що поле "Base Font"
   відображає шрифт ролі `--secondary-font`
3. Перейти до секції Font Palette
4. Змінити роль `--secondary-font` на інший шрифт (наприклад, "Roboto")
5. **Очікувано:** кнопка-тригер поля "Base Font" у секції Settings
   відображає "Roboto"
6. **Фактично:** кнопка-тригер залишається зі старим шрифтом

> Якщо поле було збережене у БД зі значенням `"--secondary-font"`, баг не
> проявляється — тільки у випадку "ніколи не зберігалось, лише default".

---

## Причина

### Ключове місце

`font-palette-section-renderer.js:560–585` — метод `_updateConsumerFields()`:

```js
_updateConsumerFields: function (roleProperty, newFontFamily) {
    $('.bte-font-picker').each(function () {
        var $select = $(this);
        if ($select.val() !== roleProperty) {   // ← ось де ламається
            return;
        }
        // ... оновлює тригер-кнопку ...
    });
}
```

Метод шукає всі `<select class="bte-font-picker">`, чиє поточне `.val()`
дорівнює рядку ролі (`"--secondary-font"`). Це спрацьовує лише тоді, коли
прихований `<select>` **реально зберігає** CSS-var як своє обране значення.

### Коли `$select.val()` містить `"--secondary-font"`

| Ситуація | `$select.val()` |
|----------|----------------|
| Користувач клацнув role-swatch у dropdown (`simple.js:158`: `$select.val(val)`) | ✅ `"--secondary-font"` |
| Поле збережене у БД, `data.value === "--secondary-font"` (template:46) | ✅ `"--secondary-font"` |
| **Поле ніколи не збережене, `data.value = null`, тільки `data.default = "--secondary-font"`** | ❌ `null` |

### Деталь шаблону

`font-picker.html:43–49` — прихована `<option>` для role-reference:

```html
<% _.each(data.fontRoles, function(role) { %>
    <option
        value="<%- role.property %>"
        <%= String(role.property) === String(data.value) ? 'selected' : '' %>
        hidden
    ><%- role.label %></option>
<% }); %>
```

Умова `selected` перевіряє `data.value`, **не** `data.default`. Коли
`data.value = null`, жодна прихована `<option>` не отримує `selected`.
`$select.val()` повертає `null`.

Тому `_updateConsumerFields()` завжди пропускає таке поле:
`null !== "--secondary-font"` → `return`.

### Чому при першому відкритті шрифт все ж правильний

`font-picker.js` (`prepareData()`, рядки 63–89) на момент рендеру читає
`FontPaletteManager.getCurrentValue(role.property)` → встановлює
`data.selectedFontFamily`. Шаблон рендерить тригер з правильним `font-family`
**одноразово**. Але після цього DOM більше не оновлюється при змінах
палітри — `$select.val()` залишається `null`.

---

## Варіант A — виправити шаблон

**Файл:** `view/adminhtml/web/template/editor/panel/fields/font-picker.html`

Змінити умову `selected` для прихованих role-options — враховувати `data.default`
коли `data.value` порожній:

```html
<!-- BEFORE (рядок 46) -->
<%= String(role.property) === String(data.value) ? 'selected' : '' %>

<!-- AFTER -->
<%= (String(role.property) === String(data.value) ||
     (!data.value && String(role.property) === String(data.default)))
     ? 'selected' : '' %>
```

**Що змінюється:** `$select.val()` тепер повертає `"--secondary-font"` навіть
коли поле ніколи не зберігалось → `_updateConsumerFields()` знаходить і
оновлює поле.

**Ризик:** `$select.val('--secondary-font')` тепер означає і "обрав
користувач" і "default, ніколи не змінювався" — потрібно перевірити чи
dirty-count / `isDirty` логіка не вважає поле «брудним» при першому
відкритті.

---

## Варіант B — виправити `_updateConsumerFields()` (рекомендований)

**Файл:** `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js`

Додати перевірку `data-default` атрибуту коли `.val()` порожній.
Атрибут `data-default` **вже присутній** у шаблоні (рядок 27):

```html
data-default="<%= data.default %>"
```

```js
// BEFORE (рядки 560–586)
_updateConsumerFields: function (roleProperty, newFontFamily) {
    $('.bte-font-picker').each(function () {
        var $select = $(this);
        if ($select.val() !== roleProperty) {
            return;
        }
        // ...
    });
}

// AFTER
_updateConsumerFields: function (roleProperty, newFontFamily) {
    $('.bte-font-picker').each(function () {
        var $select    = $(this);
        var currentVal = $select.val();
        var defaultVal = $select.attr('data-default');

        var matchesValue   = currentVal === roleProperty;
        var matchesDefault = (!currentVal || currentVal === '') &&
                             defaultVal === roleProperty;

        if (!matchesValue && !matchesDefault) {
            return;
        }

        var selectId = $select.attr('id');
        var $widget  = $('[data-for="' + selectId + '"]');
        if (!$widget.length) {
            return;
        }

        $widget.find('.bte-font-picker-trigger-label')
            .css('font-family', newFontFamily);

        $widget.find('.bte-font-picker-role-swatch[data-value="' + roleProperty + '"]')
            .attr('data-font-family', newFontFamily)
            .css('font-family', newFontFamily);
    });
}
```

**Перевага:** Не змінює `$select.val()` → dirty-state логіка не зачіпається.  
**Недолік:** `_updateConsumerFields` стає трохи складнішим.

---

## Рекомендація

**Варіант B** — безпечніший. Не торкається `$select.val()`, не ризикує
зламати dirty-count. `data-default` вже є в шаблоні, потребує лише зміни
в одному методі JS.

Варіант A також коректний, але вимагає додаткової перевірки dirty-state
логіки перед мержем.

---

## Зачіпає файли

| Файл | Варіант | Зміна |
|------|---------|-------|
| `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js` | B | `_updateConsumerFields()` — додати перевірку `data-default` |
| `view/adminhtml/web/template/editor/panel/fields/font-picker.html` | A | Виправити умову `selected` для role-options |

---

## Пов'язані

- [Issue 010](010-font-picker-var-refs-treated-as-palette-color.md) — `font_picker`
  CSS-var refs treated as palette colour (той самий domain, закрита)
- PLAN.md п. 8.9 — setTimeout race в `settings-editor.js` на `panelShown`

---

## Tracking

- [ ] Вибрати Варіант A або B (рекомендується B)
- [ ] Реалізувати виправлення
- [ ] Написати spec-тест для `_updateConsumerFields()` з null-value consumer
      field
- [ ] Перевірити вручну: поле з `"default": "--secondary-font"`, ніколи не
      збережене → змінити роль → тригер оновлюється
- [ ] Перевірити dirty-count: поле з default-ref не вважається dirty при
      першому відкритті
