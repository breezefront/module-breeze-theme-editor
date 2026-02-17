# Testing & QA - Documentation

**Статус:** Infrastructure готово, Component tests потрібні  
**Останнє оновлення:** 17 лютого 2026

---

## 🎯 Огляд

Документація про тестування Breeze Theme Editor: PHP unit tests, JS tests, ACL testing.

---

## 📚 Testing Guides

### 🔒 ACL Testing
📄 [acl-guide.md](acl-guide.md)

**Що містить:**
- Тестування 4-рівневих permissions (view, edit, publish, rollback)
- Сценарії тестування для різних ролей
- GraphQL authorization testing
- Admin session validation

---

### 🧪 JS Testing в Admin
📄 [jstest-admin.md](jstest-admin.md)

**Що містить:**
- Швидкий старт для admin test runner
- URL format: `/admin/breeze_editor/editor/index/jstest/1`
- Тестові кейси для Admin Auth Manager
- Troubleshooting guide

---

### 📝 Initial Testing Steps
📄 [step-0.1.md](step-0.1.md)

**Що містить:**
- Перші кроки для тестування
- Базова валідація функціональності

---

## 🧪 JS Test Framework

### Статус
- ✅ **Phase 1:** Infrastructure готово (test-framework.js, test-runner.js, mock-helper.js)
- ✅ **Phase 2:** First test (admin-auth-manager-test.js)
- 📋 **Phase 3:** Component tests (~80 files) - TODO
- 📋 **Phase 4:** Integration tests - TODO

### Документація
Детальна документація про JS testing framework знаходиться в:  
📂 [../refactoring/js-testing/](../refactoring/js-testing/)

**Файли:**
- [README.md](../refactoring/js-testing/README.md) - Огляд проекту
- [migration-guide.md](../refactoring/js-testing/migration-guide.md) - Як мігрувати тести
- [implementation-summary.md](../refactoring/js-testing/implementation-summary.md) - Що зроблено
- [next-steps.md](../refactoring/js-testing/next-steps.md) - Наступні кроки

---

## 📊 Test Coverage

### Backend PHP Tests
**Локація:** `Test/Unit/`

**Coverage:**
- ColorConverterTest.php (15 tests)
- CssGeneratorTest.php (10 tests)
- **Total:** 25 tests

### Frontend JS Tests
**Локація:** `view/frontend/web/js/test/tests/`

**Coverage:**
- color-utils-rgb-wrapper-test.js (6 tests)
- palette-format-mapping-test.js (8 tests)
- palette-integration-test.js (8 tests)
- **Total:** ~30+ tests

### Admin JS Tests
**Локація:** `view/adminhtml/web/js/test/tests/`

**Coverage:**
- admin-auth-manager-test.js (8 tests)
- **Total:** 8 tests
- **TODO:** ~72 more component tests

---

## 🚀 Швидкий Старт

### Запустити Frontend JS Tests
```bash
# У браузері:
http://localhost/pub/?jstest=1&autorun=1

# Specific suite:
http://localhost/pub/?jstest=1&suite=ColorUtils&autorun=1
```

### Запустити Admin JS Tests
```bash
# У браузері (потрібен admin login):
http://localhost/admin/breeze_editor/editor/index/jstest/1

# З autorunto:
http://localhost/admin/breeze_editor/editor/index/jstest/1?autorun=1
```

### Запустити PHP Unit Tests
```bash
cd vendor/swissup/module-breeze-theme-editor
../../bin/phpunit

# Specific test:
../../bin/phpunit Test/Unit/Model/Utility/ColorConverterTest.php
```

---

## 📋 Test Types

### 1. ACL Permission Tests
**Гайд:** [acl-guide.md](acl-guide.md)

**Що тестуємо:**
- 4 рівні permissions
- GraphQL authorization
- Admin session validation
- Permission-based UI

**Результати Phase 2:**
- ✅ 259/259 tests passing
- ✅ 811 assertions
- ✅ 0 errors

---

### 2. JS Component Tests
**Гайд:** [jstest-admin.md](jstest-admin.md)

