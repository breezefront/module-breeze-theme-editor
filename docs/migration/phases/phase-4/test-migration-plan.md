# Test Migration Plan - Phase 4

**Дата створення:** 18 лютого 2026  
**Статус:** 📋 План готовий до виконання  
**Час:** 8-10 годин

---

## 🎯 Мета

Детальний покроковий план міграції 36 JavaScript тестів на PHPUnit, з фокусом на:
1. Аналіз кожного JS тесту
2. Визначення необхідності міграції
3. Створення відповідних PHP тестів
4. Валідація функціоналу

---

## 📊 Inventory: Всі 36 JS Тестів

### Adminhtml Tests (11 файлів)

**Локація:** `view/adminhtml/web/js/test/`

| # | Файл | Що тестує | Міграція? | Пріоритет |
|---|------|-----------|-----------|-----------|
| 1 | config-test.js | Editor config loading | ✅ PHP | HIGH |
| 2 | device-switcher-test.js | Device switching logic | ⚠️ Partial | MEDIUM |
| 3 | error-handler-test.js | Error handling utility | ✅ PHP | HIGH |
| 4 | fullscreen-manager-test.js | Fullscreen mode | ❌ Keep JS | LOW |
| 5 | loading-manager-test.js | Loading states | ❌ Keep JS | LOW |
| 6 | permissions-test.js | Permission checks | ✅ PHP | HIGH |
| 7 | preview-manager-test.js | Preview iframe logic | ⚠️ Partial | MEDIUM |
| 8 | publication-selector-test.js | Publication selector | ✅ PHP | HIGH |
| 9 | status-indicator-test.js | Status display | ⚠️ Partial | MEDIUM |
| 10 | toolbar-toggle-test.js | Toolbar visibility | ❌ Keep JS | LOW |
| 11 | toolbar-test.js | Toolbar integration | ⚠️ Partial | MEDIUM |

### Frontend Tests (25 файлів)

**Локація:** `view/frontend/web/js/test/`

