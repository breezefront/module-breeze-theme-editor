# Breeze Theme Editor - Documentation

Документація модуля Breeze Theme Editor для Magento 2.

---

## 📁 Структура

### [refactoring/](refactoring/) - Документація Рефакторінгу

Документація про рефакторинг і покращення коду модуля.

#### [refactoring/publication-selector/](refactoring/publication-selector/)
Рефакторинг Admin Publication Selector для приведення до архітектури frontend версії.

**Файли:**
- **[plan.md](refactoring/publication-selector/plan.md)** - Головний план рефакторінгу (читай першим!)
- **[summary.md](refactoring/publication-selector/summary.md)** - Опис CSS Architecture рефакторінгу
- **[checklist.md](refactoring/publication-selector/checklist.md)** - Тестування чеклист
- **[debug-script.js](refactoring/publication-selector/debug-script.js)** - Debug скрипт для browser console

**Статус:** Етап 1 частково виконано, залишається інтеграція StorageHelper

---

## 🚀 Швидкий Старт

### Для рефакторінгу Publication Selector:
```bash
# Відкрий у новій сесії
cat docs/refactoring/publication-selector/README.md
cat docs/refactoring/publication-selector/plan.md
```

---

## 📝 Додавання Нової Документації

Створюй структуровані директорії:

```
docs/
├── refactoring/              # Документація рефакторінгу
│   ├── component-name/
│   │   ├── README.md        # Огляд
│   │   ├── plan.md          # План робіт
│   │   └── ...
│   └── ...
├── architecture/             # Архітектурні рішення (майбутнє)
├── api/                      # API документація (майбутнє)
└── README.md                # Цей файл
```

**Рекомендації:**
- Кожна тема має свою директорію
- README.md для навігації
- Конкретні файли (.md, .js) для деталей

---

**Дата створення:** 2026-02-13  
**Останнє оновлення:** 2026-02-13
