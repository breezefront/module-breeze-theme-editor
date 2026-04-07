# Refactoring: Publication State — Єдине джерело правди

**Дата:** 2026-04-07  
**Пріоритет:** 🟠 High  
**Статус:** `[x] DONE`  
**Категорія:** Missing abstraction / Tight coupling  
**PLAN.md:** п. 6 (Missing abstractions)

---

## Проблема

`currentStatus` (`'DRAFT'` | `'PUBLISHED'` | `'PUBLICATION'`) зберігається **в двох незалежних місцях**:

| Місце | Файл | Default |
|-------|------|---------|
| `var currentStatus` | `editor/css-manager.js:21` | `PUBLICATION_STATUS.DRAFT` (хардкод) |
| `var currentStatus` | `editor/panel/css-manager.js:18` | `null` |

Окрім цього, `ctx.options.currentStatus` тримається ще у трьох виджетах:
- `editor/toolbar/publication-selector.js:49` — `options.currentStatus = DRAFT`
- `editor/toolbar/publication-selector/css-state-restorer.js` — мутує `ctx.options.currentStatus` напряму (рядки 131, 165, 212)
- `editor/toolbar/publication-selector/action-executor.js` — також мутує `ctx.options.currentStatus` (рядки 112, 208, 343)

### Чому це проблема

1. **Desync між двома css-manager** — `editor/css-manager` ніколи не слухає `publicationStatusChanged` і не оновлюється. Якщо `panel/css-manager` перемикає статус, `editor/css-manager.getCurrentStatus()` залишається старим.
2. **`panel/css-manager` стартує з `null`** — до виклику `init()` виклик `getCurrentStatus()` повертає `null`, що і спричинило баг `"Cannot edit in null mode"`.
3. **Дублювання логіки читання** — `StorageHelper.getCurrentStatus()` викликається в 4 різних місцях при ініціалізації, кожен раз з окремим `|| 'DRAFT'` fallback.
4. **Синхронізація через DOM-події** — `publicationStatusChanged` jQuery-подія є єдиним механізмом синхронізації, що робить порядок ініціалізації критичним.

### Кореневий баг (зафіксовано окремим комітом)

`settings-editor.js:242` викликав `CssManager.init(this.scopeId, this.themeId)` з legacy 2-аргументним синтаксом. Legacy конвертація підставляла `scope = 'stores'` замість реального `'default'`. При `scope='stores'` та `scopeId=0` — валідація `!scopeId && scope !== 'default'` спрацьовувала → `return false` → `currentStatus` залишався `null`.

---

## Рішення

Створити `editor/utils/core/publication-state.js` — **singleton, єдине джерело правди** для `currentStatus`.

Всі модулі читають статус через `PublicationState.get()` і змінюють через `PublicationState.set()`. Singleton слухає `publicationStatusChanged` сам і автоматично ініціалізується з localStorage при першому звертанні.

---

## Деталі реалізації

### 1. Новий файл: `editor/utils/core/publication-state.js`

```js
define([
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'jquery'
], function (StorageHelper, Logger, Constants, $) {
    'use strict';

    var log = Logger.for('utils/core/publication-state');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    var _status = null;
    var _initialized = false;

    function ensureInitialized() {
        if (_initialized) return;
        _initialized = true;
        _status = StorageHelper.getCurrentStatus() || PUBLICATION_STATUS.DRAFT;
        log.info('PublicationState initialized from storage: ' + _status);
    }

    $(document).on('publicationStatusChanged', function (e, data) {
        if (data && data.status) {
            _status = data.status;
            log.info('PublicationState updated: ' + _status);
        }
    });

    return {
        /**
         * Get current publication status.
         * Lazily reads from localStorage on first call.
         * @returns {'DRAFT'|'PUBLISHED'|'PUBLICATION'}
         */
        get: function () {
            ensureInitialized();
            return _status;
        },

        /**
         * Set current publication status and persist to localStorage.
         * Triggers publicationStatusChanged event.
         * @param {'DRAFT'|'PUBLISHED'|'PUBLICATION'} status
         */
        set: function (status) {
            if (status === _status) return;
            _status = status;
            StorageHelper.setCurrentStatus(status);
            $(document).trigger('publicationStatusChanged', { status: status });
            log.info('PublicationState set: ' + status);
        },

        /**
         * Check if current status allows editing.
         * @returns {boolean}
         */
        isEditable: function () {
            ensureInitialized();
            return _status === PUBLICATION_STATUS.DRAFT;
        },

        /**
         * Reset to DRAFT (used on flush/reinit).
         */
        reset: function () {
            _initialized = false;
            _status = null;
        }
    };
});
```

