# CSS Manager Refactoring

**Статус:** 🟡 Готово до виконання  
**Час:** 90-120 хвилин  
**Пріоритет:** Високий

---

## 🎯 Проблема

Admin CSS Manager використовує інші ID ніж frontend версія, що створює несумісності:

### Iframe ID
- ❌ **Admin:** `preview-frame`
- ✅ **Frontend:** `bte-iframe`

### Style Tag IDs
- ❌ **Admin:** `bte-theme-css-variables-draft`, `bte-theme-css-variables-published`
- ✅ **Frontend:** `bte-draft-css`, `bte-published-css`, `bte-publication-{id}-css`

---

## 📋 План

[plan.md](plan.md) містить:
- 6 конкретних змін з номерами рядків
- Код для кожної зміни
- Тестовий скрипт для валідації
- Очікувані результати

---

## ⚡ Швидкий Старт

```bash
# 1. Прочитати план
cat docs/refactoring/css-manager/plan.md

# 2. Відкрити файл
vim view/adminhtml/web/js/editor/css-manager.js

# 3. Виконати зміни згідно плану

# 4. Очистити кеш
docker exec magento248local-phpfpm-1 bash -c "rm -rf var/cache var/view_preprocessed pub/static/adminhtml && php bin/magento cache:flush"

# 5. Тестувати
# Відкрити Admin → Breeze → Theme Editor
# Запустити тестовий скрипт з плану в console
```

---

## 📊 Очікувані Результати

- ✅ CSS switching працює однаково в admin і frontend
- ✅ Iframe знаходиться правильно
- ✅ Style tags мають однакові ID
- ✅ Легше підтримувати (1 система замість 2)

---

Повернутися до [Refactoring Overview](../README.md)
