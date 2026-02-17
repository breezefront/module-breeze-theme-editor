# Navigation Panel Integration Plan

**Дата створення**: 17 лютого 2026  
**Дата оновлення**: 17 лютого 2026 (додано Phase 2: CSS Fix)  
**Статус**: 🟢 Phase 1 виконано → 🔴 Phase 2 потребує виконання  
**Час виконання**: 
- Phase 1: 30-40 хвилин ✅ ВИКОНАНО
- Phase 2: 25-30 хвилин ⏳ ПОТРЕБУЄ ВИКОНАННЯ

---

## 📋 PHASE 1: HTML INTEGRATION ✅ ВИКОНАНО

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

---

## 🔴 PHASE 2: CSS FIX - Панель справа замість зліва

**Дата виявлення:** 17 лютого 2026  
**Статус:** 🔴 Критично - панель працює, але UX відрізняється від frontend  
**Час виконання:** 25-30 хвилин

---

### 🐛 ПРОБЛЕМА

Після виконання Phase 1 (HTML панелей) виявлено:

**Симптом:**
- ✅ Панель відкривається (клік працює)
- ❌ Панель з'являється **СПРАВА** замість зліва
- ❌ Панель **перекриває** iframe замість зсуву
- ❌ Анімація через `right:` замість `transform:`

**Діагноз:**

CSS в admin відрізняється від frontend:

| Параметр | Frontend (✅ правильно) | Admin (❌ неправильно) |
|----------|------------------------|------------------------|
| **Позиція** | `left: 0` | `right: 0` |
| **Анімація** | `transform: translateX(-100%)` | `right: -360px` |
| **Показ** | `transform: translateX(0)` | `right: 0` |
| **Зсув iframe** | `margin-left: 360px` | `width: calc(100% - 360px)` |
| **Файл стилів** | `panels/_panels.less` (53 рядки) | `_admin-preview.less` (змішано з iframe) |

**Корінь проблеми:**

1. **Структурна проблема:** В admin стилі панелей знаходяться в `_admin-preview.less` (файл для **iframe preview**), а не в окремому `panels/_panels.less`

2. **Неправильна назва файлу:** `_admin-preview.less` має стилі для:
   - Preview iframe ✅ (по темі файлу)
   - **Панелей** ❌ (не по темі файлу)
   
   Це як назвати файл "engine.js" і писати туди код кондиціонера 🤦

3. **Відсутній окремий файл:** Frontend має `panels/_panels.less` (контейнер панелей), admin — немає.

4. **Різна логіка позиціонування:** Frontend використовує `transform` (GPU-прискорення), admin використовує `right` (повільніше).

---

### 🎯 МЕТА

Привести admin панелі до **100% відповідності з frontend**:

- ✅ Панель **зліва** (не справа)
- ✅ Контент **зсувається вправо** через margin (не зменшується width)
- ✅ **Структурована архітектура** - окремі файли замість одного полотна
- ✅ **Transform анімація** - швидша за позиційну
- ✅ **Той самий responsive** - 360px → full width на мобільних

---

### 📊 ПОРІВНЯННЯ СТРУКТУРИ

#### ✅ Frontend (правильна структура):

```
view/frontend/web/css/source/
├── _module.less
│   ├── @import 'panels/_panels.less';          # Контейнер панелей
│   ├── @import 'panels/_theme-editor-panel';   # Контент панелі
│
└── panels/
    ├── _panels.less                # Контейнер + анімація (53 рядки)
    ├── _theme-editor-panel.less    # Header, fields, buttons
    ├── _theme-editor-fields.less   # Color, font, range inputs
    └── _palette-section.less       # Palette UI
```

**Код frontend `panels/_panels.less`:**

```less
#bte-panels-container {
    position: fixed;
    top: @bte-toolbar-height;
    left: 0;                          // 👈 ЗЛІВА
    width: 360px;
    
    .bte-panel {
        transform: translateX(-100%); // 👈 Приховано ЗЛІВА
        transition: transform 0.3s ease;
        
        &.active {
            transform: translateX(0); // 👈 Виїжджає З ЛІВА
        }
    }
}

body.bte-panel-active {
    --bte-sidebar-width: 360px;       // 👈 CSS змінна для зсуву
}
```

