# Refactoring Projects

Документація про рефакторинги та покращення коду в Breeze Theme Editor.

---

## 📚 Категорії

### 🔧 CSS Manager
📂 [css-manager/](css-manager/)

**Статус:** 🟡 Готово до виконання  
**Час:** 90-120 хвилин

**Проблема:** Admin CSS Manager використовує інші ID ніж frontend версія
- Iframe: `preview-frame` → `bte-iframe`
- Style tags: різні схеми іменування

**Документація:**
- [plan.md](css-manager/plan.md) - Детальний план з кодом

---

### 🧪 JS Testing
📂 [js-testing/](js-testing/)

**Статус:** ✅ Infrastructure готово, 📋 Component tests потрібні

**Прогрес:**
- ✅ Phase 1: Infrastructure (test-framework.js, test-runner.js, mock-helper.js)
- ✅ Phase 2: First test (admin-auth-manager-test.js)
- 📋 Phase 3: Component tests (~80 files)
- 📋 Phase 4: Integration tests

**Документація:**
- [README.md](js-testing/README.md) - Огляд проекту
- [migration-guide.md](js-testing/migration-guide.md) - Як мігрувати тести з frontend
- [implementation-summary.md](js-testing/implementation-summary.md) - Що вже зроблено
- [next-steps.md](js-testing/next-steps.md) - Наступні кроки

---

### ✅ Completed
📂 [completed/](completed/)

Завершені рефакторинги (для довідки):

- [admin-toolbar-refactoring.md](completed/admin-toolbar-refactoring.md) - AdminToolbar extends frontend Toolbar (-67 lines)

---

## 🎯 Швидкі Посилання

### Готові до виконання
- 🔧 [CSS Manager Plan](css-manager/plan.md)
- 🧪 [JS Testing Next Steps](js-testing/next-steps.md)

### Довідка
- ✅ [Completed Projects](completed/)

---

## 📊 Статистика

| Проект | Статус | Файлів | Час |
|--------|--------|--------|-----|
| CSS Manager | 🟡 Ready | 1 | 2h |
| JS Testing | ⚙️ In Progress | 4 | ~20h залишилось |
| Completed | ✅ Done | 1 | - |

---

Повернутися до [Dashboard](../DASHBOARD.md)
