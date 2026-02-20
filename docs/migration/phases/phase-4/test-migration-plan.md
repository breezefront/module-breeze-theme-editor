# Test Migration Plan - Phase 4

**Дата створення:** 18 лютого 2026  
**Дата оновлення:** 20 лютого 2026  
**Статус:** 📋 Оновлено за результатами аналізу  
**Час:** 5-6 годин

---

## 🎯 Мета

Аудит існуючих тестів та валідація функціональності. Міграція JS→PHP **не потрібна** — PHP покриття вже є повне.

---

## 📊 Inventory: Всі 35 JS Spec-файлів

### Adminhtml Tests (12 файлів) — ✅ 95/95 passed

**Локація:** `view/adminhtml/web/js/test/tests/`

| # | Файл | Що тестує | Категорія | Пріоритет |
|---|------|-----------|-----------|-----------|
| 1 | color-utils-test.js | Color utility functions | ❌ Keep JS | LOW |
| 2 | critical-fixes-test.js | Bug fixes (RGB→HEX, CSS) | ❌ Keep JS | LOW |
| 3 | selector-alignment-test.js | UI selector alignment | ❌ Keep JS | LOW |
| 4 | panel-close-integration-test.js | Panel close behavior | ❌ Keep JS | LOW |
| 5 | panel-integration-test.js | Panel integration | ❌ Keep JS | LOW |
| 6 | panel-events-test.js | Panel event system | ❌ Keep JS | LOW |
| 7 | navigation-widget-test.js | Navigation UI widget | ❌ Keep JS | LOW |
| 8 | panel-positioning-test.js | Panel positioning | ❌ Keep JS | LOW |
| 9 | publication-events-alignment-test.js | Publication UI events | ❌ Keep JS | LOW |
| 10 | page-selector-sync-test.js | Page selector sync | ❌ Keep JS | LOW |
| 11 | url-navigation-persistence-test.js | URL navigation | ❌ Keep JS | LOW |
| 12 | admin-auth-manager-test.js | Auth token (backend logic) | ⚠️ Duplicate | MEDIUM |

### Frontend Tests (23 файли) — статус невідомий

**Локація:** `view/frontend/web/js/test/tests/`

| # | Файл | Що тестує | Категорія | Пріоритет |
|---|------|-----------|-----------|-----------|
| 13 | color-utils-test.js | Color utility functions | ❌ Keep JS | LOW |
| 14 | color-utils-rgb-wrapper-test.js | RGB wrapper logic | ❌ Keep JS | LOW |
| 15 | badge-renderer-test.js | Badge UI rendering | ❌ Keep JS | LOW |
| 16 | color-renderer-test.js | Color field rendering | ❌ Keep JS | LOW |
| 17 | color-popup-test.js | Color picker popup | ❌ Keep JS | LOW |
| 18 | palette-manager-test.js | Palette management | ❌ Keep JS | MEDIUM |
| 19 | palette-section-renderer-test.js | Palette section UI | ❌ Keep JS | LOW |
| 20 | palette-integration-test.js | Palette integration | ❌ Keep JS | MEDIUM |
| 21 | palette-format-mapping-test.js | Palette format mapping | ❌ Keep JS | LOW |
| 22 | palette-graphql-test.js | GraphQL palette calls | ⚠️ Duplicate | HIGH |
| 23 | color-field-palette-ref-test.js | Color field palette ref | ❌ Keep JS | LOW |
| 24 | cascade-behavior-test.js | Field cascade behavior | ❌ Keep JS | MEDIUM |
| 25 | field-badges-reset-test.js | Field badges reset | ❌ Keep JS | LOW |
| 26 | palette-preset-disabled-test.js | Palette preset disable | ❌ Keep JS | LOW |
| 27 | css-manager-test.js | CSS injection (frontend) | ❌ Keep JS | MEDIUM |
| 28 | mode-switching-test.js | Edit/view mode switch | ❌ Keep JS | MEDIUM |
| 29 | live-preview-test.js | Live preview updates | ❌ Keep JS | MEDIUM |
| 30 | publication-mode-test.js | Publication mode (mocks) | ⚠️ Duplicate | HIGH |
| 31 | edit-restrictions-test.js | Edit restrictions UI | ❌ Keep JS | MEDIUM |
| 32 | media-attributes-test.js | Media attribute handling | ❌ Keep JS | LOW |
| 33 | panel-integration-test.js | Frontend panel integration | ❌ Keep JS | MEDIUM |
| 34 | auth-manager-test.js | Auth token (backend logic) | ⚠️ Duplicate | HIGH |
| 35 | error-handling-test.js | Error handling | ⚠️ Duplicate | HIGH |

---

## 📋 Класифікація

### Category B: Duplicate (дублює PHP) ⚠️

**5 файлів** де JS тестує backend-логіку, яка вже покрита PHP тестами.  
**Дія:** залишити JS як є (integration perspective), задокументувати покриття.

| JS файл | PHP аналог (вже існує) |
|--|--|
| `admin-auth-manager-test.js` | `Test/Unit/Model/Service/AdminTokenGeneratorTest.php` |
| `palette-graphql-test.js` | `Test/Unit/Model/Resolver/Query/ValuesTest.php` + `Mutation/SavePaletteValueTest.php` |
| `auth-manager-test.js` | `Test/Unit/Model/Service/AdminTokenGeneratorTest.php` |
| `error-handling-test.js` | `Test/Unit/Model/Service/ValueServiceTest.php` (часткове) |
| `publication-mode-test.js` | `Test/Unit/Model/Resolver/Mutation/PublishTest.php` + `RollbackTest.php` |

