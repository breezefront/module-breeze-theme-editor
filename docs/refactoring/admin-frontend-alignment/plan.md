# Admin → Frontend Architecture Alignment

**Дата створення**: 17 лютого 2026  
**Статус**: 🔴 Потребує виконання  
**Пріоритет**: 🔴 Високий (довгострокова якість коду)  
**Час виконання**: 1.5-2 години

---

## 🎯 МЕТА

Привести Admin панелі до **100% відповідності з Frontend архітектурою**:

1. ✅ Контейнер: `#bte-panels` → `#bte-panels-container`
2. ✅ Widget: `breezeSettingsEditor` → `themeSettingsEditor`
3. ✅ Панель: Порожня (widget рендерить ВСЕ)
4. ✅ Ініціалізація: Lazy loading через navigation.js
5. ✅ Закриття: Widget обробляє свою кнопку
6. 🆕 Події: `bte:statusChanged` → `publicationStatusChanged` (уніфікація)
7. 🆕 Селектори: `#bte-navigation` → `#toolbar-navigation` (уніфікація)

---

## 🔍 АУДИТ: Знайдені проблеми (18 лютого 2026)

### 🔴 КРИТИЧНІ ПРОБЛЕМИ

#### Проблема #1: Події публікацій не синхронізовані ⚠️

**Основна помилка що спричиняє баг:** Settings Editor панель НЕ перезавантажується при переключенні публікацій в Admin.

| Компонент | Admin | Frontend | Статус |
|-----------|-------|----------|--------|
| **publication-selector trigger** | `bte:statusChanged` | `publicationStatusChanged` | ❌ **РІЗНІ** |
| **settings-editor listener** | `publicationStatusChanged` | `publicationStatusChanged` | ✅ Однакові |
| **toolbar listener** | `bte:statusChanged` | N/A | ❌ Admin-only |

**Результат:**
- Admin: publication-selector.js:327 → trigger `bte:statusChanged` → settings-editor НЕ отримує
- Frontend: publication-selector.js:158 → trigger `publicationStatusChanged` → settings-editor отримує ✅

**Файли з event mismatches:**

**Admin triggers:**
- `view/adminhtml/web/js/editor/toolbar/publication-selector.js:289` → `bte:statusChanged` ❌
- `view/adminhtml/web/js/editor/toolbar/publication-selector.js:327` → `bte:statusChanged` ❌
- `view/adminhtml/web/js/editor/panel/css-manager.js:227,292,320,387` → `publicationStatusChanged` ✅

**Admin listens:**
- `view/adminhtml/web/js/editor/toolbar.js:345` → `bte:statusChanged` ❌
- `view/adminhtml/web/js/editor/panel/settings-editor.js:203` → `publicationStatusChanged` ✅

**Frontend (correct):**
- `view/frontend/web/js/toolbar/publication-selector.js:158` → `publicationStatusChanged` ✅
- `view/frontend/web/js/theme-editor/settings-editor.js:209` → `publicationStatusChanged` ✅

#### Проблема #2: Навігаційні селектори не синхронізовані

| Компонент | Admin | Frontend | Статус |
|-----------|-------|----------|--------|
| **Navigation Element ID** | `#bte-navigation` | `#toolbar-navigation` | ❌ **РІЗНІ** |
| **Toolbar Container ID** | `#bte-toolbar` | `#breeze-theme-editor-toolbar` | ❌ **РІЗНІ** |

**Результат:** Settings Editor використовує workaround: `$('#bte-navigation, #toolbar-navigation')` → хитка архітектура

**Файли з selector mismatches:**
- `view/adminhtml/web/js/editor/toolbar.js:79` → `#bte-toolbar` ❌
- `view/adminhtml/web/js/editor/toolbar.js:91` → `#bte-navigation` ❌
- `view/adminhtml/web/js/editor/panel/settings-editor.js:68` → `$('#bte-navigation, #toolbar-navigation')` ⚠️ Dual selector
- `view/frontend/web/js/toolbar.js:74` → `#breeze-theme-editor-toolbar` ✅
- `view/frontend/web/js/toolbar.js:134` → `#toolbar-navigation` ✅
- `view/frontend/web/js/theme-editor/settings-editor.js:71` → `$('#bte-navigation, #toolbar-navigation')` ⚠️ Dual selector

### 🟡 СЕРЕДНІ ПРОБЛЕМИ

#### Проблема #3: Різні події для публікацій

| Event Name | Admin | Frontend | Використання |
|------------|-------|----------|--------------|
| `bte:published` | ✅ | ❌ | Admin uses for publication success |
| `themeEditorPublished` | ✅ | ✅ | Both use (STANDARD) |
| `publicationLoaded` | ✅ (line 328) | ❌ | Orphan event (no listeners) |

**Рекомендація:** Видалити `publicationLoaded` (orphan), залишити обидва `bte:published` + `themeEditorPublished` (backward compat)

### 🟢 НИЗЬКІ ПРОБЛЕМИ (Admin-specific, OK)

Ці події використовуються тільки в Admin через архітектурні відмінності (iframe vs device frame):

- `bte:iframeReloaded` - Admin only (iframe helper specific)
- `bte:pageTypeChanged` - Admin only (iframe helper specific)
- `bte:cssManagerReady` - Admin only (initialization timing)

**Висновок:** Ці події OK, це валідні Admin-специфічні event

---

## 📊 ПОВНА ТАБЛИЦЯ ПОДІЙ

### Events Comparison Table

