# Refactoring: Font Palette Role Fields — Auto-generation

**Дата:** 2026-03-24  
**Пріоритет:** 🟡 Medium  
**Статус:** `[x] DONE`  
**Категорія:** Code duplication / Missing abstraction  
**PLAN.md:** п. 4.21

---

## Проблема

Кожна роль шрифту (`primary`, `secondary`, `utility`) зараз описується в `settings.json` **двічі**:

**Місце 1 — `font_palettes.default.fonts[]`** (UI-декларація ролі):
```json
"font_palettes": {
  "default": {
    "fonts": [
      { "id": "primary",   "label": "Primary",   "property": "--primary-font",   "default": "ui-sans-serif..." },
      { "id": "secondary", "label": "Secondary", "property": "--secondary-font", "default": "ui-sans-serif..." },
      { "id": "utility",   "label": "Utility",   "property": "--utility-font",   "default": "ui-sans-serif..." }
    ]
  }
}
```

**Місце 2 — `sections.typography.settings[]`** (storage binding):
```json
{
  "id": "typography",
  "settings": [
    { "id": "primary-font",   "type": "font_picker", "property": "--primary-font",   "font_palette": "default", "default": "ui-sans-serif..." },
    { "id": "secondary-font", "type": "font_picker", "property": "--secondary-font", "font_palette": "default", "default": "ui-sans-serif..." },
    { "id": "utility-font",   "type": "font_picker", "property": "--utility-font",   "font_palette": "default", "default": "ui-sans-serif..." }
  ]
}
```

### Чому дублювання виникло

Архітектурно `sections[].settings[]` — це єдиний шлях збереження значень до БД (`bte_value`).  
`font_palettes.fonts[]` — декларація UI-ролей для виджета `fontPaletteSection`.  
Без entries в `sections` — `PanelState` нічого не знає про ці поля і значення не зберігаються (детально: `font-palette-section-renderer.js:425` — guard `if (sectionCode && fieldCode)`).

### Наслідки поточного стану

1. **Дублювання `default`** — один і той самий довгий рядок `"ui-sans-serif, system-ui..."` повторюється 6 разів.
2. **Дублювання `property`** — `--primary-font`, `--secondary-font`, `--utility-font` — по 2 рази кожен.
3. **Ризик розсинхронізації** — якщо оновити `default` в `fonts[]` і забути в `settings[]` — поведінка непередбачувана (рендер використовує `fonts[].default`, збереження — `settings[].default`).
4. **Плутанина для авторів тем** — поля в `sections.typography` реально не виводяться в акордеоні (фільтруються через `FontPaletteManager.isPaletteRole()` в `field-renderer.js`), але мусять там бути. Неочевидно.

---

## Рішення

**Авто-генерація field-записів з `font_palettes.fonts[]` у PHP-резолвері.**

`AbstractConfigResolver::mergeSectionsWithValues()` після обробки `$config['sections']`
синтетично генерує field-записи для кожної ролі і поміщає їх у секцію `_font_palette`
(аналогічно до того, як color palette ролі зберігаються у `_palette`).

Після рефакторингу в `settings.json` залишається **лише `font_palettes.fonts[]`** — ніяких дублікатів у `sections`.

---

## Деталі реалізації

### 1. PHP: `AbstractConfigResolver` — авто-генерація

**Файл:** `Model/Resolver/Query/AbstractConfigResolver.php`

Додати метод:

```php
protected function mergeFontPaletteRolesAsFields(array $fontPalettes, array $valuesMap): array
{
    $syntheticSection = [
        'code'   => '_font_palette',
        'label'  => null,
        'icon'   => null,
        'fields' => [],
        'order'  => -1,
    ];

    foreach ($fontPalettes as $palette) {
        foreach ($palette['fonts'] ?? [] as $role) {
            $property   = $role['property'] ?? '';
            $defaultVal = $role['default'] ?? null;
            $fieldCode  = ltrim($property, '-');          // "--primary-font" → "primary-font"
            $key        = '_font_palette.' . $fieldCode;
            $savedValue = $valuesMap[$key] ?? null;

            $syntheticSection['fields'][] = [
                'code'        => $fieldCode,
                'label'       => $role['label'] ?? null,
                'type'        => 'FONT_PICKER',
                'value'       => $savedValue,
                'default'     => $defaultVal,
                'isModified'  => $savedValue !== null && $savedValue !== $defaultVal,
                'property'    => $property,
                'fontPalette' => $palette['id'],
                'description' => null,
                'selector'    => null,
                'required'    => false,
                'validation'  => null,
                'placeholder' => null,
                'helpText'    => null,
                'params'      => null,
                'dependsOn'   => null,
            ];
        }
    }

    return $syntheticSection;
}
```

Викликати в `Config::resolve()` після `mergeSectionsWithValues()`:

```php
$sections     = $this->mergeSectionsWithValues($config['sections'], $valuesMap, $themeId);
$fontSection  = $this->mergeFontPaletteRolesAsFields($fontPalettes, $valuesMap);

if (!empty($fontSection['fields'])) {
    $sections[] = $fontSection;
}
```

### 2. PHP: `ConfigProvider::getAllDefaults()` — додати `_font_palette`

**Файл:** `Model/Provider/ConfigProvider.php`

Метод `getAllDefaults()` наразі ітерує тільки `$config['sections']`. Додати прохід по `font_palettes`:

```php
foreach ($config['font_palettes'] ?? [] as $palette) {
    foreach ($palette['fonts'] ?? [] as $role) {
        $fieldCode = ltrim($role['property'] ?? '', '-');
        $defaults['_font_palette.' . $fieldCode] = $role['default'] ?? null;
    }
}
```

### 3. JS: `font-palette-section-renderer.js` — спростити `_buildRoleMap()`

**Файл:** `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js:69`

Зараз `_buildRoleMap()` сканує **всі** `this.options.sections` щоб знайти role-поля.
Після рефакторингу — шукати тільки в секції `_font_palette`:

```js
_buildRoleMap: function () {
    var self = this;
    var fontPaletteSection = (this.options.sections || []).find(function (s) {
        return s.code === '_font_palette';
    });

    ((fontPaletteSection && fontPaletteSection.fields) || []).forEach(function (field) {
        self._roleFields[field.property] = {
            sectionCode:  '_font_palette',
            fieldCode:    field.code,
            currentValue: field.value !== null && field.value !== undefined
                ? field.value
                : (field.default || '')
        };
        FontPaletteManager.setCurrentValue(field.property, self._roleFields[field.property].currentValue);
    });
}
```

### 4. JS: `config-loader.js` — спростити `_seedFontPaletteCurrentValues()`

**Файл:** `view/adminhtml/web/js/editor/panel/config-loader.js:161`

Замінити загальний scan всіх секцій на прямий пошук `_font_palette`:

```js
_seedFontPaletteCurrentValues: function (sections) {
    var fontSection = (sections || []).find(function (s) {
        return s.code === '_font_palette';
    });
    ((fontSection && fontSection.fields) || []).forEach(function (field) {
        if (field.property) {
            var val = (field.value !== null && field.value !== undefined)
                ? field.value : (field.default || '');
            FontPaletteManager.setCurrentValue(field.property, val);
        }
    });
}
```

### 5. `settings.json` теми — видалити role entries з `sections`

Після впровадження авто-генерації прибрати role-поля з `sections`:

**Було** (`theme-frontend-breeze-evolution/etc/theme_editor/settings.json:258–281`):
```json
{
  "id": "typography",
  "settings": [
    { "id": "primary-font",   "type": "font_picker", "property": "--primary-font",   "font_palette": "default", "default": "..." },
    { "id": "secondary-font", "type": "font_picker", "property": "--secondary-font", "font_palette": "default", "default": "..." },
    { "id": "utility-font",   "type": "font_picker", "property": "--utility-font",   "font_palette": "default", "default": "..." },
    { "id": "base-font-family", ... },
    ...
  ]
}
```

