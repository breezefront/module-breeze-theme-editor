# Breeze Theme Editor - Project Dashboard

**Останнє оновлення:** 2026-04-21  
**Загальний прогрес:** ✅ Admin Migration завершено (beta.4 released) | Рефакторинг: 76/108

---

## 🚨 Поточний Фокус

### ✅ Admin Migration завершено — beta.4 released

Всі фази міграції завершені. GraphQL E2E 6/6 ✅. beta.4 зарелізовано 16.04.2026.  
Відкрито: `error-log` stub (Low), `highlight` (Deferred).  
Поточна робота — **Рефакторинг** (68/108).

---

## 📊 Основні Проекти

### 🚀 1. Admin Migration (ГОЛОВНИЙ ПРОЕКТ)

**Мета:** Міграція з token-based до admin інтерфейсу  
**Статус:** ✅ 100% завершено — beta.4 released 16.04.2026  
**Документація:** [`docs/migration/`](migration/)

| Фаза | Назва | Статус | Прогрес | Документи |
|------|-------|--------|---------|-----------|
| **1** | Foundation | ✅ Завершено | 100% | [phase-1/](migration/phases/phase-1/) |
| **2** | Security & ACL | ✅ Завершено | 100% | [phase-2/](migration/phases/phase-2/) |
| **3A** | Toolbar GraphQL | ✅ Завершено | 100% | [phase-3a/](migration/phases/phase-3a/) |
| **3B** | Settings Editor | ✅ Завершено | 100% | [phase-3b/](migration/phases/phase-3b/) |
| **4** | Test Audit | ✅ Завершено | 100% | [phase-4/](migration/phases/phase-4/) |
| **5** | Polish & Testing | ✅ Завершено | 100% | [phase-5/](migration/phases/phase-5/) |

---

### 🔧 2. Рефакторинг (Code Quality)

**Мета:** Усунення технічної заборгованості після завершення Admin Migration  
**Статус:** 🔄 В процесі (76 / 108 завершено)  
**Документація:** [`docs/refactoring/PLAN.md`](refactoring/PLAN.md)

| Категорія | Задач | 🔴 | 🟠 | 🟡 | 🟢 | Виконано |
|-----------|-------|----|----|----|----|----------|
| Мертвий код — баги | 4 | 3 | 1 | — | — | ✅ 4/4 |
| Dead code cleanup | 31 | 1 | 3 | 10 | 17 | 27/31 |
| God classes/widgets | 5 | — | 4 | 1 | — | ✅ 5/5 |
| Code duplication | 21 | — | 5 | 10 | 6 | 18/21 |
| Magic numbers/strings | 17 | 1 | — | 4 | 12 | 6/17 |
| Missing abstractions | 8 | — | 1 | 7 | — | 6/8 |
| Tight coupling | 9 | — | 2 | 4 | 3 | 3/9 |
| setTimeout audit | 13 | — | — | 3 | 10 | 0/13 |
| **Всього** | **108** | **5** | **16** | **39** | **48** | **76/108** |

**Завершені кроки:**
- ✅ Крок 1 — Критичні баги (6/6): пп. 1.1, 1.2, 1.3, 1.4, 2.21, 5.1
- ✅ Крок 2 — Dead code (5/5 + 1 N/A): пп. 2.1, 2.16, 2.17, 2.18, 2.28 + п. 5.5 (файл видалено)
- ✅ Крок 3 — High-priority duplication (4/4): пп. 4.1, 4.2, 4.5, 4.7
- ✅ Крок 4 — God classes (4/4): пп. 3.1, 3.2, 3.3, 3.4 DONE
- ✅ Крок 5 — Missing abstractions + Magic strings (5/5): пп. 6.1, 6.2, 6.3, 5.11, 5.12
- ✅ Крок 6 — Medium/Low cleanup (4/4): пп. 4.3, 6.4, 4.4, 2.13
- ✅ Крок 7A — PHP Dead code (11/11): пп. 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12 + 2.15 (partial)
- ✅ Крок 7B — css-var shim + issue-017 refactor: issue `css-var` closed, `storeManager` required dep
- ✅ Крок 7C — JS dead code: `palette-manager.js` deprecated wrappers (п. 2.20), `FrontendPageUrlProvider` (п. 2.14), `_utilities.less` tooltip stub (п. 2.29) — `bd3235e`
- ✅ Крок 7.1 — `window.breezeThemeEditorConfig` видалено; `config-manager.js` + новий `scope-manager.js` як AMD closure singletons; 14 файлів мігровано; Jest 771 ✅ — `6b9911a`

