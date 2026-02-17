# План рефакторингу Admin CSS Manager

**Дата створення**: 12 лютого 2026  
**Дата виконання**: 17 лютого 2026  
**Статус**: ✅ ЗАВЕРШЕНО (Completed)

---

## 🎯 Мета

Зробити admin CSS Manager консистентним з frontend версією:
- Використовувати існуючі `<style>` теги з iframe (published CSS з PHP template)
- Створювати draft/publication стилі через JS (on-demand)
- Використовувати правильні ID для style тегів
- Перемикати стилі через `media="all"` / `media="not all"` + `disabled`

---

## 📊 Поточна ситуація

### Що є в iframe (перевірено в консолі):
```javascript
// Існуючі style теги:
1. bte-theme-css-variables (published, 920 chars) - з PHP ✅
2. bte-draft-css (10 chars) - створений JS, неправильний ID ❌
3. bte-theme-css-variables-draft - НЕ існує ❌
```

### Проблеми:
1. ❌ Iframe ID: код шукає `preview-frame`, а реальний ID = `bte-iframe`
2. ❌ Неправильні ID: `bte-draft-css` замість `bte-theme-css-variables-draft`
3. ❌ CSS Manager створює нові теги замість використання існуючих з PHP
4. ❌ Draft CSS рендериться в PHP template навіть коли не потрібен

---

## 📋 ДЕТАЛЬНИЙ ПЛАН ВИКОНАННЯ

### **Зміна 1: Вимкнути draft CSS в PHP template**

**Файл**: `view/frontend/templates/inline-css-variables.phtml`

**Рядок 30**:
```php
// Було:
<?php if ($isTestMode || $hasToken): ?>
<!-- Draft CSS (for toolbar users and test mode, always rendered even if empty) -->
<style id="bte-theme-css-variables-draft" data-status="draft" media="not all" disabled>
<?= /* @noEscape */ $inlineCssContentDraft ?>
</style>
<?php endif; ?>

// Стане:
<?php if (false && ($isTestMode || $hasToken)): ?>
<!-- Draft CSS (for toolbar users and test mode, always rendered even if empty) -->
<style id="bte-theme-css-variables-draft" data-status="draft" media="not all" disabled>
<?= /* @noEscape */ $inlineCssContentDraft ?>
</style>
<?php endif; ?>
```

**Причина**: 
- Draft CSS буде створюватись JS on-demand коли потрібно
- Менший HTML, немає порожніх style тегів
- Консистентна архітектура: всі кастомні стилі керуються JS

---

### **Зміна 2: Виправити iframe ID**

**Файл**: `view/adminhtml/web/js/editor/toolbar/publication-selector.js`

**Рядок 53**:
```javascript
// Було:
cssManager.init({
    storeId: this.storeId,
    themeId: this.themeId,
    iframeId: 'preview-frame'  // ❌ Неправильний ID
});

// Стане:
cssManager.init({
    storeId: this.storeId,
    themeId: this.themeId,
    iframeId: 'bte-iframe'  // ✅ Правильний ID
});
```

**Причина**: Iframe має `id="bte-iframe"` в HTML (editor/index.phtml)

---

### **Зміна 3: Оновити ID схему в css-manager.js**

**Файл**: `view/adminhtml/web/js/editor/css-manager.js`

**Метод `_getStyleId()` (рядок 155)**:

```javascript
// Було (неправильні ID):
_getStyleId: function(status, publicationId) {
    switch (status) {
        case 'DRAFT':
            return 'bte-draft-css';  // ❌ НЕПРАВИЛЬНО
        case 'PUBLISHED':
            return 'bte-published-css';  // ❌ НЕПРАВИЛЬНО
        case 'PUBLICATION':
            return 'bte-publication-css-' + publicationId;
        default:
            return 'bte-css';
    }
}

// Стане (консистентні з frontend):
_getStyleId: function(status, publicationId) {
    switch (status) {
        case 'DRAFT':
            return 'bte-theme-css-variables-draft';  // ✅ ПРАВИЛЬНО
        case 'PUBLISHED':
            return 'bte-theme-css-variables';  // ✅ ПРАВИЛЬНО
        case 'PUBLICATION':
            return 'bte-publication-css-' + publicationId;  // ✅ З ID
        default:
            return 'bte-css';
    }
}
```

