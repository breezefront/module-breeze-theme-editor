# Phase 4 - Test Migration & Validation

**Статус:** 🟡 Готово до виконання  
**Час:** 8-10 годин  
**Пріоритет:** ВИСОКИЙ ⭐⭐⭐

---

## 🎯 Цілі Фази

Мігрувати JavaScript тести на PHP Unit тести, валідувати функціональність та створити test audit report.

### Чому це важливо?

1. **Консолідація тестів:** Зараз маємо 36 JS тестів + 21 PHP тестів = дублювання coverage
2. **Backend-first testing:** PHP тести краще для GraphQL/Server-side логіки
3. **Виявлення broken functionality:** Тести покажуть що працює, а що ні
4. **Quality assurance:** Before final release треба знати стан проекту

---

## 📊 Поточний Стан Тестів

### JavaScript Tests (36 total)

**Adminhtml (11 tests):**
- `view/adminhtml/web/js/test/`
  - config-test.js
  - device-switcher-test.js
  - error-handler-test.js
  - fullscreen-manager-test.js
  - loading-manager-test.js
  - permissions-test.js
  - preview-manager-test.js
  - publication-selector-test.js
  - status-indicator-test.js
  - toolbar-toggle-test.js
  - toolbar-test.js

**Frontend (25 tests):**
- `view/frontend/web/js/test/`
  - css-manager-test.js
  - event-bus-test.js
  - highlighter-test.js
  - panel-manager-test.js
  - settings-editor/ (тести для settings editor компонентів)
  - інші component tests

### PHP Tests (21 existing)

- `Test/Unit/` - 21 PHP Unit тестів
  - GraphQL resolvers tests
  - Model tests
  - Plugin tests
  - Utility tests

---

## 📋 План Виконання

### Step 1: Аналіз і Категоризація (1-1.5h)

**Завдання:**
1. Прочитати всі 36 JS тестів
2. Категоризувати по типу:
   - **GraphQL/Backend** - потрібна міграція на PHP
   - **UI/Frontend only** - залишити як JS (або видалити якщо obsolete)
   - **Duplicate coverage** - вже є PHP тести
3. Створити mapping table: JS test → PHP test location

**Deliverable:**
- `test-analysis.md` - категоризація всіх 36 тестів
- `migration-map.md` - plan які тести куди мігрувати

---

### Step 2: Міграція GraphQL/Backend Тестів (3-4h)

**Пріоритетні тести для міграції:**

#### 2.1 Settings GraphQL (1h)
- Settings editor tests → PHP
- Field handlers tests → PHP
- Validation tests → PHP

**Файли:**
- Create: `Test/Unit/Model/Resolver/Settings/*Test.php`
- Update: Existing settings resolver tests

#### 2.2 Publication Selector (0.5h)
- Publication queries tests → PHP
- Publication mutations tests → PHP

**Файли:**
- Create: `Test/Unit/Model/Resolver/Publication/*Test.php`

#### 2.3 Toolbar Components (1h)
- Status indicator (GraphQL parts) → PHP
- Permissions system → PHP
- Config loading → PHP

**Файли:**
- Create: `Test/Unit/Model/Resolver/Editor/*Test.php`

#### 2.4 Preview & CSS Manager (0.5-1h)
- CSS Manager backend logic → PHP
- Preview manager server-side → PHP

**Файли:**
- Create: `Test/Unit/Model/CssManager/*Test.php`

#### 2.5 ACL & Security (0.5h)
- Verify existing PHP tests cover JS functionality
- Add missing edge cases

---

### Step 3: Мердж Дублікатів (1-1.5h)

**Завдання:**
1. Знайти дублювання між JS і PHP тестами
2. Консолідувати в один PHP тест
3. Видалити obsolete JS тести
4. Оновити test documentation

**Очікується:**
- Device switcher: JS test може бути obsolete (localStorage тепер)
- Toolbar toggle: JS test може бути obsolete
- Settings: Частково дублюється

---

### Step 4: Функціональна Валідація (2-2.5h)

**Завдання:**
1. Запустити всі PHPUnit тести
2. Ідентифікувати failing tests
3. Категоризувати failures:
   - **Test bugs** - тест неправильний
   - **Real bugs** - код не працює
   - **Missing features** - не реалізовано
4. Виправити test bugs
5. Задокументувати real bugs для Phase 5

**Команди:**
```bash
# Run all tests
vendor/bin/phpunit Test/Unit/

# Run specific test suites
vendor/bin/phpunit Test/Unit/Model/Resolver/
vendor/bin/phpunit Test/Unit/Plugin/

# With coverage report
vendor/bin/phpunit --coverage-html coverage/
```

---

### Step 5: Test Audit Report (1-1.5h)

**Створити:** `docs/migration/phases/phase-4/TEST-AUDIT-REPORT.md`

**Структура звіту:**

