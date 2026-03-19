# Breeze Theme Editor - Project Dashboard

**Останнє оновлення:** 2026-03-19  
**Загальний прогрес:** 99% завершено (Admin Migration) | Рефакторинг: 9/94

---

## 🚨 Поточний Фокус

### ✅ Проект практично завершений

Всі 16 issues закриті. Всі фази міграції завершені (1–5 в процесі release prep).  
Єдиний відкритий пункт — **Manual GraphQL E2E тестування** у Phase 5.

---

## 📊 Основні Проекти

### 🚀 1. Admin Migration (ГОЛОВНИЙ ПРОЕКТ)

**Мета:** Міграція з token-based до admin інтерфейсу  
**Статус:** ✅ 99% завершено  
**Документація:** [`docs/migration/`](migration/)

| Фаза | Назва | Статус | Прогрес | Документи |
|------|-------|--------|---------|-----------|
| **1** | Foundation | ✅ Завершено | 100% | [phase-1/](migration/phases/phase-1/) |
| **2** | Security & ACL | ✅ Завершено | 100% | [phase-2/](migration/phases/phase-2/) |
| **3A** | Toolbar GraphQL | ✅ Завершено | 100% | [phase-3a/](migration/phases/phase-3a/) |
| **3B** | Settings Editor | ✅ Завершено | 100% | [phase-3b/](migration/phases/phase-3b/) |
| **4** | Test Audit | ✅ Завершено | 100% | [phase-4/](migration/phases/phase-4/) |
| **5** | Polish & Testing | 🟡 В процесі | 80% | [phase-5/](migration/phases/phase-5/) |

**Phase 5 — що залишилось:**
- ✅ Браузерна валідація Admin JS
- ✅ Light panel theme (issue-006)
- ✅ Multi-scope support
- ✅ Phosphor Icons
- ✅ Content Builder integration
- [ ] Manual GraphQL E2E тестування
- [ ] Release preparation (version bump, changelog, git tag)

---

### 🔧 2. Рефакторинг (Code Quality)

**Мета:** Усунення технічної заборгованості після завершення Admin Migration  
**Статус:** 📋 Заплановано (0 / 94 завершено)  
**Документація:** [`docs/refactoring/PLAN.md`](refactoring/PLAN.md)

| Категорія | Задач | 🔴 | 🟠 | 🟡 | 🟢 | Статус |
|-----------|-------|----|----|----|----|--------|
| Мертвий код — баги | 4 | 3 | 1 | — | — | 📋 |
| Dead code cleanup | 31 | 1 | 3 | 10 | 17 | 📋 |
| God classes/widgets | 5 | — | 4 | 1 | — | 📋 |
| Code duplication | 20 | — | 5 | 9 | 6 | 📋 |
| Magic numbers/strings | 17 | 1 | — | 4 | 12 | 📋 |
| Missing abstractions | 8 | — | 1 | 7 | — | 📋 |
| Tight coupling | 9 | — | 2 | 4 | 3 | 📋 |
| **Всього** | **94** | **5** | **16** | **35** | **38** | **0%** |

**Критичні баги (виконати першими):**
- [ ] `ImportExportService` — key mismatch → GraphQL завжди повертає `null` для imported/skipped
- [ ] `ValidationService::validateValues()` — type mismatch → валідація не працює при імпорті
- [ ] `palette-manager.js` — `getDirtyCount()` визначений двічі
- [ ] `SavePaletteValue.php:86` — `setStatusId(1)` magic integer замість StatusProvider
- [ ] `Observer/SetThemePreviewCookie` — dead observer logic
- [ ] `etc/frontend/di.xml:3` — typo `urn: magento` (зайвий пробіл)

---

### 📦 3. Завершені рефакторинги та фічі

| Задача | Статус | Дата | Коміт(и) |
|--------|--------|------|----------|
| Multi-scope (Default/Website/Store View) | ✅ | 10.03 | `5d43943` + серія |
| Light panel theme + toggle (issue-006) | ✅ | ~12.03 | `7c74231` |
| Phosphor Icons (nav + config sections) | ✅ | ~12.03 | `ad05a7b` `689c6e3` |
| Content Builder integration | ✅ | ~10.03 | `4f0d104` |
| Font Palette system | ✅ | ~01.03 | `2f92597` + серія |
| Font Picker (custom dropdown, local fonts) | ✅ | ~01.03 | `5ed6d0f` `22f9d9b` |
| Pickr + opacity (hex8) | ✅ | 09.03 | `7e01919` `8d1c577` |
| Live Search у settings panel | ✅ | ~01.03 | `9b3d6e7` |
| Toastify notifications | ✅ | ~01.03 | `7373f41` |
| HEADING field type | ✅ | ~01.03 | `86a7ddf` |
| inheritParent flag | ✅ | ~01.03 | `0f462a4` |
| Publication selector (rollback, discard, Live badge) | ✅ | ~03.03 | `ca9c937` + серія |
| Scope selector (persist in URL/cookie, F5 restore) | ✅ | ~14.03 | `f83df04` `c53eaa1` |
| PublicationDataTrait (refactor) | ✅ | ~14.03 | `da1540a` |
| Menu: Theme Editor → Swissup > Breeze | ✅ | ~17.03 | `e82e4a4` |
| AbstractToolbar merged into AdminToolbar | ✅ | 26.02 | `1a17cae` |
| CSS Manager Refactor | ✅ | 17.02 | — |
| Color Formatter (HEX→RGB) | ✅ | 20.02 | `1f03dde` |
| selector + property fields | ✅ | 24.02 | `1a7279e` |
| BteLogger infrastructure | ✅ | 23.02 | `a54caf9` |