### 2. `editor/panel/css-manager.js` — замінити `var currentStatus`

**Було:**
```js
// рядок 18
var currentStatus = null;

// рядок 123
currentStatus = this._getStoredStatus();

// рядки 130-135
$(document).on('publicationStatusChanged', function(e, data) {
    if (data && data.status) {
        currentStatus = data.status;
    }
});

// рядки 265, 345, 373, 454
currentStatus = PUBLICATION_STATUS.PUBLISHED;
// ...
currentStatus = PUBLICATION_STATUS.DRAFT;
// ...
$(document).trigger('publicationStatusChanged', {status: PUBLICATION_STATUS.DRAFT});
```

**Стало:**
```js
// додати до залежностей
'Swissup_BreezeThemeEditor/js/editor/utils/core/publication-state'

// видалити var currentStatus — читати через PublicationState.get()

// init(): замінити currentStatus = ... та listener на:
// (listener тепер всередині publication-state.js — тут не потрібен)

// showPublished():
PublicationState.set(PUBLICATION_STATUS.PUBLISHED);

// showDraft():
PublicationState.set(PUBLICATION_STATUS.DRAFT);

// showPublication():
PublicationState.set(PUBLICATION_STATUS.PUBLICATION);

// getCurrentStatus():
getCurrentStatus: function() {
    return PublicationState.get();
},

// isEditable():
isEditable: function() {
    return PublicationState.isEditable();
},

// reset() / reinit():
currentStatus = null;  →  PublicationState.reset();
```

> **Увага:** `showPublished/showDraft/showPublication` зараз вручну встановлюють `currentStatus` **і** тригерять `publicationStatusChanged`. Після рефакторингу `PublicationState.set()` робить обидві дії — прибираємо дублікат trigger.

### 3. `editor/css-manager.js` — замінити `var currentStatus`

**Було:**
```js
// рядок 21
var currentStatus = PUBLICATION_STATUS.DRAFT;

// рядок 286
currentStatus = status;

// рядок 472
getCurrentStatus: function() { return currentStatus; },

// рядок 492
return currentStatus === PUBLICATION_STATUS.DRAFT;

// рядок 523 (flush)
currentStatus = PUBLICATION_STATUS.DRAFT;
```

**Стало:**
```js
// додати PublicationState до залежностей, видалити var currentStatus

// switchTo() (рядок 286):
PublicationState.set(status);

// getCurrentStatus():
getCurrentStatus: function() { return PublicationState.get(); },

// isDraft():
return PublicationState.isEditable();

// flush (рядок 523):
PublicationState.reset();
```

### 4. `editor/toolbar/publication-selector/css-state-restorer.js` — прибрати прямі мутації

**Було (рядок 131, 135):**
```js
ctx.options.currentStatus = PUBLICATION_STATUS.DRAFT;
StorageHelper.setCurrentStatus(PUBLICATION_STATUS.DRAFT);
```

**Стало:**
```js
PublicationState.set(PUBLICATION_STATUS.DRAFT);
// ctx.options.currentStatus залишається для зворотної сумісності, але вже як кеш
ctx.options.currentStatus = PublicationState.get();
```

Аналогічно для `PUBLICATION` (рядок 212) та `PUBLISHED` (рядок 165).

### 5. `editor/toolbar/publication-selector/action-executor.js`

Замінити прямі `ctx.options.currentStatus = ...` + `StorageHelper.setCurrentStatus(...)` на `PublicationState.set(...)`:

```js
// рядки 112, 208, 341-343
// Було:
StorageHelper.setCurrentStatus(PUBLICATION_STATUS.PUBLISHED);
ctx.options.currentStatus = PUBLICATION_STATUS.PUBLISHED;
// Стало:
PublicationState.set(PUBLICATION_STATUS.PUBLISHED);
ctx.options.currentStatus = PublicationState.get(); // кеш для зворотної сумісності
```

### 6. `editor/panel/settings-editor.js` — спростити ініціалізацію