| Event Name | Admin Trigger | Admin Listen | Frontend Trigger | Frontend Listen | Status |
|------------|---------------|--------------|------------------|-----------------|--------|
| `publicationStatusChanged` | css-manager ✅ | settings-editor ✅ | css-manager, toolbar ✅ | settings-editor, toolbar ✅ | ✅ **STANDARD** |
| `bte:statusChanged` | publication-selector, toolbar ❌ | toolbar ❌ | ❌ NOT FOUND | ❌ NOT FOUND | 🔴 **FIX REQUIRED** |
| `themeEditorPublished` | settings-editor ✅ | settings-editor ✅ | settings-editor, publish-handler ✅ | settings-editor, publication-selector ✅ | ✅ **STANDARD** |
| `themeEditorDraftSaved` | settings-editor ✅ | ❌ | settings-editor ✅ | publication-selector ✅ | ✅ OK |
| `bte:published` | publication-selector ❌ | toolbar, publication-selector ❌ | ❌ NOT FOUND | ❌ NOT FOUND | 🟡 Admin-only |
| `publicationLoaded` | publication-selector ❌ | ❌ NOT FOUND | ❌ NOT FOUND | ❌ NOT FOUND | 🔴 **ORPHAN** |
| `navigationChanged` | navigation ✅ | ❌ | navigation ✅ | toolbar ✅ | ✅ OK |
| `panelShown` | navigation ✅ | ❌ | navigation ✅ | toolbar ✅ | ✅ OK |
| `panelHidden` | navigation ✅ | ❌ | navigation ✅ | toolbar ✅ | ✅ OK |
| `navigationDisabledClick` | navigation ✅ | ❌ | navigation ✅ | toolbar ✅ | ✅ OK |
| `loadThemeEditorFromPublication` | ❌ | settings-editor ✅ | toolbar, publication-selector ✅ | settings-editor ✅ | ✅ OK |
| `openPublicationHistoryModal` | ❌ | settings-editor ✅ | ❌ | settings-editor, toolbar ✅ | ✅ OK |
| `bte:iframeReloaded` | toolbar ✅ | publication-selector ✅ | ❌ | ❌ | 🟢 Admin-specific (OK) |
| `bte:pageTypeChanged` | iframe-helper, toolbar ✅ | toolbar ✅ | ❌ | ❌ | 🟢 Admin-specific (OK) |
| `bte:cssManagerReady` | css-manager ✅ | ❌ | ❌ | ❌ | 🟢 Admin-specific (OK) |
| `paletteColorChanged` | ? ✅ | settings-editor ✅ | palette-section-renderer ✅ | settings-editor, palette-section-renderer ✅ | ✅ OK |
| `paletteChangesReverted` | palette-manager ✅ | ? | palette-manager ✅ | palette-section-renderer ✅ | ✅ OK |

---

## 📊 ПЕРЕДУМОВИ

### Що вже зроблено (navigation-panel-integration):
- ✅ **Phase 1**: HTML панелей додано в DOM
- ✅ **Phase 2**: CSS виправлено (панель зліва, transform animation)

### Що залишилось:
- ❌ Неконсистентні назви (`#bte-panels` vs `#bte-panels-container`)
- ❌ Різні назви widget (`breezeSettingsEditor` vs `themeSettingsEditor`)
- ❌ Дублікат HTML (header в phtml + header в template)
- ❌ Різна логіка ініціалізації (toolbar.js vs navigation.js lazy)
- 🔴 **КРИТИЧНО:** Події не синхронізовані (`bte:statusChanged` vs `publicationStatusChanged`)
- 🔴 **КРИТИЧНО:** Селектори навігації різні (`#bte-navigation` vs `#toolbar-navigation`)

---

## 📊 ПОРІВНЯННЯ: Було → Стане

| Аспект | Admin (Зараз) | Admin (Після) | Frontend (Еталон) |
|--------|---------------|---------------|-------------------|
| **Контейнер ID** | `#bte-panels` | `#bte-panels-container` ✅ | `#bte-panels-container` |
| **Widget назва** | `breezeSettingsEditor` | `themeSettingsEditor` ✅ | `themeSettingsEditor` |
| **HTML панелі** | Має header/wrapper | Порожня ✅ | Порожня |
| **Widget ініціалізація** | toolbar.js (100-116) | navigation.js lazy ✅ | navigation.js lazy |
| **panelWidgets config** | ❌ Немає | ✅ Додати | ✅ Є |
| **_initializePanel()** | ❌ Немає | ✅ Додати | ✅ Є |
| **Close button** | ❌ Не працює | ✅ Widget обробляє | ✅ Widget обробляє |
| **🆕 Publication events** | `bte:statusChanged` ❌ | `publicationStatusChanged` ✅ | `publicationStatusChanged` |
| **🆕 Navigation ID** | `#bte-navigation` ❌ | `#toolbar-navigation` ✅ | `#toolbar-navigation` |
| **🆕 Toolbar ID** | `#bte-toolbar` ❌ | `#breeze-theme-editor-toolbar` ✅ | `#breeze-theme-editor-toolbar` |

---

## 📂 ФАЙЛИ ДО ЗМІНИ

### Зміни коду (9 файлів):

1. **view/adminhtml/templates/editor/index.phtml**
   - Змінити: `#bte-panels` → `#bte-panels-container`
   - 🆕 Змінити: `#bte-toolbar` → `#breeze-theme-editor-toolbar`
   - 🆕 Змінити: `#bte-navigation` → `#toolbar-navigation`
   - Видалити: Header/wrapper з `#theme-editor-panel`
   - Зробити: Панель порожньою `<div id="theme-editor-panel" class="bte-panel"></div>`

