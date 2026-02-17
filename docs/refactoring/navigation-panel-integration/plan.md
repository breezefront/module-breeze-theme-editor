# Navigation Panel Integration Plan

**Дата створення**: 17 лютого 2026  
**Статус**: 🟡 Готовий до виконання  
**Час виконання**: 30-40 хвилин (Варіант 1) або 2-3 години (Варіант 2)

---

## 🎯 ПРОБЛЕМА

### Симптом
По кліку на кнопку Navigation (наприклад "Theme Editor") **нічого не відкривається**.

### Діагноз
В admin версії **відсутня HTML розмітка панелей** у DOM.

**Що є зараз:**
```html
<!-- view/adminhtml/templates/editor/index.phtml -->
<div id="bte-panels" class="bte-panels"></div>  <!-- ПОРОЖНІЙ контейнер! -->
```

**Що очікує navigation.js:**
```javascript
// _showPanel() шукає панель за ID:
var $panel = $('#theme-editor-panel');  // ❌ НЕ ЗНАХОДИТЬ!
```

### Порівняння з Frontend

#### ✅ Frontend (працює):
```javascript
// view/frontend/web/js/toolbar.js створює HTML при ініціалізації:
var panelsHtml = 
    '<div id="bte-panels-container">' +
        '<div id="theme-editor-panel" class="bte-panel"></div>' +
        '<div id="content-builder-panel" class="bte-panel disabled"></div>' +
    '</div>';
$('body').append(panelsHtml);
```

#### ❌ Admin (НЕ працює):
- Toolbar.js **НЕ створює** панелі
- index.phtml має **порожній** контейнер
- Navigation.js шукає панель, але **не знаходить**

---

## 📋 ВАРІАНТИ РІШЕННЯ

### Варіант 1: HTML в index.phtml (Простий) ⭐ РЕКОМЕНДУЮ

**Час:** 30-40 хвилин  
**Складність:** 🟢 Легко  
**Ризик:** 🟢 Низький

**Підхід:**
- Додати HTML панелей безпосередньо в `index.phtml`
- Панелі завжди в DOM при завантаженні
- Navigation.js працює "як є" (show/hide)

**Переваги:**
- ✅ Швидко і просто
- ✅ Мінімальні зміни в коді
- ✅ Працює з існуючим navigation.js
- ✅ Легко тестувати

**Недоліки:**
- ⚠️ Панелі завжди в DOM (навіть якщо не використовуються)
- ⚠️ HTML дублюється між frontend і admin

---

### Варіант 2: Динамічне створення в toolbar.js (Як Frontend)

**Час:** 2-3 години  
**Складність:** 🟡 Середньо  
**Ризик:** 🟡 Середній

**Підхід:**
- Toolbar.js створює панелі при ініціалізації
- Navigation.js додати метод `_initializePanel()` (lazy loading)
- Повна відповідність frontend архітектурі

**Переваги:**
- ✅ Чиста архітектура
- ✅ Lazy loading панелей
- ✅ Консистентність з frontend
- ✅ Легше додавати нові панелі

**Недоліки:**
- ⚠️ Більше часу (2-3 години)
- ⚠️ Більше змін в коді
- ⚠️ Потрібно тестувати ініціалізацію

---

### Варіант 3: Гібридний (Toolbar створює HTML, Navigation lazy init)

**Час:** 1.5 години  
**Складність:** 🟡 Середньо  
**Ризик:** 🟢 Низький

**Компроміс між варіантами 1 і 2:**
- Toolbar.js створює порожні `<div>` панелей
- Navigation.js ініціалізує widget при першому відкритті
- Панелі в DOM, але widget lazy

---

## ✅ РЕКОМЕНДАЦІЯ: Варіант 1

**Чому саме Варіант 1:**
1. **Швидко** - 30-40 хвилин замість 2-3 годин
2. **Достатньо** - зараз тільки 1 активна панель (Theme Editor)
3. **Безпечно** - мінімальні зміни, менше ризику
4. **Працює** - navigation.js вже має всю потрібну логіку

