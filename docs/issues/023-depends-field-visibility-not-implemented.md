# Issue 023: `dependsOn` field visibility — JS runtime not implemented

**Severity:** Medium  
**Area:** `view/adminhtml/web/js/editor/panel/field-renderers/base.js`,
`view/adminhtml/web/js/editor/panel/field-renderer.js`,
`view/adminhtml/web/js/editor/panel/settings-editor.js`,
`view/adminhtml/web/js/editor/panel/panel-state.js`,
`view/adminhtml/web/css/source/_theme-editor-fields.less`  
**Type:** Feature / Missing implementation  
**Status:** Fixed

---

## Проблема

Поля в `settings.json` можуть мати ключ `dependsOn`:

```json
{
  "id": "custom_font_url",
  "type": "text",
  "label": "Custom Font URL",
  "dependsOn": {
    "field": "font_source",
    "value": "custom",
    "operator": "EQUALS"
  }
}
```

Це означає: "показуй це поле тільки коли поле `font_source` має значення `custom`".

**Поточний стан:** Дані `dependsOn` проходять весь шлях від PHP через GraphQL
до JS-об'єкту поля, але JS-рантайм (показ/приховання, фільтрація при Save)
**повністю відсутній**. Поля з `dependsOn` завжди відображаються і завжди
включаються в Save-мутацію.

---

## Що вже реалізовано ✅

| Шар | Файл | Деталь |
|-----|------|--------|
| PHP | `Model/Resolver/Query/AbstractConfigResolver.php:273–285` | `formatDependency()` читає `dependsOn` з JSON, повертає `{fieldCode, value, operator}` |
| GraphQL schema | `etc/schema.graphqls:32–38` | `enum BreezeThemeEditorDependencyOperator { EQUALS, NOT_EQUALS, CONTAINS, GREATER_THAN, LESS_THAN }` |
| GraphQL schema | `etc/schema.graphqls:255, 323–327` | `BreezeThemeEditorFieldDependency` тип на `BreezeThemeEditorField` |
| GraphQL query | `view/adminhtml/web/js/graphql/queries/get-config.js:94–98` | `dependsOn { fieldCode value operator }` запитується |
| GraphQL query | `view/adminhtml/web/js/graphql/queries/get-config-from-publication.js:83–87` | те саме |

Дані **долітають** до JS як `field.dependsOn = { fieldCode, value, operator }`.

---

## Що відсутнє ❌

### Компонент 1 — `prepareData()` дропає `dependsOn`

**Файл:** `field-renderers/base.js:91–108`

`prepareData()` будує об'єкт `data` для шаблонів. `dependsOn` не включений —
шаблони і будь-який JS-код після рендеру не мають доступу до залежності.

### Компонент 2 — DOM-wrapper не має `data-depends-*` атрибутів

**Файл:** `field-renderer.js:143`

```js
// Зараз — завжди однаковий wrapper без інформації про залежність:
html += '<div class="bte-field-wrapper" data-field="' + (field.code || 'unknown') + '">';
```

Без `data-depends-on-field` / `data-depends-on-value` / `data-depends-on-op`
атрибутів неможливо знайти залежні поля при зміні контролюючого.

### Компонент 3 — Початковий стан при рендері не обчислюється

**Файл:** `field-renderer.js:123` `renderSection()`

При рендері секції всі поля відображаються незалежно від поточних значень.
Навіть якщо `font_source = 'system'`, поле `custom_font_url` з
`dependsOn.value = 'custom'` буде показано.

### Компонент 4 — Немає реакції на зміни контролюючого поля

**Файл:** `settings-editor.js:164–168`

Change callback після зміни поля не сканує залежні поля (з будь-якої секції)
і не перемикає їх видимість.

```js
// Зараз — тільки badge update, без depends:
FieldHandlers.init(this.element, function (fieldData) {
    self._updateChangesCount();
    FieldHandlers.updateBadges(self.element, fieldData.sectionCode, fieldData.fieldCode);
    // ← немає DependsEvaluator.updateVisibility()
});
```

### Компонент 5 — Приховані поля включаються в Save-мутацію

**Файл:** `panel-state.js:150` `getDirtyChanges()`

