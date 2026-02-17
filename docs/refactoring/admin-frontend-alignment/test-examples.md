# Приклади тестів для Navigation & Panel Integration

Цей файл містить приклади тестів які треба створити після виконання рефакторингу **admin-frontend-alignment**.

---

## 📂 Структура тестів

```
view/adminhtml/web/js/test/tests/
├── navigation-lazy-loading-test.js     (НОВИЙ)
├── panel-lifecycle-test.js             (НОВИЙ)
├── panel-widget-integration-test.js    (НОВИЙ)
└── navigation-consistency-test.js      (НОВИЙ)
```

---

## 🧪 ТЕСТ 1: Navigation Lazy Loading

**Файл:** `view/adminhtml/web/js/test/tests/navigation-lazy-loading-test.js`

### Призначення:
Перевірити що панель ініціалізується LAZY (при відкритті), а не EAGER (при завантаженні).

### Код:

```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';

    return {
        name: 'Navigation Lazy Loading Test',
        
        tests: {
            /**
             * Тест 1: Панель НЕ ініціалізована при завантаженні
             */
            'panel should NOT be initialized on page load': function() {
                var $panel = $('#theme-editor-panel');
                
                this.assertTrue($panel.length > 0, 
                    'Panel element should exist in DOM');
                
                this.assertEquals($panel.html().trim(), '', 
                    'Panel should be empty (not initialized yet)');
                
                this.assertFalse($panel.data('panel-initialized'), 
                    'Panel should NOT have initialized flag');
                
                this.assertFalse($panel.data('swissupThemeSettingsEditor'), 
                    'Widget should NOT be attached yet');
            },
            
            /**
             * Тест 2: Панель ініціалізується при першому відкритті
             */
            'panel should initialize on first open': function(done) {
                var self = this;
                var $panel = $('#theme-editor-panel');
                var $navigation = $('#bte-navigation');
                
                // Переконатись що панель закрита
                if ($panel.hasClass('active')) {
                    var widget = $navigation.data('swissupBreezeNavigation');
                    widget.deactivate('theme-editor', true);
                }
                
                // Перевірити що панель порожня
                this.assertEquals($panel.html().trim(), '', 
                    'Panel should be empty before open');
                
                // Відкрити панель
                TestFramework.openPanel('theme-editor', function(err) {
                    if (err) {
                        self.fail('Failed to open panel: ' + err.message);
                        done();
                        return;
                    }
                    
                    // Перевірити що панель ініціалізована
                    self.assertTrue($panel.data('panel-initialized'), 
                        'Panel should have initialized flag');
                    
                    self.assertTrue($panel.html().length > 0, 
                        'Panel should have content after init');
                    
                    var widgetInstance = $panel.data('swissupThemeSettingsEditor');
                    self.assertNotNull(widgetInstance, 
                        'Widget should be attached to panel');
                    
                    console.log('✅ Lazy init test passed');
                    done();
                });
            },
            
            /**
             * Тест 3: Панель НЕ ініціалізується повторно
             */
            'panel should NOT re-initialize on second open': function(done) {
                var self = this;
                var $panel = $('#theme-editor-panel');
                var initCount = 0;
                
                // Spy на метод _initializePanel
                var $navigation = $('#bte-navigation');
                var widget = $navigation.data('swissupBreezeNavigation');
                var originalInit = widget._initializePanel;
                
                widget._initializePanel = function(itemId) {
                    initCount++;
                    console.log('🔍 _initializePanel called:', initCount, 'times');
                    return originalInit.call(this, itemId);
                };
                
                // Відкрити панель (1-й раз)
                TestFramework.openPanel('theme-editor', function(err) {
                    if (err) {
                        self.fail('Failed to open panel first time: ' + err.message);
                        done();
                        return;
                    }
                    
                    var firstInitCount = initCount;
                    
                    // Закрити панель
                    TestFramework.closePanel('theme-editor', function(err) {
                        if (err) {
                            self.fail('Failed to close panel: ' + err.message);
                            done();
                            return;
                        }
                        
                        // Відкрити панель (2-й раз)
                        TestFramework.openPanel('theme-editor', function(err) {
                            if (err) {
                                self.fail('Failed to open panel second time: ' + err.message);
                                done();
                                return;
                            }
                            
                            // Перевірити що init викликався тільки 1 раз (при першому відкритті)
                            self.assertEquals(initCount, firstInitCount, 
                                '_initializePanel should be called only once (on first open)');
                            
                            // Відновити оригінальний метод
                            widget._initializePanel = originalInit;
                            
                            console.log('✅ No re-init test passed');
                            done();
                        });
                    });
                });
            },
            
            /**
             * Тест 4: panelWidgets config існує
             */
            'navigation should have panelWidgets config': function() {
                var $navigation = $('#bte-navigation');
                var widget = $navigation.data('swissupBreezeNavigation');
                
                this.assertNotNull(widget, 
                    'Navigation widget should be initialized');
                
                this.assertNotNull(widget.options.panelWidgets, 
                    'Widget should have panelWidgets config');
                
                this.assertNotNull(widget.options.panelWidgets['theme-editor'], 
                    'theme-editor panel config should exist');
                
                var config = widget.options.panelWidgets['theme-editor'];
                
                this.assertEquals(config.selector, '#theme-editor-panel', 
                    'Panel selector should match');
                
                this.assertEquals(config.widget, 'themeSettingsEditor', 
                    'Widget name should be themeSettingsEditor');
                
                this.assertNotNull(config.config, 
                    'Widget config should exist');
            }
        }
    };
});
```

