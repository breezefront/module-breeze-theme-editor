# Refactoring: Об'єднання двох CSS Manager в один

**Дата:** 2026-04-07  
**Пріоритет:** 🟠 High  
**Статус:** `[ ] TODO`  
**Категорія:** Code duplication / Tight coupling  
**PLAN.md:** п. 7 (Tight coupling)

**Залежність:** виконувати після `publication-state.md` та `scope-single-source-of-truth.md`

---

## Проблема

Є два модулі що роблять принципово одне — керують CSS-шарами в iframe:

| | `editor/css-manager.js` | `editor/panel/css-manager.js` |
|--|--|--|
| **Хто використовує** | `css-state-restorer.js` (toolbar) | `settings-editor.js`, `css-preview-manager.js` (panel) |
| **Live preview шар** | ❌ не знає про нього | ✅ вмикає/вимикає `$livePreviewStyle` |
| **DOM refs** | stateless — шукає щоразу | stateful — кешує у module vars |
| **Унікальний API** | `isReady()`, `setIframeId()` | `showDraft/Published/Publication()`, `refreshPublishedCss()`, `refreshDraftCss()`, `refreshIframeDocument()`, `destroy()` |
| **Спільний API** | `init()`, `switchTo()`, `reinit()`, `getCurrentStatus()`, `isEditable()` | те саме |

### Реальний баг що випливає з розділення

При перемиканні в `PUBLISHED` або `PUBLICATION` через **toolbar** (`css-state-restorer` → `editor/css-manager.switchTo()`) — `#bte-live-preview` **не вимикається і не очищається**. Якщо користувач:

1. Редагує щось у DRAFT (live preview активний — змінені CSS variables в `#bte-live-preview`)
2. Перемикається в PUBLISHED через toolbar dropdown

— live preview зміни залишаються видимими поверх published CSS, бо `editor/css-manager` не знає про цей шар.

`panel/css-manager.showPublished()` коректно викликає `_disableStyle($livePreviewStyle)` + `resetLivePreview()`. `editor/css-manager.switchTo(PUBLISHED)` — ні.

Цей баг фіксувався кілька разів в інших місцях, але корінь — в тому що логіка розкидана по двох модулях.

### CSS-шари в iframe (повна картина)

```
#bte-theme-css-variables          ← published (завжди в DOM, з PHP)
#bte-theme-css-variables-draft    ← draft (створюється динамічно при першому DRAFT)
#bte-publication-css-{id}         ← стара публікація для перегляду (множинні, editor)
#bte-publication-css              ← стара публікація для перегляду (один, panel)
#bte-live-preview                 ← превью несохраненого драфту (керує css-preview-manager)
```

> **Примітка:** `editor/css-manager` і `panel/css-manager` мають різну стратегію для publication style: editor зберігає `bte-publication-css-{id}` (множинні ID), panel — один `bte-publication-css`. Після об'єднання залишити стратегію panel: один елемент, замінюється при кожному перегляді.

---

## Рішення

Залишити **один** `editor/css-manager.js` що знає про всі 5 CSS-шарів.

Live preview layer реєструється через `registerLivePreviewLayer($element)` — це вирішує circular dependency (`css-manager ↔ css-preview-manager`).

`editor/panel/css-manager.js` — **видалити**.

---

## Деталі реалізації

### 1. `editor/css-manager.js` — додати live preview layer

**Новий module-level стан:**
```js
// Cached DOM refs (panel strategy — refresh on reinit/flush)
var $publishedStyle   = null;
var $draftStyle       = null;
var $livePreviewStyle = null;  // ← NEW: реєструється css-preview-manager
var $publicationStyle = null;
```

**Новий метод `registerLivePreviewLayer()`:**
```js
/**
 * Register the live preview <style> element.
 * Called by css-preview-manager after it creates #bte-live-preview.
 * Solves circular dependency: css-manager does not require css-preview-manager.
 *
 * @param {jQuery} $el
 */
registerLivePreviewLayer: function($el) {
    $livePreviewStyle = $el;
    log.info('Live preview layer registered');
},
```

**`css-preview-manager.js` викликає після створення елемента:**
```js
// _createStyleElement():
self._createStyleElement();
CssManager.registerLivePreviewLayer(self.$styleElement);
```

### 2. `switchTo()` — єдина логіка для всіх шарів

Після об'єднання `switchTo()` завжди обробляє всі шари:

```js
switchTo: function(status, publicationId, ctx) {
    // ... refresh DOM refs ...
    switch (status) {

        case PUBLICATION_STATUS.DRAFT:
            return getCss(...).then(function(response) {
                // create/update draft style
                self._enableStyle($publishedStyle);
                self._enableStyle($draftStyle);
                self._enableStyle($livePreviewStyle);   // ← live preview активний у DRAFT
                self._disableStyle($publicationStyle);
                self._recreateLivePreviewStyle();       // ← після iframe nav
                PublicationState.set(PUBLICATION_STATUS.DRAFT);
            });

        case PUBLICATION_STATUS.PUBLISHED:
            self._enableStyle($publishedStyle);
            self._disableStyle($draftStyle);
            self._disableStyle($livePreviewStyle);      // ← FIX: вимкнути live preview
            self._resetLivePreview();                   // ← FIX: очистити зміни
            self._disableStyle($publicationStyle);
            PublicationState.set(PUBLICATION_STATUS.PUBLISHED);
            return Promise.resolve(...);

        case PUBLICATION_STATUS.PUBLICATION:
            return getCss(...).then(function(response) {
                self._disableStyle($draftStyle);
                self._disableStyle($livePreviewStyle);  // ← FIX: вимкнути live preview
                self._resetLivePreview();               // ← FIX: очистити зміни
                self._injectPublicationStyle(css);
                PublicationState.set(PUBLICATION_STATUS.PUBLICATION);
            });
    }
},
```

### 3. `_resetLivePreview()` і `_recreateLivePreviewStyle()` — lazy require

Circular dependency вирішується через lazy `require` (вже є в `panel/css-manager`):

```js
_resetLivePreview: function() {
    require(['Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'], function(CssPreviewManager) {
        CssPreviewManager.reset();
    });
},

_recreateLivePreviewStyle: function() {
    require(['Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'], function(CssPreviewManager) {
        CssPreviewManager.recreateLivePreviewStyle();
    });
},
```

### 4. Перейменувати `editor/css-manager.js` → `editor/toolbar/css-manager.js`

