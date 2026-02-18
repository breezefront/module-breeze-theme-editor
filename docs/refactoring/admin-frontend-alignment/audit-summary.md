# Admin-Frontend Alignment Audit Summary

**Дата:** 18 лютого 2026  
**Статус:** ✅ Аудит завершено  
**Мета:** Знайти всі невідповідності між Admin і Frontend

---

## 🎯 Що було зроблено

### 1. Повний аудит подій (Events)

**Проаналізовано:**
- ✅ Всі JavaScript файли в `view/adminhtml/web/js/`
- ✅ Всі JavaScript файли в `view/frontend/web/js/`
- ✅ Всі `.trigger()` та `.on()` виклики
- ✅ 17 різних custom events

**Інструменти:**
- Explore agent (very thorough mode)
- Grep для event patterns
- Manual file comparison

**Результат:** Створено повну таблицю подій з файлами та номерами рядків

---

### 2. Повний аудит селекторів (Selectors)

**Проаналізовано:**
- ✅ ID selectors (`#bte-*`, `#toolbar-*`, `#breeze-*`)
- ✅ Class selectors (`.bte-*`, `.toolbar-*`)
- ✅ Data attributes (`data-*`)
- ✅ Навігаційні та toolbar елементи

**Результат:** Виявлено критичні невідповідності в ID селекторах

---

## 🔴 КРИТИЧНІ ПРОБЛЕМИ ЗНАЙДЕНО

### Проблема #1: Події публікацій (ОСНОВНИЙ БАГ)

**Симптом:** Settings Editor НЕ перезавантажується при зміні публікацій в Admin

**Причина:**
```
Admin publication-selector.js:327 → trigger 'bte:statusChanged'
Admin settings-editor.js:203       → listen 'publicationStatusChanged'
❌ EVENT MISMATCH - Settings Editor never receives the event!
```

**Порівняння з Frontend:**
```
Frontend publication-selector.js:158 → trigger 'publicationStatusChanged'
Frontend settings-editor.js:209       → listen 'publicationStatusChanged'
✅ WORKS CORRECTLY
```

**Файли для виправлення:**
- `view/adminhtml/web/js/editor/toolbar/publication-selector.js:289` → змінити event
- `view/adminhtml/web/js/editor/toolbar/publication-selector.js:327` → змінити event
- `view/adminhtml/web/js/editor/toolbar.js:345` → змінити listener

**Часовитрати на fix:** 15 хвилин  
**Пріоритет:** 🔴 КРИТИЧНО

---

### Проблема #2: Навігаційні селектори

**Симптом:** Settings Editor використовує dual selector workaround

**Причина:**
```
Admin toolbar.js:91          → $('#bte-navigation')
Frontend toolbar.js:134      → $('#toolbar-navigation')
Settings-editor.js (обидва)  → $('#bte-navigation, #toolbar-navigation')  ← WORKAROUND
```

**Наслідки:**
- Хитка архітектура
- Code duplication
- Potential bugs при зміні одного з селекторів

**Файли для виправлення:**
- `view/adminhtml/templates/editor/index.phtml` → змінити ID
- `view/adminhtml/web/js/editor/toolbar.js:79,91` → оновити selectors
- `view/adminhtml/web/js/editor/panel/settings-editor.js:68` → спростити (видалити dual)

**Часовитрати на fix:** 10 хвилин (в рамках ЕТАП 1)  
**Пріоритет:** 🟡 СЕРЕДНЄ (але важливо для якості)

---

## 📊 СТАТИСТИКА АУДИТУ

### Події (Events)

| Статус | Кількість | Опис |
|--------|-----------|------|
| ✅ **Синхронізовані** | 12 events | Працюють однаково в Admin і Frontend |
| 🔴 **Потребують виправлення** | 2 events | `bte:statusChanged`, `publicationLoaded` |
| 🟢 **Admin-specific (OK)** | 3 events | `bte:iframeReloaded`, `bte:pageTypeChanged`, `bte:cssManagerReady` |
| **ВСЬОГО ПРОАНАЛІЗОВАНО** | **17 events** | - |

### Селектори (Selectors)