---

## 🧪 ТЕСТ 2: Panel Lifecycle

**Файл:** `view/adminhtml/web/js/test/tests/panel-lifecycle-test.js`

### Призначення:
Перевірити повний життєвий цикл панелі (відкриття → закриття → повторне відкриття).

### Код:

```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';

    return {
        name: 'Panel Lifecycle Test',
        
        tests: {
            /**
             * Тест 1: Цикл відкриття/закриття працює
             */
            'panel open/close cycle should work': function(done) {
                var self = this;
                var $panel = $('#theme-editor-panel');
                
                // 1. Відкрити панель
                TestFramework.openPanel('theme-editor', function(err) {
                    if (err) {
                        self.fail('Failed to open panel: ' + err.message);
                        done();
                        return;
                    }
                    
                    self.assertTrue(TestFramework.isPanelOpen('theme-editor'), 
                        'Panel should be open after openPanel()');
                    
                    self.assertTrue($panel.hasClass('active'), 
                        'Panel should have active class');
                    
                    self.assertTrue($panel.is(':visible'), 
                        'Panel should be visible');
                    
                    // 2. Закрити панель
                    TestFramework.closePanel('theme-editor', function(err) {
                        if (err) {
                            self.fail('Failed to close panel: ' + err.message);
                            done();
                            return;
                        }
                        
                        self.assertFalse(TestFramework.isPanelOpen('theme-editor'), 
                            'Panel should be closed after closePanel()');
                        
                        self.assertFalse($panel.hasClass('active'), 
                            'Panel should NOT have active class');
                        
                        self.assertFalse($panel.is(':visible'), 
                            'Panel should NOT be visible');
                        
                        // 3. Повторно відкрити панель
                        TestFramework.openPanel('theme-editor', function(err) {
                            if (err) {
                                self.fail('Failed to re-open panel: ' + err.message);
                                done();
                                return;
                            }
                            
                            self.assertTrue(TestFramework.isPanelOpen('theme-editor'), 
                                'Panel should be open again');
                            
                            console.log('✅ Lifecycle test passed');
                            done();
                        });
                    });
                });
            },
            
            /**
             * Тест 2: body.bte-panel-active клас управляється правильно
             */
            'body class should toggle with panel state': function(done) {
                var self = this;
                
                // Закрити всі панелі
                TestFramework.closePanel('theme-editor', function() {
                    
                    // Перевірити що body НЕ має клас
                    self.assertFalse($('body').hasClass('bte-panel-active'), 
                        'Body should NOT have bte-panel-active when panel closed');
                    
                    // Відкрити панель
                    TestFramework.openPanel('theme-editor', function(err) {
                        if (err) {
                            self.fail('Failed to open panel: ' + err.message);
                            done();
                            return;
                        }
                        
                        // Wait for animation
                        setTimeout(function() {
                            // Перевірити що body має клас
                            self.assertTrue($('body').hasClass('bte-panel-active'), 
                                'Body should have bte-panel-active when panel open');
                            
                            // Закрити панель
                            TestFramework.closePanel('theme-editor', function(err) {
                                if (err) {
                                    self.fail('Failed to close panel: ' + err.message);
                                    done();
                                    return;
                                }
                                
                                // Wait for animation
                                setTimeout(function() {
                                    // Перевірити що body більше не має клас
                                    self.assertFalse($('body').hasClass('bte-panel-active'), 
                                        'Body should NOT have bte-panel-active after close');
                                    
                                    console.log('✅ Body class test passed');
                                    done();
                                }, 400);
                            });
                        }, 400);
                    });
                });
            },
            
            /**
             * Тест 3: Події спрацьовують в правильному порядку
             */
            'events should fire in correct order': function(done) {
                var self = this;
                var events = [];
                var $navigation = $('#bte-navigation');
                
                // Слухати події
                $navigation.on('navigationChanged.test', function(e, data) {
                    events.push({type: 'navigationChanged', active: data.active});
                });
                
                $navigation.on('panelShown.test', function(e, data) {
                    events.push({type: 'panelShown', panelId: data.panelId});
                });
                
                $navigation.on('panelHidden.test', function(e, data) {
                    events.push({type: 'panelHidden', panelId: data.panelId});
                });
                
                // Відкрити панель
                TestFramework.openPanel('theme-editor', function(err) {
                    if (err) {
                        self.fail('Failed to open panel: ' + err.message);
                        done();
                        return;
                    }
                    
                    // Перевірити що події спрацювали
                    self.assertTrue(events.length >= 2, 
                        'At least 2 events should fire on open');
                    
                    var hasNavigationChanged = events.some(function(e) {
                        return e.type === 'navigationChanged' && e.active === true;
                    });
                    
                    var hasPanelShown = events.some(function(e) {
                        return e.type === 'panelShown';
                    });
                    
                    self.assertTrue(hasNavigationChanged, 
                        'navigationChanged(active=true) should fire');
                    
                    self.assertTrue(hasPanelShown, 
                        'panelShown should fire');
                    
                    // Очистити події
                    events = [];
                    
                    // Закрити панель
                    TestFramework.closePanel('theme-editor', function(err) {
                        if (err) {
                            self.fail('Failed to close panel: ' + err.message);
                            done();
                            return;
                        }
                        
                        // Перевірити що події спрацювали
                        self.assertTrue(events.length >= 2, 
                            'At least 2 events should fire on close');
                        
                        var hasNavigationDeactivated = events.some(function(e) {
                            return e.type === 'navigationChanged' && e.active === false;
                        });
                        
                        var hasPanelHidden = events.some(function(e) {
                            return e.type === 'panelHidden';
                        });
                        
                        self.assertTrue(hasNavigationDeactivated, 
                            'navigationChanged(active=false) should fire');
                        
                        self.assertTrue(hasPanelHidden, 
                            'panelHidden should fire');
                        
                        // Очистити listeners
                        $navigation.off('.test');
                        
                        console.log('✅ Events test passed');
                        done();
                    });
                });
            }
        }
    };
});
```

