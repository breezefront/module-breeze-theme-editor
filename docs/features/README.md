# Features & Future Plans

Документація про майбутні фічі та покращення Breeze Theme Editor.

---

### Pickr для кольорів палітри / Opacity (09.03.2026)

**Статус:** ✅ Завершено

**Що зроблено:**
- Нативний `<input type="color">` у swatches палітри замінено на Pickr
- Додано підтримку opacity (alpha-канал): `#rrggbb` → `#rrggbbaa`
- Live preview, Save/Cancel, закриття по ESC та кліку поза попапом

**Документація:** [palette-pickr-opacity.md](palette-pickr-opacity.md)

---



**Статус:** ✅ Завершено (коміти `1a7279e`, `f401f6c`)

**Що зроблено:**
- `css_var` перейменовано на `property` (backward compat: читається обидва варіанти)
- `property` підтримує CSS custom properties (`--var`) і стандартні CSS властивості (`max-width`)
- Додано `selector` поле: field-level та section-level з ієрархією успадкування
- Ієрархія: `field.selector` → `section.selector` → `:root`
- PHP тести: 303/303 ✅
- Публічна документація оновлена: `theme-developer-guide.md` v1.2

---

## 💡 Заплановані Features

### Color Palette System
📄 [color-palette-system.md](color-palette-system.md)

**Статус:** ✅ Завершено

**Що реалізовано:**
- `PaletteProvider` / `PaletteResolver` — резолвинг палітр з конфігу теми
- `FontPaletteProvider` — підтримка font palette
- GraphQL mutation `saveBreezeThemeEditorPaletteValue` + типи `BreezeThemeEditorPalette`, `BreezeThemeEditorPaletteGroup`, `BreezeThemeEditorPaletteColor`, `BreezeThemeEditorFontPalette`
- `palette-manager.js` / `font-palette-manager.js` — JS-менеджери у правій панелі
- `palette-section-renderer.js` / `font-palette-section-renderer.js` — рендеринг секцій
- `save-palette-value.js` — GraphQL mutation на JS стороні
- HTML templates: `palette-section.html`, `palette-grid.html`, badges
- LESS стилі: `_palette-section.less`
- Pickr з підтримкою opacity (`#rrggbbaa`) — реалізовано окремо (2026-03-09)
- 33 файли загалом (PHP, JS, templates, тести)

---

## 📊 Пріоритети

Поточні пріоритети сфокусовані на завершенні Phase 5 (E2E тестування + release prep).

---

### PHP Settings Reader (23.03.2026)
📄 [php-settings-reader.md](php-settings-reader.md)

**Статус:** ✅ Завершено (GitHub issue #13)

**Що реалізовано:**
- `View/Helper/BreezeThemeEditor` — helper з `get('section/field')`, `is('section/field', 'value')`
- Автоматичний inject `$breezeThemeEditor` у всі frontend `.phtml` шаблони через `blockVariables`
- Lazy loading через `\Proxy` (той самий механізм що і `$secureRenderer`)
- In-memory кешування per-request, scope + theme inheritance, fallback до `default` з `settings.json`
- 8 юніт-тестів: 8/8 ✅

---

## 💭 Ідеї для Майбутнього

### Можливі напрямки:
- [ ] AI-assisted theme customization
- [ ] Real-time collaboration
- [ ] Theme marketplace integration
- [ ] Advanced layout builder
- [ ] Performance monitoring dashboard

---

Повернутися до [Dashboard](../DASHBOARD.md)