**Що тестуємо:**
- Admin toolbar components
- GraphQL client
- Auth manager
- Storage helpers
- CSS manager

**Статус:**
- ✅ Infrastructure: Готово
- ✅ First test: Готово (admin-auth-manager)
- 📋 Component tests: TODO (~72 files)

---

### 3. Integration Tests
**Статус:** 📋 Заплановано (Phase 4 JS testing)

**Що тестувати:**
- End-to-end workflows
- Component interactions
- Real GraphQL queries
- Permission flows

---

## 📈 Test Metrics

### Поточна Coverage
```
Backend PHP:      ████████░░  ~80% (критичні утиліти)
Frontend JS:      ██████░░░░  ~60% (основні компоненти)
Admin JS:         ██░░░░░░░░  ~10% (infrastructure only)
Integration:      ░░░░░░░░░░   0% (not started)
```

### Цілі
- Backend PHP: 90%+
- Frontend JS: 80%+
- Admin JS: 70%+
- Integration: 50%+

---

## 🔗 Корисні Посилання

### Testing Guides
- 🔒 [ACL Testing Guide](acl-guide.md)
- 🧪 [JS Test Admin Guide](jstest-admin.md)
- 📝 [Initial Steps](step-0.1.md)

### JS Testing Framework
- 📖 [Framework Overview](../refactoring/js-testing/README.md)
- 🔄 [Migration Guide](../refactoring/js-testing/migration-guide.md)
- ✅ [Implementation Summary](../refactoring/js-testing/implementation-summary.md)
- 🎯 [Next Steps](../refactoring/js-testing/next-steps.md)

### Related
- 📊 [Project Dashboard](../DASHBOARD.md)
- 🗺️ [Migration Plan](../migration/master-plan.md)

---

## 📝 Writing New Tests

### Frontend JS Test Example
```javascript
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/my-module'
], function (TestFramework, MyModule) {
    'use strict';

    return TestFramework.suite('My Feature Tests', {
        
        'should do something': function() {
            var result = MyModule.doSomething('input');
            
            this.assertEquals(result, 'expected', 
                'Should process correctly');
        }
    });
});
```

### Admin JS Test Example
```javascript
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/my-component'
], function (TestFramework, MyComponent) {
    'use strict';

    return TestFramework.suite('Admin Component Tests', {
        
        'should initialize': function() {
            var instance = new MyComponent();
            
            this.assertNotNull(instance, 
                'Component should initialize');
        }
    });
});
```

### PHP Unit Test Example
```php
<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model;

use PHPUnit\Framework\TestCase;

class MyClassTest extends TestCase
{
    public function testMyMethod(): void
    {
        $instance = new MyClass();
        $result = $instance->myMethod('input');
        
        $this->assertEquals('expected', $result);
    }
}
```

---

## 🐛 Troubleshooting

### Tests не запускаються
1. Clear Magento cache: `bin/magento cache:flush`
2. Check console для JavaScript errors
3. Verify test зареєстровано в TestRunner.php

### PHPUnit не знайдено
```bash
# Install PHPUnit if missing
composer require --dev phpunit/phpunit

# Verify installation
../../bin/phpunit --version
```

### ACL Tests Failing
1. Check admin user має потрібні permissions
2. Verify GraphQL plugin активний
3. Check session validation працює

---

## 🎯 Наступні Кроки

### Короткостроково
1. Написати component tests для admin (~72 files)
2. Покращити coverage frontend tests
3. Додати integration tests

### Довгостроково
1. Automated testing в CI/CD
2. Performance testing
3. E2E testing з Playwright/Cypress

**Детальний план:** [../refactoring/js-testing/next-steps.md](../refactoring/js-testing/next-steps.md)

---

## 📊 Статистика

### Документація
- **Guides:** 3 файли
- **JS Framework:** 4 файли (в refactoring/)
- **Total:** 7 файлів

### Тести
- **PHP Unit:** 25 tests
- **Frontend JS:** ~30 tests
- **Admin JS:** 8 tests (+ ~72 TODO)
- **Total:** ~63 tests (+ 72 TODO)

---

Повернутися до [Dashboard](../DASHBOARD.md) | [Main README](../README.md)