**Коли використовувати Варіант 2:**
- Якщо плануєте додати багато панелей (5+)
- Якщо потрібен lazy loading для performance
- Якщо хочете 100% відповідність frontend архітектурі

---

## 🛠️ ВИКОНАННЯ: ВАРІАНТ 1 (Детальний План)

### Етап 1: Додати HTML панелей (15 хв)

**Файл:** `view/adminhtml/templates/editor/index.phtml`

**Де змінювати:** Після рядка 34

**Було:**
```html
<!-- Panels container - for side panels (theme editor, etc) -->
<div id="bte-panels" class="bte-panels"></div>
```

**Стане:**
```html
<!-- Panels container - for side panels (theme editor, etc) -->
<div id="bte-panels" class="bte-panels">
    <!-- Theme Editor Panel -->
    <div id="theme-editor-panel" 
         class="bte-panel" 
         style="display: none;"
         data-panel-type="theme-editor">
        <!-- Content will be initialized by settings-editor.js widget -->
        <div class="panel-loading">
            <p>Loading Theme Editor...</p>
        </div>
    </div>
    
    <!-- Content Builder Panel (PRO feature - disabled) -->
    <div id="content-builder-panel" 
         class="bte-panel disabled" 
         style="display: none;"
         data-panel-type="content-builder">
        <div class="panel-placeholder">
            <div class="panel-placeholder-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M20.67 23.33V2M2 23.33h44.67M43.07 44.67H3.6c-.43 0-.84-.17-1.14-.47-.3-.3-.47-.71-.47-1.14V3.6c0-.43.17-.84.47-1.14.3-.3.71-.47 1.14-.47h39.47c.43 0 .84.17 1.14.47.3.3.47.71.47 1.14v39.47c0 .43-.17.84-.47 1.14-.3.3-.71.47-1.14.47z" stroke="currentColor" stroke-width="2"/>
                </svg>
            </div>
            <h3>Content Builder</h3>
            <p>Visual page builder is available in PRO version</p>
            <a href="https://swissuplabs.com/magento-page-builder.html" 
               target="_blank" 
               class="btn-primary">
                Learn More
            </a>
        </div>
    </div>
</div>
```

**Пояснення змін:**
1. **`#theme-editor-panel`** - основна панель Theme Editor
   - `style="display: none;"` - спочатку прихована
   - `data-panel-type` - для ідентифікації типу панелі
   - Буде заповнена settings-editor.js widget (вже ініціалізується в toolbar.js)

2. **`#content-builder-panel`** - заглушка для PRO версії
   - `class="disabled"` - позначає що недоступна
   - Показує placeholder з посиланням на PRO версію

---

### Етап 2: Додати CSS стилі (10 хв)

**Файл:** `view/adminhtml/web/css/source/_editor.less`

**Якщо файлу немає, створити:** `view/adminhtml/web/css/editor.css`

**Додати стилі:**

