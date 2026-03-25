# Issue 022: Draft CSS у iframe залишається застарілим після discardDraft

**Severity:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/css-manager.js`,
`view/adminhtml/web/js/editor/panel/settings-editor.js`  
**Type:** Bug  
**Status:** Fixed — `b95dc02`

---

## Симптом

Після відхилення чернетки ("Discard Draft") iframe preview продовжував
показувати старі CSS-значення (чернетки) замість поточних DRAFT-значень
(тих, що залишились після скидання).

Зміни в полях, зроблені до `discardDraft`, були видимі в iframe ще деякий
час після відхилення — аж до наступного повного перезавантаження сторінки.

---

## Відтворення

1. Відкрити Theme Editor у DRAFT-режимі
2. Змінити кілька полів (наприклад, колір фону)
3. Натиснути "Discard Draft"
4. **Очікувано:** iframe preview одразу показує значення після скидання
5. **Фактично:** iframe залишається зі старими значеннями до наступного `F5`

---

## Причина

Обробник події `bte:draftDiscarded` у `settings-editor.js` скидав стан
панелі та перезавантажував конфіг, але **не оновлював CSS в iframe**:

```js
// BEFORE (settings-editor.js)
$(document).on('bte:draftDiscarded', function () {
    PanelState.reset();
    PaletteManager.revertDirtyChanges();
    CssPreviewManager.reset();
    // ← css-manager не отримував команду оновити draft layer в iframe
    self._loadConfig();
});
```

`#bte-theme-css-variables-draft` — `<style>`-елемент в iframe, що містить
DRAFT CSS — залишався з попереднім вмістом. `CssPreviewManager.reset()`
очищав тільки live-preview шар (`#bte-live-preview`), але не торкався
draft-шару.

Для порівняння: `bte:publishedDiscarded` обробник вже коректно викликав
`CssManager.refreshPublishedCss()` — аналогічного методу для draft-шару
просто не існувало.

---

## Виправлення

### `css-manager.js` — новий метод `refreshDraftCss()`

```js
refreshDraftCss: function() {
    var self = this;

    return getCss(scope, scopeId, PUBLICATION_STATUS.DRAFT, null)
        .then(function(response) {
            var css = (response &&
                       response.getThemeEditorCss &&
                       response.getThemeEditorCss.css) || '';

            if (!$draftStyle || !$draftStyle.length) {
                $draftStyle = $(getIframeDocument()).find('#bte-theme-css-variables-draft');
            }

            if ($draftStyle && $draftStyle.length) {
                $draftStyle.text(css || ':root {}');
            } else {
                return self.showDraft();   // fallback якщо елемент зник
            }
        });
}
```

Метод дзеркалить існуючий `refreshPublishedCss()` для DRAFT-шару:
- Робить GraphQL-запит `getThemeEditorCss` зі статусом `DRAFT`
- Записує отриманий CSS напряму у `#bte-theme-css-variables-draft`
- Якщо елемент зник (iframe перенавігація) — fallback на `showDraft()`

### `settings-editor.js` — виклик у обробнику

```js
// AFTER
$(document).on('bte:draftDiscarded', function () {
    PanelState.reset();
    PaletteManager.revertDirtyChanges();
    CssPreviewManager.reset();
    CssManager.refreshDraftCss();   // ← новий рядок
    self._loadConfig();
});
```

---

## Зачіпає файли

| Файл | Зміна |
|------|-------|
| `view/adminhtml/web/js/editor/panel/css-manager.js` | Додано метод `refreshDraftCss()` (рядки 575–618) |
| `view/adminhtml/web/js/editor/panel/settings-editor.js` | Виклик `CssManager.refreshDraftCss()` у `bte:draftDiscarded` обробнику (рядок 223) |

---

## Пов'язані

- `refreshPublishedCss()` — аналогічний метод для PUBLISHED-шару (вже існував)
- `bte:publishedDiscarded` обробник — симетричний, вже коректно викликав
  `refreshPublishedCss()`

---

## Status

| Крок | Стан |
|------|------|
| Причина встановлена | ✅ |
| `refreshDraftCss()` додано | ✅ — `b95dc02` |
| Виклик у `bte:draftDiscarded` | ✅ — `b95dc02` |
| Перевірено вручну | pending |