---

## 🧪 ТЕСТ 3: Panel Widget Integration

**Файл:** `view/adminhtml/web/js/test/tests/panel-widget-integration-test.js`

### Призначення:
Перевірити інтеграцію між navigation widget та settings-editor widget.

### Код:

```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';

    return {
        name: 'Panel Widget Integration Test',
        
        tests: {
            /**
             * Тест 1: Widget створює правильну DOM структуру
             */
            'widget should create correct DOM structure': function(done) {
                var self = this;
                var $panel = $('#theme-editor-panel');
                
                TestFramework.openPanel('theme-editor', function(err) {
                    if (err) {
                        self.fail('Failed to open panel: ' + err.message);
                        done();
                        return;
                    }
                    
                    // Перевірити що widget створив структуру
                    var $wrapper = $panel.find('.bte-theme-editor-panel');
                    self.assertTrue($wrapper.length > 0, 
                        'Widget should create .bte-theme-editor-panel wrapper');
                    
                    var $header = $wrapper.find('.bte-panel-header');
                    self.assertTrue($header.length > 0, 
                        'Widget should create header');
                    
                    var $title = $header.find('.bte-panel-title');
                    self.assertTrue($title.length > 0, 
                        'Header should have title');
                    
                    var $closeBtn = $header.find('.bte-panel-close');
                    self.assertTrue($closeBtn.length > 0, 
                        'Header should have close button');
                    
                    var $content = $wrapper.find('.bte-panel-content');
                    self.assertTrue($content.length > 0, 
                        'Widget should create content area');
                    
                    console.log('✅ DOM structure test passed');
                    done();
                });
            },
            
            /**
             * Тест 2: Close button працює
             */
            'close button should work': function(done) {
                var self = this;
                var $panel = $('#theme-editor-panel');
                
                TestFramework.openPanel('theme-editor', function(err) {
                    if (err) {
                        self.fail('Failed to open panel: ' + err.message);
                        done();
                        return;
                    }
                    
                    // Знайти кнопку закриття
                    var $closeBtn = $panel.find('.bte-panel-close');
                    self.assertTrue($closeBtn.length > 0, 
                        'Close button should exist');
                    
                    // Клікнути на кнопку
                    $closeBtn.trigger('click');
                    
                    // Почекати на закриття
                    setTimeout(function() {
                        self.assertFalse(TestFramework.isPanelOpen('theme-editor'), 
                            'Panel should be closed after clicking close button');
                        
                        console.log('✅ Close button test passed');
                        done();
                    }, 500);
                });
            },
            
            /**
             * Тест 3: Widget отримує правильний config
             */
            'widget should receive correct config': function(done) {
                var self = this;
                var $panel = $('#theme-editor-panel');
                
                TestFramework.openPanel('theme-editor', function(err) {
                    if (err) {
                        self.fail('Failed to open panel: ' + err.message);
                        done();
                        return;
                    }
                    
                    var widget = $panel.data('swissupThemeSettingsEditor');
                    self.assertNotNull(widget, 
                        'Widget should be attached');
                    
                    // Перевірити config
                    self.assertNotNull(widget.options, 
                        'Widget should have options');
                    
                    self.assertEquals(widget.options.title, 'Theme Editor', 
                        'Widget should have correct title');
                    
                    self.assertNotNull(widget.storeId, 
                        'Widget should have storeId');
                    
                    self.assertNotNull(widget.themeId, 
                        'Widget should have themeId');
                    
                    console.log('✅ Widget config test passed');
                    done();
                });
            }
        }
    };
});
```