**Використання змінної в `_utilities.less`:**

```less
body.breeze-theme-editor-active {
    margin-left: var(--bte-sidebar-width, 0px);  // 👈 Зсув контенту
}
```

---

#### ❌ Admin (поточна структура - неправильна):

```
view/adminhtml/web/css/source/
├── _module.less
│   ├── @import '_admin-preview.less';          # ❌ МІШАНина iframe + панелі
│
├── _admin-preview.less              # ❌ 92 рядки - мішанина!
│   ├── .bte-admin-editor            # ✅ OK - container
│   ├── .bte-preview                 # ✅ OK - iframe preview
│   ├── #bte-iframe                  # ✅ OK - iframe
│   ├── .bte-panels                  # ❌ НЕ ПО ТЕМІ! Має бути в panels/_panels.less
│   └── body.bte-panel-active        # ❌ НЕ ПО ТЕМІ! Зменшує width замість margin
│
└── panels/
    ├── ❌ _panels.less відсутній!   # Має бути тут!
    ├── _theme-editor-panel.less     # ✅ OK
    ├── _theme-editor-fields.less    # ✅ OK
    └── _palette-section.less        # ✅ OK
```

**Проблемний код admin `_admin-preview.less`:**

```less
.bte-panels {
    position: fixed;
    top: 60px;
    right: 0;                         // ❌ СПРАВА замість left: 0
    
    .bte-panel {
        right: -360px;                // ❌ right замість transform
        
        &.active {
            right: 0;                 // ❌ right замість transform
        }
    }
}

body.bte-panel-active {
    #bte-iframe {
        width: calc(100% - 360px);    // ❌ Зменшує width замість margin-left
    }
}
```

---

### ✅ РІШЕННЯ: Структурний рефакторинг

#### Етап 1: Створити `panels/_panels.less` (10 хв)

**Створити новий файл:** `view/adminhtml/web/css/source/panels/_panels.less`

**Код (адаптація з frontend):**

```less
//
// Breeze Theme Editor - Panels Container
// _____________________________________________

// Admin має інший контейнер: #bte-panels замість #bte-panels-container
#bte-panels {
    position: fixed;
    top: @bte-toolbar-height;  // 56px
    left: 0;                   // 👈 ЗЛІВА
    width: 360px;
    height: ~"calc(100vh - @{bte-toolbar-height})";
    z-index: @bte-toolbar-z-index - 1;
    pointer-events: none;

    .bte-panel {
        position: absolute;
        top: 0;
        left: 0;               // 👈 ЗЛІВА
        width: 100%;
        height: 100%;
        background: @bte-toolbar-bg;
        color: @bte-toolbar-text;
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);  // 👈 Тінь СПРАВА
        transform: translateX(-100%);  // 👈 Приховано ЗЛІВА
        transition: transform 0.3s ease;
        pointer-events: auto;
        overflow: hidden;

        &.active {
            transform: translateX(0);  // 👈 Виїжджає З ЛІВА
        }

        // Responsive - full width on mobile
        @media (max-width: @screen__m) {
            width: 100vw;
        }
    }
}

// CSS змінна для зсуву контенту (для консистентності з frontend)
body.bte-panel-active {
    --bte-sidebar-width: 360px;

    @media (max-width: @screen__m) {
        --bte-sidebar-width: 0px;
    }
}
```

**Відмінності від frontend:**

1. Селектор `#bte-panels` замість `#bte-panels-container` (різні HTML контейнери)
2. `@bte-toolbar-height` (56px) замість hardcoded 60px
3. `@media` замість LESS mixin `.media-width()` (admin не використовує Magento LESS міксини)

---

#### Етап 2: Очистити `_admin-preview.less` (5 хв)

**Видалити:** Рядки 33-92 (стилі `.bte-panels` та `body.bte-panel-active`)

**Додати:** Зсув preview через margin-left

**Файл після змін:**