**Завершено в Кроці 8 (beta.4):**
- ✅ Крок 8 — PHP refactoring (більшість): пп. 4.11, 4.12, 4.13, 4.14, 4.15, 6.8, 2.23, 2.26, 2.27, 5.3, 2.15 — `526342e`..`c407bf5`
- ✅ Крок 9 — JS DRY: пп. 4.9, 4.10, 4.18, 4.19, 4.20, 2.16 (error-handler cleanup) — `d7eddb4`
- ✅ П. 6.5 — `getDraftUserIdForSave()` у `SaveValue`/`SaveValues` — `c74ca1e`
- ✅ П. 3.5 — `AbstractConfigResolver` декомпозиція → `FieldFormatter`, `FieldParamsFormatter`, `SectionFormatter`, `PresetFormatter` — `16608f2`

**Наступний крок: Крок 9 залишок — мертвий JS код**
- [ ] п. 2.25 — dead methods: `url-builder.js` (5), `cookie-manager.js` (6), `permissions.js` (4), `loading.js` (2)
- [ ] п. 2.22 — `repeater.js::initSortable()` порожнє тіло
- [ ] п. 2.24 — `highlight-toggle.js` iframe частина (Phase 2 TODO)

---

### 📦 3. Завершені рефакторинги та фічі

| Задача | Статус | Дата | Коміт(и) |
|--------|--------|------|----------|
| css-manager unification (panel + editor → єдиний модуль) | ✅ | 08.04 | `5a97541` `8e59dac` |
| publication-state singleton (єдине джерело currentStatus) | ✅ | 08.04 | `26b3ee9` `65a4ede` |
| scope-manager.js + config-manager.js — AMD closure singletons | ✅ | 09.04 | `6b9911a` |
| configManager — єдине джерело scope/scopeId/themeId (partial) | ✅ | 08.04 | `5b62abf` `cdbdfc1` |
| url-restoration — окремий AMD модуль | ✅ | 08.04 | `df54e47` `6f9f7dd` |
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
| PHP Unit tests | 50 файлів | ✅ Проходять (741 tests, 2 skipped) |
| JS Admin tests | 32 spec-файлів | ✅ Проходять (771 tests) |
| GraphQL integration tests | наявні | ✅ |

---

### 💡 5. Features

| Feature | Статус | Документація |
|---------|--------|--------------|
| **Color Palette System** | ✅ Завершено | [features/color-palette-system.md](features/color-palette-system.md) |
| **Font Palette System** | ✅ Завершено | — |
| **Multi-scope support** | ✅ Завершено | [features/multi-scope.md](features/multi-scope.md) |
| **Pickr + opacity** | ✅ Завершено | [features/palette-pickr-opacity.md](features/palette-pickr-opacity.md) |
| **PHP Settings Reader** | ✅ Завершено | [features/php-settings-reader.md](features/php-settings-reader.md) |
| **Font Palette Role Fields Auto-gen** | ✅ Завершено | [refactoring/font-palette-role-fields-autogeneration.md](refactoring/font-palette-role-fields-autogeneration.md) |

---

## 🐛 Issues

**Детально:** [issues/DASHBOARD.md](issues/DASHBOARD.md)

| Категорія | Всього | Закрито | Відкрито |
|-----------|--------|---------|---------|
| Bugs | 22 | 22 ✅ | 0 |
| Tasks | 9 | 8 ✅ | 1 (error-log open), 1 (highlight deferred) |
| Без номера | 1 | — | 1 (test-cov) |
| **Всього** | **31** | **29 ✅** | **2** |

---

## 📈 Метрики

```
Admin Migration:
✅ Phase 1    ████████████ 100%
✅ Phase 2    ████████████ 100%
✅ Phase 3A   ████████████ 100%
✅ Phase 3B   ████████████ 100%
✅ Phase 4    ████████████ 100%
✅ Phase 5    ████████████ 100% — beta.4 released

Refactoring:
🔴 Critical     ████████████   5/5  ✅ Крок 1 завершено
🟠 High         ████████████  15/16 ✅ Кроки 2+3+4+7.1+7.2+8 завершено
🟡 Medium       ████████░░░░  28/39
🟢 Low          ████░░░░░░░░  19/48
📋 Total        ██████░░░░░░  67/108 (62%)

Issues:        29/31 closed (1 open, 1 deferred)
PHP Tests:     50 файлів / 769 tests ✅
JS Tests:      32 spec-файлів / 771 tests ✅
```

---

## 📁 Структура Документації

```
docs/
├── DASHBOARD.md                      # Цей файл
├── README.md                         # Індекс
│
├── issues/                           # Issue tracker
│   ├── DASHBOARD.md                  # ✅ 29/31 closed
│   └── 001–026 *.md                  # Детальні описи
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
