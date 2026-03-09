# Pickr для кольорів палітри (з підтримкою opacity)

**Статус:** ✅ Реалізовано  
**Дата:** 9 березня 2026  
**Задача:** Color settings opacity settings (Dmitry D. / Alexander K.)

---

## Мета

Замінити нативний `<input type="color">` у swatches кольорової палітри на Pickr —
той самий color picker що вже використовується для полів конфігурації.

**Головне:** додати підтримку **opacity (alpha-канал)** для кольорів палітри.  
Наприклад: `#ff0000` → `#ff000080` (50% прозорість).

---

## Що змінилось

| | До | Після |
|---|---|---|
| UI | Нативний OS color dialog | Pickr (inline, nano theme) |
| Opacity | Немає | Є (повзунок alpha) |
| HEX формат | `#rrggbb` | `#rrggbb` або `#rrggbbaa` |
| Live preview | Є (через `input` event) | Є (через `pickr.on('change')`) |
| Cancel | Немає (OS закриває без undo) | Відновлює оригінальний колір |

---

## Рішення

Попап — **лише Pickr**, без сітки палітри зліва.  
Кольори палітри є незалежними значеннями — не посилаються один на одного.

---

## Змінені файли

### `sections/palette-section-renderer.js`

- `_createSwatch()` — видалено `<input type="color" class="bte-swatch-input">`
- `_bind()` — замінено 3 обробники (click/input/change на `.bte-swatch-input`) на один click → `_openPickrPopup()`; додано `click.bte-palette-pickr` та `keydown.bte-palette-pickr` для закриття
- `updateSwatch()` — видалено `.bte-swatch-input.val()`, додано оновлення відкритого Pickr
- `paletteChangesReverted` listener — видалено `.bte-swatch-input.val()`
- `_destroy()` — додано `_closeAllPalettePickrPopups()` та `.off()` для нових handlers

**Нові методи:**
- `_normalizeHexAlpha(hex)` — `#rrggbbff` → `#rrggbb`
- `_openPickrPopup($swatch)` — будує popup, ініціалізує Pickr, обробляє change/save/cancel
- `_positionPickrPopup($popup, $swatch)` — позиціює праворуч від swatch з viewport clamping
- `_closeAllPalettePickrPopups()` — `pickr.destroyAndRemove()` + `$popup.remove()`

### `panels/_palette-section.less`

- Видалено блок `.bte-swatch-input` (прихований input більше не існує)

### `panels/_color-picker.less` — без змін

Стилі `.bte-color-popup`, `.bte-popup-pickr-container`, `.pcr-app[data-theme="nano"]`
вже існували і підходять для нового popup без змін.

---

## HEX з opacity

Pickr повертає `color.toHEXA().toString()` → `#rrggbbaa`.  
`_normalizeHexAlpha`: `#rrggbbff` → `#rrggbb` (повна непрозорість = без суфіксу).  
`#rrggbb80` зберігається як є (50% прозорість).

Збереження через GraphQL (`save-palette-value.js`) — без змін: приймає будь-який
валідний hex string, включаючи 8-символьний.