```markdown
# Test Audit Report - Phase 4

## Test Coverage Summary
- Total PHP tests: XX
- Total JS tests: XX (YY migrated, ZZ kept)
- Coverage: XX%

## Functionality Status

### ✅ Working Features
- Feature 1: Tests passing
- Feature 2: Tests passing
...

### ⚠️ Broken Features
- Feature X: Test fails because...
- Feature Y: Missing implementation...

### 📋 Untested Features
- Feature Z: No tests exist
...

## Migration Summary
- Migrated tests: XX
- Merged duplicates: XX
- Removed obsolete: XX
- Kept as JS: XX

## Recommendations for Phase 5
1. Fix broken feature X
2. Implement missing feature Y
3. Add tests for feature Z
```

---

## 📁 Файли які будуть створені/оновлені

### Нові файли:
```
docs/migration/phases/phase-4/
├── test-analysis.md              # Категоризація 36 тестів
├── migration-map.md              # Mapping JS→PHP
├── TEST-AUDIT-REPORT.md          # Фінальний звіт
└── test-migration-plan.md        # Детальний план міграції

Test/Unit/Model/
├── Resolver/
│   ├── Settings/*Test.php        # Settings tests (нові)
│   ├── Publication/*Test.php     # Publication tests (нові)
│   └── Editor/*Test.php          # Editor/Toolbar tests (нові)
└── CssManager/*Test.php          # CSS Manager tests (нові)
```

### Оновлені файли:
```
Test/Unit/
├── Model/Resolver/*              # Existing tests + new coverage
└── Plugin/*                      # Existing tests + new coverage

view/adminhtml/web/js/test/       # Cleanup obsolete tests
view/frontend/web/js/test/        # Cleanup obsolete tests
```

---

## 🎯 Deliverables

### Must Have ✅
1. ✅ Test analysis document (категоризація)
2. ✅ PHP tests для GraphQL functionality
3. ✅ Test Audit Report
4. ✅ Passing test suite (або documented failures)

### Nice to Have 💡
1. 💡 Code coverage report (HTML)
2. 💡 Integration tests (якщо час залишиться)
3. 💡 Test refactoring для кращої структури

---

## 🚦 Критерії Завершення

Phase 4 вважається завершеним коли:

- [ ] Всі 36 JS тестів проаналізовано та категоризовано
- [ ] GraphQL/Backend тести мігровано на PHP
- [ ] Дублікати змерджено або видалено
- [ ] PHPUnit test suite запускається без помилок (або помилки задокументовано)
- [ ] TEST-AUDIT-REPORT.md створено з висновками
- [ ] Документація оновлена

---

## 📊 Часовий Розклад

| Завдання | Час | Опис |
|----------|-----|------|
| **Step 1** | 1-1.5h | Аналіз і категоризація тестів |
| **Step 2** | 3-4h | Міграція GraphQL/Backend тестів |
| **Step 3** | 1-1.5h | Мердж дублікатів |
| **Step 4** | 2-2.5h | Функціональна валідація |
| **Step 5** | 1-1.5h | Test Audit Report |
| **TOTAL** | **8-10h** | |

---

## 🎯 Пріоритизація

### Високий пріоритет ⭐⭐⭐
- Settings Editor tests (найбільший функціонал)
- Publication/Status tests (критична функціональність)
- ACL/Security tests (безпека)

### Середній пріоритет ⭐⭐
- CSS Manager tests
- Preview Manager tests
- Toolbar components tests

### Низький пріоритет ⭐
- UI-only tests (можна залишити як JS)
- Animation/Transition tests
- Helper/Utility tests (якщо вже є coverage)

---

## 🔗 Пов'язані Документи

- [Master Plan](../../master-plan.md) - Загальний план міграції
- [Phase 3A](../phase-3a/) - GraphQL implementation
- [Phase 3B](../phase-3b/) - Settings Editor
- [Phase 5](../phase-5/) - Final Polish (next phase)
- [Testing Overview](../../../testing/README.md) - Test guides

---

## 📝 Примітки

### Поточна ситуація:
- ✅ 36 JS тестів готово (infrastructure працює)
- ✅ 21 PHP тестів існує
- ⚠️ Невідомо скільки дублювання
- ⚠️ Невідомо який % coverage

### Після Phase 4 ми матимемо:
- ✅ Consolidated test suite (переважно PHP)
- ✅ Clear picture: що працює, що ні
- ✅ Documented broken features для Phase 5
- ✅ Better test organization

---

## 🚀 Як Почати

### Підготовка:
```bash
# 1. Check existing tests run
vendor/bin/phpunit Test/Unit/

# 2. Review JS test files
ls -la view/adminhtml/web/js/test/
ls -la view/frontend/web/js/test/

# 3. Review current PHP tests
ls -la Test/Unit/

# 4. Read this plan + create test-analysis.md
```

### Перший крок:
Start with **Step 1: Аналіз і Категоризація**  
📄 Create: `docs/migration/phases/phase-4/test-analysis.md`

---

**Готово до виконання!** ✅  
Повернутися до [Migration Overview](../../README.md) | [Dashboard](../../../DASHBOARD.md)
