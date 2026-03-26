# Issue 025: Preview iframe не оновлюється при першому кліку на шрифт у Font Palette

**Severity:** Medium
**Area:** `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js`,
`view/adminhtml/web/js/editor/panel/section-renderer.js`
**Type:** Bug
**Status:** Fixed

---

## Симптом

Перший клік на шрифт у секції Font Palette не оновлює preview iframe —
storefront лишається зі старим шрифтом. При повторному кліку (або будь-якому
наступному) preview оновлюється нормально.

Те саме стосується кнопки **Reset** (повернути до збереженого значення) та
кнопки **Restore** (× — повернути до default): при першому відкритті editor-а
зміни в preview не відображаються.

---

## Відтворення

1. Відкрити Theme Editor
2. Одразу (не чекаючи) перейти до секції Font Palette
3. Клацнути на будь-який шрифт для будь-якої ролі
4. **Очікувано:** preview iframe миттєво відображає новий шрифт
5. **Фактично:** preview iframe не змінюється
6. Клацнути той самий або інший шрифт ще раз — тепер працює

> Баг проявляється тільки при **першому** кліку після відкриття editor-а.
> Якщо зачекати ~2–3 секунди після відкриття перед першим кліком — може
> також спрацювати, залежно від швидкості завантаження iframe.

---

## Причина

### Порядок ініціалізації

```
settings-editor._create()
  → _initPreview()  → CssPreviewManager.init() → Promise (ще не resolved)
  → _loadConfig()   → sections rendered → fontPaletteSection initialized

... iframe ще завантажується ...

user clicks font option   ← $styleElement = null → setVariable() returns false (!)

... пізніше: iframe load event → tryInit() → $styleElement встановлено ...

user clicks again         ← тепер працює ✓
```

### Де ламається

`CssPreviewManager.init()` (`css-preview-manager.js`) повертає Promise, що
резолвиться лише після того як в iframe з'явиться елемент
`#bte-theme-css-variables`. До цього моменту `$styleElement = null`.

`font-palette-section-renderer.js` викликає `CssPreviewManager.setVariable()`
та `CssPreviewManager.loadFont()` **синхронно** в обробниках кліків, не
чекаючи на ініціалізацію preview. `setVariable` (рядок ~264) тихо повертає
`false`:

```js
if (!iframeDocument || !$styleElement) {
    return false;  // ← без логу, без черги
}
```

### Чому кольори не мають цієї проблеми

`PaletteManager` має pub/sub (`subscribe` / `notify`). `CssPreviewManager`
підписується на зміни кольорів **всередині** свого `init()` — тобто вже після
того як `$styleElement` готовий. Тому будь-яка зміна кольору через palette
завжди приходить у потрібний момент.

`FontPaletteManager` pub/sub **не має** — виклик `setVariable` іде напряму з
обробника кліку, без будь-якого очікування готовності preview.

### Три місця з прямим викликом у `font-palette-section-renderer.js`

| Місце | Рядки | Опис |
|-------|-------|------|
| option click handler | ~420–441 | `loadFont()` + `setVariable()` + `_updateConsumerFields()` |
| reset handler | ~293–300 | `setVariable()` + `_updateConsumerFields()` у `dirty.forEach` |
| restore handler | ~325–331 | `setVariable()` + `_updateConsumerFields()` в `Object.keys` loop |

---

## Рішення

Передати `_previewReady` Promise (зберігається в `settings-editor.js:231`) у
widget `fontPaletteSection` і огорнути всі виклики preview у
`Promise.resolve(this.options.previewReady).then(...)`.

Використання `Promise.resolve()` безпечне: якщо Promise вже resolved (iframe
завантажений) — `.then()` виконується синхронно в наступному мікротаску.

### Файл 1: `section-renderer.js` — рядок 156

```js
// BEFORE
ctx.$fontPaletteContainer.fontPaletteSection({
    fontPalettes: ctx.config.fontPalettes,
    sections:     ctx.config.sections || []
});

// AFTER
ctx.$fontPaletteContainer.fontPaletteSection({
    fontPalettes: ctx.config.fontPalettes,
    sections:     ctx.config.sections || [],
    previewReady: ctx._previewReady
});
```