`getDirtyChanges()` повертає всі dirty поля без фільтрації по видимості.
Якщо поле сховане через `dependsOn` але має dirty значення (наприклад,
залишилось від попередньої сесії) — воно потрапляє в мутацію.

### Компонент 6 — Відсутній CSS клас для прихованого стану

**Файл:** `view/adminhtml/web/css/source/_theme-editor-fields.less`

Немає `.bte-field-depends-hidden { display: none; }`.

---

## Рішення

### Scope і обмеження

- **Залежності між будь-якими секціями** — `fieldCode` може бути в іншій секції
- **Тільки 1 рівень** — ланцюгові залежності (A→B→C) не підтримуються
- **Оператори:** `EQUALS` та `NOT_EQUALS`
- **При прихованому полі:** виключати з Save-мутації

---

### 1. `field-renderers/base.js` — додати `dependsOn` до `prepareData()`

```js
// Додати в об'єкт що повертається (рядок ~107):
dependsOn: field.dependsOn || null,
```

---

### 2. `field-renderer.js` — штампувати `data-depends-*` на wrapper

```js
// BEFORE (рядок 143):
html += '<div class="bte-field-wrapper" data-field="' + (field.code || 'unknown') + '">';

// AFTER:
var wrapperAttrs = 'class="bte-field-wrapper" data-field="' + (field.code || 'unknown') + '"';
if (field.dependsOn) {
    wrapperAttrs += ' data-depends-on-field="' + field.dependsOn.fieldCode + '"';
    wrapperAttrs += ' data-depends-on-value="' + field.dependsOn.value + '"';
    wrapperAttrs += ' data-depends-on-op="' + (field.dependsOn.operator || 'EQUALS') + '"';
}
html += '<div ' + wrapperAttrs + '>';
```

---

### 3. Новий модуль `depends-evaluator.js`

**Файл:** `view/adminhtml/web/js/editor/panel/depends-evaluator.js`

```js
define(['Swissup_BreezeThemeEditor/js/editor/panel/panel-state'], function (PanelState) {

    /**
     * Evaluate a single dependsOn condition.
     *
     * @param {String} operator  'EQUALS' | 'NOT_EQUALS'
     * @param {String} controlValue  Current value of the controlling field
     * @param {String} targetValue   Value defined in dependsOn
     * @returns {Boolean}  true = show the dependent field
     */
    function _evaluate(operator, controlValue, targetValue) {
        switch (operator) {
            case 'NOT_EQUALS': return String(controlValue) !== String(targetValue);
            case 'EQUALS':
            default:           return String(controlValue) === String(targetValue);
        }
    }

    /**
     * Resolve the current value of a field from PanelState or DOM fallback.
     *
     * @param {String} fieldCode
     * @param {jQuery} $element  Panel root element
     * @returns {String|null}
     */
    function _resolveControlValue(fieldCode, $element) {
        // Try PanelState first (works cross-section)
        var $input = $element.find('[data-field="' + fieldCode + '"]').first();
        if ($input.length) {
            var sectionCode = $input.attr('data-section') ||
                $input.closest('[data-section]').attr('data-section') ||
                $input.closest('.bte-accordion-content').attr('data-section');
            if (sectionCode) {
                var val = PanelState.getValue(sectionCode, fieldCode);
                if (val !== undefined && val !== null) {
                    return String(val);
                }
            }
            // DOM fallback
            return String($input.val() || '');
        }
        return null;
    }

    return {

        /**
         * Apply initial visibility to all depends fields after render.
         * Call once after renderSection() has inserted HTML into the DOM.
         *
         * @param {jQuery} $element  Panel root element
         */
        applyInitialVisibility: function ($element) {
            $element.find('[data-depends-on-field]').each(function () {
                var $wrapper    = $(this);
                var fieldCode   = $wrapper.attr('data-depends-on-field');
                var targetValue = $wrapper.attr('data-depends-on-value');
                var operator    = $wrapper.attr('data-depends-on-op') || 'EQUALS';

                var controlValue = _resolveControlValue(fieldCode, $element);
                var show = controlValue !== null
                    ? _evaluate(operator, controlValue, targetValue)
                    : operator === 'NOT_EQUALS'; // unknown → show for NOT_EQUALS, hide for EQUALS

                $wrapper.toggleClass('bte-field-depends-hidden', !show);
            });
        },

        /**
         * Re-evaluate visibility for all fields that depend on changedFieldCode.
         * Call from the field-change callback in settings-editor.js.
         *
         * @param {jQuery} $element           Panel root element
         * @param {String} changedFieldCode   The field whose value just changed
         * @param {String} newValue           The new value
         */
        updateVisibility: function ($element, changedFieldCode, newValue) {
            $element
                .find('[data-depends-on-field="' + changedFieldCode + '"]')
                .each(function () {
                    var $wrapper    = $(this);
                    var targetValue = $wrapper.attr('data-depends-on-value');
                    var operator    = $wrapper.attr('data-depends-on-op') || 'EQUALS';
                    var show        = _evaluate(operator, newValue, targetValue);

                    $wrapper.toggleClass('bte-field-depends-hidden', !show);
                });
        }
    };
});
```