```less
//
// Breeze Theme Editor - Admin Preview Iframe
// _____________________________________________

// Admin editor container
.bte-admin-editor {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

// Preview iframe container
.bte-preview {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: #f5f5f5;
    display: flex;
    justify-content: center;
    padding: 0;
    margin-left: 0;                        // 👈 Додати
    transition: margin-left 0.3s ease;     // 👈 Додати
}

// Preview iframe
#bte-iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
}

// Зсув preview коли панель активна
body.bte-panel-active {
    .bte-preview {
        margin-left: 360px;                // 👈 Зсув ВПРАВО

        @media (max-width: @screen__m) {
            margin-left: 0;                // 👈 Responsive - без зсуву на мобільних
        }
    }
}
```

**Результат:**
- Було: 92 рядки (iframe + панелі змішані)
- Стало: ~40 рядків (тільки iframe preview)
- Чиста відповідальність файлу ✅

---

#### Етап 3: Додати імпорт в `_module.less` (2 хв)

**Файл:** `view/adminhtml/web/css/source/_module.less`

**Знайти рядок 20:**

```less
// Panel styles (settings editor)
@import 'panels/_theme-editor-panel.less';
```

**Додати перед ним:**

```less
// Panels
@import 'panels/_panels.less';          // 👈 ДОДАТИ - контейнер панелей
@import 'panels/_theme-editor-panel.less';
```

**Повний блок після змін:**

```less
// Toolbar components (selectors)
@import 'components/_publication-selector.less';
@import 'components/_scope-selector.less';
@import 'components/_page-selector.less';

// Panels
@import 'panels/_panels.less';                   // 👈 НОВИЙ
@import 'panels/_theme-editor-panel.less';
@import 'panels/_theme-editor-fields.less';
@import 'panels/_palette-section.less';
```

**Важливо:** Імпорт `_panels.less` має бути **перед** `_theme-editor-panel.less`, бо:
- `_panels.less` визначає контейнер та базові стилі `.bte-panel`
- `_theme-editor-panel.less` розширює стилі для контенту панелі

---

#### Етап 4: Очистити кеш та тестування (5 хв)

**Команди:**

```bash
# 1. Видалити згенеровані CSS файли
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor/css"

# 2. Очистити LESS preprocessor кеш
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && rm -rf var/view_preprocessed/css/adminhtml"

# 3. Очистити Magento cache
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && php bin/magento cache:clean"

# 4. Hard refresh в браузері (Ctrl+Shift+R)
```

**Тести в браузері:**

1. ✅ **Позиція:** Панель з'являється ЗЛІВА (не справа)
2. ✅ **Зсув:** Preview зсувається ВПРАВО через margin (не зменшується width)
3. ✅ **Анімація:** Плавна через transform (не ривками через right)
4. ✅ **Toggle:** Повторний клік закриває панель
5. ✅ **Responsive:** На екрані < 768px панель на повну ширину
6. ✅ **Settings Editor:** Працює всередині панелі

**DevTools перевірка:**

```javascript
// Відкрити консоль (F12) і перевірити:

// 1. Панель існує
console.log('Panel:', $('#theme-editor-panel').length);  // Має бути 1

// 2. Контейнер існує
console.log('Container:', $('#bte-panels').length);      // Має бути 1

// 3. CSS computed style (коли панель ЗАКРИТА)
console.log('Transform (closed):', 
    $('#theme-editor-panel').css('transform'));  // Має бути matrix(-1, 0, 0, 1, -360, 0) або translateX(-100%)

// 4. CSS computed style (коли панель ВІДКРИТА)
// Відкрити панель і перевірити
console.log('Transform (open):', 
    $('#theme-editor-panel').css('transform'));  // Має бути none або translateX(0)

// 5. Preview зсув
console.log('Preview margin:', 
    $('.bte-preview').css('margin-left'));      // Має бути 360px коли панель відкрита
```

**Очікувані CSS значення:**

| Стан | `.bte-panel` transform | `.bte-preview` margin-left |
|------|------------------------|----------------------------|
| Закрито | `translateX(-100%)` або `matrix(-1,...)` | `0px` |
| Відкрито | `translateX(0)` або `none` | `360px` |

---

#### Етап 5: Перевірка responsive (3 хв)

**DevTools → Device Mode:**

