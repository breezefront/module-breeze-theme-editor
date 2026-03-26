# Issue 026: Consumer font fields не оновлюють CSS preview при зміні ролі у Font Palette

**Severity:** Medium
**Area:** `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js`
**Type:** Bug
**Status:** Fixed

---

## Симптом

Зміна шрифту ролі (наприклад `--secondary-font → 'Open Sans', sans-serif`) у секції
Font Palette оновлює UI кнопки залежних (consumer) fields у панелі, але **не змінює
відображення у preview iframe**: storefront продовжує показувати старий шрифт для
елементів, що використовують consumer CSS-змінну (наприклад `--base-font-family`).

---

## Відтворення

1. Відкрити Theme Editor
2. Перейти до секції Font Palette
3. Змінити шрифт для ролі `--secondary-font` (наприклад, обрати `'Open Sans', sans-serif`)
4. **Очікувано:** preview iframe показує новий шрифт для всіх елементів, що
   використовують `--base-font-family` (або іншу consumer-змінну цієї ролі)
5. **Фактично:** iframe залишається зі старим шрифтом

---

## Причина

### Що відбувається при кліку на шрифт

`font-palette-section-renderer.js` викликає:
1. `CssPreviewManager.setVariable('--secondary-font', "'Open Sans', sans-serif", 'font_picker')`
   — записує змінну ролі у `#bte-live-preview` ✅
2. `_updateConsumerFields('--secondary-font', "'Open Sans', sans-serif")`
   — оновлює **лише UI кнопки** залежних fields ❌ (iframe не чіпається)

### Чому iframe не оновлюється

Тема CSS містить:
```css
:root {
    --base-font-family: ui-sans-serif, system-ui, ...;  /* hardcoded */
}
```

Після кроку 1 `#bte-live-preview` набуває вигляду:
```css
:root {
    --secondary-font: 'Open Sans', sans-serif;
}
```

Але `--base-font-family` у `#bte-live-preview` відсутня — тому `html { font-family: var(--base-font-family) }`
читає значення з теми (hardcoded), а не з preview. Зміна ролі не відображається.

### DOM-доказ

Consumer field `--base-font-family` має:
- `data-property="--base-font-family"` — CSS-змінна, яку слід оновлювати
- `$select.val()` = `"--secondary-font"` або `data-default="--secondary-font"` — прив'язка до ролі

`_updateConsumerFields` мала доступ до `data-property`, але не викликала
`CssPreviewManager.setVariable` для consumer-поля.

### Чому кольорові палітри не мають цієї проблеми

`PaletteManager` використовує pub/sub (`subscribe` / `notify`). `CssPreviewManager`
підписується всередині `init()` — після готовності `$styleElement`. Font palettes не
мають pub/sub: виклики йдуть напряму з обробників кліків через `Promise.resolve(previewReady).then(...)`.

---

## Рішення

У методі `_updateConsumerFields` додати виклик `CssPreviewManager.setVariable` для
кожного consumer-поля, що збігається з роллю. Передаємо **посилання на CSS-змінну**
(наприклад `'--secondary-font'`), а не resolved font stack, щоб `#bte-live-preview`
отримав:

```css
:root {
    --secondary-font: 'Open Sans', sans-serif;  /* роль — вже встановлено caller-ом */
    --base-font-family: var(--secondary-font);  /* consumer — нове */
}
```

CSS cascade: `html { font-family: var(--base-font-family) }` → `var(--secondary-font)`
→ `'Open Sans'` ✓

### Змінений файл: `font-palette-section-renderer.js` (~рядок 604)

```js
// BEFORE (_updateConsumerFields — кінець циклу .each)
$widget.find('.bte-font-picker-role-swatch[data-value="' + roleProperty + '"]')
    .attr('data-font-family', newFontFamily)
    .css('font-family', newFontFamily);

// AFTER — додано блок нижче
$widget.find('.bte-font-picker-role-swatch[data-value="' + roleProperty + '"]')
    .attr('data-font-family', newFontFamily)
    .css('font-family', newFontFamily);

// Reflect the role change in the CSS preview iframe for this consumer
// field so that the theme's --base-font-family (or similar) resolves to
// the new font without the user having to manually interact with the field.
//
// We write the CSS-var reference (e.g. '--secondary-font'), NOT the
// resolved font stack, so the live-preview :root gets:
//   --base-font-family: var(--secondary-font)
// which cascades through the role variable that was already set by the
// caller (CssPreviewManager.setVariable(roleProperty, val, …)).
//
// PanelState is intentionally NOT touched — the consumer field should not
// become dirty just because the role it points to was changed.
var consumerProperty = $select.data('property');
if (consumerProperty) {
    CssPreviewManager.setVariable(consumerProperty, roleProperty, 'font_picker');
}
```

---

## Зачіпає файли

| Файл | Зміна |
|------|-------|
| `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js` | Додано `setVariable(consumerProperty, roleProperty)` у `_updateConsumerFields` |
| `view/adminhtml/web/js/test/tests/font-palette-section-renderer-test.js` | 4 нові тести Issue 026; оновлено inline `updateConsumerFields` з `setCalls` |

---

## Пов'язані

- [Issue 020](020-font-picker-default-cssvar-not-reactive-to-palette-change.md) — `font_picker` з `default: "--role"` не реагує на зміни палітри (matchesByDefault path)
- [Issue 025](025-font-palette-preview-not-updated-on-first-click.md) — Preview iframe не оновлюється при першому кліку (`Promise.resolve(previewReady).then(...)` guard)
- `css-preview-manager.js` — `setVariable()`, `$styleElement`

---

## Tracking

- [x] Реалізувати зміни у `font-palette-section-renderer.js`
- [x] Написати тести (4 нові + оновити 1 існуючий)
- [ ] Перевірити вручну: зміна ролі → consumer field у preview оновлюється
- [ ] Перевірити: PanelState не позначає consumer field як dirty
- [ ] Перевірити: регресія — зміна ролі ще й оновлює роль у preview (крок 1 не зламався)
