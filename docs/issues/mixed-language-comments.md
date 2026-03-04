# Issue: Ukrainian Inline Comments in `PublishService.php`

**Severity:** Low  
**Area:** `Model/Service/PublishService.php`  
**Type:** Code style / Consistency

---

## Problem

`PublishService.php` contains Ukrainian-language inline comments mixed with
English code. The rest of the PHP codebase uses English exclusively.

```php
// Отримати всі draft значення через ValueService
// Створити publication запис
// Зберегти changelog
// Сучасний підхід: draftValues → ValueInterface моделі → saveMultiple
// Видалити draft через ValueService
// Новий підхід: отримати changelog через SearchCriteria + getList()
// Створити нову publication (rollback)
// Очистити поточний draft перед застосуванням старих значень
// Застосувати старі значення → ValueInterface[]
// Зберегти changelog для rollback
```

These comments appear to be AI-session artifacts from a Ukrainian-language
development session.

---

## Fix

Replace each comment with an English equivalent or remove if the code is
self-explanatory.

Example translations:

| Ukrainian | English |
|---|---|
| `// Отримати всі draft значення через ValueService` | `// Load all draft values via ValueService` |
| `// Створити publication запис` | `// Create publication record` |
| `// Зберегти changelog` | `// Save changelog` |
| `// Видалити draft через ValueService` | `// Delete draft values via ValueService` |
| `// Створити нову publication (rollback)` | `// Create new publication (rollback)` |
| `// Очистити поточний draft перед застосуванням старих значень` | `// Clear current draft before restoring old values` |
| `// Застосувати старі значення → ValueInterface[]` | `// Restore old values → ValueInterface[]` |
| `// Зберегти changelog для rollback` | `// Save changelog for rollback` |