1. **Desktop (1920px):**
   - ✅ Панель 360px зліва
   - ✅ Preview зсунутий на 360px вправо

2. **Tablet (768px):**
   - ✅ Панель 360px зліва
   - ✅ Preview зсунутий на 360px вправо

3. **Mobile (375px):**
   - ✅ Панель 100vw (на всю ширину)
   - ✅ Preview БЕЗ зсуву (margin-left: 0)

**Тест:** Змінити розмір вікна і подивитися анімацію переходу.

---

### 📋 CHECKLIST ВИКОНАННЯ

- [ ] **Етап 1:** Створено `panels/_panels.less` (53 рядки)
- [ ] **Етап 2:** Очищено `_admin-preview.less` (92 → 40 рядків)
- [ ] **Етап 3:** Додано імпорт в `_module.less` (+1 рядок)
- [ ] **Етап 4:** Очищено кеш та протестовано:
  - [ ] Панель зліва ✅
  - [ ] Preview зсувається вправо ✅
  - [ ] Transform анімація ✅
  - [ ] Toggle працює ✅
  - [ ] Settings Editor працює ✅
- [ ] **Етап 5:** Протестовано responsive:
  - [ ] Desktop (1920px) ✅
  - [ ] Tablet (768px) ✅
  - [ ] Mobile (375px) ✅

---

### 📊 ОЧІКУВАНІ ЗМІНИ ФАЙЛІВ

```
M  view/adminhtml/web/css/source/_module.less          # +1 рядок імпорту
M  view/adminhtml/web/css/source/_admin-preview.less  # -60 рядків, +10 рядків
A  view/adminhtml/web/css/source/panels/_panels.less  # +53 рядки (новий файл)
```

**Підсумок:** 3 файли, ~100 рядків змін.

---

### ✅ РЕЗУЛЬТАТ

#### До:
- ❌ Панель справа
- ❌ Iframe зменшується через width
- ❌ Стилі змішані в одному файлі
- ❌ Анімація через `right:` (повільна)
- ❌ Відрізняється від frontend UX

#### Після:
- ✅ Панель **зліва** (як на frontend)
- ✅ Iframe **зсувається** через margin (як на frontend)
- ✅ Структуровані файли (як на frontend)
- ✅ Анімація через `transform:` (швидка, GPU-прискорена)
- ✅ **100% відповідність** з frontend UX

---

### 📝 КОМІТ

```bash
git add view/adminhtml/web/css/source/_module.less
git add view/adminhtml/web/css/source/_admin-preview.less
git add view/adminhtml/web/css/source/panels/_panels.less

git commit -m "refactor(css): fix panel positioning - move from right to left

- Create separate panels/_panels.less (53 lines) for panel container styles
- Clean up _admin-preview.less - remove panel styles, keep only iframe preview
- Change panel position from right to left (match frontend UX)
- Use transform animation instead of position-based (GPU acceleration)
- Preview shifts via margin-left instead of width reduction
- Add responsive support: full-width panel on mobile (<768px)

Before:
- Panel appears from RIGHT
- Iframe width reduces
- Styles mixed in _admin-preview.less (92 lines)
- Animation via 'right:' property

After:
- Panel appears from LEFT (matches frontend)
- Iframe shifts via margin-left
- Clean separation: _panels.less + _admin-preview.less
- Animation via 'transform:' (faster)

Closes: CSS structure cleanup
Tested: Desktop (1920px), Tablet (768px), Mobile (375px)"
```

---

### 🔗 Зв'язок з Phase 1

**Phase 1** (HTML Integration):
- ✅ Додав HTML панелей у DOM
- ✅ Навігація працює (клік відкриває панель)
- ❌ Але панель з'являється **справа** замість зліва

**Phase 2** (CSS Fix):
- ✅ Виправляє позиціонування (зліва замість справа)
- ✅ Виправляє структуру CSS файлів
- ✅ Приводить до відповідності з frontend UX

**Обидві фази обов'язкові** для повної інтеграції navigation панелей.

---

**Файл оновлено:** `docs/refactoring/navigation-panel-integration/plan.md`

**Phase 2 Статус:** 🟡 Готовий до виконання

**Очікуваний час Phase 2:** 25-30 хвилин
