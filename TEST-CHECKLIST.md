# CSS Architecture Refactoring - Test Checklist

## ✅ Код перевірено
- [x] Синтаксис JS файлів валідний
- [x] PHP файли оновлено
- [x] Git commit створено

## 🧪 Тестування Admin Area

### 1. Базова ініціалізація
- [ ] Відкрити Theme Editor
- [ ] Перевірити console - не повинно бути помилок про відсутність `#bte-theme-css-variables-draft`
- [ ] Перевірити що `#bte-theme-css-variables` присутній в iframe
- [ ] Лог: `✅ CSS Manager initialized`

### 2. Перемикання DRAFT → PUBLISHED → DRAFT
- [ ] Клік на статус → вибрати "Draft"
- [ ] Лог: `📥 Loading draft CSS from GraphQL...`
- [ ] Лог: `✅ Draft CSS created dynamically`
- [ ] Лог: `📗 CSS Manager: Showing DRAFT`
- [ ] Перевірити в Elements: `#bte-theme-css-variables-draft` створено
- [ ] Перевірити: `media="all"`, `disabled=false`
- [ ] **ВІЗУАЛЬНО: Кольори змінилися на draft**

- [ ] Клік на статус → вибрати "Published"
- [ ] Лог: `📕 CSS Manager: Showing PUBLISHED`
- [ ] Перевірити: draft має `media="not all"`, `disabled=true`
- [ ] Перевірити: published має `media="all"`, `disabled=false`
- [ ] **ВІЗУАЛЬНО: Кольори повернулися до published**

### 3. Завантаження публікації
- [ ] Клік на статус → вибрати старішу публікацію (напр. "🟢 Green Theme")
- [ ] Лог: `📦 Fetching publication CSS: 6`
- [ ] Лог: `📝 Created style element: bte-publication-css-6`
- [ ] Лог: `✅ Updated style content: bte-publication-css-6 (XXX chars)`
- [ ] Лог: `📙 CSS Manager: Showing PUBLICATION 6`
- [ ] Перевірити в Elements: `#bte-publication-css-6` створено
- [ ] Перевірити: має `media="all"`, `disabled=false`
- [ ] Перевірити: published і draft мають `media="not all"`
- [ ] **ВІЗУАЛЬНО: Кольори змінилися на зелені (з публікації)**

### 4. Перемикання між публікаціями
- [ ] Вибрати іншу публікацію (напр. "Red Theme")
- [ ] Лог: старий publication-css disable
- [ ] Лог: новий publication-css enable
- [ ] **ВІЗУАЛЬНО: Кольори змінилися**

### 5. Нова тема (порожній draft)
- [ ] Створити нову тему або видалити всі draft значення
- [ ] Перемкнути на Draft
- [ ] Перевірити що CSS порожній або містить тільки `:root {}`
- [ ] Не повинно бути помилок

### 6. Force Reflow перевірка
- [ ] Відкрити DevTools → Elements
- [ ] Перемикати статуси швидко (Draft → Published → Draft)
- [ ] Перевірити що атрибути `media` і `disabled` оновлюються миттєво
- [ ] Перевірити що немає "залипання" старих стилів

## 🧪 Тестування Frontend (якщо є toolbar)

### 1. Відкрити сторінку з toolbar
- [ ] Додати `?bte_access_token=...` до URL
- [ ] Перевірити що toolbar з'явився
- [ ] Перевірити console - не повинно бути помилок

### 2. Перемикання статусів
- [ ] Вибрати Draft → перевірити кольори
- [ ] Вибрати Published → перевірити кольори
- [ ] Вибрати Publication → перевірити кольори

## 🐛 Відомі можливі проблеми

### Проблема 1: Draft CSS порожній
**Симптом:** При перемиканні на Draft кольори не змінюються
**Причина:** CSS з GraphQL порожній (`:root {}`)
**Рішення:** Це нормально якщо немає збережених draft значень

### Проблема 2: Publication не завантажується
**Симптом:** Лог `❌ Failed to load PUBLICATION CSS`
**Причина:** GraphQL помилка або публікація не існує
**Перевірка:** Відкрити Network → GraphQL запит → Response

### Проблема 3: Стилі "залипають"
**Симптом:** Після перемикання візуально нічого не змінюється
**Причина:** Force reflow не працює або браузер кешує
**Рішення:** Ctrl+Shift+R (hard refresh)

### Проблема 4: `#bte-theme-css-variables` не знайдено
**Симптом:** `❌ CSS Manager: #bte-theme-css-variables not found`
**Причина:** Template не відрендерився (модуль вимкнено або CSS порожній)
**Рішення:** Перевірити `Helper\Data::isEnabled()` і що є хоч одне збережене значення

## 📝 Checklist для різних сценаріїв

### Сценарій A: Існуюча тема з даними
- [ ] Published CSS присутній ✅
- [ ] Draft CSS відрізняється від published ✅
- [ ] Є декілька публікацій ✅
- [ ] Перемикання працює ✅

### Сценарій B: Нова тема (без даних)
- [ ] Published CSS порожній або `:root {}`
- [ ] Draft CSS порожній
- [ ] Перемикання не викликає помилок ✅
- [ ] Візуально нічого не змінюється (це OK)

### Сценарій C: Тема з тільки published (без draft)
- [ ] Published CSS присутній ✅
- [ ] Draft CSS = Published CSS (однакові)
- [ ] Візуально нічого не змінюється при перемиканні (це OK)

## 🎯 Критерії успіху

1. ✅ Немає JS помилок в console
2. ✅ Draft CSS створюється динамічно через GraphQL
3. ✅ Перемикання між статусами працює
4. ✅ Візуальні зміни застосовуються миттєво
5. ✅ Publications завантажуються і відображаються правильно
6. ✅ Force reflow працює (немає "залипання")
7. ✅ Нові теми не викликають помилок

## 📊 Результати тестування

**Дата:** _________________
**Тестував:** _________________
**Браузер:** _________________
**Magento версія:** _________________

### Знайдені проблеми:
1. 
2. 
3. 

### Примітки:

