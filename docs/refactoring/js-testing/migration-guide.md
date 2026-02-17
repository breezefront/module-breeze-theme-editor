# JS Test Framework - Migration to Admin Area

## 🎯 Мета

Перенести існуючий JavaScript тестовий фреймворк з frontend в адмінку для live тестування JS компонентів, які поступово мігрують з frontend на backend.

---

## 📊 Поточна ситуація

### ✅ Що вже є (Frontend)

**Інфраструктура:**
- `Block/TestRunner.php` - контролер через URL параметри
- `view/frontend/layout/breeze_default.xml` - активація через `?jstest=true`
- `view/frontend/templates/test-runner.phtml` - UI панель справа
- `view/frontend/web/js/test/test-framework.js` - assertion API, async тести
- `view/frontend/web/js/test/test-runner.js` - UI логіка, запуск тестів
- `view/frontend/web/js/test/helpers/mock-helper.js` - GraphQL mock система

**Тести (23 файли, ~4,700 рядків):**
- color-utils-test.js
- palette-manager-test.js
- auth-manager-test.js
- publication-mode-test.js
- cascade-behavior-test.js
- field-badges-reset-test.js
- та інші...

**Особливості:**
- Активація: `?jstest=true` (показує панель), `?autorun=true` (автозапуск)
- Фільтри: `?suite=PaletteManager` (конкретний тест)
- UI: фіксована панель справа, кнопки Run/Clear/Copy/Close
- Mock система для GraphQL запитів

### ✅ Що вже є (Admin)

**JS Компоненти (~80 файлів):**
```
view/adminhtml/web/js/
├── graphql/
│   ├── client.js                    # ✅ GraphQL клієнт (Bearer auth)
│   ├── mutations/
│   └── queries/
├── editor/
│   ├── toolbar.js                   # ✅ Координатор toolbar
│   ├── css-manager.js               # CSS injection в iframe
│   ├── preview-manager.js           # Preview управління
│   ├── panel/
│   │   ├── settings-editor.js       # Settings panel
│   │   ├── palette-manager.js       # Palette управління
│   │   └── field-handlers/          # Field типи
│   ├── toolbar/
│   │   ├── navigation.js            # Navigation widget
│   │   ├── publication-selector.js  # Publication dropdown
│   │   ├── scope-selector.js        # Store/Theme selector
│   │   └── page-selector.js         # Page type selector
│   └── util/
│       ├── config-manager.js        # Глобальний конфіг
│       └── url-builder.js           # URL utilities
├── auth-manager.js                  # Token управління
└── utils/
    ├── error-handler.js             # Error handling
    └── permissions.js               # ACL перевірки
```

**Toolbar структура:**
- Navigation з панелями (theme-editor, presets, export, etc.)
- Device switcher (desktop/tablet/mobile)
- Publication selector (Draft/Published/Publication)
- Scope selector (Website/Store/Theme)
- Page selector (Home/Category/Product/etc.)
- Highlight toggle, Exit button

**GraphQL клієнт:**
- Bearer token authentication (localStorage: `bte_admin_token`)
- Endpoint: `/graphql`
- Підтримка операцій: queries, mutations
- Error handling

---

## 🏗️ Архітектура міграції

### Структура файлів

```
view/adminhtml/
├── layout/
│   └── breeze_editor_editor_index.xml    # Додати TestRunner блок
├── templates/
│   └── test-runner.phtml                 # Admin версія UI панелі
└── web/js/test/
    ├── test-framework.js                 # Копія з frontend (universal)
    ├── test-runner.js                    # Адаптація для адмінки
    ├── test-fixtures.js                  # Admin-specific fixtures
    ├── helpers/
    │   └── mock-helper.js                # GraphQL mock для адмінки
    └── tests/
        ├── admin-toolbar-test.js         # Перший тест
        └── (поступово додавати)

Block/TestRunner.php                      # Розширити для адмінки
```

---

## 📋 Покроковий план

### **Крок 1: Підготовка структури (30 хв)**

**1.1. Створити директорії:**
```bash
mkdir -p view/adminhtml/web/js/test/helpers
mkdir -p view/adminhtml/web/js/test/tests
```

**1.2. Що копіювати з frontend:**
- ✅ `test-framework.js` → копіювати **без змін** (максимально universal)
- ⚠️ `test-runner.js` → потрібна **адаптація** для адмінки
- ⚠️ `test-fixtures.js` → створити **новий** для admin контексту
- ⚠️ `helpers/mock-helper.js` → **адаптувати** для admin GraphQL

**1.3. Критичні відмінності admin vs frontend:**

| Аспект | Frontend | Admin |
|--------|----------|-------|
| **RequireJS** | ✅ Так | ✅ Так |
| **jQuery** | ✅ Глобально | ✅ Глобально |
| **GraphQL endpoint** | `/graphql` | `/graphql` |
| **Auth** | Custom header | Bearer token (localStorage) |
| **Context** | `$iframe()` | `$('#theme-editor-panel')` |
| **Toolbar** | Немає | `#bte-toolbar` |

---

### **Крок 2: Адаптація test-framework.js (15 хв)**

**Стратегія:** Залишити **максимально незмінним**, додати тільки admin helpers.

**2.1. Копіювати `test-framework.js`:**
```bash
cp view/frontend/web/js/test/test-framework.js \
   view/adminhtml/web/js/test/test-framework.js
```

**2.2. Додати admin-specific helpers (опціонально):**
```javascript
// В createTestContext() додати:
{
    // Frontend helper (вже є)
    $iframe: function() {
        return $('iframe').contents();
    },
    
    // Admin helper (новий)
    $panel: function() {
        return $('#theme-editor-panel');
    },
    
    // Admin toolbar helper (новий)
    $toolbar: function() {
        return $('#bte-toolbar');
    },
    
    // Перевірка чи панель відкрита
    isPanelOpen: function() {
        var $panel = $('#theme-editor-panel');
        return $panel.length > 0 && 
               $panel.is(':visible') && 
               $panel.hasClass('active');
    }
}
```

**Результат:** Universal фреймворк, працює і на frontend і в адмінці.

---

### **Крок 3: Адаптація test-runner.js (30 хв)**

**3.1. Копіювати і адаптувати:**
```bash
cp view/frontend/web/js/test/test-runner.js \
   view/adminhtml/web/js/test/test-runner.js
```

**3.2. Що змінити:**

**A. RequireJS paths (якщо потрібно):**
```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'  // Шлях однаковий
], function($, TestFramework) {
    // ...
});
```

**B. Селектори (якщо відрізняються):**
```javascript
// Frontend:
var $element = $(element);
var $results = $element.find('#test-results');

// Admin - може бути те саме якщо використовуємо той самий template
```

**C. Логування (підтримка різних контекстів):**
```javascript
console.log('🧪 Test Runner initialized (Admin Context)');
```

**Результат:** Працюючий test-runner для адмінки.

---

### **Крок 4: Адаптація mock-helper.js (45 хв)**

**Критичний файл!** GraphQL mock система повинна працювати з admin GraphQL client.

**4.1. Проаналізувати різницю:**

**Frontend GraphQL client:**
```javascript
// Використовує custom header (X-Store-Code, X-Theme-Id)
```

**Admin GraphQL client:**
```javascript
// Використовує Bearer token (Authorization header)
// Token: localStorage.getItem('bte_admin_token')
// Endpoint: ConfigManager.get().graphqlEndpoint
```

**4.2. Стратегія mock'ування:**

**Варіант A: Підмінити `graphql/client.js`:**
```javascript
// В mock-helper.js
var originalClient = require('Swissup_BreezeThemeEditor/js/graphql/client');
var mockClient = {
    execute: function(query, variables, operationName) {
        // Перехопити запит
        // Повернути mock дані якщо співпадає
        // Інакше викликати originalClient.execute()
    }
};

// Replace
define.amd.modules['Swissup_BreezeThemeEditor/js/graphql/client'] = mockClient;
```

**Варіант B: Event interception:**
```javascript
// Підписатися на GraphQL запити
$(document).on('graphql:request', function(e, data) {
    // Перехопити і повернути mock
});
```

**Варіант C: XHR interception:**
```javascript
// Підмінити XMLHttpRequest.prototype.open
var originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
    if (url.includes('/graphql')) {
        // Перехопити
    }
    return originalOpen.apply(this, arguments);
};
```

**Рекомендація:** **Варіант A** - найчистіший, працює з RequireJS.

**4.3. Створити `helpers/mock-helper.js`:**
```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/graphql/client'
], function($, GraphQLClient) {
    'use strict';
    
    var MockHelper = {
        _mocks: {},
        _originalExecute: null,
        _isActive: false,
        
        activate: function() {
            if (this._isActive) return;
            
            // Зберегти оригінальний execute
            this._originalExecute = GraphQLClient.execute;
            
            // Підмінити на mock версію
            var self = this;
            GraphQLClient.execute = function(query, variables, operationName) {
                // Перевірити чи є mock для цього запиту
                var mockData = self._findMock(operationName || 'unknown', variables);
                
                if (mockData) {
                    console.log('🎭 Mock intercepted:', operationName, variables);
                    return $.Deferred().resolve(mockData).promise();
                }
                
                // Інакше викликати оригінальний метод
                return self._originalExecute.call(GraphQLClient, query, variables, operationName);
            };
            
            this._isActive = true;
            console.log('✅ Mock system activated (Admin)');
        },
        
        deactivate: function() {
            if (!this._isActive) return;
            
            // Відновити оригінальний метод
            GraphQLClient.execute = this._originalExecute;
            this._isActive = false;
            this._mocks = {};
            
            console.log('✅ Mock system deactivated');
        },
        
        mockOperation: function(operationName, variables, mockResponse) {
            var key = this._createKey(operationName, variables);
            this._mocks[key] = mockResponse;
        },
        
        mockGetCss: function(params, mockResponse) {
            this.mockOperation('getCss', params, mockResponse);
        },
        
        clearMocks: function() {
            this._mocks = {};
        },
        
        _findMock: function(operationName, variables) {
            var key = this._createKey(operationName, variables);
            return this._mocks[key] || null;
        },
        
        _createKey: function(operationName, variables) {
            // Створити унікальний ключ для mock
            return operationName + ':' + JSON.stringify(variables || {});
        }
    };
    
    return MockHelper;
});
```

**Результат:** Працюючий mock helper для admin GraphQL.

---

### **Крок 5: Backend Block розширення (30 хв)**

**5.1. Оновити `Block/TestRunner.php`:**
```php
<?php

namespace Swissup\BreezeThemeEditor\Block;

use Magento\Framework\View\Element\Template;

class TestRunner extends Template
{
    /**
     * Check if tests should be rendered based on URL parameter
     * Works both for frontend and admin
     *
     * @return bool
     */
    public function shouldRenderTests()
    {
        $request = $this->getRequest();
        $jstest = $request->getParam('jstest');
        
        return $jstest === 'true' || $jstest === '1';
    }
    
    /**
     * Check if tests should auto-run
     *
     * @return bool
     */
    public function shouldAutoRun()
    {
        $request = $this->getRequest();
        $autorun = $request->getParam('autorun');
        
        return $autorun === 'true' || $autorun === '1';
    }
    
    /**
     * Get specific test suite to run (or null for all)
     *
     * @return string|null
     */
    public function getTestSuite()
    {
        return $this->getRequest()->getParam('suite');
    }
    
    /**
     * Get list of test modules to load
     * Returns admin tests if in admin context, frontend tests otherwise
     *
     * @return array
     */
    public function getTestModules()
    {
        if ($this->isAdminContext()) {
            return $this->getAdminTestModules();
        }
        
        return $this->getFrontendTestModules();
    }
    
    /**
     * Check if current context is admin area
     *
     * @return bool
     */
    public function isAdminContext()
    {
        // Check if template path contains 'adminhtml'
        return strpos($this->getTemplate(), 'adminhtml') !== false;
    }
    
    /**
     * Get admin test modules list
     *
     * @return array
     */
    protected function getAdminTestModules()
    {
        return [
            // Utility tests (пріоритет 1)
            'Swissup_BreezeThemeEditor/js/test/tests/admin-auth-manager-test',
            
            // Component tests (пріоритет 2 - додавати по потребі)
            // 'Swissup_BreezeThemeEditor/js/test/tests/admin-toolbar-test',
            // 'Swissup_BreezeThemeEditor/js/test/tests/admin-panel-test',
            
            // Business logic tests (пріоритет 3)
            // 'Swissup_BreezeThemeEditor/js/test/tests/admin-palette-manager-test',
        ];
    }
    
    /**
     * Get frontend test modules list (existing)
     *
     * @return array
     */
    protected function getFrontendTestModules()
    {
        return [
            'Swissup_BreezeThemeEditor/js/test/tests/auth-manager-test',
            'Swissup_BreezeThemeEditor/js/test/tests/css-manager-test',
            // ... existing 23 tests
        ];
    }
}
```

**Результат:** Блок підтримує обидва контексти (frontend + admin).

---

### **Крок 6: Admin Layout інтеграція (20 хв)**

**6.1. Оновити `view/adminhtml/layout/breeze_editor_editor_index.xml`:**
```xml
<?xml version="1.0"?>
<page xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="urn:magento:framework:View/Layout/etc/page_configuration.xsd">
    <body>
        <!-- Existing content block -->
        <referenceContainer name="content">
            <!-- Existing editor blocks -->
            
            <!-- Test Runner (activated with ?jstest=true URL parameter) -->
            <block
                class="Swissup\BreezeThemeEditor\Block\TestRunner"
                name="breeze.admin.test.runner"
                template="Swissup_BreezeThemeEditor::admin/test-runner.phtml"
                after="-"
            />
        </referenceContainer>
    </body>
</page>
```

**6.2. Створити `view/adminhtml/templates/admin/test-runner.phtml`:**
```php
<?php
/**
 * @var \Swissup\BreezeThemeEditor\Block\TestRunner $block
 */
?>
<?php if ($block->shouldRenderTests()): ?>
<div id="breeze-test-runner" style="
    position: fixed;
    top: 0;
    right: 0;
    width: 450px;
    max-height: 100vh;
    overflow-y: auto;
    background: #fff;
    border-left: 2px solid #333;
    box-shadow: -4px 0 20px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 13px;
">
    <!-- Header -->
    <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; position: sticky; top: 0; z-index: 1;">
        <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">
            🧪 Admin JS Tests
        </h3>
        <div id="test-summary" style="font-size: 12px; opacity: 0.9;">
            ⏳ Loading tests...
        </div>
    </div>
    
    <!-- Test Results -->
    <div id="test-results" style="padding: 15px; min-height: 300px;">
        <div style="text-align: center; padding: 40px 20px; color: #999;">
            <div style="font-size: 48px;">🧪</div>
            <p style="margin: 10px 0 0 0;">Ready to run admin tests</p>
        </div>
    </div>
    
    <!-- Footer Controls -->
    <div style="padding: 15px; background: #f5f5f5; border-top: 1px solid #ddd; position: sticky; bottom: 0;">
        <button id="run-all-tests" style="
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: transform 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            ▶ Run All Tests
        </button>
        
        <button id="clear-tests" style="
            width: 100%;
            padding: 10px;
            margin-top: 8px;
            background: #fff;
            color: #666;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        ">
            🗑️ Clear Results
        </button>
        
        <button id="copy-results" style="
            width: 100%;
            padding: 10px;
            margin-top: 8px;
            background: #fff;
            color: #666;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        ">
            📋 Copy Results
        </button>
        
        <button id="close-tests" style="
            width: 100%;
            padding: 10px;
            margin-top: 8px;
            background: #fff;
            color: #666;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        " onclick="document.getElementById('breeze-test-runner').style.display='none'">
            ✖ Close
        </button>
    </div>
</div>

<script type="text/x-magento-init">
{
    "#breeze-test-runner": {
        "Swissup_BreezeThemeEditor/js/test/test-runner": {
            "testModules": <?= /* @noEscape */ json_encode($block->getTestModules()) ?>,
            "autoRun": <?= $block->shouldAutoRun() ? 'true' : 'false' ?>,
            "testSuite": <?= $block->getTestSuite() ? '"' . $block->escapeJs($block->getTestSuite()) . '"' : 'null' ?>
        }
    }
}
</script>
<?php endif; ?>
```

**Результат:** UI панель в адмінці, аналогічна frontend версії.

---

### **Крок 7: Toolbar інтеграція (опціонально, 30 хв)**

**Додати кнопку "JS Tests" в toolbar.**

**7.1. Знайти toolbar template:**
```bash
find view/adminhtml -name "*toolbar*.html" -o -name "*toolbar*.phtml"
```

**7.2. Додати кнопку (якщо є dev mode):**
```html
<!-- В toolbar template -->
<button 
    id="bte-jstest-toggle" 
    class="bte-toolbar__button"
    title="Toggle JS Tests"
    style="display: <?= $isDevelopmentMode ? 'block' : 'none' ?>;">
    🧪 Tests
</button>

<script>
require(['jquery'], function($) {
    $('#bte-jstest-toggle').on('click', function() {
        var currentUrl = window.location.href;
        var separator = currentUrl.includes('?') ? '&' : '?';
        var newUrl = currentUrl + separator + 'jstest=true';
        window.location.href = newUrl;
    });
});
</script>
```

**Альтернатива:** Dropdown меню з опціями:
- Run Tests
- Run Tests (auto)
- Close Tests

**Результат:** Зручна кнопка для активації тестів.

---

### **Крок 8: Створення першого тесту (45 хв)**

**8.1. Auth Manager Test (`tests/admin-auth-manager-test.js`):**
```javascript
/**
 * Admin Auth Manager Tests
 * 
 * Tests authentication and token management in admin context
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/auth-manager'
], function(TestFramework, AuthManager) {
    'use strict';
    
    return TestFramework.suite('Admin Auth Manager', {
        
        /**
         * Test 1: Should have Bearer token in localStorage
         */
        'should have Bearer token in localStorage': function() {
            var token = localStorage.getItem('bte_admin_token');
            
            this.assertNotNull(token, 
                'Bearer token should exist in localStorage');
            this.assertTrue(token.length > 10, 
                'Token should be a valid string');
        },
        
        /**
         * Test 2: Should initialize config from ConfigManager
         */
        'should initialize config from ConfigManager': function() {
            var config = AuthManager.getConfig();
            
            this.assertNotNull(config, 'Config should be available');
            this.assertNotNull(config.storeId, 'storeId should be set');
            this.assertNotNull(config.themeId, 'themeId should be set');
        },
        
        /**
         * Test 3: GraphQL client should use Bearer token (async)
         */
        'GraphQL client should use Bearer token': function(done) {
            this.enableMocks();
            
            // Mock simple query
            this.mockOperation('testQuery', {}, {
                data: { test: 'success' }
            });
            
            var GraphQLClient = require('Swissup_BreezeThemeEditor/js/graphql/client');
            
            GraphQLClient.execute('query testQuery { test }', {}, 'testQuery')
                .done(function(response) {
                    this.assertEquals(response.data.test, 'success', 
                        'Mock should intercept GraphQL request');
                    this.clearMocks();
                    done();
                }.bind(this))
                .fail(function(error) {
                    this.fail('GraphQL request failed: ' + error);
                    this.clearMocks();
                    done(error);
                }.bind(this));
        }
    });
});
```

**8.2. Додати в `Block/TestRunner.php`:**
```php
protected function getAdminTestModules()
{
    return [
        'Swissup_BreezeThemeEditor/js/test/tests/admin-auth-manager-test',
    ];
}
```

**Результат:** Перший працюючий тест в адмінці!

---

## 🚀 Порядок виконання

### Фаза 1: Інфраструктура (2 години)
- [x] Крок 1: Створити структуру директорій
- [x] Крок 2: Скопіювати test-framework.js
- [x] Крок 3: Адаптувати test-runner.js
- [x] Крок 4: Створити mock-helper.js
- [x] Крок 5: Розширити Block/TestRunner.php
- [x] Крок 6: Створити admin layout + template

### Фаза 2: Перевірка (30 хв)
- [x] Відкрити `/admin/breeze_editor/editor/index?jstest=true`
- [x] Перевірити що панель відображається
- [x] Перевірити що RequireJS завантажує модулі
- [x] Debug console для помилок

### Фаза 3: Перший тест (1 година)
- [x] Створити admin-auth-manager-test.js
- [x] Запустити тест
- [x] Переконатися що працює mock система
- [x] Переконатися що assertions працюють

### Фаза 4: Масштабування (по потребі)
- [ ] Додавати тести для кожного нового компонента
- [ ] Створювати admin-specific fixtures
- [ ] Документувати тестові сценарії

---

## 📝 Checklist першого запуску

```bash
# 1. Створити структуру
mkdir -p view/adminhtml/web/js/test/{helpers,tests}
mkdir -p view/adminhtml/templates/admin

# 2. Скопіювати файли
cp view/frontend/web/js/test/test-framework.js \
   view/adminhtml/web/js/test/test-framework.js

cp view/frontend/web/js/test/test-runner.js \
   view/adminhtml/web/js/test/test-runner.js

# 3. Створити mock-helper.js
# (див. Крок 4)

# 4. Оновити Block/TestRunner.php
# (див. Крок 5)

# 5. Створити layout + template
# (див. Крок 6)

# 6. Створити перший тест
# (див. Крок 8)

# 7. Відкрити в браузері
# URL: /admin/breeze_editor/editor/index?jstest=true&autorun=true

# 8. Перевірити console
# Шукати:
# ✅ "Admin toolbar initialized"
# ✅ "Mock system activated"
# ✅ "Test passed"
```

---

## 🎯 Пріоритети тестування

### Пріоритет 1: Utility компоненти (без UI)
1. ✅ **Auth Manager** - токени, GraphQL
2. ✅ **Config Manager** - глобальний конфіг
3. ✅ **URL Builder** - побудова URLs
4. ✅ **Error Handler** - обробка помилок

### Пріоритет 2: Business Logic
5. **Palette Manager** - управління палітрами
6. **CSS Manager** - CSS injection
7. **Preview Manager** - iframe управління
8. **Storage Helper** - localStorage операції

### Пріоритет 3: UI Components
9. **Toolbar Navigation** - перемикання панелей
10. **Publication Selector** - Draft/Published/Publication
11. **Scope Selector** - Store/Theme switching
12. **Settings Editor** - форма редагування

### Пріоритет 4: Integration тести
13. **Full workflow** - відкрити панель, змінити значення, зберегти, перевірити CSS
14. **Multi-store** - перемикання між stores
15. **Publication flow** - Draft → Publish → Rollback

---

## 🔧 Налаштування

### URL параметри

| Параметр | Значення | Опис |
|----------|----------|------|
| `jstest` | `true` | Показати панель тестів |
| `autorun` | `true` | Автоматично запустити тести |
| `suite` | `AuthManager` | Запустити конкретний тест-suite |

**Приклади:**
```
# Показати панель
/admin/breeze_editor/editor/index?jstest=true

# Автозапуск всіх тестів
/admin/breeze_editor/editor/index?jstest=true&autorun=true

# Запустити конкретний suite
/admin/breeze_editor/editor/index?jstest=true&suite=AuthManager&autorun=true
```

### Development mode

Рекомендується ввімкнути кнопку тестів тільки в dev mode:
```php
// Block/TestRunner.php
public function isDevelopmentMode()
{
    return $this->_appState->getMode() === \Magento\Framework\App\State::MODE_DEVELOPER;
}
```

---

## 📚 Довідка

### Mock Helper API

```javascript
// Активувати mock систему
this.enableMocks();

// Mock GraphQL операції
this.mockOperation('getCss', { storeId: 1 }, { data: { css: ':root {}' } });

// Mock getCss (helper)
this.mockGetCss({ storeId: 1, themeId: 1 }, mockData);

// Очистити всі mocks
this.clearMocks();

// Деактивувати mock систему
this.disableMocks();
```

### Test Framework API

```javascript
// Assertions
this.assert(condition, message);
this.assertEquals(actual, expected, message);
this.assertNotNull(value, message);
this.assertTrue(value, message);
this.assertFalse(value, message);
this.assertContains(array, value, message);
this.assertStringContains(haystack, needle, message);

// Async тести
'async test name': function(done) {
    setTimeout(function() {
        this.assertEquals(1, 1);
        done(); // Викликати коли тест завершено
    }.bind(this), 100);
}

// Helpers
this.$('#element-id');           // jQuery в document
this.$panel();                   // Admin panel element
this.$toolbar();                 // Admin toolbar element
this.waitFor(condition, timeout, callback);
```

### GraphQL Client (Admin)

```javascript
var GraphQLClient = require('Swissup_BreezeThemeEditor/js/graphql/client');

GraphQLClient.execute(query, variables, operationName)
    .done(function(response) {
        // Success
    })
    .fail(function(error) {
        // Error
    });
```

---

## ❓ Troubleshooting

### Проблема: Панель не відображається

**Перевірити:**
1. URL має параметр `?jstest=true`
2. Layout XML підключений правильно
3. Template path правильний
4. `shouldRenderTests()` повертає `true`

**Debug:**
```javascript
console.log('Template:', '<?= $block->getTemplate() ?>');
console.log('Should render:', <?= $block->shouldRenderTests() ? 'true' : 'false' ?>);
```

### Проблема: RequireJS не завантажує модулі

**Перевірити:**
1. Шляхи до файлів правильні
2. Файли існують фізично
3. `requirejs-config.js` не перезаписує шляхи

**Debug:**
```javascript
require(['Swissup_BreezeThemeEditor/js/test/test-framework'], function(fw) {
    console.log('Loaded:', fw);
});
```

### Проблема: Mock система не перехоплює запити

**Перевірити:**
1. `this.enableMocks()` викликано на початку тесту
2. Mock зареєстровано перед викликом GraphQL
3. Operation name співпадає

**Debug:**
```javascript
console.log('Mock registered:', MockHelper._mocks);
console.log('Active:', MockHelper._isActive);
```

### Проблема: Bearer token відсутній

**Перевірити:**
1. Toolbar ініціалізований (`config.token` переданий)
2. Token збережений в localStorage
3. GraphQL клієнт підтягує token

**Debug:**
```javascript
console.log('Token:', localStorage.getItem('bte_admin_token'));
console.log('Config:', ConfigManager.get());
```

---

## 📖 Наступні кроки

1. **Запустити Крок 1-6** - створити інфраструктуру
2. **Перевірити базову роботу** - панель відображається
3. **Створити перший тест** - admin-auth-manager-test.js
4. **Переконатися що працює** - тест проходить
5. **Поступово додавати тести** - для кожного компонента

**По мірі міграції компонентів з frontend на backend:**
- Створювати admin версії тестів
- Адаптувати існуючі frontend тести
- Документувати відмінності

---

## 🎉 Готово!

Після виконання всіх кроків у вас буде:
- ✅ Працюючий тестовий фреймворк в адмінці
- ✅ UI панель з кнопками Run/Clear/Copy
- ✅ Mock система для GraphQL
- ✅ Перший працюючий тест
- ✅ Готова інфраструктура для додавання нових тестів

**URL для запуску:**
```
/admin/breeze_editor/editor/index?jstest=true&autorun=true
```

---

**Документ створено:** 2026-02-13  
**Автор:** OpenCode  
**Версія:** 1.0