---

## 🧪 ТЕСТ 4: Navigation Consistency (Frontend vs Admin)

**Файл:** `view/adminhtml/web/js/test/tests/navigation-consistency-test.js`

### Призначення:
Перевірити що Admin navigation має ту саму структуру що й Frontend.

### Код:

```javascript
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';

    return {
        name: 'Navigation Consistency Test (Admin ↔ Frontend)',
        
        tests: {
            /**
             * Тест 1: Контейнер має правильний ID
             */
            'container should have correct ID': function() {
                var $container = $('#bte-panels-container');
                
                this.assertTrue($container.length > 0, 
                    'Container #bte-panels-container should exist (same as frontend)');
                
                this.assertTrue($container.hasClass('bte-panels-container'), 
                    'Container should have class bte-panels-container');
                
                // Перевірити що старий ID не існує
                var $oldContainer = $('#bte-panels');
                this.assertFalse($oldContainer.length > 0, 
                    'Old container #bte-panels should NOT exist');
            },
            
            /**
             * Тест 2: Widget має правильну назву
             */
            'widget should have correct name': function(done) {
                var self = this;
                
                TestFramework.openPanel('theme-editor', function(err) {
                    if (err) {
                        self.fail('Failed to open panel: ' + err.message);
                        done();
                        return;
                    }
                    
                    var $panel = $('#theme-editor-panel');
                    var widget = $panel.data('swissupThemeSettingsEditor');
                    
                    self.assertNotNull(widget, 
                        'Widget should be themeSettingsEditor (same as frontend)');
                    
                    // Перевірити що старе ім'я НЕ використовується
                    var oldWidget = $panel.data('swissupBreezeSettingsEditor');
                    self.assertFalse(oldWidget, 
                        'Old widget name breezeSettingsEditor should NOT be used');
                    
                    console.log('✅ Widget name test passed');
                    done();
                });
            },
            
            /**
             * Тест 3: Navigation має _initializePanel метод
             */
            'navigation should have _initializePanel method': function() {
                var $navigation = $('#bte-navigation');
                var widget = $navigation.data('swissupBreezeNavigation');
                
                this.assertNotNull(widget, 
                    'Navigation widget should exist');
                
                this.assertTrue(typeof widget._initializePanel === 'function', 
                    'Navigation should have _initializePanel method (same as frontend)');
            },
            
            /**
             * Тест 4: CSS селектори відповідають frontend
             */
            'CSS selectors should match frontend': function() {
                // Панель
                var $panel = $('#theme-editor-panel');
                this.assertTrue($panel.hasClass('bte-panel'), 
                    'Panel should have .bte-panel class');
                
                // Контейнер
                var $container = $('#bte-panels-container');
                this.assertTrue($container.hasClass('bte-panels-container'), 
                    'Container should have .bte-panels-container class');
            }
        }
    };
});
```