```css
/**
 * Breeze Theme Editor - Panels
 */

/* Panels Container */
.bte-panels {
    position: fixed;
    top: 60px; /* Під toolbar */
    right: 0;
    bottom: 0;
    width: 0; /* Спочатку прихований */
    background: #fff;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    transition: width 0.3s ease;
    z-index: 999;
    overflow: hidden;
}

/* Коли панель активна - зсув контенту */
body.bte-panel-active .bte-panels {
    width: 360px;
}

/* Окрема панель */
.bte-panel {
    width: 360px;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background: #fff;
    position: absolute;
    top: 0;
    right: 0;
    display: none; /* Спочатку всі приховані */
}

.bte-panel.active {
    display: block;
}

/* Disabled Panel Placeholder */
.bte-panel.disabled {
    background: #f5f5f5;
}

.panel-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px;
    text-align: center;
    color: #666;
}

.panel-placeholder-icon {
    width: 80px;
    height: 80px;
    margin-bottom: 20px;
    opacity: 0.3;
}

.panel-placeholder-icon svg {
    width: 100%;
    height: 100%;
}

.panel-placeholder h3 {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 10px;
    color: #333;
}

.panel-placeholder p {
    font-size: 14px;
    margin: 0 0 20px;
    line-height: 1.5;
}

.panel-placeholder .btn-primary {
    display: inline-block;
    padding: 10px 24px;
    background: #1979c3;
    color: #fff;
    text-decoration: none;
    border-radius: 3px;
    font-weight: 600;
    transition: background 0.2s;
}

.panel-placeholder .btn-primary:hover {
    background: #145d8f;
}

/* Loading State */
.panel-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    font-size: 14px;
}

/* Responsive - зменшити ширину на малих екранах */
@media (max-width: 1366px) {
    body.bte-panel-active .bte-panels {
        width: 320px;
    }
    
    .bte-panel {
        width: 320px;
    }
}

/* Зсув iframe коли панель відкрита */
body.bte-panel-active .bte-preview {
    margin-right: 360px;
    transition: margin-right 0.3s ease;
}

@media (max-width: 1366px) {
    body.bte-panel-active .bte-preview {
        margin-right: 320px;
    }
}
```

**Пояснення стилів:**
1. `.bte-panels` - контейнер панелей (фіксований справа)
2. `body.bte-panel-active` - клас додається navigation.js коли панель відкрита
3. `.bte-panel` - окрема панель (360px ширина)
4. `.panel-placeholder` - красива заглушка для disabled панелей
5. Responsive - зменшення ширини на малих екранах
6. Iframe зсувається вліво коли панель відкрита

---

### Етап 3: Перевірити ініціалізацію Settings Editor (5 хв)

**Файл:** `view/adminhtml/web/js/editor/toolbar.js`

**Перевірити рядки 99-116:**

```javascript
// Initialize settings editor panel
if ($('#theme-editor-panel').length) {
    // Store config globally for settings-editor to access
    window.breezeThemeEditorConfig = {
        storeId: config.storeId,
        themeId: config.themeId,
        themeName: config.themeName || 'Theme',
        adminUrl: config.adminUrl || '/admin',
        graphqlEndpoint: config.graphqlEndpoint
    };
    
    $('#theme-editor-panel').breezeSettingsEditor({
        storeId: config.storeId,
        themeId: config.themeId,
        themeName: config.themeName || 'Theme'
    });
    console.log('✅ Settings editor panel initialized');
}
```

**Якщо цього блоку немає** - додати після ініціалізації navigation (після рядка 97).

**Це вже має працювати**, тому що:
- Settings editor widget вже реалізований (Phase 3B)
- Тепер панель `#theme-editor-panel` буде існувати в DOM
- Widget автоматично заповнить панель контентом

---

### Етап 4: Очистити кеш (2 хв)

**Виконати команди:**

```bash
# Очистити Magento cache
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && php bin/magento cache:clean"

# Видалити згенеровані CSS/JS
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor"

# Опціонально: очистити var/view_preprocessed
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && rm -rf var/view_preprocessed"
```

---

### Етап 5: Тестування в браузері (10 хв)

#### Тест 1: Перевірити що панелі існують

1. Відкрити admin → Theme Editor
2. Відкрити DevTools (F12) → Console
3. Виконати:

```javascript
// Перевірити що контейнер панелей існує
console.log('Panels container:', $('#bte-panels').length); // Має бути 1

// Перевірити що панелі існують
console.log('Theme editor panel:', $('#theme-editor-panel').length); // Має бути 1
console.log('Content builder panel:', $('#content-builder-panel').length); // Має бути 1

// Перевірити що navigation widget ініціалізований
console.log('Navigation widget:', $('#bte-navigation').data('swissup-breezeNavigation')); // Має бути object
```