2. **view/adminhtml/web/js/editor/constants.js**
   - Змінити: `PANELS: '#bte-panels'` → `PANELS: '#bte-panels-container'`
   - 🆕 Додати/оновити: `TOOLBAR: '#breeze-theme-editor-toolbar'`
   - 🆕 Додати/оновити: `NAVIGATION: '#toolbar-navigation'`

3. **view/adminhtml/web/js/editor/toolbar.js**
   - Змінити: `panelSelector: '#bte-panels'` → `'#bte-panels-container'`
   - 🆕 Змінити: `#bte-toolbar` → `#breeze-theme-editor-toolbar` (line 79)
   - 🆕 Змінити: `#bte-navigation` → `#toolbar-navigation` (line 91)
   - 🆕 Змінити listener: `bte:statusChanged` → `publicationStatusChanged` (line 345)
   - **ВИДАЛИТИ**: Рядки 99-116 (ініціалізація settings-editor)
   - **ДОДАТИ**: `panelWidgets` config в navigation

4. **view/adminhtml/web/js/editor/toolbar/navigation.js**
   - **ДОДАТИ**: `panelWidgets` в options (як у frontend)
   - **ДОДАТИ**: `_initializePanel()` метод (lazy loading)
   - **ОНОВИТИ**: `_showPanel()` - викликати `_initializePanel()`

5. **🔴 view/adminhtml/web/js/editor/toolbar/publication-selector.js** (КРИТИЧНЕ)
   - 🆕 **Змінити line 289:** `bte:statusChanged` → `publicationStatusChanged`
   - 🆕 **Змінити line 327:** `bte:statusChanged` → `publicationStatusChanged`
   - 🆕 **Видалити line 328:** `publicationLoaded` event (orphan)

6. **view/adminhtml/web/js/editor/panel/settings-editor.js**
   - **ПЕРЕЙМЕНУВАТИ**: `$.widget('swissup.breezeSettingsEditor')` → `themeSettingsEditor`
   - **ОНОВИТИ**: return statement (line 928)
   - 🆕 **Спростити line 68:** `$('#bte-navigation, #toolbar-navigation')` → `$('#toolbar-navigation')`

7. **view/adminhtml/web/css/source/panels/_panels.less**
   - Змінити: `#bte-panels` → `#bte-panels-container`

8. **view/adminhtml/web/css/source/_admin-preview.less**
   - Перевірити: Що margin-left застосовується до контейнера

9. **🆕 view/adminhtml/web/css/source/_toolbar.less** (якщо існує)
   - Оновити селектори: `#bte-toolbar` → `#breeze-theme-editor-toolbar`
   - Оновити селектори: `#bte-navigation` → `#toolbar-navigation`

---

## 🔢 ПОКРОКОВИЙ ПЛАН ВИКОНАННЯ

### **ЕТАП 0: 🔴 КРИТИЧНИЙ FIX - Події публікацій (15 хв)**

**Пріоритет:** 🔴 **КРИТИЧНО** - Це виправляє основний баг (Settings Editor не перезавантажується при зміні публікацій)

#### Крок 0.1: Виправити publication-selector.js

**Файл:** `view/adminhtml/web/js/editor/toolbar/publication-selector.js`

**Змінити line 289:**
```javascript
// Було:
$(document).trigger('bte:statusChanged', {
    status: 'draft',
    publicationId: null
});

// Стане:
$(document).trigger('publicationStatusChanged', {
    status: 'draft',
    publicationId: null
});
```

**Змінити line 327-328:**
```javascript
// Було:
$(document).trigger('bte:statusChanged', {
    status: publication.status,
    publicationId: publication.id
});
$(document).trigger('publicationLoaded', publication);

// Стане:
$(document).trigger('publicationStatusChanged', {
    status: publication.status,
    publicationId: publication.id
});
// Видалено publicationLoaded - orphan event
```

#### Крок 0.2: Виправити toolbar.js listener

**Файл:** `view/adminhtml/web/js/editor/toolbar.js`

**Змінити line 345:**
```javascript
// Було:
$(document).on('bte:statusChanged', this._onStatusChanged.bind(this));

// Стане:
$(document).on('publicationStatusChanged', this._onStatusChanged.bind(this));
```

#### Крок 0.3: Тестувати основний баг

**Очистити кеш:**
```bash
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor"
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && php bin/magento cache:clean"
```

**Відкрити Admin → Theme Editor → Settings Editor panel**

**Тест:**
1. Відкрити Settings Editor (Theme Editor button)
2. Перемкнути з DRAFT на Publication #6
3. **Очікуваний результат:** Panel should reload, "Modified" badges disappear ✅
4. Console: `✅ Publication status changed to: publication #6`

**Результат Етапу 0:**
- ✅ Settings Editor тепер ПРАЦЮЄ - перезавантажується при зміні публікацій
- ✅ Події синхронізовані: Admin = Frontend (`publicationStatusChanged`)
- ✅ Видалено orphan event `publicationLoaded`
- ✅ **ОСНОВНИЙ БАГ ВИПРАВЛЕНО** 🎉

---

### **ЕТАП 1: Перейменування контейнера + селекторів (25 хв)**

### **ЕТАП 1: Перейменування контейнера + селекторів (25 хв)**

#### Крок 1.1: Оновити constants.js

**Файл:** `view/adminhtml/web/js/editor/constants.js`

**Змінити line 18:**
```javascript
// Було:
PANELS: '#bte-panels',

// Стане:
PANELS: '#bte-panels-container',
```

**🆕 Додати/оновити (якщо є TOOLBAR та NAVIGATION константи):**
```javascript
TOOLBAR: '#breeze-theme-editor-toolbar',
NAVIGATION: '#toolbar-navigation',
```

