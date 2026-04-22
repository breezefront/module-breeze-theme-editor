# Refactoring Plan — Breeze Theme Editor

**Дата аудиту:** 2026-03-19  
**Загальний стан:** 94 + 13 (setTimeout audit) = 107 задокументованих проблем у 8 категоріях  
**Статус виконання:** 76 / 108 завершено  

---

## Пріоритети

| Пріоритет | Опис |
|-----------|------|
| 🔴 **Critical** | Реальний баг — неправильна поведінка в production |
| 🟠 **High** | Суттєва технічна заборгованість, ускладнює підтримку |
| 🟡 **Medium** | Дублювання або слабка абстракція |
| 🟢 **Low** | Косметика, іменування, незначні дрібниці |

---

## Зміст

1. [Мертвий код — баги](#1-мертвий-код--баги)
2. [Dead code cleanup](#2-dead-code-cleanup)
3. [God classes / God widgets](#3-god-classes--god-widgets)
4. [Code duplication](#4-code-duplication)
5. [Magic numbers / Magic strings](#5-magic-numbers--magic-strings)
6. [Missing abstractions](#6-missing-abstractions)
7. [Tight coupling](#7-tight-coupling)
8. [setTimeout audit](#8-settimeout-audit--замінити-на-promise--requestanimationframe--подійну-логіку)

---

## 1. Мертвий код — баги

> Мертвий код, що спричиняє реальні помилки в production.

### 1.1 `ImportExportService` — невідповідність ключів повернення
- **Файл:** `Model/Service/ImportExportService.php`
- **Проблема:** `import()` повертає `['importedCount' => ..., 'skippedCount' => ...]`, але GraphQL-resolver читає `$result['imported']` та `$result['skipped']` (без суфікса `Count`). Обидва поля GraphQL-відповіді завжди `null`.
- **Пріоритет:** 🔴 Critical
- **Статус:** `[x] DONE` — коміт `0e4e4cb`

### 1.2 `ValidationService::validateValues()` — помилка типу
- **Файл:** `Model/Service/ValidationService.php`
- **Проблема:** Метод викликається з `ImportExportService.php:124` з масивом `ValueInterface[]`, але тіло методу очікує асоціативні масиви з ключами `sectionCode`/`fieldCode`/`value`. Цикл валідації не спрацьовує — валідація ніколи реально не виконується під час імпорту.
- **Пріоритет:** 🔴 Critical
- **Статус:** `[x] DONE` — коміт `54d007e`

### 1.3 `Observer/SetThemePreviewCookie` — dead observer logic
- **Файл:** `Observer/SetThemePreviewCookie.php`
- **Проблема:** Observer читає параметр `___store` — конвенція фронтенд-перемикача магазину, яка **ніколи не присутня** в admin-контексті. Event `controller_action_predispatch_breeze_editor_editor_index` — admin-only. Кукі ніколи не встановлюється; логіка observer'а мертва.
- **Пріоритет:** 🔴 Critical
- **Статус:** `[x] DONE` — коміт `619354e` (переміщено у frontend), `428725a` (видалено admin observer)

### 1.4 `etc/frontend/di.xml` — невалідний URI схеми
- **Файл:** `etc/frontend/di.xml:3`
- **Проблема:** `xsi:noNamespaceSchemaLocation="urn: magento:framework:..."` — зайвий пробіл після `urn:`. Технічно невалідний URI; строга XML-валідація може провалитись.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `1e8d8f1`

---

## 2. Dead code cleanup

> Невикористаний код: класи, методи, змінні, модулі, CSS-класи.

### PHP — Невикористані методи (тільки тести, ніяк не production)

### 2.1 `AdminToolbar` — stub-методи та мертві залежності
- **Файл:** `ViewModel/AdminToolbar.php`
- **Проблема:**
  - `getInitialPublications()` — завжди повертає `[]` (stub)
  - `getInitialPublicationStatus()` — завжди повертає `'DRAFT'` (stub)
  - `getCurrentPublicationId()` — завжди `null` (залежить від stub вище)
  - `$searchCriteriaBuilder` (constructor dep) — ніде не використовується
  - `$publicationRepository` (constructor dep) — ніде не використовується
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `6955d07`

### 2.2 `StoreDataProvider` — недосяжні методи
- **Файл:** `Model/Provider/StoreDataProvider.php`
- **Проблема:** `getAvailableGroups()` та `getAvailableStores()` недосяжні, бо `getSwitchMode()` завжди повертає `'hierarchical'`. `hasMultipleStores()` та `getActiveStorePath()` — не викликаються з production.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — видалено `hasMultipleStores()`, `getActiveStorePath()`

### 2.3 `BackendSession` — невикористані сеттери
- **Файл:** `Model/Session/BackendSession.php`
- **Проблема:** `setScopeType()` та `setScopeId()` ніколи не викликаються з production-коду.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — видалено `setScopeType()`, `setScopeId()`

### 2.4 `ColorFormatResolver` — методи тільки для тестів
- **Файл:** `Model/Utility/ColorFormatResolver.php`
- **Проблема:** `isAutoDetectable()` (рядки 95–109) та `getFormatFromValue()` (рядки 129–150) — викликаються тільки з тест-файлів, не з production.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — `isAutoDetectable()` позначено `@internal` (getFormatFromValue використовується в ColorPipeline — залишено)

### 2.5 `AdminUserLoader::clearCache()` — тільки тести
- **Файл:** `Model/Utility/AdminUserLoader.php`
- **Проблема:** `clearCache()` викликається тільки з тест-файлів.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — видалено `getUserFullName()`, `getUserEmail()`, `clearCache()`

### 2.6 `PresetService::applyPreset()` — тільки тести
- **Файл:** `Model/Service/PresetService.php:81–131`
- **Проблема:** Resolver `ApplyPreset.php` виконує логіку inline, не делегуючи до цього методу. Метод викликається тільки з unit-тестів.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — `getPresetValues()` викликається з production (Presets.php, ApplyPreset.php) — залишено як є; `@internal` не додавалось (N/A)

### 2.7 `ConfigProvider` — методи тільки для тестів
- **Файл:** `Model/Provider/ConfigProvider.php`
- **Проблема:** `getPresets()` (рядок 243), `getPreset()` (рядок 252), `clearCache()` (рядок 389) — тільки тести.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — видалено `getSections()`, `getSection()`, `getPresets()`, `getPreset()`, `clearCache()`; `getField()` перероблено з inline lookup

### 2.8 `StatusProvider` — методи тільки для тестів
- **Файл:** `Model/Provider/StatusProvider.php`
- **Проблема:** `getStatusCode()` (рядок 43), `getAllStatuses()` (рядок 59), `clearCache()` (рядок 136) — тільки тести.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — видалено `getStatusCode()`, `getAllStatuses()`, `clearCache()`

### 2.9 `ValueInheritanceResolver` — методи тільки для тестів
- **Файл:** `Model/Service/ValueInheritanceResolver.php`
- **Проблема:** `isValueInherited()` (рядок 203), `getInheritedFromTheme()` (рядок 241) — тільки тести.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — позначено `@internal`

### 2.10 `ThemeResolver` — методи тільки для тестів
- **Файл:** `Model/Utility/ThemeResolver.php`
- **Проблема:** `getThemeInfo()` (рядок 150), `hasParentTheme()` (рядок 171), `getParentThemeId()` — тільки тести або взагалі не викликаються.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — позначено `@internal`

### 2.11 `PaletteProvider::getPaletteById()` — тільки тести
- **Файл:** `Model/Config/PaletteProvider.php:50`
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — видалено `getPaletteById()`

### 2.12 `AdminTokenGenerator::forceRefresh()` — тільки тести
- **Файл:** `Model/Service/AdminTokenGenerator.php:150`
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — видалено `forceRefresh()`

### 2.13 `StatusRepository::delete()` — мертва змінна `$code`
- **Файл:** `Model/StatusRepository.php:123`
- **Проблема:** `$code = $status->getCode()` присвоюється і одразу ігнорується.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `d62015b`

### 2.14 `FrontendPageUrlProvider` — порожній клас
- **Файл:** `Model/Provider/FrontendPageUrlProvider.php`
- **Проблема:** Клас без жодної логіки. Існує лише як DI-alias. Можна замінити прямим preference на батьківський клас.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `bd3235e`

### 2.15 Collection builders — невикористані query-helper методи
- **Файли:**
  - `Model/ResourceModel/Publication/Collection.php` — `addThemeStoreFilter()`, `addTitleSearch()`, `addRollbackFilter()`, `addPublishedAtOrder()`, `joinAdminUser()`
  - `Model/ResourceModel/Value/Collection.php` — `addThemeStoreFilter()`, `addStatusFilter()`, `addUserFilter()`, `addSectionFilter()`, `addUpdatedAtOrder()`
  - `Model/ResourceModel/Status/Collection.php` — `addSortOrderSort()`, `addCodeFilter()`
  - `Model/ResourceModel/Changelog/Collection.php` — `addPublicationFilter()`, `addSectionFilter()`, `addSettingFilter()`
- **Проблема:** Всі ці query-builder методи написані спекулятивно, ніколи не викликаються з production-коду.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — `Publication/Collection.php` очищено (всі 5 методів видалено); `Value/Collection.php` (5), `Status/Collection.php` (2), `Changelog/Collection.php` (3) — коміт `b1d5539`

---

### JS — Невикористані модулі та методи

### 2.16 `editor/toolbar/status-indicator.js` — мертвий виджет
- **Файл:** `view/adminhtml/web/js/editor/toolbar/status-indicator.js`
- **Проблема:** Ніколи не імпортується в жодному production JS-файлі, шаблоні чи layout XML. Весь модуль мертвий.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `88b6aa6`

### 2.17 `graphql/queries/get-compare.js` — мертвий модуль
- **Файл:** `view/adminhtml/web/js/editor/graphql/queries/get-compare.js`
- **Проблема:** Ніде не імпортується в production.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `88b6aa6`

### 2.18 `graphql/queries/get-values.js` — мертвий модуль
- **Файл:** `view/adminhtml/web/js/editor/graphql/queries/get-values.js`
- **Проблема:** Ніде не імпортується в production.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `88b6aa6`

### 2.19 `editor/constants.js` — не імпортується в production
- **Файл:** `view/adminhtml/web/js/editor/constants.js`
- **Проблема:** Весь модуль (PUBLICATION_STATUS, SELECTORS, EVENT_NAMES) імпортується тільки в тест-файлах. Production-код порівнює рядки `'DRAFT'`/`'PUBLISHED'` напряму та хардкодить `'#bte-iframe'`. Константи є, але не застосовуються.
- **Пріоритет:** 🟠 High (або виправити використання, або видалити)
- **Статус:** `[x] DONE` — всі хардкодовані рядки замінено на Constants у 17 production-файлах; додано `SELECTORS.IFRAME_ID`

### 2.20 `palette-manager.js` — deprecated методи-обгортки
- **Файл:** `view/adminhtml/web/js/editor/panel/palette-manager.js`
- **Проблема:** `hexToRgb()` та `rgbToHex()` позначені `@deprecated`, делегують до `ColorUtils`, жодних викликів.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `bd3235e`

### 2.21 `palette-manager.js` — `getDirtyCount()` визначений двічі
- **Файл:** `view/adminhtml/web/js/editor/panel/palette-manager.js:309–311` та `480–482`
- **Проблема:** Метод визначений двічі в одному object literal. Перше визначення мертве — перезаписується другим.
- **Пріоритет:** 🔴 Critical (потенційний баг — перша реалізація може відрізнятись)
- **Статус:** `[x] DONE` — коміт `1560258`

### 2.22 `repeater.js::initSortable()` — stub-метод
- **Файл:** `view/adminhtml/web/js/editor/panel/field-handlers/repeater.js:301–305`
- **Проблема:** Тіло містить лише `console.log('initSortable called')`. Drag-and-drop sorting ніколи не реалізовано.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] N/A` — stub залишено навмисно; sortable не є пріоритетом; метод служить placeholder для майбутньої реалізації — stub
- **Файл:** `view/adminhtml/web/js/editor/utils/ui/error-handler.js:110–119`
- **Проблема:** `// TODO: Implement server-side error logging endpoint`. Тіло тільки `console.log`. Серверне логування ніколи не реалізоване.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `d7eddb4` (видалено `_logToServer()` і `_isCritical()` з `error-handler.js`; тести оновлено)

### 2.24 `highlight-toggle.js` — нереалізована фіча
- **Файл:** `view/adminhtml/web/js/editor/toolbar/highlight-toggle.js`
- **Проблема:** `// TODO Phase 2: Enable/disable element overlay in iframe`. Кнопка рендериться, але нічого не робить.
- **Пріоритет:** 🟡 Medium (реалізувати або прибрати кнопку)
- **Статус:** `[x] N/A` — Phase 2 feature, відкладено свідомо; кнопка залишається як placeholder
- **Файл:** `view/adminhtml/web/js/editor/utils/browser/url-builder.js`
  - `updateStoreParam()`, `updateThemeParam()`, `getNavigationParams()`, `removeNavigationParams()` — видалено
  - `decodePathParam()` — має виклики в тест-файлах, залишено
- **Файл:** `view/adminhtml/web/js/editor/utils/browser/cookie-manager.js` — всі методи мають production callers
- **Файл:** `view/adminhtml/web/js/editor/utils/ui/permissions.js` — всі методи мають production callers
- **Файл:** `view/adminhtml/web/js/editor/utils/ui/loading.js` — всі методи мають production callers
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `bcc0f38` (4 dead методи з `url-builder.js` видалено); решта файлів чисті

### 2.26 `publication-selector/metadata-loader.js::getPublicationTitle()` — не викликається
- **Файл:** `view/adminhtml/web/js/editor/toolbar/publication-selector/metadata-loader.js:184`
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `d7eddb4` (метод видалено)

### 2.27 `autoPublish` / `publicationTitle` — мертві GraphQL параметри
- **Файли:** `view/adminhtml/web/js/editor/graphql/mutation/save-values.js`, `etc/schema.graphqls:412–413`
- **Проблема:** Параметри передаються в мутацію та визначені в схемі, але `SaveValues.php` resolver їх ніколи не читає. Схемний dead code.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `c407bf5` (`autoPublish`/`publicationTitle` видалено з JS mutation payload і JSDoc; schema і PHP resolver очищено раніше в `b1d5539`)

---

### CSS — Мертві класи та правила

### 2.28 `_publication-selector.less` — responsive-блоки з неправильним класом
- **Файл:** `view/adminhtml/web/css/source/_publication-selector.less:405–429`
- **Проблема:** Responsive-блоки таргетують `.toolbar-publication-selector`, але виджет використовує `.bte-publication-selector`. Ці правила ніколи не спрацюють.
- **Пріоритет:** 🟠 High (візуальний баг на мобільних)
- **Статус:** `[x] DONE` — коміт `b978bf5`

### 2.29 `_utilities.less` — мертві CSS-класи
- **Файл:** `view/adminhtml/web/css/source/_utilities.less`
- **Проблема:**
  - `.permission-notice` та `.permission-notice .help-text` (рядки 70–86) — ніде не застосовуються в шаблонах
  - Порожній `&:hover::after {}` блок (рядки 109–112) — компілюється в nothing
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `bd3235e`

### 2.30 `_theme-editor-panel.less` — legacy CSS
- **Файл:** `view/adminhtml/web/css/source/panels/_theme-editor-panel.less:307–357`
- **Проблема:** `.bte-control-group`, `.bte-color-picker`, `.bte-font-picker select.bte-control`, `.bte-range-slider`, `.bte-range-value` — позначені або ідентифіковані як legacy, потенційно дублюються або мертві.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 2.31 `_variables.less` — перезаписані змінні (перші визначення мертві)
- **Файли:** `view/base/web/css/source/_variables.less`, `view/adminhtml/web/css/source/_variables.less`
- **Проблема:** `@dropdown-section-title-color`, `@dropdown-action-bg`, `@dropdown-action-hover-bg`, `@dropdown-item-meta-color` визначаються двічі в одному файлі. Перші визначення повністю перезаписуються.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

---

## 3. God classes / God widgets

> Класи та модулі, що роблять занадто багато — порушення SRP.

### 3.1 `CssGenerator` — God service (721 рядок)
- **Файл:** `Model/Service/CssGenerator.php`
- **Проблема:** Відповідає за: завантаження значень, вирішення спадкування, форматування кольорів (HEX, HEX8, RGB, RGBA), форматування шрифтів (з вбудованими масивами serif/monospace), генерацію CSS-змінних, збірку `:root {}` блоку, форматування виводу.
- **Пропозиція:** Розділити на `CssVariableBuilder`, `ColorValueFormatter`, `FontValueFormatter` — `CssGenerator` залишити тонким оркестратором.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `389b3b1`

### 3.2 `AdminToolbar` ViewModel — 15 залежностей (613 рядків)
- **Файл:** `ViewModel/AdminToolbar.php`
- **Проблема:** 15 constructor-залежностей. Відповідає за: генерацію URL, виявлення scope/store, резолюцію теми, перевірку дозволів, завантаження даних користувача, визначення типу сторінки, збірку конфігурації toolbar, вбудовування SVG.
- **Пропозиція:** Розбити на `ScopeViewModel`, `PermissionsViewModel` тощо, скомпонувати в `AdminToolbar`.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `98545c1`

### 3.3 `settings-editor.js` — God widget (1511 рядків)
- **Файл:** `view/adminhtml/web/js/editor/settings-editor.js`
- **Проблема:** Керує: завантаженням конфігу, рендерингом секцій, подіями полів, скиданням/відновленням полів, станом палітри, станом шрифтової палітри, CSS preview updates, обробкою зміни scope, обробкою помилок, форматуванням повідомлень.
- **Пропозиція:** Декомпозиція на спеціалізовані суб-модулі або суб-виджети.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміти `b9dad47` (декомпозиція), `709c593` (bugfix)

### 3.4 `publication-selector.js` — God widget (994 рядки)
- **Файл:** `view/adminhtml/web/js/editor/toolbar/publication-selector.js`
- **Проблема:** Керує: публікацією, відкатом, відхиленням чернетки, відхиленням опублікованого, видаленням публікації, відновленням CSS-стану, пагінацією, змінами scope, перевіркою дозволів, відображенням помилок.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `d4700ec`; оркестратор 512 рядків; витягнуті `css-state-restorer.js` (255 рядків) та `action-executor.js` (494 рядки)

### 3.5 `AbstractConfigResolver` — наближається до God abstract class (363 рядки)
- **Файл:** `Model/Resolver/Query/AbstractConfigResolver.php`
- **Проблема:** Один abstract клас відповідає за: завантаження секцій, побудову полів, params для validation/option/select/font-picker/palette/font-palette, побудову preset.
- **Пропозиція:** Виокремити окремі builder-класи.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `16608f2`; витягнуто `FieldFormatter`, `FieldParamsFormatter`, `SectionFormatter`, `PresetFormatter`; `AbstractConfigResolver` зменшено до ~45 рядків; тести перенесено в `Test/Unit/Model/Formatter/`

---

## 4. Code duplication

> Повторення логіки, яка має жити в одному місці.

### 4.1 `extractLabels()` — дублювання verbatim у двох файлах
- **Файли:** `Model/Provider/CompareProvider.php:90–104`, `Model/Resolver/Query/Publication.php:90–104`
- **Проблема:** Ідентичний вкладений цикл побудови `$labels[$sectionCode]['label']/['fields'][$fieldCode]`. `PublicationDataTrait` вже існує, але не містить цього методу.
- **Пропозиція:** Винести в `PublicationDataTrait`.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `d8483ed`

### 4.2 `PageUrlProvider` методи дубльовані в `AdminPageUrlProvider`
- **Файли:** `Model/Provider/PageUrlProvider.php:107–194`, `Model/Provider/AdminPageUrlProvider.php:62–153`
- **Проблема:** `getCategoryUrl()`, `getProductUrl()`, `getCmsPageUrl()` — майже ідентичні копії. Дочірній клас розширює батьківський, але перевизначає всі три методи з нуля.
- **Пропозиція:** Shared query logic у батьківський клас, override тільки `buildUrl()`.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `4e1e1d0`

### 4.3 PUBLISHED/DRAFT branching у двох query resolvers
- **Файли:** `Model/Resolver/Query/Config.php:95–106`, `Model/Resolver/Query/Values.php:72–83`
- **Проблема:** Ідентичний `if ($params['statusCode'] === 'PUBLISHED')` блок у двох місцях.
- **Пропозиція:** Protected helper в `AbstractConfigResolver`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `80a8dab`

### 4.4 `$userIdForSave` — ідентичний one-liner у двох сервісах
- **Файли:** `Model/Service/PresetService.php:97`, `Model/Service/ImportExportService.php:96`
- **Проблема:** `$userIdForSave = ($params['statusCode'] ?? '') === 'DRAFT' ? ($params['userId'] ?? 0) : 0;`
- **Пропозиція:** Винести в `AbstractMutationResolver` або shared utility.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `5680893` (documented with @see AbstractMutationResolver::getDraftUserIdForSave)

### 4.5 DRAFT ternary — 7+ повторень у mutation resolvers
- **Файли:** `Model/Resolver/Mutation/ApplyPreset.php:67,105`, `ResetToDefaults.php:53,65,66`, `CopyFromStore.php:54,63`
- **Проблема:** `$params['statusCode'] === 'DRAFT' ? $params['userId'] : null` написано 7+ разів.
- **Пропозиція:** Protected метод на `AbstractMutationResolver`.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `ee89eb8`

### 4.6 `ValueInterface[]` GraphQL return payload — у всіх mutation resolvers
- **Файли:** `ApplyPreset.php:83–95`, `ResetToDefaults.php:69–78`, `CopyFromStore.php:108–116`, `SaveValues.php:26–40`
- **Проблема:** Ітерація `$values` і маппінг `[sectionCode, fieldCode, value, isModified, updatedAt]` для GraphQL-відповіді — структурно ідентична в усіх чотирьох файлах.
- **Пропозиція:** Protected `toGraphQlValue()` на `AbstractMutationResolver`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `85289cd` (`values: [BreezeThemeEditorValue!]` додано до всіх mutation output типів у schema + PHP resolvers + JS оновлено) — тричі дубльована логіка
- **Файли:** `Model/Service/CssGenerator.php:378–384`, `Model/Utility/ColorFormatter.php:118–125`, `view/adminhtml/web/js/editor/panel/css-preview-manager.js` (всередині `_formatColorValue()`)
- **Проблема:** Алгоритм конвертації 8-значного hex в `rgba()` дубльований у PHP двічі та перереалізований у JS.
- **Пропозиція:** `ColorConverter::hex8ToRgba()` + JS-аналог в `ColorUtils`.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `a3ad5d3`

### 4.8 Style reference refresh — тричі в `css-manager.js`
- **Файл:** `view/adminhtml/web/js/editor/panel/css-manager.js`
- **Проблема:** `showPublished()`, `showDraft()`, `showPublication()` — всі три містять ідентичний блок, що знаходить 3 іменованих `<style>` елементи, видаляє та перевставляє їх.
- **Пропозиція:** Private `_refreshStyleElements()` helper.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміти `5a97541` `8e59dac` (panel/css-manager.js видалено, злито з editor/css-manager.js; дублювання усунуто через уніфікований модуль)

### 4.9 Scope traversal — 3 рази в `scope-selector.js`
- **Файл:** `view/adminhtml/web/js/editor/toolbar/scope-selector.js`
- **Проблема:** `_findScopeName()`, `_findStoreCode()`, `_findDefaultStoreId()` — кожен містить майже ідентичний потрійний `$.each` по `websites/groups/stores` ієрархії.
- **Пропозиція:** `_traverseScopes(callback)` helper.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `d7eddb4` (`_traverseScopes(callback)` витягнуто, всі три методи делегують до нього)

### 4.10 `handleFieldReset()` / `handleFieldRestore()` — майже ідентичні в `base.js`
- **Файл:** `view/adminhtml/web/js/editor/panel/field-handlers/base.js`
- **Проблема:** ~40 рядків кожен, однакова структура. Різниця тільки в тексті підтвердження та джерелі "default value".
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `d7eddb4` (`_handleFieldAction(options)` private helper витягнуто; обидва методи делегують до нього)

### 4.11 `publish()` / `rollback()` — спільна DB pipeline
- **Файл:** `Model/Service/PublishService.php:92–113` та `184–203`
- **Проблема:** Обидва методи: delete old rows → save new rows → write changelog. Спільні кроки можна витягти в private `_applySnapshot()`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `8c8e892`

### 4.12 `saveChangelog()` / `saveChangelogFromOld()` — майже ідентичні цикли
- **Файл:** `Model/Service/PublishService.php:223–246`
- **Проблема:** Обидва ітерують значення, будують `ChangelogInterface` — різниця тільки у джерелі "before" значення.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `8c8e892` (видалено `saveChangelogFromOld`; rollback нормалізує дані перед викликом єдиного `saveChangelog()`)

### 4.13 `mergeSections()` / `mergeSettings()` — одновалентний алгоритм
- **Файл:** `Model/Provider/ConfigProvider.php`
- **Проблема:** Обидва реалізують однаковий merge-by-code pattern.
- **Пропозиція:** `_mergeById(array $target, array $source, string $key): array`
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `7a7bb22`

### 4.14 `toRow()` — дублювання в `ValueRepository`
- **Файл:** `Model/ValueRepository.php`
- **Проблема:** `save()` та `saveMultiple()` будують ідентичний `$row` масив. Потрібна private `toRow(ValueInterface $value): array`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `304cbf3`

### 4.15 `getUserData()` / `getMultipleUsersData()` — дублювання array-building
- **Файл:** `Model/Utility/AdminUserLoader.php`
- **Проблема:** Ідентична конкатенація `fullname` та ідентичний `$userData` масив у двох методах.
- **Пропозиція:** Private `_buildUserData(AdminUserInterface $user): array`.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `6e744f1`

### 4.16 Tooltip HTML — двічі в palette renderer
- **Файл:** `view/adminhtml/web/js/editor/panel/sections/palette-section-renderer.js`
- **Проблема:** HTML-шаблон tooltip для swatch будується ідентично в `_createSwatch()` та `_updateSwatchModifiedState()`.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — `_buildSwatchTooltip(label, hexValue, usageCount, isModified)` витягнуто; обидва місця замінено одним викликом

### 4.17 Accordion toggle — у двох renderer'ах
- **Файли:** `palette-section-renderer.js`, `font-palette-section-renderer.js`
- **Проблема:** Ідентичне прив'язування accordion expand/collapse + анімація.
- **Пропозиція:** Shared `accordion-mixin.js` або base renderer.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `598daba` (`_bindAccordion()` витягнуто в `base-palette-renderer.js`)

### 4.18 Error message extraction — 6+ разів inline в `publication-selector.js`
- **Файл:** `view/adminhtml/web/js/editor/toolbar/publication-selector.js`
- **Проблема:** `error?.response?.data?.errors?.[0]?.message || error?.message || defaultMsg` написано inline 6+ разів.
- **Пропозиція:** Private `_extractErrorMessage(error, fallback)`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `d7eddb4` (`getMutationError` → `_extractErrorMessage` у `action-executor.js`; всі inline patterns замінено)

### 4.19 `_loadConfig()` / `_loadConfigFromPublication()` — shared init blocks
- **Файл:** `view/adminhtml/web/js/editor/settings-editor.js`
- **Проблема:** Обидва методи містять майже ідентичні блоки ініціалізації секцій, стану палітри, ре-рендеру.
- **Пропозиція:** Private `_applyConfig(config)`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `d7eddb4` (`_applyConfig(config)` витягнуто; дублювання усунуто)

### 4.20 `_injectCSS()` / `injectCSS()` — near-identical pair
- **Файл:** `view/adminhtml/web/js/editor/preview-manager.js`
- **Проблема:** Public та private майже ідентичні; `removeDraftCSS()` та `removeCSS()` теж.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] DONE` — коміт `d7eddb4` (видалено `_injectCSS` приватний дублікат; `preview-manager.js` використовує єдиний base class метод)

### 4.21 Font palette role fields — дублювання між `font_palettes.fonts[]` і `sections`
- **Файли:** `Model/Resolver/Query/AbstractConfigResolver.php`, `Model/Provider/ConfigProvider.php`, `view/adminhtml/web/js/editor/panel/sections/font-palette-section-renderer.js`, `view/adminhtml/web/js/editor/panel/config-loader.js`, `theme-frontend-breeze-evolution/etc/theme_editor/settings.json`
- **Проблема:** Кожна роль шрифту (`primary`, `secondary`, `utility`) описується двічі: в `font_palettes.fonts[]` (UI-декларація) і в `sections[].settings[]` (storage binding). Однакові `property` і `default` значення дублюються. Ризик розсинхронізації. Плутанина для авторів тем — поля в `sections` фільтруються і не відображаються в акордеоні, але мусять там бути для збереження.
- **Пропозиція:** Авто-генерація field-записів з `font_palettes.fonts[]` у `AbstractConfigResolver` у синтетичну секцію `_font_palette` (аналог `_palette` для кольорів). Видалити role entries з `sections` в `settings.json`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE`
- **Документація:** [`refactoring/font-palette-role-fields-autogeneration.md`](font-palette-role-fields-autogeneration.md)

---

## 5. Magic numbers / Magic strings

> Хардкодовані значення без іменованих констант.

### 5.1 `setStatusId(1)` — magic integer
- **Файл:** `Model/Resolver/Mutation/SavePaletteValue.php:86`
- **Проблема:** `$valueModel->setStatusId(1)` хардкодить integer ID для PUBLISHED-статусу. Весь інший код використовує `$statusProvider->getStatusId('PUBLISHED')`.
- **Пріоритет:** 🔴 Critical (може зламатись якщо ID зміниться)
- **Статус:** `[x] DONE` — коміт `6e59fd6`

### 5.2 `":root {\n}\n"` — sentinel value в 3 місцях
- **Файли:** `ViewModel/ThemeCssVariables.php:~72`, `Model/Resolver/Query/GetCss.php:~92,~112`
- **Проблема:** Хардкодоване представлення "порожнього CSS". Потрібна константа `CssGenerator::EMPTY_CSS_OUTPUT`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `526342e` (`EMPTY_CSS_OUTPUT` + `hasRealCssContent()` static method перенесено в `CssGenerator`)

### 5.3 `'#bte-iframe'` — не використовує SELECTORS константу
- **Файли:** `view/adminhtml/web/js/editor/toolbar.js` (7 разів), `color.js`, `css-preview-manager.js`
- **Проблема:** `constants.js` визначає `SELECTORS.IFRAME = '#bte-iframe'`, але жоден з файлів не імпортує та не використовує цю константу.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — `toolbar.js` повністю використовує `Constants.SELECTORS.IFRAME`; жодних `'#bte-iframe'` літералів не залишилось

### 5.4 Magic z-index `10001` / `10002`
- **Файли:** `palette-section-renderer.js`, `color.js`, `_color-picker.less:22,169`
- **Проблема:** `_variables.less` визначає `@bte-toolbar-z-index`, але ці файли використовують raw integers.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.5 Magic `30000` — auto-refresh interval
- **Файл:** `view/adminhtml/web/js/editor/toolbar/status-indicator.js`
- **Проблема:** 30-секундний інтервал polling хардкодований без іменованої константи.
- **Пріоритет:** 🟢 Low
- **Статус:** `[x] N/A` — файл `status-indicator.js` видалено в коміті `88b6aa6` (п. 2.16)

### 5.6 Magic device widths `'768px'`, `'375px'`
- **Файл:** `view/adminhtml/web/js/editor/toolbar/device-switcher.js`
- **Проблема:** Breakpoints хардкодовані як inline рядки без констант.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.7 Magic числа в `palette-section-renderer.js`
- **Файл:** `view/adminhtml/web/js/editor/panel/sections/palette-section-renderer.js`
- **Проблема:** `220` (popup width), `50` (scroll offset), `150` (debounce delay), `500` (cooldown delay) — всі без іменованих констант.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.8 `'--color-brand-'` prefix у `CssGenerator`
- **Файл:** `Model/Service/CssGenerator.php:712`
- **Проблема:** Рядковий префікс для стриппінгу label хардкодований. Потрібна class constant.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.9 `'--color-'` для detection у `color.js`
- **Файл:** `view/adminhtml/web/js/editor/panel/field-handlers/color.js`
- **Проблема:** `value.startsWith('--color-')` хардкодує prefix для palette CSS variable references.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.10 Inline CSS transition в JS
- **Файл:** `view/adminhtml/web/js/editor/toolbar/device-switcher.js`
- **Проблема:** `transition: 'width 0.3s ease'` встановлюється через JS замість CSS-класу.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.11 `'DRAFT'` / `'PUBLISHED'` порівнюється напряму в 10+ місцях
- **Файли:** Всі mutation resolvers + кілька JS-файлів
- **Проблема:** `constants.js` визначає `PUBLICATION_STATUS.DRAFT`, але більшість mutation resolvers та JS-файли порівнюють рядки напряму.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `0c57fa1`

### 5.12 `#1979c3` (Magento blue) — 10+ разів у LESS
- **Файл:** `view/adminhtml/web/css/source/_theme-editor-fields.less`
- **Проблема:** Основний Magento admin action color хардкодований 10+ разів замість LESS-змінної `@action-primary`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `eaa7e7c`

### 5.13 `rgba(255, 255, 255, 0.2)` — 8+ разів у LESS
- **Файл:** `view/adminhtml/web/css/source/_theme-editor-fields.less`
- **Проблема:** Semi-transparent white border inline замість `@bte-field-border-translucent` змінної.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.14 `'Courier New', monospace` — повторення в LESS
- **Файл:** `view/adminhtml/web/css/source/_theme-editor-fields.less`
- **Проблема:** Monospace font stack повторюється без `@bte-code-font` змінної.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.15 `min-width: 220px` в mixin
- **Файл:** `view/adminhtml/web/css/source/_mixins.less:51`
- **Проблема:** Мінімальна ширина dropdown хардкодована в mixin без LESS-змінної.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.16 `max-height: 75vh` — двічі в `_mixins.less`
- **Файл:** `view/adminhtml/web/css/source/_mixins.less:70,175`
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 5.17 `padding-right: 36px` у `_publication-selector.less`
- **Файл:** `view/adminhtml/web/css/source/_publication-selector.less:323`
- **Проблема:** Offset для icon width пояснений тільки коментарем, не змінною.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

---

## 6. Missing abstractions

> Відсутні абстракції, які зменшили б дублювання та поліпшили б читаність.

### 6.1 `ScopeInput` value object
- **Зачіпає:** Всі 13 mutation resolvers + query resolvers
- **Проблема:** Scope завжди передається як raw `['type' => ..., 'scopeId' => ...]` асоціативний масив. Жодної типізації, жодних іменованих accessors.
- **Пропозиція:** `ScopeInput` value object з `getType(): string` та `getScopeId(): int`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `bdcca71`

### 6.2 `StatusCode` enum / constants class
- **Зачіпає:** Всі mutation resolvers, кілька сервісів, JS-файли
- **Проблема:** Рядки `'DRAFT'` / `'PUBLISHED'` порівнюються напряму в 10+ місцях. PHP 8.1 дозволяє backed enums.
- **Пропозиція:** `StatusCode` enum або `StatusCode::DRAFT / ::PUBLISHED` constants class.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміти `69782d2`, `12e674f` (constants + resolvers)

### 6.3 `ColorPipeline` facade
- **Зачіпає:** `ColorFormatResolver.php`, `ColorFormatter.php`, `ColorConverter.php`, `css-preview-manager.js`
- **Проблема:** Логіка детекції та конвертації кольорів розкидана по трьох PHP-класах (жоден не розширює інший) та продубльована в JS.
- **Пропозиція:** `ColorPipeline` з чітким `detect() → convert() → format()` інтерфейсом як єдина точка входу.
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `20a334c`

### 6.4 `toGraphQlValue()` на `AbstractMutationResolver`
- **Зачіпає:** 4 mutation resolvers (ApplyPreset, ResetToDefaults, CopyFromStore, SaveValues)
- **Проблема:** Маппінг `ValueInterface → GraphQL array` дубльований у всіх 4 resolver'ах.
- **Пропозиція:** Protected `toGraphQlValue(ValueInterface $value): array` на `AbstractMutationResolver`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `d62f5b7`

### 6.5 `DraftUserIdResolver` abstraction
- **Зачіпає:** 7+ місць (3 mutation resolver файли, 2 сервіси)
- **Проблема:** `isDraft ? $userId : null` (або варіації) написано inline 7+ разів.
- **Пропозиція:** `DraftUserIdResolver::resolve(string $statusCode, int $userId): ?int`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміти `ad0bd60` (static helpers + більшість resolvers), `c74ca1e` (`SaveValue.php` + `SaveValues.php` — inline userId → `getDraftUserIdForSave()`)

### 6.6 Base palette renderer (`base-palette-renderer.js`)
- **Зачіпає:** `palette-section-renderer.js`, `font-palette-section-renderer.js`
- **Проблема:** Accordion toggle, swatch rendering scaffolding, dirty-state tracking, confirm-dialog reset — все дубльоване в обох renderer'ах.
- **Пропозиція:** Shared `base-palette-renderer.js` mixin або прототип.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `598daba` (`base-palette-renderer.js` витягнуто: `_bindAccordion`, `_bindBadgeUpdates`, `_updateHeaderBadges`, `_escapeHtml`, `_escapeAttr`; 781/781 тестів ✅)
- **Зачіпає:** `field-handlers/base.js`, `palette-section-renderer.js`, `font-palette-section-renderer.js`, `repeater.js`
- **Проблема:** Native `confirm()` та `alert()` для деструктивних дій. `Magento_Ui/js/modal/confirm` доступний і надає консистентний UI.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[ ] TODO`

### 6.8 `ThemeCache` в `ThemeResolver`
- **Файл:** `Model/Utility/ThemeResolver.php`
- **Проблема:** `getThemeInfo()`, `getParentThemeId()`, `hasParentTheme()` — кожен робить окремий DB-запит для одних і тих самих даних.
- **Пропозиція:** Private `getThemeCollection()` з кешуванням per-request.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `5f338c3` (`private array $themeCache` + `loadTheme()` memoisation)

---

## 7. Tight coupling

> Тісне зчеплення між компонентами.

### 7.1 `window.breezeThemeEditorConfig` — глобальний стан
- **Файли:** `view/adminhtml/web/js/editor/toolbar.js`, `settings-editor.js`, `publication-selector.js`, `permissions.js`
- **Проблема:** Toolbar записує конфіг у `window.breezeThemeEditorConfig`, кілька компонентів читають звідти. Невидима залежність між toolbar та будь-яким компонентом, що читає цей глобал.
- **Проблема з `configManager` (поточний стан):**
  - `configManager` зберігає стан через `$('body').data()` — це теж page-scoped глобал, просто через jQuery DOM замість `window.*`. Суть проблеми не усувається.
  - `configManager` змішує два типи даних: **статичний конфіг** (`graphqlEndpoint`, `adminUrl`, `permissions`) і **runtime стан** (`scope`, `scopeId`, `themeId`, `themeName` — змінюються при `scopeChanged` і після GraphQL).
- **Правильне рішення:** Розділити на два AMD closure singleton-и:
  - `config-manager.js` — **статичний readonly конфіг**, встановлюється один раз при старті toolbar. Аналог `Magento\Framework\App\Config`.
  - `scope-manager.js` — **runtime стан scope/theme**, мутує при `scopeChanged` та після GraphQL. Аналог `Magento\Store\Model\StoreManager`.
  - Обидва зберігають стан у `var _config = {}` / `var _scope = {}` у AMD замиканні — RequireJS кешує `define()`, тому всі модулі отримують один і той самий екземпляр.
- **Розподіл полів:**

  | Поле | Модуль | Тип |
  |------|--------|-----|
  | `graphqlEndpoint` | `config-manager` | static |
  | `adminUrl` | `config-manager` | static |
  | `adminBasePath` | `config-manager` | static |
  | `permissions` | `config-manager` | static |
  | `activatePanel` | `config-manager` | static |
  | `scope` | `scope-manager` | runtime |
  | `scopeId` | `scope-manager` | runtime |
  | `storeCode` | `scope-manager` | runtime |
  | `themeId` | `scope-manager` | runtime (null після scopeChanged, реальний після GraphQL) |
  | `themeName` | `scope-manager` | runtime (оновлюється після GraphQL) |

- **`publication-state.js`** — залишається незалежним singleton без змін.

- **Plan виконання (10 кроків):**

  **Крок 1 — Створити `utils/core/scope-manager.js`**
  - AMD closure singleton: `var _scope = { scope, scopeId, storeCode, themeId, themeName }`
  - API: `init(data)`, `update(updates)`, `get()`, `clear()` (для тестів)
  - Геттери: `getScope()`, `getScopeId()`, `getStoreCode()`, `getThemeId()`, `getThemeName()`
  - `init()` — перша ініціалізація при старті; `update()` — часткові зміни при scopeChanged/GraphQL

  **Крок 2 — Переписати `config-manager.js`**
  - Замінити `$('body').data(CONFIG_KEY, ...)` на `var _config = {}` у AMD замиканні
  - Прибрати залежність від `jquery`
  - Видалити scope/theme поля: `scope`, `scopeId`, `storeCode`, `themeId`, `themeName`
  - Видалити мертві сеттери: `setScope()`, `setScopeId()`, `setStoreCode()`, `setThemeId()`
  - Видалити `update()` — конфіг readonly після `set()`
  - Додати нові поля в DEFAULTS: `adminUrl`, `permissions`, `activatePanel`
  - Додати геттери: `getAdminUrl()`, `getPermissions()`, `getActivatePanel()`
  - Залишити: `set()`, `get()`, `exists()`, `clear()`, `getGraphqlEndpoint()`, `getAdminUrl()`, `getAdminBasePath()`

  **Крок 3 — `toolbar.js`**
  - Розбити `configManager.set({...})` на два виклики:
    - `configManager.set({ graphqlEndpoint, adminUrl, adminBasePath, permissions, activatePanel })`
    - `scopeManager.init({ scope, scopeId, storeCode, themeId, themeName })`
  - Видалити `window.breezeThemeEditorConfig = {...}` (рядки 127–136)
  - В `scopeChanged` handler: видалити `window.breezeThemeEditorConfig.scope/scopeId/themeId = ...` — `scope-selector.js` вже викликає `scopeManager.update()` перед тригером події
  - Додати `scopeManager` як AMD-залежність

  **Крок 4 — `toolbar/scope-selector.js`**
  - `configManager.update({ scope, scopeId, storeCode, themeId: null })` → `scopeManager.update({ scope, scopeId, storeCode, themeId: null })`
  - Замінити `configManager` на `scopeManager` як AMD-залежність (якщо `configManager` більше не потрібен у цьому файлі)

  **Крок 5 — `panel/config-loader.js`**
  - `configManager.getScope/getScopeId/getThemeId/getThemeName` → `scopeManager.*`
  - `configManager.update({ themeId, themeName })` → `scopeManager.update({ themeId, themeName })`
  - Додати `scopeManager` як AMD-залежність

  **Крок 6 — `panel/settings-editor.js`**
  - Видалити `var config = window.breezeThemeEditorConfig || {}`
  - Standalone fallback: `if (!scopeManager.initialized()) scopeManager.init({ scope: 'stores', ... })`
  - `config.themeName` → `scopeManager.getThemeName('current theme')`
  - `config.adminUrl` → `configManager.getAdminUrl('/admin')`
  - `configManager.getScope/getScopeId/getThemeId` → `scopeManager.*`
  - Додати `scopeManager` як AMD-залежність

  **Крок 7 — `toolbar/publication-selector.js`**
  - Видалити весь fallback блок (`if (!configManager.exists()) { var config = window.breezeThemeEditorConfig ... }`)
  - `configManager.getScopeId/getThemeId` → `scopeManager.*`
  - Додати `scopeManager` як AMD-залежність

  **Крок 8 — `utils/ui/permissions.js`**
  - `window.breezeThemeEditorConfig.permissions` → `configManager.getPermissions()`
  - Замінити `jquery` на `config-manager` як AMD-залежність

  **Крок 9 — Решта 9 файлів: `configManager.get*` → `scopeManager.get*`**
  - `css-manager.js` — `getScope`, `getScopeId`, `getThemeId` (14 викликів)
  - `panel/error-presenter.js` — `getScope`, `getThemeName` (4 виклики)
  - `panel/preset-selector.js` — `getScope`, `getScopeId` (4 виклики)
  - `panel/section-renderer.js` — `getScope`, `getScopeId`, `getThemeId` (6 викликів)
  - `toolbar/page-selector.js` — `getStoreCode`, `getThemeId` (4 виклики)
  - `toolbar/publication-selector/action-executor.js` — `getScope`, `getScopeId`, `getThemeId` (16 викликів)
  - `toolbar/publication-selector/css-state-restorer.js` — `getScope`, `getScopeId`, `getThemeId` (8 викликів)
  - `toolbar/publication-selector/metadata-loader.js` — `getScope`, `getScopeId`, `getThemeId` (6 викликів)
  - У кожному файлі: додати `scopeManager` як AMD-залежність, прибрати `configManager` якщо більше не потрібен

  **Крок 10 — Тести**
  - `permissions-test.js`: `window.breezeThemeEditorConfig = { permissions: perms }` → `configManager.set({ permissions: perms })`; `window.breezeThemeEditorConfig = originalConfig` → `configManager.clear()`; додати `configManager` до `define([...])`
  - `publication-selector-test.js`: `window.breezeThemeEditorConfig = { permissions: perms }` → `configManager.set({ permissions: perms })`; `window.breezeThemeEditorConfig = undefined` → `configManager.clear()`; додати `configManager` до `define([...])`
  - Новий `scope-manager-test.js`: `init()` встановлює всі поля; `update()` оновлює тільки вказані; `getScopeId()` з `scopeId=0` повертає `0` (не `null`); `getThemeId()` після `update({ themeId: null })` повертає `null`; `clear()` скидає до дефолтів

- **Зачіпаються файли:** 14 production JS + 2 test JS + 1 новий файл (scope-manager.js)
- **Пріоритет:** 🟠 High
- **Статус:** `[x] DONE` — коміт `6b9911a`
  - Створено `scope-manager.js` — AMD closure singleton (`var _scope = {}`), API: `init`, `update`, `get*`, `clear`
  - `config-manager.js` переписано — AMD closure (`var _config = {}`), jQuery прибрано, тільки static поля
  - 14 production файлів мігровано: `configManager.getScope/Id/ThemeId/Name/StoreCode` → `scopeManager.*`
  - `window.breezeThemeEditorConfig` повністю видалено
  - `permissions.js` → `configManager.getPermissions()`
  - Тести оновлено: `permissions-test.js`, `publication-selector-test.js`; новий `scope-manager-test.js` (16 тестів)
  - Jest: 771 passed ✅

### 7.2 `AdminToolbar` — 15 constructor-залежностей
- **Файл:** `ViewModel/AdminToolbar.php`
- **Проблема:** Зміна будь-якого з 15 залежних класів потенційно ламає ViewModel. Включаючи 2 мертві залежності (п. 2.1).
- **Пріоритет:** 🟠 High (пов'язано з п. 3.2)
- **Статус:** `[x] DONE` — 11 deps → 8 deps. `DecoderInterface`, `EncoderInterface`, `UrlInterface` переміщені в `ToolbarUrlProvider` разом з методами `getIframeUrl()`, `isJstestMode()`, `getCurrentPageId()`.

### 7.3 `CssGenerator` — 3 color utility залежності
- **Файл:** `Model/Service/CssGenerator.php`
- **Проблема:** Напряму залежить від `ColorConverter`, `ColorFormatter`, `ColorFormatResolver`. Новий color format потребує змін у `CssGenerator`.
- **Пропозиція:** `ColorPipeline` facade (пов'язано з п. 6.3).
- **Пріоритет:** 🟡 Medium
- **Статус:** `[ ] TODO`

### 7.4 `db_schema.xml` — FK `onDelete="NO ACTION"` для `user_id`
- **Файл:** `etc/db_schema.xml:63`
- **Проблема:** Видалення admin user провалиться якщо в нього є збережені draft values. Краще `onDelete="SET NULL"` + nullable `user_id`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] N/A` — адміни в Magento рідко видаляються (зазвичай деактивують `is_active=0`). `NO ACTION` є фактичним захистом від випадкового видалення адміна з активними даними. Ризик регресії від міграції схеми перевищує практичну цінність fix.

### 7.5 ACL plugin — мовчазне ігнорування при відсутності interface
- **Файл:** `Plugin/GraphQL/AclAuthorization.php`, `etc/graphql/di.xml`
- **Проблема:** Plugin спрацьовує тільки на resolver'ах, що реалізують `ResolverInterface`. Якщо resolver забуде реалізувати interface — авторизація мовчки обходиться.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[x] DONE` — коміт `fbd5e60` (guardrail тест `ResolverAclGuardrailTest` — 22 resolver'и; SECURITY NOTE у `beforeResolve()`)

### 7.6 Надмірне логування — `AdminTokenGenerator`
- **Файл:** `Model/Service/AdminTokenGenerator.php`
- **Проблема:** 20+ `debug()` записів на кожен GraphQL-виклик. В dev/staging — значний шум у логах.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 7.7 `UserResolver` — info log на кожному auth
- **Файл:** `Model/Utility/UserResolver.php:90–94`
- **Проблема:** `info`-рівень лог на кожному автентифікованому GraphQL-запиті. При live-preview — сотні записів за хвилину.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 7.8 Мішаниця мов у коментарях
- **Файли:** `ConfigProvider.php`, `ValidationService.php`, `ValueInheritanceResolver.php`, `ImportExportService.php`, `css-manager.js`, `css-preview-manager.js`, `_mixins.less`
- **Проблема:** Коментарі в деяких файлах написані українською, в інших — англійською. Ускладнює onboarding.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 7.9 `strpos` chain для визначення типу сторінки
- **Файл:** `ViewModel/AdminToolbar.php:449–468`
- **Проблема:** Довгий ланцюжок `if (strpos($url, '/catalog/product') !== false) ... elseif ...` крихкий і важко розширюваний.
- **Пропозиція:** Lookup table `[url-fragment => pageId]`.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

---

## 8. setTimeout audit — замінити на Promise / requestAnimationFrame / подійну логіку

> 21 використання `setTimeout` у JS-коді редактора. Кожен класифікований нижче.

### Категорії

| Тип | Опис | Кількість | Що робити |
|-----|------|-----------|-----------|
| **A** — retry polling | Чекати поки iframe/DOM буде готовий (retry loop) | 4 | Замінити на `Promise` + `waitForElement()` |
| **B** — CSS animation sync | Затримка для синхронізації з CSS-transition | 3 | Залишити `setTimeout`, задокументувати |
| **C** — next-tick defer | `setTimeout(fn, 0)` — відкласти після call-stack | 1 | Замінити на `Promise.resolve().then(fn)` або `queueMicrotask` |
| **D** — flag cleanup | Скинути прапорець після того як усі події оброблені | 2 | Замінити на `Promise.resolve().then(fn)` |
| **E** — outside-click guard | Затримка щоб попап встиг відрендеритись перед перевіркою | 2 | Замінити на `requestAnimationFrame` |
| **F** — debounce | Стандартний debounce timer | 3 | OK — залишити, але витягти в `_debounce()` утиліту |
| **G** — intentional delay | Свідома затримка (reload після publish, hide toolbar) | 3 | OK — залишити, задокументувати |
| **H** — editability race | Затримка щоб уникнути race condition після події | 1 | Замінити на подійну логіку |

---

### 8.1 `css-manager.js` (root) — retry polling (×2)
- **Файл:** `view/adminhtml/web/js/editor/css-manager.js:67,82`
- **Тип:** A — retry polling
- **Проблема:** `setTimeout(fn, 200)` у рекурсивному `init(config, retries)` — чекає поки `iframe.contentDocument` та `#bte-theme-css-variables` будуть доступні. До 20 спроб × 200мс = до 4с затримки при невдачі.
- **Пропозиція:** Витягти `waitForIframe(maxRetries, delay)` → повертає `Promise`. `init()` стає `async`, використовує `await waitForIframe()`.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[ ] TODO`

### 8.2 `panel/css-manager.js` — retry polling (×2)
- **Файл:** `view/adminhtml/web/js/editor/panel/css-manager.js:73,90`
- **Тип:** A — retry polling
- **Проблема:** Ідентична логіка до п. 8.1. Дублювання retry pattern між двома css-manager файлами.
- **Пропозиція:** Спільна утиліта `waitForIframeReady(selector, maxRetries, delay)` → `Promise`. Усунути дублювання між 8.1 і 8.2.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[ ] TODO`

### 8.3 `toolbar.js` — next-tick defer
- **Файл:** `view/adminhtml/web/js/editor/toolbar.js:112`
- **Тип:** C — next-tick defer
- **Проблема:** `setTimeout(fn, 0)` щоб відкласти `navWidget.setActive()` після завершення поточного call-stack (widget ще не повністю ініціалізований).
- **Пропозиція:** Замінити на `Promise.resolve().then(fn)` або `queueMicrotask(fn)` — семантично точніше.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 8.4 `panel/field-handlers/color.js` — outside-click guard (×1)
- **Файл:** `view/adminhtml/web/js/editor/panel/field-handlers/color.js:81`
- **Тип:** E — outside-click guard
- **Проблема:** `setTimeout(fn, 10)` у `document.click` handler — дає час попапу відрендеритись перед перевіркою `.bte-color-popup`. Крихко: 10мс довільне.
- **Пропозиція:** Замінити на `requestAnimationFrame(fn)` — виконується після наступного paint, гарантовано після render.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 8.5 `panel/field-handlers/color.js` — flag cleanup
- **Файл:** `view/adminhtml/web/js/editor/panel/field-handlers/color.js:399`
- **Тип:** D — flag cleanup
- **Проблема:** `setTimeout(fn, 50)` щоб скинути `is-palette-selection` прапорець після того як усі jQuery-події обробляться. 50мс — довільне.
- **Пропозиція:** `Promise.resolve().then(fn)` — виконується після поточної синхронної черги.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 8.6 `panel/sections/palette-section-renderer.js` — outside-click guard
- **Файл:** `view/adminhtml/web/js/editor/panel/sections/palette-section-renderer.js:242`
- **Тип:** E — outside-click guard
- **Проблема:** Ідентична до п. 8.4 — `setTimeout(fn, 10)` у `document.click`. Дублювання паттерну з color.js.
- **Пропозиція:** `requestAnimationFrame(fn)`. Усунути дублювання з п. 8.4 — спільний helper `onOutsideClick(selector, callback)`.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 8.7 `panel/sections/palette-section-renderer.js` — debounce (×2)
- **Файл:** `view/adminhtml/web/js/editor/panel/sections/palette-section-renderer.js:575,580`
- **Тип:** F — debounce
- **Проблема:** `badgesDebounceTimer` (150мс) і `_justChangedTimer` (500мс) — інлайн debounce таймери. Коректні, але оголені.
- **Пропозиція:** Обгорнути в локальний `_debounce(fn, delay)` для читабельності. Не змінювати логіку.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 8.8 `panel/css-preview-manager.js` — flag cleanup
- **Файл:** `view/adminhtml/web/js/editor/panel/css-preview-manager.js:181`
- **Тип:** D — flag cleanup
- **Проблема:** `setTimeout(fn, 50)` щоб скинути `is-palette-update` прапорець. Ідентична до п. 8.5.
- **Пропозиція:** `Promise.resolve().then(fn)`. Усунути дублювання з п. 8.5.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 8.9 `panel/settings-editor.js:306` — editability race condition
- **Файл:** `view/adminhtml/web/js/editor/panel/settings-editor.js:306`
- **Тип:** H — editability race
- **Проблема:** `setTimeout(_updateFieldsEditability, 100)` після події `publicationStatusChanged` — обхід race condition де поля ще не відрендерені. Коментар: "fixes the bug where fields remain disabled on first panel open".
- **Пропозиція:** Слухати `panelShown` подію замість `setTimeout` — викликати `_updateFieldsEditability()` одразу після відкриття панелі.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[ ] TODO`

### 8.10 `panel/settings-editor.js:379` — intentional reload delay
- **Файл:** `view/adminhtml/web/js/editor/panel/settings-editor.js:379`
- **Тип:** G — intentional delay
- **Проблема:** `setTimeout(window.location.reload, 1000)` після публікації — дає 1с для UX (показати success state) перед перезавантаженням.
- **Пропозиція:** Залишити. Задокументувати `/* intentional UX delay before reload */`.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 8.11 `panel/settings-editor.js:913` — debounce utility
- **Файл:** `view/adminhtml/web/js/editor/panel/settings-editor.js:906–916`
- **Тип:** F — debounce
- **Проблема:** Локальна `_debounce(fn, delay)` функція визначена всередині `settings-editor`. Те ж саме потрібно в 8.7 і потенційно деінде.
- **Пропозиція:** Винести в `view/adminhtml/web/js/editor/utils/debounce.js` як окремий модуль. Імпортувати там де потрібно.
- **Пріоритет:** 🟡 Medium
- **Статус:** `[ ] TODO`

### 8.12 `toolbar/navigation.js` — CSS animation sync (×2)
- **Файл:** `view/adminhtml/web/js/editor/toolbar/navigation.js:215,261`
- **Тип:** B — CSS animation sync
- **Проблема:**
  - `:215` — `setTimeout(fn, 10)` щоб додати `.active` клас після `display:block` (force reflow). Потрібен для CSS slide-in анімації.
  - `:261` — `setTimeout($panel.hide, 300)` після видалення `.active` — чекає CSS transition (300мс) перед `display:none`.
- **Пропозиція:** Залишити. Задокументувати зв'язок з CSS transition duration. Для `:215` можна розглянути `requestAnimationFrame` замість 10мс, але різниця незначна.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

### 8.13 `toolbar/toolbar-toggle.js` — intentional delay
- **Файл:** `view/adminhtml/web/js/editor/toolbar/toolbar-toggle.js:163`
- **Тип:** G — intentional delay
- **Проблема:** `setTimeout(_hideToolbar, 100)` при відновленні collapsed-стану — дає час сторінці завантажитись перед приховуванням тулбара.
- **Пропозиція:** Залишити. Розглянути заміну на `requestAnimationFrame` якщо проблем з мерехтінням не буде.
- **Пріоритет:** 🟢 Low
- **Статус:** `[ ] TODO`

---

## Статистика

| Категорія | Всього | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low |
|-----------|--------|------------|--------|----------|-------|
| 1. Мертвий код — баги | 4 | 3 | 1 | — | — | ✅ 4/4 |
| 2. Dead code cleanup | 31 | 1 | 3 | 10 | 17 | 12/31 |
| 3. God classes | 5 | — | 4 | 1 | — | 4/5 |
| 4. Code duplication | 21 | — | 5 | 10 | 6 | 8/21 |
| 5. Magic numbers/strings | 17 | 1 | — | 4 | 12 | 4/17 |
| 6. Missing abstractions | 8 | — | 1 | 7 | — | 4/8 |
| 7. Tight coupling | 9 | — | 2 | 4 | 3 | 1/9 |
| 8. setTimeout audit | 13 | — | — | 3 | 10 | 0/13 |
| **Всього** | **108** | **5** | **16** | **39** | **48** |
| **Виконано** | **47** | **5** | **12** | **17** | **13** |
| **Залишилось** | **61** | **0** | **4** | **22** | **35** |

> Примітка: пп. 6.5 і 2.27 — `🔄 Partial` (частково зроблено, є залишки).

> Примітка: деякі пункти перетинаються між категоріями (напр. п. 3.2 і п. 7.2, або п. 6.3 і п. 7.3).

---

## Рекомендований порядок виконання

### Крок 1 — Критичні баги (виконати першими)
1. `[x]` **п. 1.1** — Виправити `importedCount`/`skippedCount` → `imported`/`skipped` key mismatch — `0e4e4cb`
2. `[x]` **п. 1.2** — Виправити type mismatch у `ValidationService::validateValues()` — `54d007e`
3. `[x]` **п. 2.21** — Виправити подвійне визначення `getDirtyCount()` в `palette-manager.js` — `1560258`
4. `[x]` **п. 5.1** — Замінити `setStatusId(1)` на `$statusProvider->getStatusId('PUBLISHED')` — `6e59fd6`
5. `[x]` **п. 1.3** — Перевірити та виправити `Observer/SetThemePreviewCookie` — `619354e` + `428725a`
6. `[x]` **п. 1.4** — Виправити typo в `etc/frontend/di.xml` — `1e8d8f1`

### Крок 2 — Dead code (швидкий виграш)
7. `[x]` **п. 2.28** — Виправити `.toolbar-publication-selector` → `.bte-publication-selector` в responsive LESS — `b978bf5`
8. `[x]` **п. 2.16** — Видалити `status-indicator.js` — `88b6aa6`
9. `[x]` **п. 2.17, 2.18** — Видалити мертві GraphQL query модулі — `88b6aa6`
10. `[x]` **п. 2.1** — Прибрати мертві DI-залежності та stubs з `AdminToolbar` — `6955d07`

### Крок 3 — High-priority duplication
11. `[x]` **п. 4.1** — Перенести `extractLabels()` в `PublicationDataTrait` — `d8483ed`
12. `[x]` **п. 4.5** — DRAFT ternary → protected метод в `AbstractMutationResolver` — `ee89eb8`
13. `[x]` **п. 4.7** — Уніфікувати HEX8→rgba в PHP та JS — `a3ad5d3`
14. `[x]` **п. 4.2** — Виправити дублювання `PageUrlProvider` / `AdminPageUrlProvider` — `4e1e1d0`

### Крок 4 — God classes (великі рефакторинги)
15. `[x]` **п. 3.1** — Декомпозиція `CssGenerator` — коміт `389b3b1`
16. `[x]` **п. 3.2** — Декомпозиція `AdminToolbar` ViewModel — коміт `98545c1`
17. `[x]` **п. 3.3** — Декомпозиція `settings-editor.js` — коміти `b9dad47`, `709c593`, `cb7c148`
18. `[x]` **п. 3.4** — Декомпозиція `publication-selector.js` — коміт `d4700ec`

### Крок 5 — Missing abstractions + Magic strings
19. `[x]` **п. 6.2** — `StatusCode` enum/constants — `69782d2`, `12e674f`
20. `[x]` **п. 6.1** — `ScopeInput` value object — `bdcca71`
21. `[x]` **п. 6.3** — `ColorPipeline` facade — `20a334c`
22. `[x]` **п. 5.11** — Замінити магічні `'DRAFT'`/`'PUBLISHED'` рядки константами — `0c57fa1`
23. `[x]` **п. 5.12** — Замінити `#1979c3` на LESS-змінну — `eaa7e7c`

### Крок 7 — Tight coupling
- **Крок 7A** `[x]` — PHP dead code cleanup (пп. 2.2–2.12 + 2.15 partial) — `0cf89a5`
- **Крок 7B** `[x]` — css-var shim removal (PHP + GraphQL + JS) — `06e760c` `6574cd9` `f337705`
- **Крок 7C** `[x]` — JS dead code: `palette-manager.js` deprecated wrappers, `FrontendPageUrlProvider`, `_utilities.less` tooltip stub — `bd3235e`
- **Крок 7.1** `[x]` — **Розділити `configManager` на `config-manager` (static) + `scope-manager` (runtime); видалити `window.breezeThemeEditorConfig`** — коміт `6b9911a`

### Крок 8 — PHP + JS залишки (малі)

> Залишки попередніх кроків — два PHP файли і один JS файл.

- `[x]` **п. 4.11 + 4.12** — `PublishService`: `applySnapshot()` helper + `saveChangelog` уніфіковано — коміт `8c8e892`
- `[x]` **п. 4.14** — `ValueRepository.toRow()` private helper — коміт `304cbf3`
- `[x]` **п. 4.13** — `ConfigProvider.mergeById()` helper — коміт `7a7bb22`
- `[x]` **п. 4.15** — `AdminUserLoader._buildUserData()` helper — коміт `6e744f1`
- `[x]` **п. 6.8** — `ThemeResolver` per-request cache (`loadTheme()`) — коміт `5f338c3`
- `[x]` **п. 5.2** — `CssGenerator::EMPTY_CSS_OUTPUT` constant — коміт `526342e`
- `[x] N/A` **п. 7.4** — `db_schema.xml` FK `onDelete="SET NULL"` — адміни рідко видаляються, `NO ACTION` є захистом від випадкового видалення
- `[x]` **п. 7.5** — `AclAuthorization` guardrail тест + SECURITY NOTE — коміт `fbd5e60`
- `[x] N/A` **п. 2.15** — `Value/Collection.php`, `Status/Collection.php`, `Changelog/Collection.php` — порожні класи, нема чого видаляти
- `[x]` **п. 6.5** *(залишок)* — `SaveValues.php` і `SaveValue.php` → `getDraftUserIdForSave()` — ще не зроблено *(залишається відкритим)*
- `[x]` **п. 2.27** *(залишок)* — `save-values.js` `autoPublish`/`publicationTitle` — коміт `c407bf5` ✅

### Крок 8.5 — `AbstractConfigResolver` decomposition (великий)

> Окремий крок через обсяг — 446 рядків, 18 методів.

- `[x]` **п. 3.5** — DONE `16608f2` — витягнуто `FieldFormatter`, `FieldParamsFormatter`, `SectionFormatter`, `PresetFormatter`

### Крок 9 — JS duplication cleanup

> Батч малих JS рефакторингів, кожен незалежний.

- `[x]` **п. 4.9** — `_traverseScopes()` у `scope-selector.js` — коміт `d7eddb4`
- `[x]` **п. 4.10** — `_handleFieldAction()` у `base.js` — коміт `d7eddb4`
- `[x]` **п. 4.18** — `_extractErrorMessage()` у `action-executor.js` — коміт `d7eddb4`
- `[x]` **п. 4.19** — `_applyConfig()` у `settings-editor.js` — коміт `d7eddb4`
- `[x]` **п. 5.3** — `Constants.SELECTORS.IFRAME` у `toolbar.js` — ✅ вже використовується
- `[ ]` **п. 2.22** — `repeater.js::initSortable()` stub — тіло порожнє, `eslint-disable` додано; реалізація відкладена
- `[x]` **п. 2.23** — `_logToServer()` і `_isCritical()` видалено з `error-handler.js` — коміт `d7eddb4`
- `[ ]` **п. 2.25** — мертві утиліти: `url-builder.js` (5), `cookie-manager.js` (6), `permissions.js` (4), `loading.js` (2)
- `[x]` **п. 2.26** — `getPublicationTitle()` видалено з `metadata-loader.js` — коміт `d7eddb4`
- `[x]` **п. 4.20** — `_injectCSS` дублікат видалено з `preview-manager.js` — коміт `d7eddb4`

### Крок 10 — JS abstractions

> Більші JS рефакторинги з залежностями між собою.

- `[ ]` **п. 8.11** — витягти `_debounce(fn, delay)` в `utils/debounce.js` (використовується в settings-editor + palette-renderer)
- `[ ]` **п. 8.1 + 8.2** — iframe retry-polling → спільна `waitForIframeReady()` → `Promise`
- `[ ]` **п. 8.9** — `settings-editor.js:306` `setTimeout` race → `panelShown` event
- `[x]` **п. 4.17 + 6.6** — `base-palette-renderer.js` shared mixin (accordion + dirty state + confirm dialog) — `598daba`
- `[ ]` **п. 6.7** — `window.confirm()` / `alert()` → `Magento_Ui/js/modal/confirm`
- `[x]` **п. 7.2** — `AdminToolbar.php` 11 deps → 8: URL deps переміщені в `ToolbarUrlProvider`
- `[ ]` **п. 4.6** — `ValueInterface[]` GraphQL mapping → `toGraphQlValue()` на `AbstractMutationResolver` *(перевірити чи не закрито з 6.4)*
- `[ ]` **п. 7.3** — `CssGenerator` → `ColorPipeline` *(перевірити чи не закрито з 6.3)*
- `[ ]` **п. 2.24** — `highlight-toggle.js` — реалізувати або прибрати кнопку

### Крок 11 — Low priority sweep

> Все що залишилось: magic numbers, LESS змінні, коментарі, дрібний dead code.

- `[ ]` **п. 5.4** — magic z-index `10001`/`10002` → LESS змінна
- `[ ]` **п. 5.6** — breakpoints `'768px'`/`'375px'` → константи у `device-switcher.js`
- `[ ]` **п. 5.7** — magic числа в `palette-section-renderer.js` (220, 50, 150, 500)
- `[ ]` **п. 5.8** — `'--color-brand-'` → class constant у `CssGenerator.php`
- `[ ]` **п. 5.9** — `'--color-'` prefix → константа у `color.js`
- `[ ]` **п. 5.10** — `transition: 'width 0.3s ease'` → CSS клас у `device-switcher.js`
- `[ ]` **п. 5.13** — `rgba(255, 255, 255, 0.2)` → `@bte-field-border-translucent` LESS variable
- `[ ]` **п. 5.14** — `'Courier New', monospace` → `@bte-code-font` LESS variable
- `[ ]` **п. 5.15** — `min-width: 220px` → LESS variable у `_mixins.less`
- `[ ]` **п. 5.16** — `max-height: 75vh` → LESS variable у `_mixins.less`
- `[ ]` **п. 5.17** — `padding-right: 36px` → LESS variable у `_publication-selector.less`
- `[ ]` **п. 2.30** — legacy CSS у `_theme-editor-panel.less:307–357`
- `[ ]` **п. 2.31** — duplicate LESS variables у `_variables.less`
- `[ ]` **п. 7.6** — `AdminTokenGenerator` надмірне debug logging
- `[ ]` **п. 7.7** — `UserResolver` info log на кожному auth
- `[ ]` **п. 7.8** — мішаниця мов у коментарях → уніфікувати на EN
- `[ ]` **п. 7.9** — `strpos` chain → lookup table у `AdminToolbar.php`
- `[ ]` **п. 8.3** — `setTimeout(fn, 0)` → `Promise.resolve().then(fn)` у `toolbar.js`
- `[ ]` **п. 8.4 + 8.6** — outside-click `setTimeout(fn, 10)` → `requestAnimationFrame` + спільний `onOutsideClick()`
- `[ ]` **п. 8.5 + 8.8** — flag cleanup `setTimeout(fn, 50)` → `Promise.resolve().then(fn)`
- `[ ]` **п. 8.7** — inline debounce timers → локальний `_debounce()` у `palette-section-renderer.js`
- `[ ]` **п. 8.10** — додати коментар `/* intentional UX delay */` до reload timeout
- `[ ]` **п. 8.12** — документувати CSS animation sync timeouts у `navigation.js`
- `[ ]` **п. 8.13** — документувати intentional delay у `toolbar-toggle.js`

### Виконано поза кроками (нові рефакторинги)
25. `[x]` **п. 2.19** — Замінити хардкодовані рядки на Constants у 17 production-файлах — `365a3dd`
26. `[x]` **п. 4.21** — Авто-генерація font_palette role fields із `font_palettes.fonts[]` — `a3238b8`
27. `[x]` **п. 4.8** — css-manager уніфікований: `panel/css-manager.js` видалено, злито з `editor/css-manager.js` — `5a97541` `8e59dac`
28. `[x]` **publication-state singleton** — `utils/core/publication-state.js` як єдине джерело `currentStatus` — `26b3ee9` `65a4ede`
29. `[x]` **configManager scope source** — `utils/core/config-manager.js` як єдине джерело scope/scopeId/themeId — `5b62abf` `cdbdfc1`
30. `[x]` **url-restoration module** — `utils/browser/url-restoration.js` витягнутий як AMD-модуль — `df54e47` `6f9f7dd`
31. `[x]` **getIframeUrl()** — витягнутий в `AdminToolbar::getIframeUrl()` — `9a96e9c`
32. `[x]` **getToolbarConfig() cleanup** — видалено pre-populated publications fields — `f35b5d4`
33. `[x]` **PHP 8.4 nullable types** — explicit nullable types для сумісності — `3946582`

---

_Повернутися до [Refactoring README](README.md) | [Dashboard](../DASHBOARD.md)_