**Було (рядки 101-102):**
```js
var currentStatus = StorageHelper.getCurrentStatus();
this.options.status = currentStatus;
```

**Стало:**
```js
this.options.status = PublicationState.get();
```

---

## Зачіпаються файли

| Файл | Тип зміни |
|------|-----------|
| `view/adminhtml/web/js/editor/utils/core/publication-state.js` | **Новий файл** — singleton |
| `view/adminhtml/web/js/editor/panel/css-manager.js` | Замінити `var currentStatus` → `PublicationState`, видалити listener |
| `view/adminhtml/web/js/editor/css-manager.js` | Замінити `var currentStatus` → `PublicationState` |
| `view/adminhtml/web/js/editor/toolbar/publication-selector/css-state-restorer.js` | Замінити подвійний write (storage + ctx.options) на `PublicationState.set()` |
| `view/adminhtml/web/js/editor/toolbar/publication-selector/action-executor.js` | Те ж саме |
| `view/adminhtml/web/js/editor/panel/settings-editor.js` | Читати `PublicationState.get()` замість `StorageHelper.getCurrentStatus()` |

**Не зачіпаються:**
- `editor/utils/browser/storage-helper.js` — `getCurrentStatus/setCurrentStatus` залишаються, їх використовує `publication-state.js`
- `editor/toolbar/publication-selector.js` — `ctx.options.currentStatus` залишається як локальний кеш виджета, але ініціалізується через `PublicationState.get()`
- GraphQL-запити, PHP-бекенд

---

## Порядок виконання

1. Створити `publication-state.js` — без змін інших файлів, тести зелені
2. Підключити в `panel/css-manager.js` — найважливіший крок, усуває `null` default
3. Підключити в `editor/css-manager.js`
4. Підключити в `css-state-restorer.js` та `action-executor.js` — після 2 і 3
5. Спростити `settings-editor.js`

---

## Тести, які потрібно написати

- `test/tests/publication-state-test.js` (новий файл):
  - `get()` повертає `'DRAFT'` при першому виклику (localStorage порожній)
  - `get()` повертає збережений статус з localStorage
  - `set()` оновлює статус, зберігає в storage, тригерить подію
  - `set()` з тим самим статусом — подія не тригериться повторно
  - `isEditable()` повертає `true` тільки для `'DRAFT'`
  - `reset()` + `get()` — перечитує з localStorage
  - Зовнішній `publicationStatusChanged` оновлює внутрішній `_status`

---

## Деталі реалізації тестів

### Ізоляція StorageHelper

`StorageHelper` потребує `init(storeId, themeId)` перед використанням. Тести
використовують **реальний** `StorageHelper` з `jsdom`-localStorage (без моків) —
це відповідає підходу `panel-state-test.js`. На початку suite: `StorageHelper.init(1, 1)`.
На початку кожного кейсу: `PublicationState.reset()` + очищення localStorage.

### Ізоляція singleton між кейсами

`publication-state.js` — AMD-модуль, його стан живе на рівні модуля (`_status`,
`_initialized`). Оскільки Jest кешує AMD-модулі протягом suite, кожен тест мусить
викликати `PublicationState.reset()` першою дією — це скидає `_initialized = false`
і `_status = null`, змушуючи `get()` перечитати localStorage заново.

### Ризик подвійного тригера в `css-state-restorer.js`

`switchStatus()` (рядки 176–179) вручну тригерить `publicationStatusChanged` після
switch. Після рефакторингу `PublicationState.set()` тригерить подію сам — тому
дублікат `$(document).trigger(...)` у `switchStatus()` треба **видалити**.
Аналогічно для `loadPublication()` (рядки 220–226 в оригіналі).

---

## Переваги після рефакторингу

1. **Єдине джерело правди** — статус завжди консистентний між `editor/css-manager` і `panel/css-manager`.
2. **Немає `null` default** — `publication-state.js` ініціалізується з localStorage при першому зверненні, гарантований fallback `'DRAFT'`.
3. **Менше копій логіки** — `StorageHelper.setCurrentStatus()` викликається в одному місці.
4. **Простіший тест** — singleton легко мокувати ізольовано.
5. **Усуває клас багів** — більше не потрібен правильний порядок ініціалізації для отримання коректного статусу.