#### Крок 1.2: Оновити index.phtml

**Файл:** `view/adminhtml/templates/editor/index.phtml`

**Змінити toolbar ID (знайти line з `id="bte-toolbar"`):**
```html
<!-- Було: -->
<div id="bte-toolbar" class="bte-toolbar">

<!-- Стане: -->
<div id="breeze-theme-editor-toolbar" class="bte-toolbar">
```

**Змінити navigation ID (знайти line з `id="bte-navigation"`):**
```html
<!-- Було: -->
<div id="bte-navigation" ...>

<!-- Стане: -->
<div id="toolbar-navigation" ...>
```

**Змінити panels container ID (line 34):**
```html
<!-- Було: -->
<div id="bte-panels" class="bte-panels">

<!-- Стане: -->
<div id="bte-panels-container" class="bte-panels-container">
```

#### Крок 1.3: Оновити toolbar.js

**Файл:** `view/adminhtml/web/js/editor/toolbar.js`

**Змінити line 79:**
```javascript
// Було:
var $toolbar = $('#bte-toolbar');

// Стане:
var $toolbar = $('#breeze-theme-editor-toolbar');
```

**Змінити line 91:**
```javascript
// Було:
if ($('#bte-navigation').length && config.components && config.components.navigation) {

// Стане:
if ($('#toolbar-navigation').length && config.components && config.components.navigation) {
```

**Змінити line 94 (приблизно):**
```javascript
// Було:
panelSelector: '#bte-panels'

// Стане:
panelSelector: '#bte-panels-container'
```

**Також оновити рядок ініціалізації navigation (приблизно line 100):**
```javascript
// Було:
$('#bte-navigation').breezeNavigation({

// Стане:
$('#toolbar-navigation').breezeNavigation({
```

#### Крок 1.4: Оновити settings-editor.js

**Файл:** `view/adminhtml/web/js/editor/panel/settings-editor.js`

**🆕 Спростити line 68 (видалити dual selector):**
```javascript
// Було:
this.$navigation = $('#bte-navigation, #toolbar-navigation');

// Стане:
this.$navigation = $('#toolbar-navigation');
```

#### Крок 1.5: Оновити _panels.less

**Файл:** `view/adminhtml/web/css/source/panels/_panels.less`

**Змінити line 6:**
```less
// Було:
#bte-panels {

// Стане:
#bte-panels-container {
```

**Також оновити коментар line 5:**
```less
// Було:
// Admin має інший контейнер: #bte-panels замість #bte-panels-container

// Стане:
// Admin тепер має той самий контейнер що й Frontend: #bte-panels-container
```

#### Крок 1.6: 🆕 Перевірити CSS для toolbar та navigation

**Виконати пошук:**
```bash
grep -rn "#bte-toolbar\|#bte-navigation" view/adminhtml/web/css --include="*.less"
```

**Якщо знайдено входження** - оновити на:
- `#bte-toolbar` → `#breeze-theme-editor-toolbar`
- `#bte-navigation` → `#toolbar-navigation`

**Результат Етапу 1:**
- ✅ Контейнер має ту саму назву що й Frontend
- ✅ Toolbar має ту саму назву що й Frontend
- ✅ Navigation має ту саму назву що й Frontend
- ✅ CSS selectors працюють
- ✅ Видалено dual selector workaround

---

### **ЕТАП 2: Очистити HTML панелі (15 хв)**

#### Крок 2.1: Спростити структуру панелі

**Файл:** `view/adminhtml/templates/editor/index.phtml`

**Знайти блок панелі (lines 36-47) і замінити:**

**Було:**
```html
<!-- Theme Editor Panel -->
<div id="theme-editor-panel" class="bte-panel" style="display: none;">
    <div class="bte-panel-header">
        <h2 class="bte-panel-title">Theme Editor</h2>
        <button class="bte-panel-close" data-panel="theme-editor-panel" title="Close Panel">
            <span>×</span>
        </button>
    </div>
    <div class="bte-panel-content">
        <!-- Settings Editor Widget Container -->
        <div id="bte-settings-editor-widget"></div>
    </div>
</div>
```

**Стане:**
```html
<!-- Theme Editor Panel (widget renders all content) -->
<div id="theme-editor-panel" class="bte-panel" style="display: none;"></div>
```

**Пояснення:**
- Widget сам створить header + content через template
- Порожня панель = чиста відповідальність
- Немає дублювання HTML

**Також оновити Content Builder панель (lines 50-60):**

**Було:**
```html
<!-- Content Builder Panel (future feature) -->
<div id="content-builder-panel" class="bte-panel" style="display: none;">
    <div class="bte-panel-header">
        <h2 class="bte-panel-title">Content Builder</h2>
        <button class="bte-panel-close" data-panel="content-builder-panel" title="Close Panel">
            <span>×</span>
        </button>
    </div>
    <div class="bte-panel-content">
        <p class="bte-placeholder">Content Builder coming soon...</p>
    </div>
</div>
```

**Стане:**
```html
<!-- Content Builder Panel (future feature) -->
<div id="content-builder-panel" class="bte-panel" style="display: none;"></div>
```

**Результат Етапу 2:**
- ✅ Панель порожня (як на Frontend)
- ✅ Немає дублікату header
- ✅ Widget повністю контролює свій DOM
- ⚠️ Widget ще не перейменований (наступний етап)

---

### **ЕТАП 3: Перейменувати widget (10 хв)**

#### Крок 3.1: Оновити назву widget

**Файл:** `view/adminhtml/web/js/editor/panel/settings-editor.js`