Переміщення окремим кроком (до або після об'єднання — на розсуд):

```
editor/css-manager.js         →  видалити
editor/panel/css-manager.js   →  editor/css-manager.js (або editor/toolbar/css-manager.js)
```

> Варіант: залишити як `editor/css-manager.js` — бо він тепер єдиний і обслуговує весь editor, не тільки toolbar.

### 5. `reinit(flush=true)` — очищати всі 4 шари

```js
reinit: function(_config, flush) {
    if (flush) {
        if (getIframeDocument()) {
            $(getIframeDocument()).find('#bte-theme-css-variables-draft').remove();
            // publication style теж прибрати
            $(getIframeDocument()).find('#bte-publication-css').remove();
        }
        $publishedStyle   = null;
        $draftStyle       = null;
        $livePreviewStyle = null;   // ← скидати реєстрацію
        $publicationStyle = null;
        PublicationState.reset();
    }
    // ...
},
```

### 6. Перенести унікальні методи з `panel/css-manager`

| Метод | Дія |
|-------|-----|
| `refreshPublishedCss()` | Перенести без змін |
| `refreshDraftCss()` | Перенести без змін |
| `refreshIframeDocument()` | Перенести (оновлює всі 4 cached refs) |
| `destroy()` | Перенести, додати `$livePreviewStyle = null` |
| `_injectPublicationStyle(css)` | Перенести з panel (стратегія одного `bte-publication-css`) |
| `_removePublicationStyle()` | Перенести з panel |

Методи з `editor/css-manager` що стають зайвими після переходу на stateful refs:
- `_getOrCreateStyle()` — замінити на `_injectPublicationStyle()` з panel
- `_getStyleId()` — видалити

### 7. `isReady()` — перейти на stateful перевірку

```js
// Було (editor/css-manager):
isReady: function() {
    return !!(configManager.getScopeId() !== null && this._getCurrentIframeDoc());
},

// Стало (unified):
isReady: function() {
    return !!$publishedStyle && !!$publishedStyle.length;
},
```

---

## Зачіпаються файли

| Файл | Тип зміни |
|------|-----------|
| `view/adminhtml/web/js/editor/css-manager.js` | Об'єднати логіку, додати `registerLivePreviewLayer()`, `refreshPublishedCss()`, `refreshDraftCss()`, `refreshIframeDocument()`, `destroy()` |
| `view/adminhtml/web/js/editor/panel/css-manager.js` | **Видалити** |
| `view/adminhtml/web/js/editor/panel/css-preview-manager.js` | Додати виклик `CssManager.registerLivePreviewLayer($el)` після `_createStyleElement()` |
| `view/adminhtml/web/js/editor/panel/settings-editor.js` | Змінити `require` path (якщо файл перемістили); API не змінюється |
| `view/adminhtml/web/js/editor/toolbar/publication-selector/css-state-restorer.js` | Змінити `require` path (якщо файл перемістили); API не змінюється |

**Не зачіпаються:**
- `css-preview-manager.js` публічний API (тільки додається виклик `registerLivePreviewLayer`)
- `publication-state.js`, `config-manager.js`
- PHP, GraphQL

---

## Архітектурне рішення: повністю stateless (без module-level DOM refs)

Після аналізу обох файлів — підхід `editor/css-manager` (stateless, `_getCurrentIframeDoc()` на кожен виклик)
виявився **правильнішим**, ніж `panel/css-manager` (stateful cached refs). Причини:

- Немає stale refs після iframe navigation
- Не потрібен `refreshIframeDocument()`
- Не потрібен `registerLivePreviewLayer()` — `$(doc).find('#bte-live-preview')` завжди свіжий
- `reinit(flush=true)` скидає тільки стан (PublicationState), не DOM refs — бо їх немає
- `_removePublicationStyle()` → `$(doc).find('#bte-publication-css').remove()` — без ref

Єдиний виняток де можна тримати state — `currentPublicationId` (вже є) для `refresh()`.

**Це означає:** переносимо **логіку** з `panel/css-manager`, але **не переносимо** stateful ref-кешування.

---

## Порядок виконання

### Крок 1 — Bug fix: `switchTo(PUBLISHED/PUBLICATION)` — вимкнути live preview

**Файл:** `editor/css-manager.js`

В `case PUBLICATION_STATUS.PUBLISHED` після `self._disableStyle($draftStyle)`:
```js
var $livePreviewStyle = $(doc).find('#bte-live-preview');
self._disableStyle($livePreviewStyle);
require(['Swissup_BreezeThemeEditor/js/editor/panel/css-preview-manager'], function(pm) {
    pm.reset();
});
```

В `case PUBLICATION_STATUS.PUBLICATION` у `.then()` після `self._disableStyle($draftStyle)` — те саме.

Ризик: 🟢 мінімальний. `_disableStyle` has null-guard. `find()` на живому doc.

---

### Крок 2 — Додати `showPublished()` як аліас

**Файл:** `editor/css-manager.js`

`settings-editor.js` рядок 232 викликає `CssManager.showPublished()` напряму.
Потрібно додати аліас:
```js
showPublished: function() {
    return this.switchTo(PUBLICATION_STATUS.PUBLISHED);
},
```

Ризик: 🟢 мінімальний.

---

### Крок 3 — Перенести `refreshPublishedCss()` і `refreshDraftCss()`

**Файл:** `editor/css-manager.js`

Скопіювати з `panel/css-manager`, адаптувати:
- замінити `getIframeDocument()` → `this._getCurrentIframeDoc()`
- замінити stateful `$publishedStyle` / `$draftStyle` → `$(doc).find('#...')`
- `refreshDraftCss()` fallback до `this.switchTo(PUBLICATION_STATUS.DRAFT)` замість `this.showDraft()`

Ризик: 🟢 низький. Нові методи, ізольовані.

---

### Крок 4 — Перенести `_injectPublicationStyle()`, `_removePublicationStyle()`

**Файл:** `editor/css-manager.js`

Стратегія: **один** `#bte-publication-css` (panel strategy), замість множинних `bte-publication-css-{id}`.
Адаптація:
- `_injectPublicationStyle(css)` — stateless: `$(doc).find('#bte-live-preview')` для insertion point
- `_removePublicationStyle()` — stateless: `$(doc).find('#bte-publication-css').remove()`

Оновити `switchTo(PUBLICATION)`: замість `querySelectorAll('style[id^="bte-publication-css-"]')` —
викликати `self._injectPublicationStyle(css)` (remove + create в одному методі).

Оновити `switchTo(PUBLISHED)` і `switchTo(DRAFT)`: замінити `querySelectorAll` disable-loop →
`self._removePublicationStyle()`.

Видалити `_getOrCreateStyle()` і `_getStyleId()` — більше не потрібні.

Ризик: 🟠 середній. Publication strategy змінюється. Зовнішніх readers `bte-publication-css-{id}` — немає (grep підтвердив).

---

### Крок 5 — Перенести `destroy()` і додати `StorageHelper` + `_applyStoredState()`

**Файл:** `editor/css-manager.js`

`destroy()` з `panel/css-manager` — адаптувати: без null'ення refs (stateless), тільки:
```js
destroy: function() {
    this._removePublicationStyle();
    PublicationState.reset();
    $(document).off('scopeChanged.cssManager');
    log.info('CSS Manager destroyed');
},
```

Додати `StorageHelper` в `define([...])` залежності.

Додати `_applyStoredState()` — скопіювати з `panel/css-manager` без змін (викликає `this.switchTo()`).

Оновити `init()`:
- додати `StorageHelper.init(configManager.getScopeId(), configManager.getThemeId())`
- додати `this._applyStoredState()` в кінці (після знаходження `$publishedStyle`)
- зробити idempotent: `if (retries === 0 && this.isReady()) { log.info('already ready'); return true; }`
  (захист від подвійного init: toolbar init → `isReady()=true` → panel init → пропускається)

Ризик: 🟡 низький-середній. Зміна поведінки `init()`. `_applyStoredState()` робить GraphQL запит — переконатись що не дублює запит toolbar'а. Idempotent guard вирішує це.

---

### Крок 6 — Оновити `settings-editor.js`: змінити require path

**Файл:** `editor/panel/settings-editor.js`

Змінити рядок 23:
```js
// Було:
'Swissup_BreezeThemeEditor/js/editor/panel/css-manager'
// Стало:
'Swissup_BreezeThemeEditor/js/editor/css-manager'
```

API не змінюється — всі методи (`init`, `isReady`, `showPublished`, `refreshPublishedCss`, `refreshDraftCss`) вже є в unified manager після кроків 1–5.

Ризик: 🟠 середній. Зміна AMD dependency. Перевірити що RequireJS підхоплює новий path.

---

### Крок 7 — Оновити `css-preview-manager.js`: змінити require path

**Файл:** `editor/panel/css-preview-manager.js`

Змінити рядок 5:
```js
// Було:
'Swissup_BreezeThemeEditor/js/editor/panel/css-manager'
// Стало:
'Swissup_BreezeThemeEditor/js/editor/css-manager'
```

`css-preview-manager` використовує `CssManager.isEditable()` і `CssManager.getCurrentStatus()` — обидва є.
Circular dependency залишається (editor/css-manager lazy-requires css-preview-manager) — це нормально, вже є.

Ризик: 🟠 середній. AMD circular dep. Перевірити порядок завантаження.

---

### Крок 8 — Видалити `editor/panel/css-manager.js`

Перед видаленням: grep по всіх JS файлах на `panel/css-manager` — переконатись що 0 залишкових references.

Ризик: 🟠 середній. Якщо пропустити один require — 404 в AMD loader.

---

### Крок 9 — Оновити тести

- `tests/js/editor/css-manager-test.js` або `css-manager-live-preview-bug-test.js`:
  - `switchTo(PUBLISHED)` — `#bte-live-preview` вимикається, `CssPreviewManager.reset()` викликається
  - `switchTo(PUBLICATION, id)` — те саме
  - `switchTo(DRAFT)` — `#bte-live-preview` вмикається (через `recreateLivePreviewStyle`)
  - `refreshPublishedCss()` — оновлює контент `#bte-theme-css-variables`
  - `refreshDraftCss()` — оновлює або fallback до `switchTo(DRAFT)`
  - `_injectPublicationStyle(css)` — створює `#bte-publication-css` в правильному місці каскаду
  - `_removePublicationStyle()` — видаляє `#bte-publication-css` з DOM

- `discard-published-preview-test.js` — оновити mock path

- `tests/js/panel/css-manager-test.js` — **видалити**

---

## Тести, які потрібно написати / оновити

- `tests/js/editor/css-manager-test.js` (новий або оновлений):
  - `switchTo(PUBLISHED)` — `#bte-live-preview` вимикається, `CssPreviewManager.reset()` викликається
  - `switchTo(PUBLICATION, id)` — те саме
  - `switchTo(DRAFT)` — `#bte-live-preview` вмикається
  - `reinit(null, true)` — скидає `PublicationState`, `currentPublicationId`; не торкається DOM refs (stateless)
  - `refreshPublishedCss()` — оновлює контент `#bte-theme-css-variables`
  - `refreshDraftCss()` — оновлює або fallback до `switchTo(DRAFT)`

- `tests/js/panel/css-manager-test.js` — **видалити** (або перетворити на інтеграційний)

- `tests/js/panel/settings-editor-test.js` — оновити mock path для `css-manager`

---

## Переваги після рефакторингу

1. **Усуває клас багів** — live preview завжди коректно вмикається/вимикається незалежно від того, хто ініціює перемикання (toolbar чи panel).
2. **Одне місце для CSS-логіки** — `switchTo(PUBLISHED)` рівно в одному місці, не можна "забути" один з шарів.
3. **Менше файлів** — -1 модуль, -1 set тестів.
4. **Простіша mental model** — є один CSS Manager що знає про всі шари: published, draft, publication, live-preview.
5. **Симетрія** — `css-state-restorer` (toolbar) і `settings-editor` (panel) використовують один і той самий модуль.
6. **Немає ref-кешування** — `_getCurrentIframeDoc()` скрізь, немає stale refs, немає `refreshIframeDocument()`.