**Очікуваний результат:**
```
Panels container: 1
Theme editor panel: 1
Content builder panel: 1
Navigation widget: Object {...}
```

---

#### Тест 2: Перевірити відкриття Theme Editor

1. Клікнути на кнопку **"Theme Editor"** в navigation
2. Очікуваний результат:
   - ✅ Панель з'являється справа (360px)
   - ✅ Кнопка стає активною (active клас)
   - ✅ Iframe зсувається вліво
   - ✅ В консолі:
     ```
     🔄 Switching navigation to: theme-editor
     ✅ Navigation activated: theme-editor
     🙈 All panels hidden
     👁️ Panel shown: theme-editor-panel
     ```

3. Перевірити в Elements панелі:
   - `<body>` має клас `bte-panel-active`
   - `#theme-editor-panel` має клас `active` та `display: block`

---

#### Тест 3: Перевірити toggle (закриття панелі)

1. Повторно клікнути на **"Theme Editor"**
2. Очікуваний результат:
   - ✅ Панель ховається
   - ✅ Кнопка стає неактивною
   - ✅ Iframe повертається на повну ширину
   - ✅ В консолі:
     ```
     🔄 Toggling off active navigation: theme-editor
     ✅ Navigation deactivated: theme-editor
     🙈 Panel hidden: theme-editor-panel
     ```

---

#### Тест 4: Перевірити disabled панель (Content Builder)

1. Клікнути на **"Content Builder"** (має badge "PRO")
2. Очікуваний результат:
   - ✅ Панель НЕ відкривається
   - ✅ В консолі:
     ```
     ⚠️ Navigation item is disabled: content-builder
     ℹ️ Disabled item clicked: content-builder → Content Builder is available in PRO version
     ```
   - ⚠️ Може показати alert (залежить від налаштувань)

---

#### Тест 5: Перевірити Settings Editor працює

1. Відкрити Theme Editor панель
2. Перевірити що:
   - ✅ Видно список секцій (General, Typography, Colors тощо)
   - ✅ Можна відкрити секцію (клік по заголовку)
   - ✅ Видно поля (inputs, color pickers тощо)
   - ✅ Можна змінити значення і побачити live preview

**Якщо щось не працює** - перевірити консоль на помилки.

---

### Етап 6: Виправлення можливих проблем

#### Проблема 1: Панель не з'являється

**Симптом:**
```
👁️ Panel shown: theme-editor-panel
⚠️ Panel not found: theme-editor-panel
```

**Рішення:**
- Перевірити що HTML панелі доданий в index.phtml
- Очистити кеш ще раз
- Hard refresh (Ctrl+Shift+R)

---

#### Проблема 2: Панель з'являється, але порожня

**Симптом:** Панель відкривається, але всередині тільки "Loading Theme Editor..."

**Рішення:**
1. Перевірити що settings-editor ініціалізується:
   ```javascript
   $('#theme-editor-panel').data('swissup-breezeSettingsEditor')
   ```
   
2. Якщо undefined - перевірити toolbar.js рядки 99-116

3. Перевірити консоль на помилки завантаження модуля

---

#### Проблема 3: CSS не застосовується

**Симптом:** Панель працює, але виглядає криво (немає стилів)

**Рішення:**
1. Перевірити що CSS файл створений
2. Якщо використовуєте LESS:
   ```bash
   docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && php bin/magento setup:static-content:deploy -f"
   ```

3. Якщо використовуєте CSS - додати в layout:
   ```xml
   <page>
       <head>
           <css src="Swissup_BreezeThemeEditor::css/editor.css"/>
       </head>
   </page>
   ```

---

#### Проблема 4: Iframe не зсувається

**Симптом:** Панель відкривається, але перекриває iframe