**Стало:**
```json
{
  "id": "typography",
  "settings": [
    { "id": "base-font-family", ... },
    { "id": "headings-font-family", ... },
    { "id": "font-size", ... },
    { "id": "line-height", ... }
  ]
}
```

Всі ролі — виключно в `font_palettes.fonts[]`.

---

## Сумісність з існуючими темами

Теми, що **ще не оновились**, матимуть role-поля в обох місцях одночасно.  
Тому в `mergeSectionsWithValues()` треба ігнорувати settings-поля, які вже покриті авто-генерацією:

```php
// Collect properties that will be auto-generated from font_palettes.fonts[]
$autoGeneratedProperties = [];
foreach ($fontPalettes as $palette) {
    foreach ($palette['fonts'] ?? [] as $role) {
        $autoGeneratedProperties[] = $role['property'] ?? '';
    }
}

foreach ($section['settings'] as $setting) {
    // Skip role fields — they are now auto-generated from font_palettes.fonts[]
    if (in_array($setting['property'] ?? '', $autoGeneratedProperties, true)) {
        continue;
    }
    // ... звичайна обробка
}
```

Це забезпечує **плавну міграцію**: нова логіка — авто-генерація; якщо тема ще не прибрала entries — дублікат мовчки ігнорується.

---

## Зачіпаються файли

| Файл | Тип зміни |
|------|-----------|
| `Model/Resolver/Query/AbstractConfigResolver.php` | Новий метод `mergeFontPaletteRolesAsFields()` + виклик у `resolve()` + guard у `mergeSectionsWithValues()` |
| `Model/Provider/ConfigProvider.php` | `getAllDefaults()` — додати прохід по `font_palettes` |
| `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js` | `_buildRoleMap()` — спростити, шукати секцію `_font_palette` |
| `view/adminhtml/web/js/editor/panel/config-loader.js` | `_seedFontPaletteCurrentValues()` — спростити |
| `theme-frontend-breeze-evolution/etc/theme_editor/settings.json` | Видалити role entries з `sections.typography` |

**Не зачіпаються:**
- `SaveValues.php` / `SaveValue.php` — storage path не змінюється (`_font_palette` як sectionCode валідний)
- `FontPaletteProvider.php` — читання `font_palettes` не змінюється
- `FontPaletteManager.js` — публічний API не змінюється
- GraphQL schema — `_font_palette` sectionCode валідний без змін схеми

---

## Тести, які потрібно оновити / написати

- `Test/Unit/Model/Resolver/Query/AbstractConfigResolverTest.php`
  - кейс: `font_palettes.fonts[]` генерує `_font_palette` секцію з правильними полями і значеннями
  - кейс: дублікат у `sections` ігнорується (guard спрацьовує)
  - кейс: `getAllDefaults()` повертає defaults для `_font_palette.*` ключів
- `tests/js/panel/font-palette-section-renderer-test.js`
  - оновити `_buildRoleMap` тест: секція `_font_palette` замість сканування всіх секцій
- `tests/js/panel/config-loader-test.js`
  - оновити `_seedFontPaletteCurrentValues` тест

---

## Переваги після рефакторингу

1. **DRY** — `default` і `property` для кожної ролі описуються рівно один раз, в `font_palettes.fonts[]`.
2. **Зрозумілість для авторів тем** — `font_palettes.fonts[]` = єдина точка правди для ролей шрифтів.
3. **Симетрія з кольорами** — color palette ролі зберігаються у `_palette`; font palette ролі — у `_font_palette`. Консистентна архітектура.
4. **Менше ризику** — зникає клас багів де `default` в `fonts[]` і `settings[]` розходяться.
5. **Простіший JS** — `_buildRoleMap()` і `_seedFontPaletteCurrentValues()` більше не сканують весь `config.sections`.