| # | Файл | Що тестує | Міграція? | Пріоритет |
|---|------|-----------|-----------|-----------|
| 12 | css-manager-test.js | CSS injection logic | ⚠️ Partial | HIGH |
| 13 | event-bus-test.js | Event system | ❌ Keep JS | LOW |
| 14 | highlighter-test.js | Element highlighting | ❌ Keep JS | LOW |
| 15 | panel-manager-test.js | Panel show/hide | ❌ Keep JS | LOW |
| 16-40 | settings-editor/* | Settings components | ✅ PHP (backend) | HIGH |

**Settings Editor тести (~25 files):**
- field-renderer-test.js
- form-validator-test.js
- section-manager-test.js
- field-handlers/* (багато файлів)
- value-processors-test.js
- ...та інші

---

## 📋 Migration Strategy

### Категорія A: MUST Migrate to PHP ✅

**Критерії:**
- Тестує GraphQL queries/mutations
- Тестує server-side logic
- Тестує ACL/Security
- Тестує database operations

**Файли (пріоритет):**

#### A1. Settings Editor Backend (3-4h)
**JS файли:** `view/frontend/web/js/test/settings-editor/*`

**Створити PHP тести:**
```
Test/Unit/Model/Resolver/Settings/
├── QueryTest.php                 # GET settings
├── MutationTest.php              # UPDATE settings
├── ValidationTest.php            # Validation logic
└── FieldHandlers/
    ├── ColorFieldTest.php
    ├── NumberFieldTest.php
    ├── SelectFieldTest.php
    └── ...інші field types
```

**Що тестувати:**
- GraphQL query `editorSettings` повертає правильні дані
- GraphQL mutation `updateSettings` зберігає дані
- Validation rules працюють (min/max, required, etc.)
- Field handlers обробляють значення правильно
- ACL permissions перевіряються

**Приклад тесту:**
```php
// Test/Unit/Model/Resolver/Settings/QueryTest.php
public function testEditorSettingsQueryReturnsCorrectStructure()
{
    $result = $this->resolver->resolve(
        $this->field,
        $this->context,
        $this->resolveInfo,
        []
    );
    
    $this->assertArrayHasKey('sections', $result);
    $this->assertArrayHasKey('fields', $result);
    // ...
}
```

---

#### A2. Publication/Status Logic (1h)
**JS файли:**
- `publication-selector-test.js`
- `status-indicator-test.js`

**Створити PHP тести:**
```
Test/Unit/Model/Resolver/Publication/
├── QueryTest.php                 # GET publications
├── PublishMutationTest.php       # Publish action
├── RollbackMutationTest.php      # Rollback action
└── StatusTest.php                # Status calculation
```

**Що тестувати:**
- GraphQL query `editorPublications` повертає список
- Mutation `publishPublication` створює publication
- Mutation `rollbackToPublication` відкатує
- Status calculation правильний (draft/published/modified)
- ACL permissions (publish/rollback) працюють

---

#### A3. Permissions & ACL (0.5h)
**JS файли:**
- `permissions-test.js`

**Оновити існуючі PHP тести:**
```
Test/Unit/Plugin/GraphQL/
└── AclAuthorizationTest.php      # Add more test cases
```

**Що додати:**
- Test all 4 ACL levels (view/edit/publish/rollback)
- Test permission checks в UI context
- Test error messages для unauthorized users

---

#### A4. Config & Error Handling (0.5h)
**JS файли:**
- `config-test.js`
- `error-handler-test.js`

**Створити PHP тести:**
```
Test/Unit/Model/
├── ConfigProviderTest.php        # Config loading
└── ErrorHandlerTest.php          # Error formatting
```

---

### Категорія B: PARTIAL Migration ⚠️

**Критерії:**
- Має і frontend і backend частини
- Backend частину треба тестувати в PHP
- Frontend частину залишити в JS

**Файли:**

#### B1. CSS Manager (0.5-1h)
**JS файл:** `css-manager-test.js`

**Backend частина → PHP:**
```
Test/Unit/Model/CssManager/
├── ThemeVariablesTest.php        # Theme CSS variables logic
└── PublicationCssTest.php        # Publication CSS loading
```

**Frontend частина → Keep JS:**
- CSS injection в iframe
- Style tag management
- DOM manipulation

---

#### B2. Device Switcher (0.5h)
**JS файл:** `device-switcher-test.js`

**Що міграти:**
- Device config loading → PHP test
- Available devices list → PHP test

**Що залишити JS:**
- CSS width application
- Iframe resizing
- localStorage sync

---

#### B3. Preview Manager (0.5h)
**JS файл:** `preview-manager-test.js`

**Що міграти:**
- Preview URL generation → PHP test
- Store/Theme context → PHP test

**Що залишити JS:**
- Iframe loading
- Postmessage communication

---

### Категорія C: KEEP as JS ❌

**Критерії:**
- Pure frontend logic
- DOM manipulation
- UI interactions
- No server-side component

**Файли (залишити як є):**
- `fullscreen-manager-test.js` - DOM manipulation
- `loading-manager-test.js` - UI states
- `toolbar-toggle-test.js` - localStorage UI
- `event-bus-test.js` - Frontend events
- `highlighter-test.js` - DOM highlighting
- `panel-manager-test.js` - UI show/hide

**Дія:** Перевірити що тести проходять, оновити якщо потрібно

---

## 🗺️ Execution Roadmap

### Week 1: Analysis & Setup (1-1.5h)

**Day 1: Analysis**
- [ ] Read all 36 JS test files
- [ ] Fill out detailed category table (A/B/C)
- [ ] Create migration checklist
- [ ] Setup PHP test templates

**Deliverable:** `test-analysis.md` with full breakdown

---

### Week 2: Category A Migration (4-5h)

**Day 2-3: Settings Editor**
- [ ] Migrate settings query tests
- [ ] Migrate settings mutation tests
- [ ] Migrate validation tests
- [ ] Migrate field handler tests

**Day 4: Publications & Status**
- [ ] Migrate publication query tests
- [ ] Migrate publish/rollback tests
- [ ] Migrate status calculation tests

**Day 5: Permissions & Config**
- [ ] Enhance ACL tests
- [ ] Add config provider tests
- [ ] Add error handling tests

**Deliverable:** 15-20 new PHP test files

---

### Week 3: Category B & Validation (2-2.5h)

**Day 6: Partial Migration**
- [ ] CSS Manager backend tests
- [ ] Device config tests
- [ ] Preview manager backend tests

**Day 7: Test Execution**
- [ ] Run full PHPUnit suite
- [ ] Fix failing tests
- [ ] Document broken features

**Deliverable:** Passing test suite + failure documentation

---

### Week 4: Cleanup & Report (1-1.5h)

**Day 8: Cleanup**
- [ ] Remove obsolete JS tests (duplicates)
- [ ] Update JS tests that stay
- [ ] Organize test structure

**Day 9: Documentation**
- [ ] Create TEST-AUDIT-REPORT.md
- [ ] Update test README
- [ ] Document coverage gaps

**Deliverable:** Final test audit report

---

## 📝 Test Templates

### PHP Test Template

```php
<?php
/**
 * Copyright © Swissup. All rights reserved.
 */
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\[Category];

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Resolver\[Category]\[ClassName];