---

### 🧪 4. Тести

| Тип | Кількість | Статус |
|-----|-----------|--------|
| PHP Unit tests | 50 файлів | ✅ Проходять (512 tests, 2 skipped) |
| JS Admin tests | 28 spec-файлів | ✅ Проходять |
| GraphQL integration tests | наявні | ✅ |

---

### 💡 5. Features

| Feature | Статус | Документація |
|---------|--------|--------------|
| **Color Palette System** | ✅ Завершено | [features/color-palette-system.md](features/color-palette-system.md) |
| **Font Palette System** | ✅ Завершено | — |
| **Multi-scope support** | ✅ Завершено | [features/multi-scope.md](features/multi-scope.md) |
| **Pickr + opacity** | ✅ Завершено | [features/palette-pickr-opacity.md](features/palette-pickr-opacity.md) |

---

## 🐛 Issues — всі закриті

**Детально:** [issues/DASHBOARD.md](issues/DASHBOARD.md)

| Категорія | Всього | Закрито |
|-----------|--------|---------|
| Bugs | 12 | 12 ✅ |
| Tasks | 5 | 5 ✅ |
| **Всього** | **16** | **16 ✅** |

---

## 📈 Метрики

```
Admin Migration:
✅ Phase 1    ████████████ 100%
✅ Phase 2    ████████████ 100%
✅ Phase 3A   ████████████ 100%
✅ Phase 3B   ████████████ 100%
✅ Phase 4    ████████████ 100%
🟡 Phase 5    ██████████░░  80% ← Manual E2E + Release

Refactoring:
🔴 Critical     ████████████   5/5  ✅ Крок 1 завершено
🟠 High         █░░░░░░░░░░░   2/16 ← (п. 1.4 di.xml + 2.16 status-indicator)
🟡 Medium       █░░░░░░░░░░░   2/35 ← (п. 2.17 get-compare + 2.18 get-values)
🟢 Low          ░░░░░░░░░░░░   0/38
📋 Total        ░░░░░░░░░░░░   9/94

Issues:        16/16 closed ✅
PHP Tests:     50 файлів / 512 tests ✅
JS Tests:      28 spec-файлів ✅
```

---

## 📁 Структура Документації

```
docs/
├── DASHBOARD.md                      # Цей файл
├── README.md                         # Індекс
│
├── issues/                           # Issue tracker
│   ├── DASHBOARD.md                  # ✅ 16/16 closed
│   └── 001–016 *.md                  # Детальні описи
│
├── features/                         # Реалізовані фічі
│   ├── color-palette-system.md       # ✅
│   ├── multi-scope.md                # ✅
│   ├── palette-pickr-opacity.md      # ✅
│   └── README.md                     # Огляд
│
├── migration/                        # Admin Migration
│   ├── phases/phase-1–5/             # Плани по фазах
│   └── README.md
│
├── refactoring/                      # Рефакторинги
│   ├── PLAN.md                       # 📋 Code Quality Plan (94 задачі)
│   ├── README.md                     # Огляд
│   ├── js-testing/                   # JS Test Framework
│   └── completed/                    # Завершені рефакторинги
│
└── testing/                          # Гайди тестування
```

---

## 🔍 Швидкі Посилання

- 🎯 [Phase 5 - Polish & Final Testing](migration/phases/phase-5/README.md)
- 🔧 [Refactoring Plan — Code Quality](refactoring/PLAN.md)
- 🐛 [Issues Dashboard](issues/DASHBOARD.md)
- ✅ [Phase 4 TEST-AUDIT-REPORT](migration/phases/phase-4/TEST-AUDIT-REPORT.md)
- 🗺️ [Migration Overview](migration/README.md)
- 🧪 [JS Testing Guide](testing/jstest-admin.md)