| Категорія | Admin | Frontend | Статус |
|-----------|-------|----------|--------|
| **ID selectors** | 23 unique | 14 unique | 🟡 Частково різні |
| **Class selectors** | ~80 shared | ~80 shared | ✅ Консистентні |
| **Data attributes** | 24 shared | 24 shared | ✅ Консистентні |
| **CRITICAL MISMATCHES** | 2 IDs | 2 IDs | 🔴 Потребують виправлення |

### Файли

| Метрика | Значення |
|---------|----------|
| **Файлів проаналізовано** | ~40 JS files |
| **Файлів потребують змін** | 9 files |
| **Рядків коду до зміни** | ~20 lines |
| **Часовитрати на виправлення** | 2-2.5 години |

---

## 📋 ПОВНА ТАБЛИЦЯ ПОДІЙ

### Critical Events

| Event Name | Admin | Frontend | Issue | Fix |
|------------|-------|----------|-------|-----|
| `bte:statusChanged` | ✅ Trigger | ❌ NOT FOUND | Mismatch | Rename to `publicationStatusChanged` |
| `publicationStatusChanged` | ✅ CSS Manager | ✅ Multiple | OK | Keep (STANDARD) |
| `publicationLoaded` | ✅ Trigger | ❌ NOT FOUND | Orphan | Remove (no listeners) |

### Standard Events (OK)

| Event Name | Admin | Frontend | Status |
|------------|-------|----------|--------|
| `themeEditorPublished` | ✅ | ✅ | ✅ Synced |
| `themeEditorDraftSaved` | ✅ | ✅ | ✅ Synced |
| `navigationChanged` | ✅ | ✅ | ✅ Synced |
| `panelShown` | ✅ | ✅ | ✅ Synced |
| `panelHidden` | ✅ | ✅ | ✅ Synced |
| `navigationDisabledClick` | ✅ | ✅ | ✅ Synced |
| `loadThemeEditorFromPublication` | ✅ | ✅ | ✅ Synced |
| `openPublicationHistoryModal` | ✅ | ✅ | ✅ Synced |
| `paletteColorChanged` | ✅ | ✅ | ✅ Synced |
| `paletteChangesReverted` | ✅ | ✅ | ✅ Synced |

### Admin-Specific Events (OK - architectural differences)

| Event Name | Purpose | Reason |
|------------|---------|--------|
| `bte:iframeReloaded` | IFrame helper | Admin uses iframe, Frontend uses device frame |
| `bte:pageTypeChanged` | IFrame navigation | Admin-specific preview mechanism |
| `bte:cssManagerReady` | Initialization | Admin initialization timing |

---

## 📂 ФАЙЛИ З ПРОБЛЕМАМИ

### Event Mismatches

**Admin triggers wrong events:**
```
view/adminhtml/web/js/editor/toolbar/publication-selector.js:289  → bte:statusChanged ❌
view/adminhtml/web/js/editor/toolbar/publication-selector.js:327  → bte:statusChanged ❌
view/adminhtml/web/js/editor/toolbar/publication-selector.js:328  → publicationLoaded ❌ (orphan)
```

**Admin listens for wrong events:**
```
view/adminhtml/web/js/editor/toolbar.js:345  → bte:statusChanged ❌
```

**Correct (should match):**
```
view/frontend/web/js/toolbar/publication-selector.js:158  → publicationStatusChanged ✅
```

### Selector Mismatches

**Admin uses old IDs:**
```
view/adminhtml/templates/editor/index.phtml      → #bte-toolbar, #bte-navigation ❌
view/adminhtml/web/js/editor/toolbar.js:79       → #bte-toolbar ❌
view/adminhtml/web/js/editor/toolbar.js:91       → #bte-navigation ❌
```

**Frontend uses correct IDs:**
```
view/frontend/web/template/toolbar.html          → #breeze-theme-editor-toolbar, #toolbar-navigation ✅
view/frontend/web/js/toolbar.js:74,134           → correct IDs ✅
```