### Category C: Keep JS ❌

**30 файлів** — чистий frontend/UI/DOM, міграція на PHP не потрібна та недоцільна.

---

## 🗺️ Execution Roadmap

### Step 1: Документування Аналізу (0.5h)

- [ ] Створити `test-analysis.md` з повною класифікацією
- [ ] Створити `migration-map.md` для Category B файлів

**Deliverable:** `test-analysis.md`, `migration-map.md`

---

### Step 2: Cleanup Дублікатів (0.5h)

- [ ] Перевірити 5 Category B файлів на реальне дублювання
- [ ] Позначити obsolete тести (якщо знайдуться)

**Checklist для кожного Category B файлу:**
- [ ] Чи JS тест дублює PHP test case в case?
- [ ] Чи JS тест додає integration perspective якого нема в PHP?
- [ ] Рішення: залишити / позначити obsolete

---

### Step 3: Функціональна Валідація (3-4h)

#### 3.1 PHP Tests

```bash
# Run all tests
vendor/bin/phpunit Test/Unit/

# Run by suite
vendor/bin/phpunit Test/Unit/Model/Resolver/
vendor/bin/phpunit Test/Unit/Model/Service/
vendor/bin/phpunit Test/Unit/Model/Provider/
vendor/bin/phpunit Test/Unit/Model/Utility/
```

**Checklist:**
- [ ] Запустити PHPUnit (23 файли / 232 методи)
- [ ] Задокументувати failures
- [ ] Категоризувати: test bug / real bug / missing feature
- [ ] Виправити test bugs
- [ ] Задокументувати real bugs для Phase 5

#### 3.2 Frontend JS Tests

**Checklist:**
- [ ] Запустити frontend test runner
- [ ] Задокументувати failures з 23 spec-файлів
- [ ] Порівняти з admin JS результатом (95/95)

---

### Step 4: Test Audit Report (1h)

- [ ] Створити `TEST-AUDIT-REPORT.md`
- [ ] Заповнити всі секції (working / broken / untested)
- [ ] Додати рекомендації для Phase 5

---

## 📊 Стан PHP Tests (23 файли)

| Файл | Методів | Примітка |
|------|---------|---------|
| `Utility/ColorConverterTest.php` | — | |
| `Utility/ColorFormatterTest.php` | — | |
| `Utility/ColorFormatResolverTest.php` | 25 | `@test` + `it_*` naming |
| `Config/PaletteResolverTest.php` | — | |
| `Provider/StatusProviderTest.php` | — | |
| `Provider/CompareProviderTest.php` | — | |
| `Provider/ConfigProviderTest.php` | — | 2 skipped (file I/O) |
| `Service/AdminTokenGeneratorTest.php` | — | |
| `Service/CssGeneratorTest.php` | — | |
| `Service/ValueServiceTest.php` | — | |
| `Service/ValueInheritanceResolverTest.php` | — | |
| `Service/PresetServiceTest.php` | — | |
| `Service/PublishServiceTest.php` | — | |
| `Service/ImportExportServiceTest.php` | — | |
| `Resolver/Query/ConfigTest.php` | — | |
| `Resolver/Query/AbstractConfigResolverColorConversionTest.php` | — | integration-style |
| `Resolver/Query/ValuesTest.php` | — | |
| `Resolver/Query/GetCssTest.php` | — | |
| `Resolver/Mutation/SaveValueTest.php` | — | |
| `Resolver/Mutation/SavePaletteValueTest.php` | — | |
| `Resolver/Mutation/PublishTest.php` | — | |
| `Resolver/Mutation/RollbackTest.php` | — | |
| `Resolver/Mutation/ExportSettingsTest.php` | — | |
| **TOTAL** | **232** | 2 skipped |

---

## 🎯 Success Metrics

### Quantitative:
- [ ] 35 JS тестів класифіковано (A/B/C)
- [ ] 232 PHP методи запущено
- [ ] Frontend JS тести запущено
- [ ] 90%+ PHP tests passing

### Qualitative:
- [ ] Чітке розуміння: що працює, що ні
- [ ] Задокументовані broken features для Phase 5
- [ ] TEST-AUDIT-REPORT.md завершено

---

## 🚧 Known Challenges

### Challenge 1: PHP Test Environment
**Problem:** PHP тести залежать від Magento framework (PHPUnit + Magento DI)  
**Solution:** Запускати через `vendor/bin/phpunit` в кореневій директорії Magento

### Challenge 2: Frontend JS Test Runner
**Problem:** Тести потребують браузерного середовища (DOM)  
**Solution:** Відкрити test-runner в браузері або налаштувати headless

### Challenge 3: ConfigProviderTest skipped tests
**Problem:** 2 тести пропущені через file I/O залежності  
**Solution:** Залишити як є або мігрувати в integration tests

---

## 🔗 Related Documents

- [Phase 4 README](README.md) - Загальний план фази
- [Master Plan](../../master-plan.md) - Весь проект
- [Phase 3A](../phase-3a/) - GraphQL implementation
- [Phase 3B](../phase-3b/) - Settings Editor

---

**Готово до виконання!** 🚀  
Start with: **Step 3 — запустити PHP тести та frontend JS тести**