---

## 📝 Реєстрація тестів в test-runner.js

Після створення файлів, додати їх в `view/adminhtml/web/js/test/test-runner.js`:

```javascript
define([
    // ... інші тести ...
    'Swissup_BreezeThemeEditor/js/test/tests/navigation-lazy-loading-test',
    'Swissup_BreezeThemeEditor/js/test/tests/panel-lifecycle-test',
    'Swissup_BreezeThemeEditor/js/test/tests/panel-widget-integration-test',
    'Swissup_BreezeThemeEditor/js/test/tests/navigation-consistency-test'
], function(
    // ... інші тести ...
    NavigationLazyLoadingTest,
    PanelLifecycleTest,
    PanelWidgetIntegrationTest,
    NavigationConsistencyTest
) {
    'use strict';
    
    return {
        suites: [
            // ... інші тести ...
            NavigationLazyLoadingTest,
            PanelLifecycleTest,
            PanelWidgetIntegrationTest,
            NavigationConsistencyTest
        ]
    };
});
```

---

## 🚀 Запуск тестів

### Admin tests:
```
http://magento.local/admin/breeze_editor/test/run
```

### Console command:
```javascript
// Запустити всі тести
TestRunner.run();

// Запустити конкретний suite
TestRunner.runSuite('Navigation Lazy Loading Test');

// Запустити конкретний тест
TestRunner.runTest('Navigation Lazy Loading Test', 'panel should NOT be initialized on page load');
```

---

## 📊 Очікувані результати

### Всі тести (4 suites, ~15 тестів):

```
✅ Navigation Lazy Loading Test (4/4 passed)
   ✅ panel should NOT be initialized on page load
   ✅ panel should initialize on first open
   ✅ panel should NOT re-initialize on second open
   ✅ navigation should have panelWidgets config

✅ Panel Lifecycle Test (3/3 passed)
   ✅ panel open/close cycle should work
   ✅ body class should toggle with panel state
   ✅ events should fire in correct order

✅ Panel Widget Integration Test (3/3 passed)
   ✅ widget should create correct DOM structure
   ✅ close button should work
   ✅ widget should receive correct config

✅ Navigation Consistency Test (4/4 passed)
   ✅ container should have correct ID
   ✅ widget should have correct name
   ✅ navigation should have _initializePanel method
   ✅ CSS selectors should match frontend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULTS: 14/14 tests passed ✅
Time: ~5-10 seconds
```

---

## 🔗 Зв'язок з Frontend тестами

### Frontend має подібні тести:

- `view/frontend/web/js/test/tests/panel-integration-test.js`
- Використовує той самий test framework
- Admin тести можна базувати на Frontend прикладах

### Спільні helper методи (test-framework.js):

```javascript
// Ці методи працюють в обох areas
TestFramework.openPanel(itemId, callback)
TestFramework.closePanel(itemId, callback)
TestFramework.isPanelOpen(itemId)
TestFramework.waitFor(condition, timeout, callback)
```

---

**Автор:** OpenCode AI  
**Дата:** 17 лютого 2026
