# Publication Selector Refactoring Documentation

Документація про рефакторинг Admin Publication Selector для приведення до архітектури frontend версії.

---

## 📚 Файли

### 1. [plan.md](plan.md) - Головний План Рефакторінгу
**Для кого:** Для виконання рефакторінгу у новій сесії  
**Що містить:**
- Поточний стан проекту (що зроблено)
- 3 етапи рефакторінгу з детальними інструкціями
- Код приклади для кожного кроку
- Команди для тестування
- Чеклисти для кожного етапу
- Варіанти виконання (поступовий/швидкий/повний)

**Читай першим!** Це головний робочий документ.

---

### 2. [summary.md](summary.md) - CSS Architecture Refactoring Summary
**Для кого:** Для контексту про попередні зміни  
**Що містить:**
- Опис проблеми з CSS switching
- Детальний аналіз виправлень
- Статистика змін (PHP, JS, commits)
- Before/After порівняння
- Очікувані логи для діагностики

**Читай для розуміння:** Що було зроблено в CSS Manager і чому.

---

### 3. [checklist.md](checklist.md) - Testing Checklist
**Для кого:** Для тестування після кожного етапу  
**Що містить:**
- Чеклисти для базової ініціалізації
- Сценарії тестування (Draft/Published/Publication)
- Типові проблеми і рішення
- Критерії успіху
- Форма для результатів тестування

**Використовуй:** Після завершення кожного етапу рефакторінгу.

---

### 4. [debug-script.js](debug-script.js) - Browser Console Debug Tool
**Для кого:** Для діагностики проблем у browser console  
**Що містить:**
- Функції для перевірки CSS Manager стану
- Хелпери для тестування перемикання
- Утиліти для перевірки localStorage
- Інспекція DOM elements

**Використовуй:** Copy-paste в DevTools Console для швидкої діагностики.

---

## 🎯 З Чого Почати

### Для Нової Сесії Рефакторінгу:

1. **Прочитай [plan.md](plan.md)** - головний робочий документ
2. **Переглянь [summary.md](summary.md)** - для контексту про попередні зміни
3. **Обери варіант виконання:**
   - Варіант A: Поступовий (Етап 1 → 2 → 3)
   - Варіант B: Швидкий (тільки Етап 1)
   - Варіант C: Повний (всі етапи відразу)
4. **Після кожного етапу:** використовуй [checklist.md](checklist.md)
5. **Якщо проблеми:** використовуй [debug-script.js](debug-script.js)

---

## 📊 Статус Рефакторінгу

### ✅ Виконано (до цієї документації):

#### CSS Manager Bug Fixes
- ✅ CSS switching працює (Draft/Published/Publication)
- ✅ Iframe navigation state restoration
- ✅ Force reflow для надійності
- ✅ Видалено PHP draft rendering

**Commits:**
- `cee6a71` - Simplify CSS architecture
- `42255cf` - Add force reflow
- `5d3a068` - Restore CSS state on iframe navigation
- `d7eb745` - Dynamic iframe document
- `13d04d2` - Fix DeviceFrame dependency

#### Storage Helper
- ✅ Frontend версія створена і інтегрована
- ✅ Admin версія створена
- ⏳ Admin версія НЕ інтегрована (TODO в Етапі 1)

---

### ⏳ Треба Зробити:

#### Етап 1: UX Покращення (~50% залишилось)
- ⏳ Інтегрувати StorageHelper в admin publication-selector.js
- ⏳ Відображення publication title
- ⏳ Badges для всіх режимів
- ⏳ Checkmarks для active items

#### Етап 2: Performance (не розпочато)
- ⏳ Smart update методи
- ⏳ Computed values
- ⏳ i18n локалізація

#### Етап 3: Модулі (не розпочато)
- ⏳ renderer.js
- ⏳ metadata-loader.js
- ⏳ Зменшити main file з 640 → 230 рядків

---

## 🔧 Корисні Команди

### Очистка кешу
```bash
docker exec magento248local-phpfpm-1 bash -c "rm -rf var/cache var/view_preprocessed pub/static/adminhtml && php bin/magento cache:flush"
```

### Git workflow
```bash
# Бекап перед початком
git branch backup-before-refactoring

# Після кожного етапу
git add .
git commit -m "refactor(admin): Complete Stage X - [опис]"

# Якщо щось зламалось
git reset --hard HEAD  # відкат
```

### Показати статус
```bash
git status
git log --oneline -10
git diff
```

---

## 📂 Пов'язані Файли

### Frontend (для референсу):
```
view/frontend/web/js/toolbar/publication-selector.js
view/frontend/web/js/toolbar/publication-selector/renderer.js
view/frontend/web/js/toolbar/publication-selector/metadata-loader.js
view/frontend/web/js/theme-editor/storage-helper.js
```

### Admin (що рефакторимо):
```
view/adminhtml/web/js/editor/toolbar/publication-selector.js
view/adminhtml/web/template/editor/publication-selector.html
view/adminhtml/web/js/editor/storage-helper.js
view/adminhtml/web/js/editor/css-manager.js
```

---

## 📞 Якщо Виникнуть Питання

1. **Перечитай [plan.md](plan.md)** - там є troubleshooting секція
2. **Запусти [debug-script.js](debug-script.js)** в browser console
3. **Перевір [checklist.md](checklist.md)** - типові проблеми описані там
4. **Подивись [summary.md](summary.md)** - для розуміння що було змінено в CSS Manager

---

**Дата створення:** 2026-02-13  
**Останнє оновлення:** 2026-02-13  
**Автор:** OpenCode AI
