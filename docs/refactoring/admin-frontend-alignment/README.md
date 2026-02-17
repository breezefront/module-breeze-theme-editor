# Admin → Frontend Architecture Alignment

**Статус:** 🔴 Потребує виконання  
**Пріоритет:** 🔴 Високий (довгострокова якість)  
**Час:** ~1.5-2 години

---

## 📌 Короткий опис

Рефакторинг для приведення Admin панелей до **100% відповідності з Frontend архітектурою**:

- Уніфікація назв (`#bte-panels-container`, `themeSettingsEditor`)
- Чиста структура HTML (widget рендерить ВСЕ)
- Lazy loading через navigation.js
- Масштабована архітектура (легко додавати панелі)

---

## 🎯 Проблеми які вирішуємо

| Проблема | До | Після |
|----------|-----|-------|
| **Неконсистентні назви** | `#bte-panels`, `breezeSettingsEditor` | `#bte-panels-container`, `themeSettingsEditor` |
| **Дублікат HTML** | Header в phtml + header в template | Widget рендерить ВСЕ |
| **Eager ініціалізація** | Widget створюється в toolbar.js | Lazy loading в navigation.js |
| **Важко додавати панелі** | Треба змінювати 3+ файли | Просто config в navigation |

---

## 📊 Що змінюється

### 7 файлів:

1. **index.phtml** - перейменувати контейнер, очистити HTML панелей
2. **constants.js** - оновити `PANELS` selector
3. **toolbar.js** - видалити eager init, передати `panelWidgets` config
4. **navigation.js** - додати `panelWidgets`, `_initializePanel()` метод
5. **settings-editor.js** - перейменувати widget
6. **_panels.less** - оновити CSS selector

### Статистика:

- **Файлів змінено:** 6
- **Рядків коду:** +59 / -33 (net +26)
- **Час виконання:** 1.5-2 години

---

## 🚀 Швидкий старт

### 1. Прочитайте детальний план

📄 **[plan.md](plan.md)** - повний покроковий план з прикладами коду

### 2. Виконайте 5 етапів:

| Етап | Що робити | Час |
|------|-----------|-----|
| **1** | Перейменувати контейнер (`#bte-panels` → `#bte-panels-container`) | 20 хв |
| **2** | Очистити HTML панелей (видалити header/wrapper) | 15 хв |
| **3** | Перейменувати widget (`breezeSettingsEditor` → `themeSettingsEditor`) | 10 хв |
| **4** | Перенести ініціалізацію (toolbar.js → navigation.js lazy) | 30 хв |
| **5** | Протестувати (кеш + браузер) | 20 хв |

### 3. Перевірте результат

**Відкрити Admin → Theme Editor → Console:**
```javascript
// Має побачити:
✅ Navigation initialized
🔄 Switching navigation to: theme-editor
✅ Panel initialized: theme-editor → themeSettingsEditor
👁️ Panel shown: theme-editor-panel
```

**Візуально:**
- ✅ Панель відкривається зліва
- ✅ Widget створив header + content
- ✅ Кнопка × працює
- ✅ Toggle працює

---

## 📚 Додаткові файли

### Документація:

- **[plan.md](plan.md)** - детальний покроковий план (5 етапів)
- **[test-examples.md](test-examples.md)** - приклади тестів для навігації

### Тести:

Після виконання рефакторингу рекомендується створити тести:
- `view/adminhtml/web/js/test/tests/navigation-lazy-loading-test.js`
- `view/adminhtml/web/js/test/tests/panel-lifecycle-test.js`

Приклади в **[test-examples.md](test-examples.md)**

---

## ⚠️ Передумови

Цей рефакторинг базується на завершених фазах:

✅ **navigation-panel-integration/Phase 1** (HTML панелей в DOM)  
✅ **navigation-panel-integration/Phase 2** (CSS positioning fix)

**Без цих фаз рефакторинг не працюватиме!**

---

## 🔗 Зв'язані плани

### Попередні:
- [navigation-panel-integration](../navigation-panel-integration/README.md) (Phase 1 & 2)

### Наступні:
- JS Tests для навігації (2-3 години)
- Додаткові панелі (Content Builder, Inspector)

---

## ✅ Очікуваний результат

### Архітектурно:
- ✅ 100% відповідність з Frontend
- ✅ Чиста відповідальність (widget = DOM owner)
- ✅ Lazy loading (швидший startup)
- ✅ Масштабованість (легко додати панелі)

### Функціонально:
- ✅ Панель відкривається (lazy init)
- ✅ Widget рендерить весь HTML
- ✅ Закриття працює (× + toggle)
- ✅ Повторне відкриття без re-init

---

## 📝 Після виконання

**Commit:**
```bash
git commit -m "refactor(navigation): align admin with frontend architecture"
```

**Tests:** Створити тести (приклади в test-examples.md)

**Documentation:** Оновити CHANGELOG

---

**Автор:** OpenCode AI  
**Дата:** 17 лютого 2026
