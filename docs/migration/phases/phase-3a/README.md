# Phase 3A - Toolbar GraphQL Integration

**Статус:** ✅ ЗАВЕРШЕНО (Hybrid Approach)  
**Час:** 8.5 годин (завершено)  
**Дата завершення:** 18 лютого 2026 (фінальний audit)

---

## 🎯 Цілі

Підключити toolbar компоненти до GraphQL API та реалізувати permission-based UI.

### ✅ Реалізовано з GraphQL (Business-critical):
- ✅ Publication Selector - історія публікацій, rollback
- ✅ Status Indicator - статуси draft/published
- ✅ Settings Editor - налаштування теми (Phase 3B)
- ✅ GraphQL Infrastructure - schema, resolvers, ACL, tests

### ✅ Реалізовано локально (UI state):
- ✅ Device Switcher - змінює ширину iframe (localStorage)
- ✅ Toolbar Toggle - показує/ховає toolbar (localStorage)
- ⏳ Highlight Toggle - (TODO, localStorage коли потрібен)

---

## 🏗️ Architecture Decision: Hybrid Approach

### Чому НЕ все через GraphQL?

**Прийняте рішення:** Hybrid Approach - критичні дані через GraphQL, UI стан локально.

#### GraphQL для Business-Critical даних:
```
✅ Settings/Config   → GraphQL (синхронізація, історія, ACL)
✅ Publications      → GraphQL (rollback, audit trail)
✅ Theme Values      → GraphQL (multi-store, inheritance)
✅ Presets/Palettes  → GraphQL (shared resources)
```

**Чому:** Ці дані потребують:
- Server-side validation
- ACL permissions
- Audit trail (хто, коли, що змінив)
- Синхронізація між користувачами
- Database persistence

#### localStorage для UI State:
```
✅ Device width      → localStorage (персональна преференція)
✅ Toolbar visible   → localStorage (UI стан)
✅ Panel collapsed   → localStorage (не critical)
✅ Highlight enabled → localStorage (тимчасова функція)
```

**Чому:** Ці дані:
- Персональні (не потребують синхронізації)
- Тимчасові (сесія користувача)
- UI-only (не впливають на business logic)
- Швидкі (без server round-trip)

### Переваги Hybrid Approach:

1. **Performance** ⚡
   - UI зміни миттєві (без network latency)
   - Менше навантаження на server
   - Кращий UX (instant feedback)

2. **Simplicity** 🎯
   - Простіша архітектура
   - Менше коду
   - Легше підтримувати

3. **Offline-capable** 📡
   - UI працює навіть при втраті зв'язку
   - Settings потребують server (правильно!)

4. **Cost-effective** 💰
   - Не зберігаємо trivial дані в DB
   - Менше GraphQL queries/mutations
   - Менше таблиць в БД

### Альтернатива (якщо потрібна синхронізація UI):

Якщо в майбутньому виникне потреба:
- Collaborative editing (кілька адмінів разом)
- Синхронізація UI між пристроями
- Analytics (які девайси використовують)

→ Легко додати Editor Preferences API (план готовий: [phase-3a-completion/](../phase-3a-completion/))

---

## 📚 Документація

### Файли в цій папці:
- [implementation-plan.md](implementation-plan.md) ⭐ - Детальний план виконання (28KB)
- [AUDIT-REPORT.md](AUDIT-REPORT.md) - Результати аудиту та рішення
- [guide.md](guide.md) - Загальний опис Phase 3A
- [quick-start.md](quick-start.md) - Швидкий старт
- [notes.md](notes.md) - Додаткові нотатки

---

## 📋 План Виконання

### Порядок виконання (з implementation-plan.md):
1. **Task 5** - Utilities (error-handler.js, loading.js) - 1h
2. **Task 3** - Permissions system - 1.5h
3. **Task 1** - Publication selector GraphQL - 2.5h
4. **Task 2** - Status indicator GraphQL - 1.5h
5. **Task 4** - Preview manager - 1h
6. **Task 6** - Testing - 1h

**Total:** 8.5 годин

---

## ⚡ Швидкий Старт

```bash
# 1. Читати детальний план
cat docs/migration/phases/phase-3a/implementation-plan.md

# 2. Почати з Task 5 (utilities)
# Детальний код в implementation-plan.md

# 3. Тестувати після кожної задачі
```

---

## ✅ Success Criteria

**GraphQL Integration:**
- [x] Publication selector завантажує справжні дані через GraphQL
- [x] Status indicator показує правильний статус через GraphQL
- [x] Settings Editor інтегровано з GraphQL (Phase 3B)
- [x] Permission-based UI працює (ACL перевірки)
- [x] Error handling працює
- [x] Loading states працюють

**UI Components (localStorage):**
- [x] Device switcher змінює ширину iframe
- [x] Toolbar toggle показує/ховає панель
- [x] Стан зберігається між сесіями (localStorage)

**Architecture:**
- [x] Гібридний підхід задокументовано
- [x] Business data → GraphQL
- [x] UI state → localStorage

---

## 🔗 Наступні Кроки

Після Phase 3A → Phase 4 (Test Migration & Validation)

**Опціонально в майбутньому:**
- Highlight Toggle реалізація (якщо потрібна)
- Editor Preferences API (якщо потрібна синхронізація UI)

---

Повернутися до [Migration Overview](../../README.md) | [Dashboard](../../../DASHBOARD.md)
