# Refactoring Documentation

Документація по рефакторингу та міграції Breeze Theme Editor.

## 📚 Документи

### JS Test Framework Migration
**Файли:** 
- [js-test-framework-migration.md](./js-test-framework-migration.md) - Детальний план (32 KB)
- [jstest-implementation-summary.md](./jstest-implementation-summary.md) - Результат імплементації ✅

**Опис:** Перенесення JavaScript тестового фреймворку з frontend в адмінку для live тестування JS компонентів.

**Статус:** ✅ Implemented  
**Дата створення:** 2026-02-13  
**Дата завершення:** 2026-02-13

**Що включає:**
- Аналіз поточної ситуації (frontend + admin)
- Архітектура міграції
- Покроковий план (8 кроків)
- Mock система для GraphQL
- Checklist першого запуску
- Troubleshooting guide

**Ключові компоненти:**
- `view/adminhtml/web/js/test/test-framework.js` - тестовий фреймворк
- `view/adminhtml/web/js/test/test-runner.js` - UI для запуску тестів
- `view/adminhtml/web/js/test/helpers/mock-helper.js` - GraphQL mock система
- `Block/TestRunner.php` - backend блок (dual: frontend + admin)
- `view/adminhtml/templates/admin/test-runner.phtml` - UI панель

**Пріоритети тестування:**
1. Utility компоненти (Auth, Config, URL Builder)
2. Business Logic (Palette, CSS, Preview managers)
3. UI Components (Toolbar, Selectors, Editors)
4. Integration тести

---

### Publication Selector Refactoring
**Директорія:** [publication-selector/](./publication-selector/)

**Опис:** Рефакторинг Publication Selector компонента для покращення архітектури та підтримки.

**Статус:** 🚧 In Progress  
**Дата:** 2026-02-13

---

## 🗂️ Структура проекту

### Admin JS Components (~80 файлів)

```
view/adminhtml/web/js/
├── graphql/
│   ├── client.js                    # GraphQL клієнт (Bearer auth)
│   ├── mutations/
│   └── queries/
├── editor/
│   ├── toolbar.js                   # Main coordinator
│   ├── css-manager.js
│   ├── preview-manager.js
│   ├── panel/
│   │   ├── settings-editor.js
│   │   ├── palette-manager.js
│   │   └── field-handlers/
│   ├── toolbar/
│   │   ├── navigation.js
│   │   ├── publication-selector.js
│   │   ├── scope-selector.js
│   │   └── page-selector.js
│   └── util/
│       ├── config-manager.js
│       ├── url-builder.js
│       └── color-utils.js
├── auth-manager.js
└── utils/
    ├── error-handler.js
    └── permissions.js
```

### Test Infrastructure (✅ Implemented)

```
view/adminhtml/web/js/test/
├── test-framework.js         # Assertion API, async тести ✅
├── test-runner.js           # UI логіка ✅
├── helpers/
│   └── mock-helper.js       # GraphQL mock ✅
└── tests/                   # 24 test files ✅
    ├── admin-auth-manager-test.js
    ├── color-utils-test.js
    ├── critical-fixes-test.js
    ├── css-preview-manager-palette-test.js
    ├── dom-color-utils-test.js
    ├── field-renderers-test.js
    ├── font-palette-manager-test.js
    ├── font-palette-section-renderer-test.js
    ├── font-picker-test.js
    ├── navigation-widget-test.js
    ├── page-selector-sync-test.js
    ├── palette-manager-test.js
    ├── palette-reset-behavior-test.js
    ├── panel-close-integration-test.js
    ├── panel-events-test.js
    ├── panel-integration-test.js
    ├── panel-positioning-test.js
    ├── publication-events-alignment-test.js
    ├── publication-selector-test.js
    ├── selector-alignment-test.js
    ├── settings-editor-reset-test.js
    ├── storage-helper-test.js
    ├── toastify-test.js
    └── url-navigation-persistence-test.js
```

---

## 🚀 Quick Start

### Запуск JS тестів (після імплементації)

**Frontend тести:**
```
URL: /?jstest=true&autorun=true
```

**Admin тести:**
```
URL: /admin/breeze_editor/editor/index?jstest=true&autorun=true
```

### Параметри URL

| Параметр | Опис | Приклад |
|----------|------|---------|
| `jstest=true` | Показати панель тестів | `?jstest=true` |
| `autorun=true` | Автозапуск | `?jstest=true&autorun=true` |
| `suite=Name` | Конкретний suite | `?suite=AuthManager` |

---

## 📋 TODO List

### Phase 1: Test Infrastructure ✅ COMPLETED
- ✅ Створити `view/adminhtml/web/js/test/` структуру
- ✅ Скопіювати test-framework.js
- ✅ Адаптувати test-runner.js
- ✅ Створити mock-helper.js для admin GraphQL
- ✅ Розширити Block/TestRunner.php
- ✅ Створити admin layout + template

### Phase 2: First Tests ✅ COMPLETED
- ✅ admin-auth-manager-test.js (8 tests)
- ✅ admin-config-manager-test.js
- ✅ admin-graphql-client-test.js

### Phase 3: Component Tests ✅ COMPLETED
- ✅ panel-positioning-test.js
- ✅ navigation-widget-test.js
- ✅ panel-events-test.js
- ✅ panel-integration-test.js
- ✅ palette-manager-test.js
- ✅ css-preview-manager-palette-test.js
- ✅ field-renderers-test.js
- ✅ storage-helper-test.js
- ✅ color-utils-test.js, dom-color-utils-test.js
- ✅ font-palette-manager-test.js, font-palette-section-renderer-test.js, font-picker-test.js
- ✅ publication-selector-test.js, publication-events-alignment-test.js
- ✅ selector-alignment-test.js, page-selector-sync-test.js
- ✅ settings-editor-reset-test.js, palette-reset-behavior-test.js
- ✅ panel-close-integration-test.js, toastify-test.js
- ✅ url-navigation-persistence-test.js, critical-fixes-test.js

### Phase 4: Integration Tests
- [ ] Full workflow (edit → save → preview → publish)
- [ ] Multi-store switching
- [ ] Publication flow (Draft → Publish → Rollback)

---

## 🔗 Корисні посилання

- [Frontend Test Framework](../../view/frontend/web/js/test/test-framework.js)
- [Frontend Tests](../../view/frontend/web/js/test/tests/)
- [Admin GraphQL Client](../../view/adminhtml/web/js/graphql/client.js)
- [Admin Toolbar](../../view/adminhtml/web/js/editor/toolbar.js)

---

**Останнє оновлення:** 2026-03-04  
**Phase 1 Status:** ✅ Complete (JS Test Framework migrated to admin)  
**Phase 2 Status:** ✅ Complete (initial tests)  
**Phase 3 Status:** ✅ Complete (24 test suites covering all major components)