class [ClassName]Test extends TestCase
{
    private [ClassName] $resolver;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        // Setup mocks
        $this->resolver = new [ClassName](
            // dependencies
        );
    }
    
    public function testSomething(): void
    {
        // Arrange
        $input = [];
        
        // Act
        $result = $this->resolver->resolve(
            $this->field,
            $this->context,
            $this->resolveInfo,
            $input
        );
        
        // Assert
        $this->assertIsArray($result);
        $this->assertArrayHasKey('expected_key', $result);
    }
}
```

### Test Data Provider Template

```php
public function dataProviderForSomething(): array
{
    return [
        'case_1' => [
            'input' => ['key' => 'value'],
            'expected' => ['result' => 'expected'],
        ],
        'case_2' => [
            'input' => ['key' => 'value2'],
            'expected' => ['result' => 'expected2'],
        ],
    ];
}

/**
 * @dataProvider dataProviderForSomething
 */
public function testWithDataProvider(array $input, array $expected): void
{
    $result = $this->resolver->method($input);
    $this->assertEquals($expected, $result);
}
```

---

## 🎯 Success Metrics

### Quantitative:
- [ ] 80%+ JS tests categorized correctly
- [ ] 15-20 new PHP tests created
- [ ] 90%+ PHP tests passing
- [ ] 10-15 obsolete JS tests removed

### Qualitative:
- [ ] Clear understanding: що працює, що ні
- [ ] Documented broken features для Phase 5
- [ ] Better test organization
- [ ] Comprehensive test audit report

---

## 🚧 Known Challenges

### Challenge 1: Duplicate Coverage
**Problem:** Невідомо скільки дублювання між JS і PHP тестами  
**Solution:** Create mapping table in analysis phase

### Challenge 2: Mock Setup
**Problem:** GraphQL resolvers потребують багато mocks  
**Solution:** Create base test class з common mocks

### Challenge 3: Test Data
**Problem:** Потрібні realistic test data  
**Solution:** Use fixtures from existing tests

### Challenge 4: Time Estimation
**Problem:** 36 тестів - багато роботи  
**Solution:** Prioritize category A, postpone category C

---

## 📋 Checklist Template

Для кожного JS тесту:

- [ ] **Read:** Прочитано і зрозуміло що тестує
- [ ] **Categorize:** A (migrate) / B (partial) / C (keep)
- [ ] **Map:** Визначено куди мігрувати (PHP test location)
- [ ] **Migrate:** Створено PHP test (якщо A або B)
- [ ] **Verify:** PHP test проходить
- [ ] **Cleanup:** JS test видалено/оновлено (якщо треба)
- [ ] **Document:** Додано до test audit report

---

## 🔗 Related Documents

- [Phase 4 README](README.md) - Загальний план фази
- [Master Plan](../../master-plan.md) - Весь проект
- [Testing Overview](../../../testing/README.md) - Test guides
- [Phase 3A](../phase-3a/) - GraphQL implementation
- [Phase 3B](../phase-3b/) - Settings Editor

---

## 📞 Questions & Answers

**Q: Чи треба мігрувати ВСІ JS тести?**  
A: Ні, тільки ті що тестують backend/GraphQL logic. UI тести залишаємо JS.

**Q: Що робити з failing PHP tests?**  
A: Спочатку перевірити чи тест правильний. Якщо код broken - документувати для Phase 5.

**Q: Скільки часу на один тест?**  
A: Прості: 10-15 хв. Складні (settings): 30-45 хв.

**Q: Чи потрібен code coverage report?**  
A: Nice to have, але не критично. Головне - функціональна валідація.

---

**Готово до виконання!** 🚀  
Start with: Читання всіх 36 JS тестів + створення `test-analysis.md`