**Причина консистентності**:
- Frontend використовує `bte-theme-css-variables*` в PHP template
- Admin має використовувати ті самі ID
- Publication з ID щоб підтримувати кілька одночасно (для майбутнього)

---

### **Зміна 4: Повністю переписати admin css-manager.js**

**Файл**: `view/adminhtml/web/js/editor/css-manager.js`

#### **Архітектура (як frontend css-manager.js)**:

**Змінні модуля** (додати на початку після рядка 20):
```javascript
var currentIframeDoc = null;  // Iframe document reference
```

#### **A. Переписати метод `init()` (рядки 31-43)**

**Нова логіка** (натхнення з frontend css-manager.js:38-92):

```javascript
/**
 * Initialize CSS Manager
 * 
 * @param {Object} config - Configuration object
 * @param {Number} config.storeId - Store ID
 * @param {Number} config.themeId - Theme ID
 * @param {String} config.iframeId - Preview iframe ID
 * @param {Number} retries - Internal retry counter (for iframe load waiting)
 * @returns {Boolean}
 */
init: function(config, retries) {
    retries = retries || 0;
    var self = this;
    
    storeId = config.storeId;
    themeId = config.themeId;
    iframeId = config.iframeId || 'bte-iframe';
    
    // Validate parameters
    if (!storeId || !themeId) {
        console.error('❌ CSS Manager: Invalid storeId or themeId', {
            storeId: storeId, 
            themeId: themeId
        });
        return false;
    }
    
    // Get iframe element
    var $iframe = $('#' + iframeId);
    if (!$iframe.length) {
        console.error('❌ CSS Manager: iframe not found:', iframeId);
        return false;
    }
    
    // Get iframe document (with retry logic for async load)
    var iframe = $iframe[0];
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    if (!iframeDoc || !iframeDoc.body) {
        if (retries < 20) {
            console.log('⏳ CSS Manager: iframe not ready, retry', retries + 1);
            setTimeout(function() {
                self.init(config, retries + 1);
            }, 200);
            return false;
        }
        console.error('❌ CSS Manager: iframe not ready after 20 retries');
        return false;
    }
    
    // Find existing published style from PHP template
    var $publishedStyle = $(iframeDoc).find('#bte-theme-css-variables');
    
    if (!$publishedStyle.length) {
        if (retries < 20) {
            console.log('⏳ CSS Manager: CSS elements not ready, retry', retries + 1);
            setTimeout(function() {
                self.init(config, retries + 1);
            }, 200);
            return false;
        }
        console.error('❌ CSS Manager: #bte-theme-css-variables not found after retries!');
        return false;
    }
    
    // Store iframe document reference
    currentIframeDoc = iframeDoc;
    
    console.log('✅ CSS Manager initialized', {
        storeId: storeId,
        themeId: themeId,
        iframeId: iframeId,
        publishedStyleFound: true
    });
    
    return true;
}
```

**Ключові зміни**:
- ✅ Retry логіка для очікування завантаження iframe
- ✅ Перевірка наявності `bte-theme-css-variables` з PHP
- ✅ Збереження `currentIframeDoc` для подальшої роботи

---

#### **B. Додати helper методи (після `init`, перед `switchTo`)**

```javascript
/**
 * Enable style element (make it active)
 * @private
 */
_enableStyle: function($style) {
    if (!$style || !$style.length) return;
    $style.attr('media', 'all');        // Primary method (HTML5 standard)
    $style.prop('disabled', false);     // Fallback for older browsers
},

/**
 * Disable style element (make it inactive)
 * @private
 */
_disableStyle: function($style) {
    if (!$style || !$style.length) return;
    $style.attr('media', 'not all');    // Primary method (HTML5 standard)
    $style.prop('disabled', true);      // Fallback for older browsers
},

/**
 * Get or create style element in iframe
 * @private
 * @param {String} styleId - Style element ID
 * @returns {jQuery}
 */
_getOrCreateStyle: function(styleId) {
    if (!currentIframeDoc) {
        console.error('❌ CSS Manager: iframe document not initialized');
        return null;
    }
    
    var $style = $(currentIframeDoc).find('#' + styleId);
    
    // If not exists - create it
    if (!$style.length) {
        $style = $('<style>', {
            id: styleId,
            type: 'text/css',
            media: 'not all',
            disabled: true
        });
        
        // Insert after published style (correct priority order)
        var $publishedStyle = $(currentIframeDoc).find('#bte-theme-css-variables');
        if ($publishedStyle.length) {
            $publishedStyle.after($style);
            console.log('📝 Created style element:', styleId);
        } else {
            // Fallback - append to head
            $(currentIframeDoc.head).append($style);
            console.log('📝 Created style element (in head):', styleId);
        }
    }
    
    return $style;
},

/**
 * Update style element content
 * @private
 * @param {String} styleId - Style element ID
 * @param {String} css - CSS content
 */
_updateStyleContent: function(styleId, css) {
    var $style = this._getOrCreateStyle(styleId);
    if ($style && $style.length) {
        $style.text(css);
        console.log('✅ Updated style content:', styleId, '(' + css.length + ' chars)');
    }
},
```