**Workaround in both:**
```
view/adminhtml/web/js/editor/panel/settings-editor.js:68  → $('#bte-navigation, #toolbar-navigation') ⚠️
view/frontend/web/js/theme-editor/settings-editor.js:71   → $('#bte-navigation, #toolbar-navigation') ⚠️
```

---

## ✅ РЕКОМЕНДАЦІЇ

### 1. Негайно виправити (ЕТАП 0)

**Пріоритет:** 🔴 КРИТИЧНО  
**Часовитрати:** 15 хвилин

- [ ] Змінити `bte:statusChanged` → `publicationStatusChanged` в publication-selector.js (2 місця)
- [ ] Змінити listener в toolbar.js
- [ ] Видалити orphan event `publicationLoaded`
- [ ] Протестувати зміну публікацій → Settings Editor має перезавантажуватись

**Результат:** Основний баг виправлено ✅

---

### 2. Виправити архітектуру (ЕТАПИ 1-4)

**Пріоритет:** 🟡 ВИСОКИЙ (якість коду)  
**Часовитрати:** 1.5-2 години

- [ ] Уніфікувати всі селектори (як в плані)
- [ ] Очистити HTML структуру
- [ ] Перейменувати widget
- [ ] Додати lazy loading

**Результат:** 100% відповідність з Frontend ✅

---

### 3. Додаткові покращення (опціонально)

**Пріоритет:** 🟢 НИЗЬКИЙ  
**Часовитрати:** 1-2 години

- [ ] Створити constants для всіх event names
- [ ] Додати JSDoc коментарі для всіх events
- [ ] Написати тести для event flow
- [ ] Задокументувати Admin-specific events

---

## 📈 ПЛАН ДІЙ

### Варіант А: Тільки critical fix (швидко)

**Часовитрати:** 15 хвилин  
**Результат:** Основний баг виправлено

1. Виконати ЕТАП 0 з плану
2. Протестувати
3. Закомітити

**Плюси:**
- ✅ Швидко
- ✅ Мінімальний ризик
- ✅ Виправляє головну проблему

**Мінуси:**
- ❌ Архітектурні невідповідності залишаються
- ❌ Workarounds залишаються

---

### Варіант Б: Повний alignment (рекомендовано)

**Часовитрати:** 2-2.5 години  
**Результат:** 100% Admin-Frontend alignment

1. Виконати всі ЕТАПИ 0-5 з плану
2. Повне тестування
3. Закомітити

**Плюси:**
- ✅ Повністю вирішує проблему
- ✅ Уніфікована архітектура
- ✅ Легко підтримувати в майбутньому
- ✅ Немає workarounds

**Мінуси:**
- ⚠️ Потребує більше часу
- ⚠️ Більше файлів для тестування

---

## 📝 НАСТУПНІ КРОКИ

### Зараз (Immediate)

1. **Прийняти рішення:** Варіант А чи Б?
2. **Якщо Варіант А:** Виконати ЕТАП 0 (15 хв)
3. **Якщо Варіант Б:** Виконати ЕТАПИ 0-5 (2-2.5 год)

### Після виправлення

1. Протестувати всі сценарії
2. Закомітити зміни
3. Оновити документацію
4. (Опціонально) Створити тести

### Довгострокове

1. Створити guideline для event naming
2. Додати CI check для event consistency
3. Задокументувати архітектурні відмінності Admin vs Frontend

---

## 🎉 ПІДСУМОК

### Що знайшли:

- 🔴 **2 критичних проблеми** (події + селектори)
- 🟡 **1 orphan event** (потрібно видалити)
- ✅ **12 подій працюють коректно**
- ✅ **Більшість селекторів консистентні**

### Головний баг:

**Settings Editor не перезавантажується при зміні публікацій** через невідповідність назв подій.

### Рішення:

**ЕТАП 0 (15 хв):** Змінити 3 рядки коду → баг виправлено  
**ЕТАПИ 1-4 (2 год):** Повна уніфікація архітектури

### Рекомендація:

**Виконати повний alignment (Варіант Б)** - виправляє не тільки баг, але й забезпечує довгострокову якість коду.

---

**Автор:** OpenCode AI  
**Дата:** 18 лютого 2026  
**Статус:** ✅ Аудит завершено, план готовий до виконання
