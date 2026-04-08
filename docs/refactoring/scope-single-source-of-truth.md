# Refactoring: Scope/ScopeId/ThemeId — Єдине джерело правди через ConfigManager

**Дата:** 2026-04-07  
**Пріоритет:** 🟠 High  
**Статус:** `[x] DONE ✓`  
**Категорія:** Code duplication / Tight coupling  
**PLAN.md:** п. 7 (Tight coupling)

---

## Проблема

`scope`, `scopeId`, `themeId` — три поля, що ідентифікують поточний контекст редагування — дублюються як мінімум у **7 незалежних місцях** в пам'яті одночасно:

| Місце | Файл | Рядки |
|-------|------|-------|
| `var scope/scopeId/themeId` | `editor/css-manager.js` | 23–25 |
| `var scope/scopeId/themeId` | `editor/panel/css-manager.js` | 19–21 |
| `this.scope/scopeId/themeId` | `editor/panel/settings-editor.js` | 77–79 |
| `this.scope/scopeId/themeId` | `editor/panel/palette-manager.js` | 41–43 |
| `this.scope/scopeId` | `editor/panel/preset-selector.js` | options |
| `this.scope/scopeId/themeId` | `editor/toolbar/publication-selector.js` | 69–71 |
| `this.scope/scopeId/themeId` | `editor/toolbar/publication-selector/metadata-loader.js` | 27–29 |

### Чому це проблема

1. **Ризик desync при scopeChanged** — при зміні scope (`scopeChanged` подія) кожен модуль має обробити її самостійно. Якщо один пропускає — він працює зі старим контекстом.
2. **Ненадійні fallback'и** — кожен модуль має власний захисний код: `config.scope || 'stores'`, `config.scopeId != null ? ... : 1` тощо. Ці fallback'и відрізняються між модулями.
3. **Legacy-баг** — саме дублювання scope спричинило баг `"Cannot edit in null mode"`: `panel/css-manager.init()` викликався з 2-аргументним синтаксом, де legacy конвертація підставляла `scope = 'stores'` замість реального `'default'`.
4. **`configManager` вже існує** — `editor/utils/core/config-manager.js` є повноцінним singleton з усім потрібним API (`getScope`, `getScopeId`, `getThemeId`, `setScope`, `update` тощо), але більшість модулів його ігнорують.

### Наявний `configManager` API (вже реалізований)

```js
configManager.get()                    // повний об'єкт
configManager.getScope(fallback)       // 'default'|'websites'|'stores'
configManager.getScopeId(fallback)     // number|null
configManager.getThemeId(fallback)     // number|null
configManager.getStoreCode(fallback)   // string
configManager.getGraphqlEndpoint()     // string
configManager.set(config)              // встановити весь конфіг
configManager.update(updates)          // оновити частково
configManager.setScope(scope)
configManager.setScopeId(scopeId)
configManager.setThemeId(themeId)
```

---

## Рішення

Всі модулі читають `scope/scopeId/themeId` через `configManager`, а не зберігають локально. При ініціалізації та при `scopeChanged` — оновлюється тільки `configManager`, решта модулів отримують актуальні значення автоматично через геттери.

---

## Деталі реалізації

### 1. `editor/toolbar/scope-selector.js` — єдине місце запису

`scope-selector` є єдиним місцем, де scope змінюється інтерактивно. Після вибору:

**Було:**
```js
// рядок 199 / 226
var scopeId = parseInt($(this).data('scope-id'), 10);
// ... передати в toolbar → передати у всі дочірні виджети
$(document).trigger('scopeChanged', [scope, scopeId]);
```

**Стало:**
```js
var scopeId = parseInt($(this).data('scope-id'), 10);
configManager.update({ scope: scope, scopeId: scopeId });
$(document).trigger('scopeChanged', [scope, scopeId]); // залишаємо для зворотної сумісності
```

### 2. `editor/toolbar/publication-selector.js` — читати з configManager

**Було (рядки 69–71):**
```js
this.scope   = config.scope   || this.options.scope   || 'stores';
this.scopeId = config.scopeId || this.options.scopeId;
this.themeId = config.themeId || this.options.themeId;
```

**Стало:**
```js
// Зберегти в configManager якщо ще не встановлено
if (!configManager.exists()) {
    configManager.set({
        scope:   config.scope   || this.options.scope   || 'stores',
        scopeId: config.scopeId || this.options.scopeId,
        themeId: config.themeId || this.options.themeId
    });
}
// Локальні поля прибрати — читати через configManager
```

А в методах де `this.scope/scopeId/themeId` читається:
```js
// Було:
scope:    this.scope,
scopeId:  this.scopeId,
themeId:  this.themeId,

// Стало:
scope:    configManager.getScope(),
scopeId:  configManager.getScopeId(),
themeId:  configManager.getThemeId(),
```

### 3. `editor/panel/settings-editor.js` — читати з configManager

**Було (рядки 77–79):**
```js
this.scope   = config.scope   || this.options.scope   || 'stores';
this.scopeId = config.scopeId != null ? config.scopeId : (this.options.scopeId != null ? this.options.scopeId : 1);
this.themeId = config.themeId || this.options.themeId || 0;
```

**Стало:**
```js
// configManager вже ініціалізований toolbar'ом раніше
// this.scope/scopeId/themeId прибрати — читати через configManager де потрібно:
```