**Змінити line 40:**
```javascript
// Було:
$.widget('swissup.breezeSettingsEditor', {

// Стане:
$.widget('swissup.themeSettingsEditor', {
```

**Змінити line 928:**
```javascript
// Було:
return $.swissup.breezeSettingsEditor;

// Стане:
return $.swissup.themeSettingsEditor;
```

#### Крок 3.2: Перевірити інші входження

**Виконати команду:**
```bash
grep -rn "breezeSettingsEditor" view/adminhtml --include="*.js" --include="*.phtml"
```

**Якщо знайдені інші входження** - оновити їх також.

**Результат Етапу 3:**
- ✅ Widget має ту саму назву що й Frontend
- ✅ `$('#panel').themeSettingsEditor()` працює
- ✅ Уніфікована назва в обох areas
- ⚠️ Ініціалізація ще в toolbar.js (наступний етап)

---

### **ЕТАП 4: Перенести ініціалізацію до navigation.js (30 хв)**

#### Крок 4.1: Додати panelWidgets config в navigation.js

**Файл:** `view/adminhtml/web/js/editor/toolbar/navigation.js`

**Додати в options (після line 22):**

```javascript
options: {
    items: [],
    panelSelector: null,
    // 🔥 ДОДАТИ: Конфігурація панелей (як у Frontend)
    panelWidgets: {
        'theme-editor': {
            selector: '#theme-editor-panel',
            widget: 'themeSettingsEditor',
            config: {
                title: 'Theme Editor',
                closeTitle: 'Close Panel',
                presetsLabel: 'Presets:'
            }
        }
        // Можна додати інші панелі:
        // 'content-builder': {
        //     selector: '#content-builder-panel',
        //     widget: 'contentBuilderPanel',
        //     config: { ... }
        // }
    }
},
```

#### Крок 4.2: Додати _initializePanel() метод

**Додати метод після `_hideAllPanels()` (після line 278):**

```javascript
/**
 * Ініціалізувати панель при першому відкритті (lazy loading)
 * @param {String} itemId - ID navigation item
 * @return {Boolean} - true якщо успішно
 */
_initializePanel: function(itemId) {
    var panelConfig = this.options.panelWidgets[itemId];

    if (!panelConfig) {
        console.warn('⚠️ No panel widget config for:', itemId);
        return false;
    }

    var $panel = $(panelConfig.selector);

    if (!$panel.length) {
        console.error('❌ Panel element not found:', panelConfig.selector);
        return false;
    }

    // Перевірити чи вже ініціалізовано
    if ($panel.data('panel-initialized')) {
        console.log('ℹ️ Panel already initialized:', itemId);
        return true;
    }

    try {
        // Передати global config в widget config
        var config = window.breezeThemeEditorConfig || {};
        var widgetConfig = $.extend({}, panelConfig.config, {
            storeId: config.storeId,
            themeId: config.themeId,
            themeName: config.themeName
        });
        
        // Ініціалізувати widget
        $panel[panelConfig.widget](widgetConfig);
        $panel.data('panel-initialized', true);

        console.log('✅ Panel initialized:', itemId, '→', panelConfig.widget);
        return true;
    } catch (e) {
        console.error('❌ Failed to initialize panel:', itemId, e);
        return false;
    }
},
```

#### Крок 4.3: Оновити _showPanel() - викликати lazy init

**Знайти метод `_showPanel()` (line 176) і додати виклик ініціалізації:**

```javascript
_showPanel: function (itemId) {
    if (!this.options.panelSelector) {
        return;
    }

    var item = this.options.items.find(function(i) {
        return i.id === itemId;
    });

    if (!item) {
        return;
    }

    // 🔥 ДОДАТИ: Lazy initialization
    this._initializePanel(itemId);

    var panelId = item.panelId || itemId + '-panel';
    var $panel = $('#' + panelId);

    if ($panel.length) {
        // Step 1: Show panel (display: block)
        $panel.show();
        
        // Step 2: Trigger reflow
        $panel[0].offsetHeight;
        
        // Step 3: Add active class (animation)
        setTimeout(function() {
            $panel.addClass('active');
        }, 10);
        
        console.log('👁️ Panel shown:', panelId);

        // Додати клас до body
        $('body').addClass('bte-panel-active');

        this.element.trigger('panelShown', [{
            panelId: panelId,
            itemId: itemId
        }]);
    } else {
        console.warn('⚠️ Panel not found:', panelId);
    }
},
```

#### Крок 4.4: Видалити ініціалізацію з toolbar.js

**Файл:** `view/adminhtml/web/js/editor/toolbar.js`

**ВИДАЛИТИ блок (lines 99-116):**