**Призначення**:
- `_enableStyle()` / `_disableStyle()` - перемикання через media + disabled
- `_getOrCreateStyle()` - створити style tag якщо не існує
- `_updateStyleContent()` - оновити вміст style

---

#### **C. Повністю переписати метод `switchTo()` (рядки 52-82)**

```javascript
/**
 * Switch to a different status (DRAFT, PUBLISHED) or load specific publication
 * 
 * @param {String} status - DRAFT | PUBLISHED | PUBLICATION
 * @param {Number} publicationId - Publication ID (required for PUBLICATION status)
 * @returns {Promise}
 */
switchTo: function(status, publicationId) {
    console.log('🔄 CSS Manager: Switching to', status, publicationId || '');
    
    if (!storeId || !currentIframeDoc) {
        console.error('❌ CSS Manager not initialized');
        return Promise.reject(new Error('CSS Manager not initialized'));
    }
    
    currentStatus = status;
    currentPublicationId = publicationId || null;
    
    // Get style elements
    var $publishedStyle = $(currentIframeDoc).find('#bte-theme-css-variables');
    var $draftStyle = $(currentIframeDoc).find('#bte-theme-css-variables-draft');
    var $publicationStyle = $(currentIframeDoc).find('#bte-publication-css-' + publicationId);
    
    var self = this;
    
    switch (status) {
        case 'DRAFT':
            // Load draft CSS via GraphQL
            return getCss(storeId, themeId, 'DRAFT', null)
                .then(function(response) {
                    if (response && response.getThemeEditorCss) {
                        var css = response.getThemeEditorCss.css || '';
                        
                        // Create/update draft style
                        self._updateStyleContent('bte-theme-css-variables-draft', css);
                        $draftStyle = self._getOrCreateStyle('bte-theme-css-variables-draft');
                        
                        // Enable draft, disable others
                        self._enableStyle($draftStyle);
                        self._disableStyle($publishedStyle);
                        
                        // Disable all publications
                        $(currentIframeDoc).find('style[id^="bte-publication-css-"]').each(function() {
                            self._disableStyle($(this));
                        });
                        
                        console.log('📗 CSS Manager: Showing DRAFT');
                        return {status: 'DRAFT', success: true};
                    } else {
                        throw new Error('Invalid response from GraphQL');
                    }
                })
                .catch(function(error) {
                    console.error('❌ Failed to load DRAFT CSS:', error);
                    return Promise.reject(error);
                });
                
        case 'PUBLISHED':
            // Use existing published style from PHP template
            self._enableStyle($publishedStyle);
            self._disableStyle($draftStyle);
            
            // Disable all publications
            $(currentIframeDoc).find('style[id^="bte-publication-css-"]').each(function() {
                self._disableStyle($(this));
            });
            
            console.log('📕 CSS Manager: Showing PUBLISHED');
            return Promise.resolve({status: 'PUBLISHED', success: true});
            
        case 'PUBLICATION':
            if (!publicationId) {
                console.error('❌ Publication ID required');
                return Promise.reject(new Error('Publication ID required'));
            }
            
            // Load publication CSS via GraphQL
            return getCss(storeId, themeId, 'PUBLICATION', publicationId)
                .then(function(response) {
                    if (response && response.getThemeEditorCss) {
                        var css = response.getThemeEditorCss.css || '';
                        var publicationStyleId = 'bte-publication-css-' + publicationId;
                        
                        // Create/update publication style
                        self._updateStyleContent(publicationStyleId, css);
                        $publicationStyle = self._getOrCreateStyle(publicationStyleId);
                        
                        // Disable others
                        self._disableStyle($publishedStyle);
                        self._disableStyle($draftStyle);
                        
                        // Disable other publications, enable current
                        $(currentIframeDoc).find('style[id^="bte-publication-css-"]').each(function() {
                            var $style = $(this);
                            if ($style.attr('id') === publicationStyleId) {
                                self._enableStyle($style);
                            } else {
                                self._disableStyle($style);
                            }
                        });
                        
                        console.log('📙 CSS Manager: Showing PUBLICATION', publicationId);
                        return {
                            status: 'PUBLICATION', 
                            publicationId: publicationId, 
                            success: true
                        };
                    } else {
                        throw new Error('Invalid response from GraphQL');
                    }
                })
                .catch(function(error) {
                    console.error('❌ Failed to load PUBLICATION CSS:', error);
                    return Promise.reject(error);
                });
                
        default:
            console.error('❌ Invalid status:', status);
            return Promise.reject(new Error('Invalid status: ' + status));
    }
}
```

**Ключові особливості**:
- ✅ **DRAFT**: завантажує через GraphQL, створює/оновлює draft style
- ✅ **PUBLISHED**: використовує існуючий style з PHP (немає GraphQL запиту)
- ✅ **PUBLICATION**: створює style з ID (`bte-publication-css-{id}`)
- ✅ Підтримка кількох publication styles одночасно (на майбутнє)

---

#### **D. Закоментувати старий метод `_loadAndInjectCSS` (для історії)**

**Рядки 92-145**:

```javascript
/* 
 * DEPRECATED: Old method using preview-manager.injectCSS()
 * Now we work directly with iframe DOM and use correct IDs
 * 
 * Kept for historical reference - can be removed later
 *
_loadAndInjectCSS: function(status, publicationId) {
    var self = this;
    
    console.log('📥 Loading CSS:', status, publicationId || '');
    
    // Load CSS using getCss function (it handles GraphQL internally)
    return getCss(
        parseInt(storeId),
        parseInt(themeId) || null,
        status,
        publicationId ? parseInt(publicationId) : null
    )
        .then(function(response) {
            ... OLD CODE ...
        });
},
*/
```

**Причина**: Вся логіка перенесена в `switchTo()`, старий код більше не потрібен

---

### **Зміна 5: Оновити preview-manager.js ID**

**Файл**: `view/adminhtml/web/js/editor/preview-manager.js`

**Рядок 71**:
```javascript
// Було:
var existingStyle = doc.getElementById('bte-draft-css');

// Стане:
var existingStyle = doc.getElementById('bte-theme-css-variables-draft');
```

**Рядок 78**:
```javascript
// Було:
style.id = 'bte-draft-css';

// Стане:
style.id = 'bte-theme-css-variables-draft';
```

**Рядок 132**:
```javascript
// Було:
var existingStyle = doc.getElementById('bte-draft-css');

// Стане:
var existingStyle = doc.getElementById('bte-theme-css-variables-draft');
```

**Причина**: Для консистентності ID, навіть якщо preview-manager більше не використовується css-manager

---

### **Зміна 6: Очистити кеш**

```bash
docker exec magento248local-phpfpm-1 bash -c "rm -rf var/cache var/view_preprocessed pub/static/adminhtml && php bin/magento cache:flush"
```

---

## 📊 ПІДСУМОК ЗМІН

| # | Файл | Зміна | Складність | Рядків |
|---|------|-------|------------|--------|
| 1 | `inline-css-variables.phtml` | Додати `false &&` для вимкнення draft | 🟢 Просто | 1 |
| 2 | `publication-selector.js` | Виправити iframe ID | 🟢 Тривіально | 1 |
| 3 | `css-manager.js` | Оновити `_getStyleId()` | 🟢 Просто | 5 |
| 4 | `css-manager.js` | Переробити `init()`, `switchTo()`, додати helper методи | 🔴 Складно | ~200 |
| 5 | `preview-manager.js` | Оновити ID | 🟢 Просто | 3 |
| 6 | - | Очистити кеш | 🟢 Тривіально | - |

**Загалом**: 5 файлів, ~210 рядків коду

---

## ✅ ОЧІКУВАНИЙ РЕЗУЛЬТАТ

### Style теги в iframe після змін:

1. **`bte-theme-css-variables`** (published)
   - Джерело: PHP template
   - Коли активний: статус PUBLISHED
   - Завжди присутній в HTML ✅

2. **`bte-theme-css-variables-draft`** (draft)
   - Джерело: створюється JS через GraphQL
   - Коли активний: статус DRAFT
   - Створюється on-demand ✅

3. **`bte-publication-css-{id}`** (publication)
   - Джерело: створюється JS через GraphQL
   - Коли активний: статус PUBLICATION з ID
   - Підтримка кількох одночасно (майбутнє) ✅

### Логіка перемикання:

**PUBLISHED** (найпростіше):
```javascript
enable:  #bte-theme-css-variables (вже є в HTML)
disable: #bte-theme-css-variables-draft
disable: всі #bte-publication-css-*
// Немає GraphQL запиту ✅
```

**DRAFT**:
```javascript
GraphQL: завантажити draft CSS
create:  #bte-theme-css-variables-draft (якщо не існує)
update:  вміст draft style
enable:  #bte-theme-css-variables-draft
disable: #bte-theme-css-variables
disable: всі #bte-publication-css-*
```

**PUBLICATION 10**:
```javascript
GraphQL: завантажити publication CSS (id=10)
create:  #bte-publication-css-10 (якщо не існує)
update:  вміст publication style
enable:  #bte-publication-css-10
disable: #bte-theme-css-variables
disable: #bte-theme-css-variables-draft
disable: інші #bte-publication-css-* (крім 10)
```

---

## 🎯 ПЕРЕВАГИ НОВОЇ АРХІТЕКТУРИ

### 1. **Консистентність**:
- ✅ Frontend і Admin використовують однакові ID
- ✅ Однакова логіка enable/disable через media + disabled
- ✅ Легше підтримувати код

### 2. **Performance**:
- ✅ Менший HTML (немає порожнього draft style)
- ✅ CSS завантажується on-demand (тільки коли потрібно)
- ✅ PUBLISHED не потребує GraphQL запиту (швидше)

### 3. **Гнучкість**:
- ✅ Підтримка кількох publication одночасно (для майбутнього)
- ✅ JS може динамічно керувати стилями
- ✅ Простіше додавати нові типи CSS (наприклад STAGING)

### 4. **Чистота коду**:
- ✅ Чіткий розподіл: PHP = published, JS = draft/publications
- ✅ Видалено дублювання логіки
- ✅ Менше умовних перевірок в PHP

---

## 🧪 ПЛАН ТЕСТУВАННЯ

### Після виконання всіх змін:

1. **Очистити кеш** (зміна 6)
2. **Перезавантажити сторінку** Theme Editor в admin панелі (Ctrl+Shift+R)
3. **Відкрити консоль** (F12)

### Перевірити консоль на помилки:
```javascript
// Має бути:
✅ CSS Manager initialized
✅ Publication selector initialized
✅ Publications loaded: {items: Array(6), total_count: 6}
```

### Перевірити style теги в iframe:
```javascript
var iframe = document.getElementById('bte-iframe');
var iframeDoc = iframe.contentDocument;
var allStyles = iframeDoc.querySelectorAll('style[id*="bte"]');
console.log('Styles in iframe:', allStyles);

// Має бути при завантаженні (PUBLISHED статус):
// 1. bte-theme-css-variables (media="all", disabled=false) ✅
```

### Тест 1: Переключити на DRAFT
1. Клікнути "Draft" в publication selector
2. Перевірити в консолі:
   ```
   📗 CSS Manager: Showing DRAFT
   ```
3. Перевірити в iframe:
   ```javascript
   var draftStyle = iframeDoc.getElementById('bte-theme-css-variables-draft');
   console.log('Draft style:', draftStyle);
   console.log('Draft enabled:', draftStyle.getAttribute('media') === 'all');
   
   var publishedStyle = iframeDoc.getElementById('bte-theme-css-variables');
   console.log('Published disabled:', publishedStyle.getAttribute('media') === 'not all');
   ```

### Тест 2: Переключити на PUBLISHED
1. Клікнути "Published" в publication selector
2. Перевірити що published активний, draft неактивний