### Файл 2: `font-palette-section-renderer.js` — options (рядок 51)

```js
// BEFORE
options: {
    fontPalettes: [],
    sections:     []
},

// AFTER
options: {
    fontPalettes: [],
    sections:     [],
    previewReady: null
},
```

### Файл 3: `font-palette-section-renderer.js` — option click (~рядок 418)

```js
// BEFORE
var url = map[val];
if (url) {
    CssPreviewManager.loadFont(url);
}
CssPreviewManager.setVariable(roleProperty, val, 'font_picker');
// ...
self._updateConsumerFields(roleProperty, val);

// AFTER
var url = map[val];
Promise.resolve(self.options.previewReady).then(function () {
    if (url) {
        CssPreviewManager.loadFont(url);
    }
    CssPreviewManager.setVariable(roleProperty, val, 'font_picker');
    self._updateConsumerFields(roleProperty, val);
});
```

### Файл 4: `font-palette-section-renderer.js` — reset handler (~рядок 293)

```js
// BEFORE
dirty.forEach(function (item) {
    PanelState.resetField(item.rf.sectionCode, item.rf.fieldCode);
    self._roleFields[item.property].currentValue = item.savedValue;
    FontPaletteManager.setCurrentValue(item.property, item.savedValue);
    self._updateRolePickerUI(item.property, item.savedValue);
    CssPreviewManager.setVariable(item.property, item.savedValue, 'font_picker');
    self._updateConsumerFields(item.property, item.savedValue);
});

// AFTER
dirty.forEach(function (item) {
    PanelState.resetField(item.rf.sectionCode, item.rf.fieldCode);
    self._roleFields[item.property].currentValue = item.savedValue;
    FontPaletteManager.setCurrentValue(item.property, item.savedValue);
    self._updateRolePickerUI(item.property, item.savedValue);
    Promise.resolve(self.options.previewReady).then(function () {
        CssPreviewManager.setVariable(item.property, item.savedValue, 'font_picker');
        self._updateConsumerFields(item.property, item.savedValue);
    });
});
```

### Файл 5: `font-palette-section-renderer.js` — restore handler (~рядок 325)

```js
// BEFORE
self._updateRolePickerUI(prop, defaultValue);
CssPreviewManager.setVariable(prop, defaultValue, 'font_picker');
self._roleFields[prop].currentValue = defaultValue;
FontPaletteManager.setCurrentValue(prop, defaultValue);
self._updateConsumerFields(prop, defaultValue);
PanelState.restoreToDefault(rf.sectionCode, rf.fieldCode);

// AFTER
self._updateRolePickerUI(prop, defaultValue);
self._roleFields[prop].currentValue = defaultValue;
FontPaletteManager.setCurrentValue(prop, defaultValue);
PanelState.restoreToDefault(rf.sectionCode, rf.fieldCode);
Promise.resolve(self.options.previewReady).then(function () {
    CssPreviewManager.setVariable(prop, defaultValue, 'font_picker');
    self._updateConsumerFields(prop, defaultValue);
});
```

---

## Зачіпає файли

| Файл | Зміна |
|------|-------|
| `view/adminhtml/web/js/editor/panel/section-renderer.js` | Передати `previewReady: ctx._previewReady` у widget |
| `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js` | Додати опцію `previewReady: null`; огорнути 3 місця у `.then()` |

---

## Пов'язані

- [Issue 020](020-font-picker-default-cssvar-not-reactive-to-palette-change.md) — `font_picker` з `default: "--role"` не реагує на зміни палітри (той самий обробник `_bind`, сусідня проблема)
- `css-preview-manager.js` — `init()`, `setVariable()`, `$styleElement`
- `settings-editor.js:231` — `this._previewReady = CssPreviewManager.init()`

---

## Tracking

- [x] Реалізувати зміни у `section-renderer.js`
- [x] Реалізувати зміни у `font-palette-section-renderer.js` (3 місця)
- [ ] Перевірити вручну: перший клік на шрифт → preview оновлюється
- [ ] Перевірити: Reset та Restore кнопки також оновлюють preview з першого разу
- [ ] Перевірити: зміна кольорів не зламалась (регресія)