```javascript
// ❌ ВИДАЛИТИ ЦЕЙ БЛОК:
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

**ЗАМІНИТИ на (передачу panelWidgets в navigation):**

```javascript
// Initialize navigation widget
if ($('#bte-navigation').length && config.components && config.components.navigation) {
    // ✅ Store config globally for widgets to access
    window.breezeThemeEditorConfig = {
        storeId: config.storeId,
        themeId: config.themeId,
        themeName: config.themeName || 'Theme',
        adminUrl: config.adminUrl || '/admin',
        graphqlEndpoint: config.graphqlEndpoint
    };
    
    $('#bte-navigation').breezeNavigation({
        items: config.components.navigation.items || [],
        panelSelector: '#bte-panels-container',
        // 🔥 ДОДАТИ: конфігурація панельних віджетів
        panelWidgets: {
            'theme-editor': {
                selector: '#theme-editor-panel',
                widget: 'themeSettingsEditor',
                config: {
                    title: 'Theme Editor',
                    closeTitle: 'Close Panel',
                    presetsLabel: 'Presets:'
                }
            }
        }
    });
    console.log('✅ Navigation initialized');
}
```

**Результат Етапу 4:**
- ✅ Widget ініціалізується LAZY (при відкритті панелі)
- ✅ Navigation керує ініціалізацією (як на Frontend)
- ✅ toolbar.js не знає про конкретні панелі (чиста архітектура)
- ✅ Легко додавати нові панелі (просто config)

---

### **ЕТАП 5: Тестування (20 хв)**

#### Крок 5.1: Очистити кеш

```bash
# Видалити згенеровані файли
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && rm -rf pub/static/adminhtml/Magento/backend/*/Swissup_BreezeThemeEditor"

# Очистити LESS кеш
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && rm -rf var/view_preprocessed/css/adminhtml"

# Очистити Magento cache
docker exec magento248local-phpfpm-1 bash -c "cd /var/www/html && php bin/magento cache:clean"
```

#### Крок 5.2: Перевірити базову структуру

**Відкрити Admin → Theme Editor**

**Відкрити DevTools (F12) → Console**

**Виконати:**
```javascript
// Перевірити контейнер
console.log('Container:', $('#bte-panels-container').length); // Має бути 1

// Перевірити панель
console.log('Panel:', $('#theme-editor-panel').length); // Має бути 1

// Перевірити що панель порожня (ще не ініціалізована)
console.log('Panel HTML:', $('#theme-editor-panel').html()); // Має бути "" (порожньо)

// Перевірити navigation widget
var nav = $('#bte-navigation').data('swissupBreezeNavigation');
console.log('Navigation widget:', nav); // Має бути object

// Перевірити panelWidgets config
console.log('Panel widgets config:', nav.options.panelWidgets); // Має бути object з 'theme-editor'
```

**Очікуваний результат:**
```
Container: 1
Panel: 1
Panel HTML: "" (empty string)
Navigation widget: Object {...}
Panel widgets config: Object {theme-editor: {...}}
```

#### Крок 5.3: Тест відкриття панелі

**Дії:**
1. Клікнути на **"Theme Editor"** в navigation

**Очікуваний результат в консолі:**
```
🔄 Switching navigation to: theme-editor
✅ Panel initialized: theme-editor → themeSettingsEditor
✅ Initializing Settings Editor (Admin)
👁️ Panel shown: theme-editor-panel
```

**Перевірити в Elements:**
```javascript
// Панель має бути заповнена widget HTML
console.log('Panel HTML after init:', $('#theme-editor-panel').html().length); // Має бути > 0

// Widget ініціалізований
console.log('Widget initialized:', $('#theme-editor-panel').data('panel-initialized')); // Має бути true

// Widget data
console.log('Widget:', $('#theme-editor-panel').data('swissupThemeSettingsEditor')); // Має бути object
```

**Візуально:**
- ✅ Панель з'являється зліва
- ✅ Є header з кнопкою ×
- ✅ Видно секції Settings Editor
- ✅ Preview зсунутий вправо

#### Крок 5.4: Тест закриття панелі

**Варіант 1: Кнопка закриття**
1. Клікнути на **×** в header панелі

**Очікуваний результат:**
- ✅ Панель ховається
- ✅ В консолі: `✅ Navigation deactivated: theme-editor`
- ✅ Preview повертається на повну ширину

**Варіант 2: Toggle**
1. Клікнути на кнопку **"Theme Editor"** знову

**Очікуваний результат:**
- ✅ Панель ховається (toggle)
- ✅ Кнопка стає неактивною

#### Крок 5.5: Тест повторного відкриття (lazy loading)

**Дії:**
1. Клікнути на **"Theme Editor"** ще раз

**Очікуваний результат в консолі:**
```
🔄 Switching navigation to: theme-editor
ℹ️ Panel already initialized: theme-editor  ← БЕЗ повторної ініціалізації!
👁️ Panel shown: theme-editor-panel
```

**Перевірити:**
- ✅ Панель відкривається швидко (немає затримки на init)
- ✅ Всі значення форм збережені
- ✅ Widget НЕ ініціалізується повторно

#### Крок 5.6: Тест функціоналу Settings Editor

**Дії:**
1. Відкрити секцію (наприклад "General")
2. Змінити значення (наприклад, колір)
3. Перевірити live preview

**Очікуваний результат:**
- ✅ Секція відкривається
- ✅ Поля працюють (input, color picker)
- ✅ Live preview оновлюється в iframe
- ✅ Save кнопка працює

**Результат Етапу 5:**
- ✅ Все працює
- ✅ Lazy loading працює коректно
- ✅ Widget не ініціалізується повторно
- ✅ Закриття працює (обидва способи)
- ✅ Settings Editor повністю функціональний

---

## 📊 ПІДСУМОК ЗМІН

### Статистика:

| Файл | Рядків до | Рядків після | Зміна |
|------|-----------|--------------|-------|
| index.phtml | 23 (панель) | 1 (панель) | -22 |
| constants.js | 138 | ~140 | +2 (нові константи) |
| toolbar.js | 396 | ~380 | -16 (видалено init + оновлено selectors) |
| 🔴 publication-selector.js | 450 | 448 | -2 (події + orphan) |
| navigation.js | 311 | ~370 | +59 (додано метод + config) |
| settings-editor.js | 929 | 929 | 0 (зміни назв + simplified selector) |
| _panels.less | 48 | 48 | 0 (1 зміна selector) |
| **ВСЬОГО** | **~2295** | **~2316** | **+21 рядків** |

### Файли:

- **Змінено:** 🆕 **9 файлів** (було 6)
- **Створено:** 0 нових файлів
- **Видалено:** 0 файлів

### Ключові зміни:

**🔴 Критичні виправлення (Етап 0):**
- ✅ Події публікацій синхронізовані: `bte:statusChanged` → `publicationStatusChanged`
- ✅ Видалено orphan event `publicationLoaded`
- ✅ **Settings Editor тепер працює при зміні публікацій**

**Архітектурна уніфікація (Етапи 1-4):**
- ✅ Контейнер: `#bte-panels` → `#bte-panels-container`
- ✅ Toolbar: `#bte-toolbar` → `#breeze-theme-editor-toolbar`
- ✅ Navigation: `#bte-navigation` → `#toolbar-navigation`
- ✅ Widget: `breezeSettingsEditor` → `themeSettingsEditor`
- ✅ Lazy loading через navigation.js
- ✅ Чиста HTML структура (widget renders all)

---

## ⏱️ ЧАСОВА ОЦІНКА

| Етап | Час | Складність |
|------|-----|------------|
| **🔴 Етап 0:** Виправити події публікацій (КРИТИЧНО) | 15 хв | 🟢 Легко |
| **Етап 1:** Перейменування контейнера + селекторів | 25 хв | 🟢 Легко |
| **Етап 2:** Очистити HTML панелі | 15 хв | 🟢 Легко |
| **Етап 3:** Перейменувати widget | 10 хв | 🟢 Легко |
| **Етап 4:** Перенести ініціалізацію | 30 хв | 🟡 Середньо |
| **Етап 5:** Тестування | 25 хв | 🟢 Легко |
| **Резерв на помилки** | 15 хв | - |
| **ЗАГАЛОМ** | **~2-2.5 години** | 🟡 |

---

## ⚠️ РИЗИКИ ТА ПОПЕРЕДЖЕННЯ

### Ризик 1: Залежності від старої назви widget

**Проблема:** Якщо є інші файли що викликають `breezeSettingsEditor()`

**Перевірка:**
```bash
grep -rn "breezeSettingsEditor" view/adminhtml --include="*.js" --include="*.phtml"
```

**Рішення:** Оновити всі входження

### Ризик 2: CSS селектори на #bte-panels

**Проблема:** Якщо інші LESS файли використовують `#bte-panels`

**Перевірка:**
```bash
grep -rn "#bte-panels[^-]" view/adminhtml/web/css --include="*.less"
```

**Рішення:** Оновити всі селектори

### Ризик 3: Кешування в браузері

**Проблема:** Старий JS/CSS може залишитись в кеші

**Рішення:** 
- Hard refresh (Ctrl+Shift+R)
- Інкогніто режим
- Очистити browser cache

### Ризик 4: Тести можуть зламатись

**Проблема:** Існуючі тести можуть використовувати старі селектори

**Перевірка:**
```bash
grep -rn "#bte-panels\|breezeSettingsEditor" view/adminhtml/web/js/test --include="*.js"
```

**Рішення:** Оновити тести відповідно

---

## ✅ CHECKLIST ВИКОНАННЯ

### Етап 0: 🔴 Виправити події (КРИТИЧНО)
- [ ] Змінено `bte:statusChanged` → `publicationStatusChanged` в publication-selector.js (line 289)
- [ ] Змінено `bte:statusChanged` → `publicationStatusChanged` в publication-selector.js (line 327)
- [ ] Видалено orphan event `publicationLoaded` (line 328)
- [ ] Змінено listener `bte:statusChanged` → `publicationStatusChanged` в toolbar.js (line 345)
- [ ] Тест: Settings Editor перезавантажується при зміні публікацій ✅

### Етап 1: Перейменування контейнера + селекторів
- [ ] Оновлено constants.js (`#bte-panels-container`)
- [ ] 🆕 Оновлено constants.js (`#breeze-theme-editor-toolbar`, `#toolbar-navigation`)
- [ ] Оновлено index.phtml (`id="bte-panels-container"`)
- [ ] 🆕 Оновлено index.phtml (`id="breeze-theme-editor-toolbar"`)
- [ ] 🆕 Оновлено index.phtml (`id="toolbar-navigation"`)
- [ ] Оновлено _panels.less (`#bte-panels-container`)
- [ ] 🆕 Перевірено CSS файли на `#bte-toolbar` та `#bte-navigation`
- [ ] Оновлено toolbar.js (`panelSelector`, `$toolbar`, `$navigation`)
- [ ] 🆕 Спрощено settings-editor.js (видалено dual selector)

### Етап 2: Очистити HTML
- [ ] Видалено header/wrapper з `#theme-editor-panel`
- [ ] Видалено header/wrapper з `#content-builder-panel`
- [ ] Панелі порожні (тільки `<div id="..."></div>`)

### Етап 3: Перейменувати widget
- [ ] Змінено назву widget → `themeSettingsEditor` (line 40)
- [ ] Змінено return statement (line 928)
- [ ] Перевірено інші входження (grep)
- [ ] Оновлено документацію/коментарі

### Етап 4: Перенести ініціалізацію
- [ ] Додано `panelWidgets` в navigation options
- [ ] Додано `_initializePanel()` метод
- [ ] Оновлено `_showPanel()` - викликає ініціалізацію
- [ ] Видалено init блок з toolbar.js (lines 99-116)
- [ ] Залишено global config в toolbar.js
- [ ] Передано `panelWidgets` в navigation init

### Етап 5: Тестування
- [ ] Очищено кеш (static + LESS + Magento)
- [ ] 🔴 **Тест 0:** Зміна публікацій → Settings Editor перезавантажується
- [ ] Тест 1: Контейнер існує (`#bte-panels-container`)
- [ ] 🆕 Тест 1a: Navigation існує (`#toolbar-navigation`)
- [ ] 🆕 Тест 1b: Toolbar існує (`#breeze-theme-editor-toolbar`)
- [ ] Тест 2: Панель порожня (до відкриття)
- [ ] Тест 3: Панель відкривається → lazy init
- [ ] Тест 4: Закриття працює (× кнопка + toggle)
- [ ] Тест 5: Повторне відкриття (без repeat init)
- [ ] Тест 6: Settings Editor працює (форми, save, preview)

---

## 🎯 ОЧІКУВАНИЙ РЕЗУЛЬТАТ

### Архітектурно:
- ✅ **100% відповідність з Frontend** (структура + naming)
- ✅ **Чиста відповідальність** (widget керує своїм DOM)
- ✅ **Lazy loading** (панель ініціалізується при відкритті)
- ✅ **Масштабованість** (легко додати нові панелі)

### Функціонально:
- ✅ Клік на "Theme Editor" → панель відкривається
- ✅ Widget ініціалізується автоматично (lazy)
- ✅ Header + форми створені widget
- ✅ Кнопка × закриває панель
- ✅ Toggle працює (повторний клік)
- ✅ Повторне відкриття без repeat init

### В консолі:
```
✅ Initializing Navigation with 2 items
✅ Navigation initialized
🔄 Switching navigation to: theme-editor
✅ Panel initialized: theme-editor → themeSettingsEditor
👁️ Panel shown: theme-editor-panel
✅ Initializing Settings Editor (Admin)
```

### Візуально:
- ✅ Панель зліва (360px)
- ✅ Preview зсунутий вправо
- ✅ Header з кнопкою ×
- ✅ Секції Settings Editor
- ✅ Плавна анімація (transform)

---

## 📝 КОМІТ ПІСЛЯ ВИКОНАННЯ

```bash
git add view/adminhtml/templates/editor/index.phtml
git add view/adminhtml/web/js/editor/constants.js
git add view/adminhtml/web/js/editor/toolbar.js
git add view/adminhtml/web/js/editor/toolbar/navigation.js
git add view/adminhtml/web/js/editor/toolbar/publication-selector.js
git add view/adminhtml/web/js/editor/panel/settings-editor.js
git add view/adminhtml/web/css/source/panels/_panels.less

git commit -m "refactor(admin): align with frontend architecture + fix publication events

🔴 CRITICAL FIX:
- Fix publication switching bug: Settings Editor now reloads when changing publications
- Sync events: bte:statusChanged → publicationStatusChanged (Admin = Frontend)
- Remove orphan event: publicationLoaded (no listeners)

🏗️ ARCHITECTURE ALIGNMENT:
- Rename container: #bte-panels → #bte-panels-container
- Rename toolbar: #bte-toolbar → #breeze-theme-editor-toolbar
- Rename navigation: #bte-navigation → #toolbar-navigation
- Rename widget: breezeSettingsEditor → themeSettingsEditor
- Clean panel HTML: remove header wrapper (widget renders all)
- Move initialization: toolbar.js → navigation.js (lazy loading)
- Add panelWidgets config to navigation (like frontend)
- Add _initializePanel() method for lazy widget loading
- Simplify settings-editor: remove dual selector workaround

BEFORE:
- Admin had different naming (#bte-panels, #bte-navigation, breezeSettingsEditor)
- Events not synced (bte:statusChanged vs publicationStatusChanged)
- Settings Editor didn't reload on publication switch ❌
- Panel HTML had wrapper (duplicated header)
- Widget initialized eagerly in toolbar.js

AFTER:
- 100% aligned with frontend architecture ✅
- Events synced: publicationStatusChanged everywhere ✅
- Settings Editor reloads correctly ✅
- Clean separation of concerns (widget owns its DOM)
- Lazy loading (panel initialized on first open)
- Easy to add new panels (just config)

TESTED:
- Publication switch → Settings Editor reloads ✅
- Panel opens → lazy init works ✅
- Close button works ✅
- Toggle works (re-open without re-init) ✅
- Settings Editor fully functional ✅

Files changed: 9
Lines: +21 net (+80 / -59)
Time: 2 hours

Fixes: #BTE-PUBLICATION-SWITCH-BUG
Related: admin-frontend-alignment refactoring plan"
```

---

## 🔗 ЗВ'ЯЗОК З ІНШИМИ ПЛАНАМИ

### Попередні залежності:
- ✅ **navigation-panel-integration/Phase 1** (HTML в DOM)
- ✅ **navigation-panel-integration/Phase 2** (CSS fix)

### Наступні кроки:
1. **JS Tests** - створити тести для навігації (2-3 години)
2. **Додаткові панелі** - Content Builder, Inspector тощо
3. **Performance optimization** - якщо потрібно

---

## 📚 ДОДАТКОВІ РЕСУРСИ

### Референс-файли (Frontend еталон):

1. **Frontend navigation.js**
   - `view/frontend/web/js/toolbar/navigation.js`
   - Містить `_initializePanel()` метод
   - Містить `panelWidgets` config

2. **Frontend settings-editor.js**
   - `view/frontend/web/js/theme-editor/settings-editor.js`
   - Widget назва: `themeSettingsEditor`
   - Рендерить весь HTML через template

3. **Frontend toolbar.html**
   - `view/frontend/web/template/toolbar.html`
   - Порожні панелі: `<div id="..." class="bte-panel"></div>`

### Тестові файли:

Дивіться окремий файл: `test-examples.md`

---

**Автор:** OpenCode AI  
**Дата:** 17 лютого 2026  
**Версія:** 1.0