```js
// рядок 242 (виклик CssManager.init):
CssManager.init({
    scope:   configManager.getScope(),
    scopeId: configManager.getScopeId(),
    themeId: configManager.getThemeId()
});

// рядок 431 (saveValues):
saveValues(configManager.getScope(), configManager.getScopeId(), this.options.status, values)

// рядок 92 (StorageHelper.init):
StorageHelper.init(configManager.getScopeId(), configManager.getThemeId());
```

### 4. `editor/panel/palette-manager.js` — читати з configManager

**Було (рядки 41–43):**
```js
this.scope   = config.scope   || 'stores';
this.scopeId = config.scopeId;
this.themeId = config.themeId || StorageHelper.getThemeId();
```

**Стало:**
```js
// видалити this.scope/scopeId/themeId — читати через configManager
```

### 5. `editor/panel/css-manager.js` і `editor/css-manager.js` — читати з configManager

Обидва модулі мають `var scope/scopeId/themeId = null` і отримують їх через `init()`.

Після рефакторингу `init()` більше не отримує `scope/scopeId/themeId` — читає з configManager:

**Було:**
```js
init: function(config, retries) {
    scope   = config.scope   || 'stores';
    scopeId = config.scopeId;
    themeId = config.themeId;
    StorageHelper.init(scopeId, themeId);
```

**Стало:**
```js
init: function(config, retries) {
    // config тепер може містити тільки iframeId і retries
    StorageHelper.init(configManager.getScopeId(), configManager.getThemeId());
    // де потрібно scope/scopeId/themeId — читати через configManager
```

### 6. `editor/toolbar/publication-selector/metadata-loader.js` — читати з configManager

**Було (рядки 27–29):**
```js
this.scope   = options.scope   || 'stores';
this.scopeId = options.scopeId;
this.themeId = options.themeId;
```

**Стало:**
```js
// видалити this.scope/scopeId/themeId, передавати до GraphQL-запиту напряму:
configManager.getScope(), configManager.getScopeId(), configManager.getThemeId()
```

---

## Зачіпаються файли

| Файл | Тип зміни |
|------|-----------|
| `view/adminhtml/web/js/editor/utils/core/config-manager.js` | Без змін (вже повний API) |
| `view/adminhtml/web/js/editor/toolbar/scope-selector.js` | Додати `configManager.update()` при зміні scope |
| `view/adminhtml/web/js/editor/toolbar/publication-selector.js` | Ініціалізувати configManager, видалити `this.scope/scopeId/themeId` |
| `view/adminhtml/web/js/editor/panel/settings-editor.js` | Видалити `this.scope/scopeId/themeId`, читати через configManager |
| `view/adminhtml/web/js/editor/panel/palette-manager.js` | Видалити `this.scope/scopeId/themeId`, читати через configManager |
| `view/adminhtml/web/js/editor/panel/preset-selector.js` | Читати `options.scope/scopeId` через configManager |
| `view/adminhtml/web/js/editor/panel/css-manager.js` | Видалити `var scope/scopeId/themeId`, читати через configManager |
| `view/adminhtml/web/js/editor/css-manager.js` | Видалити `var scope/scopeId/themeId`, читати через configManager |
| `view/adminhtml/web/js/editor/toolbar/publication-selector/metadata-loader.js` | Видалити `this.scope/scopeId/themeId`, читати через configManager |

**Не зачіпаються:**
- PHP-бекенд, GraphQL schema
- `storage-helper.js`
- Тест-файли (крім оновлення моків)

---

## Порядок виконання

1. `scope-selector.js` → пише в configManager при зміні scope (перший крок, бо це джерело правди для змін)
2. `publication-selector.js` → ініціалізує configManager при старті (toolbar стартує першим)
3. `panel/settings-editor.js` → читає з configManager
4. `panel/palette-manager.js`, `preset-selector.js` → читають з configManager
5. `panel/css-manager.js`, `editor/css-manager.js` → читають з configManager (спрощення init-сигнатури)
6. `metadata-loader.js` → читає з configManager

> Цей рефакторинг виконується **після** `publication-state.md` — бо крок 5 спрощує `init()` і там вже не буде legacy-синтаксу.

---

## Тести, які потрібно написати / оновити

- `tests/js/utils/config-manager-test.js` (доповнити):
  - `getScope()` повертає `'stores'` за замовчуванням
  - `update({ scope: 'default', scopeId: 0 })` оновлює тільки ці поля
  - `getScopeId()` з `scopeId = 0` повертає `0`, не `null` (важливо: `0` — валідний ID для `scope='default'`)

- `tests/js/toolbar/scope-selector-test.js` (доповнити):
  - при виборі scope — `configManager.getScope()` оновлюється
  - `scopeChanged` подія тригериться з правильними аргументами

- `tests/js/panel/settings-editor-test.js` (оновити):
  - `CssManager.init()` отримує scope з configManager, не з `this.scope`

---

## Переваги після рефакторингу

1. **Єдина точка запису** — scope змінюється тільки в `scope-selector.js` через `configManager.update()`.
2. **Автоматична консистентність** — всі модулі читають геттери, ніякого ручного ланцюжка передачі `scope` через `init()` параметри.
3. **Простіші сигнатури** — `CssManager.init()`, `MetadataLoader.init()` більше не потребують `scope/scopeId/themeId`.
4. **Усуває клас fallback-багів** — немає більше `config.scope || 'stores'` розкиданих по 7 місцях з різними дефолтами.
5. **`scopeChanged` обробляється одноразово** — в `configManager.update()`, а не в кожному модулі окремо.