**Рішення:**
Перевірити що CSS для `.bte-preview` додан:
```css
body.bte-panel-active .bte-preview {
    margin-right: 360px;
    transition: margin-right 0.3s ease;
}
```

---

## 📊 CHECKLIST ВИКОНАННЯ

- [ ] **Етап 1:** Додано HTML панелей в index.phtml
- [ ] **Етап 2:** Додано CSS стилі для панелей
- [ ] **Етап 3:** Перевірено ініціалізацію settings-editor в toolbar.js
- [ ] **Етап 4:** Очищено кеш Magento
- [ ] **Етап 5:** Протестовано в браузері:
  - [ ] Тест 1: Панелі існують в DOM
  - [ ] Тест 2: Theme Editor відкривається
  - [ ] Тест 3: Theme Editor закривається (toggle)
  - [ ] Тест 4: Content Builder показує disabled message
  - [ ] Тест 5: Settings Editor працює (поля, live preview)
- [ ] **Етап 6:** Виправлено всі знайдені проблеми

---

## ✅ ОЧІКУВАНИЙ РЕЗУЛЬТАТ

Після виконання всіх кроків:

### Візуально:
1. **Кнопка Theme Editor** в navigation працює
2. **Панель з'являється справа** (360px ширина)
3. **Iframe зсувається вліво** (щоб не перекривалась)
4. **Settings Editor показує поля** для редагування теми
5. **Зміни видно в live preview** в iframe
6. **Toggle працює** - повторний клік закриває панель
7. **Content Builder показує PRO placeholder**

### Технічно:
1. ✅ `#theme-editor-panel` існує в DOM
2. ✅ Navigation widget ініціалізований
3. ✅ Settings Editor widget ініціалізований
4. ✅ CSS застосований
5. ✅ Немає помилок в консолі
6. ✅ Events спрацьовують (`navigationChanged`, `panelShown`, `panelHidden`)

### В консолі при відкритті панелі:
```
🔄 Switching navigation to: theme-editor
✅ Navigation activated: theme-editor
🙈 All panels hidden
👁️ Panel shown: theme-editor-panel
✅ Settings editor initialized
```

---

## 📝 КОМІТ ПІСЛЯ ВИКОНАННЯ

```bash
git add view/adminhtml/templates/editor/index.phtml
git add view/adminhtml/web/css/editor.css  # або .less файл
git commit -m "feat(navigation): add panel HTML markup to enable panel display

- Add theme-editor-panel and content-builder-panel to index.phtml
- Add CSS styles for panels container and individual panels
- Add PRO placeholder for disabled Content Builder panel
- Fix navigation click not showing panels (panels were missing in DOM)

Closes: Navigation integration issue
Tested: Theme Editor opens/closes on navigation click"
```

---

## 🔗 Наступні кроки

Після успішної інтеграції navigation панелей:

1. **Phase 4 - Polish & Optimization** (6 годин)
   - Error handling
   - Loading states
   - Performance optimization
   - UI/CSS polish

2. **Phase 5 - Testing & Documentation** (8-12 годин)
   - Browser testing
   - User documentation
   - Release notes

---

## 🆘 Підтримка

Якщо виникають проблеми під час виконання:

1. **Перевірити консоль** - часто помилки там
2. **Перевірити Elements панель** - чи панелі в DOM
3. **Очистити кеш ще раз** - Magento кешує все
4. **Hard refresh** - Ctrl+Shift+R
5. **Перевірити файли** - можливо не збереглись зміни

**Файли для перевірки:**
- `view/adminhtml/templates/editor/index.phtml` (рядки 34-70)
- `view/adminhtml/web/css/editor.css` (повний файл)
- `view/adminhtml/web/js/editor/toolbar.js` (рядки 99-116)

---

**Файл збережено:** `docs/refactoring/navigation-panel-integration/plan.md`

**Статус:** 🟡 Готовий до виконання в окремій сесії

**Очікуваний час:** 30-40 хвилин (+ 10 хв тестування)