---

### 4. `settings-editor.js` — підключити `DependsEvaluator`

**a) Додати в `define()` deps:**
```js
'Swissup_BreezeThemeEditor/js/editor/panel/depends-evaluator'
```

**b) Викликати `applyInitialVisibility` після рендеру:**
```js
// В _renderSections() або після SectionRenderer.render() вставки в DOM:
DependsEvaluator.applyInitialVisibility(self.element);
```

**c) Викликати `updateVisibility` в change callback:**
```js
FieldHandlers.init(this.element, function (fieldData) {
    self._updateChangesCount();
    FieldHandlers.updateBadges(self.element, fieldData.sectionCode, fieldData.fieldCode);
    DependsEvaluator.updateVisibility(self.element, fieldData.fieldCode, fieldData.value);
});
```

---

### 5. `panel-state.js` — фільтрувати приховані поля при Save

```js
// В getDirtyChanges() або getChangesForMutation() — додати фільтр:
// Якщо поле приховане через depends — не включати в мутацію.
// Знайти DOM-wrapper через data-field і перевірити клас bte-field-depends-hidden.
```

> Альтернатива — передавати `$element` в `getChangesForMutation()` і фільтрувати там.
> Або зберігати `Set hiddenFields` у `DependsEvaluator` і надавати `isHidden(fieldCode): bool`.

---

### 6. LESS — клас видимості

**Файл:** `view/adminhtml/web/css/source/_theme-editor-fields.less`

```less
.bte-field-depends-hidden {
    display: none;
}
```

---

## Зачіпає файли

| Файл | Зміна |
|------|-------|
| `view/adminhtml/web/js/editor/panel/field-renderers/base.js` | Додати `dependsOn` в `prepareData()` |
| `view/adminhtml/web/js/editor/panel/field-renderer.js` | Штампувати `data-depends-*` на wrapper |
| `view/adminhtml/web/js/editor/panel/depends-evaluator.js` | **Новий файл** — `applyInitialVisibility()` + `updateVisibility()` |
| `view/adminhtml/web/js/editor/panel/settings-editor.js` | Підключити `DependsEvaluator`, викликати після рендеру і в change callback |
| `view/adminhtml/web/js/editor/panel/panel-state.js` | Фільтрувати приховані поля в `getDirtyChanges()` / `getChangesForMutation()` |
| `view/adminhtml/web/css/source/_theme-editor-fields.less` | Додати `.bte-field-depends-hidden { display: none; }` |

---

## Tracking

- [x] `base.js` — додати `dependsOn` в `prepareData()`
- [x] `field-renderer.js` — `data-depends-*` атрибути на wrapper
- [x] Створити `depends-evaluator.js` з `applyInitialVisibility()` та `updateVisibility()`
- [x] `settings-editor.js` — викликати `applyInitialVisibility` після рендеру
- [x] `settings-editor.js` — викликати `updateVisibility` в change callback
- [x] `panel-state.js` — фільтрувати приховані поля при Save
- [x] LESS — `.bte-field-depends-hidden { display: none; }`
- [x] Написати spec-тест для `depends-evaluator.js`
- [ ] Перевірити вручну: поле з `EQUALS` — показується/ховається при зміні контролюючого
- [ ] Перевірити: поле з `NOT_EQUALS` — інвертована логіка
- [ ] Перевірити: контролююче поле в іншій секції — залежність працює cross-section
- [ ] Перевірити: приховане поле не потрапляє в Save-мутацію