### Тест 3: Вибрати Publication
1. Відкрити dropdown з публікаціями
2. Вибрати будь-яку публікацію (наприклад #10)
3. Перевірити в консолі:
   ```
   📙 CSS Manager: Showing PUBLICATION 10
   ```
4. Перевірити в iframe:
   ```javascript
   var pubStyle = iframeDoc.getElementById('bte-publication-css-10');
   console.log('Publication style:', pubStyle);
   console.log('Publication enabled:', pubStyle.getAttribute('media') === 'all');
   ```

### Тест 4: Перемикати між publications
1. Вибрати Publication #9
2. Вибрати Publication #10
3. Перевірити що тільки останній вибраний активний

### Критерії успіху:
- ✅ Немає помилок в консолі
- ✅ Publications завантажуються (6 items)
- ✅ Перемикання DRAFT/PUBLISHED/PUBLICATION працює
- ✅ Тільки один style активний одночасно
- ✅ CSS застосовується в iframe (візуально змінюється)

---

## 🚀 ПОСЛІДОВНІСТЬ ВИКОНАННЯ (завтра)

### Етап 1: Прості зміни (15 хв)
1. ✅ Зміна 1: PHP template (`false &&`)
2. ✅ Зміна 2: iframe ID
3. ✅ Зміна 3: ID схема в `_getStyleId()`
4. ✅ Зміна 5: preview-manager ID

### Етап 2: Складна зміна (45-60 хв)
5. ✅ Зміна 4: Повна переробка css-manager.js
   - Додати змінну `currentIframeDoc`
   - Переписати `init()` з retry логікою
   - Додати helper методи
   - Переписати `switchTo()`
   - Закоментувати `_loadAndInjectCSS()`

### Етап 3: Тестування (30 хв)
6. ✅ Зміна 6: Очистити кеш
7. ✅ Запустити всі тести (див. План тестування)
8. ✅ Виправити помилки якщо знайдено

**Загальний час**: ~90-120 хвилин

---

## 📝 НОТАТКИ ДЛЯ ВИКОНАННЯ

### Важливо пам'ятати:
1. **Retry логіка**: iframe завантажується async, потрібно чекати
2. **ID з номером**: `bte-publication-css-{id}` - підтримка кількох
3. **jQuery Deferred**: використовуємо `.always()` замість `.finally()`
4. **Disable стилів**: використовувати ОБА `media="not all"` + `disabled=true`

### Файли для читання (якщо потрібна підказка):
- Frontend css-manager: `view/frontend/web/js/theme-editor/css-manager.js`
  - Методи: `init()` (38-92), `_enableStyle()` (116-120), `switchTo()` (162-260)

### Backup (якщо щось піде не так):
```bash
# Зробити backup перед змінами:
cp view/adminhtml/web/js/editor/css-manager.js view/adminhtml/web/js/editor/css-manager.js.backup
```

---

## ✅ ВИКОНАНО

**Дата завершення**: 17 лютого 2026  
**Результат**: Admin CSS Manager повністю рефакторений і працює консистентно з frontend

### Виконані зміни:

| # | Файл | Зміна | Статус |
|---|------|-------|--------|
| 1 | `inline-css-variables.phtml` | Draft CSS повністю видалено з PHP | ✅ DONE |
| 2 | `publication-selector.js` | iframe ID = `bte-iframe` | ✅ DONE |
| 3 | `css-manager.js` | ID схема оновлена | ✅ DONE |
| 4 | `css-manager.js` | Повна переробка з retry логікою | ✅ DONE |
| 5 | `preview-manager.js` | ID оновлено (line 71, 78, 132) | ✅ DONE |

### Що працює зараз:

1. ✅ **PUBLISHED CSS** - завантажується з PHP template, немає GraphQL запиту
2. ✅ **DRAFT CSS** - створюється динамічно через JS після GraphQL запиту
3. ✅ **PUBLICATION CSS** - створюється динамічно з унікальним ID
4. ✅ **Перемикання стилів** - через `media="all"` / `media="not all"` + `disabled`
5. ✅ **Retry логіка** - чекає поки iframe завантажиться
6. ✅ **Консистентні ID** - `bte-theme-css-variables`, `bte-theme-css-variables-draft`, `bte-publication-css-{id}`

### Наступні кроки:

- ⏭️ Перейти до Phase 4 - Polish & Optimization (6 годин)
- 📋 Або Phase 5 - Testing & Documentation (8-12 годин)

---

**Архівований файл**: `/media/om3r/disk500/Work/magento248.local/src/vendor/swissup/module-breeze-theme-editor/PLAN-CSS-MANAGER-REFACTOR.md`

