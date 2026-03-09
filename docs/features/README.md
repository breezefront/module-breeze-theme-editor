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

**Статус:** 💡 Планування  
**Опис:** Двохрівнева система управління кольорами

**Основні компоненти:**
1. **Palette Management** - Створення та управління наборами кольорів
2. **Enhanced Color Picker** - Покращений picker з підтримкою палітр
3. **GraphQL API** - API для CRUD операцій з палітрами
4. **UI/UX** - Інтерфейс для роботи з палітрами

**Переваги:**
- Швидке створення цілісних кольорових схем
- Повторне використання кольорів
- Організація кольорів по категоріям
- Експорт/імпорт палітр

**Документація:**
- [color-palette-system.md](color-palette-system.md) - Повний план з діаграмами

---

## 📊 Пріоритети

Поточні пріоритети сфокусовані на завершенні Admin Migration.  
Features будуть розглядатися після завершення Phases 1-5.

**Орієнтовний час початку:** Після Phase 5 (Q2 2026)

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
