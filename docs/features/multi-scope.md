# Multi-Scope Support

**Статус:** ✅ Реалізація завершена, всі 512 Unit тестів проходять (2 skipped)  
**Дата плану:** 9 березня 2026  
**Дата завершення:** 10 березня 2026

---

## Мета

Додати підтримку **multi-scope редагування** у Breeze Theme Editor: адміни можуть зберігати налаштування теми на рівні **Default / Website / Store View** (замість лише Store View як зараз).

---

## Прийняті рішення

| Питання | Рішення |
|---|---|
| GraphQL API | `storeId: Int!` → `scopeId: Int! + scope: ScopeEnum!`, `themeId` — видалити скрізь |
| DB колонка | Залишити `store_id` (тепер = scopeId: 0 / websiteId / storeViewId), додати `scope VARCHAR(16)` |
| FK `store_id → store` | Видалити (0 та website_id не є store view ID) |
| Inheritance при читанні | default → websites → stores (як `core_config_data`) |
| Publication таблиця | Теж отримує `scope` колонку + прибрати FK |
| ConfigFromPublication | Тільки `publicationId` — решта береться з publication record |
| CopyFromStore | `fromScope/fromScopeId` + `toScope/toScopeId` |
| Iframe при Default scope | Показувати перший активний store view |
| Scope selector UI | Тільки глобальний selector у toolbar, без per-field "Use Default" індикаторів |

### Семантика нових полів

```
scope='default'  → store_id = 0
scope='websites' → store_id = website_id
scope='stores'   → store_id = store_view_id  (поточна поведінка)
```

### Чому `scope` колонка, а не `website_id` колонка

MySQL UNIQUE constraint: `NULL != NULL`, тому для default scope `(website_id=NULL, store_id=NULL)` можна вставити дублікати — унікальність ламається. Підхід з `scope` + NOT NULL полями вирішує це, точно як у Magento `core_config_data`.

### Inheritance chain при читанні

Для store view X у website W:
1. Load `scope='default', store_id=0` (база)
2. Overlay `scope='websites', store_id=W` (website override)
3. Overlay `scope='stores', store_id=X` (найвищий пріоритет)

При **записі** — пишемо точно в той scope який вибрано, без chain.

---

## Порядок реалізації

```
Крок 1  → DB schema (xml + whitelist)
Крок 2  → Data migration patch
Кроки 3-5 → ValueInterface + Model + Repository
Крок 6  → ValueService
Крок 7  → ValueInheritanceResolver  ← ключова зміна
Крок 8  → ThemeResolver
Крок 9  → StoreDataProvider
Крок 10 → AdminToolbar
Крок 11 → schema.graphqls
Крок 12 → Query resolvers
Крок 13-14 → Mutation resolvers + PublishService
Кроки 15-17 → JS frontend
Крок 18 → Фінальна перевірка
```

---

## Детальний план по кроках

### Крок 1 — `etc/db_schema.xml`

**Таблиця `breeze_theme_editor_value`:**
- Додати колонку `scope VARCHAR(16) NOT NULL DEFAULT 'stores'`
- Видалити `<constraint xsi:type="foreign" referenceId="FK_VALUE_STORE" .../>` (store_id більше не FK)
- У UNIQUE constraint `UNQ_ALL` — додати `scope` як першу колонку (перед `theme_id`)
- Оновити індекс `IDX_THEME_STORE_STATUS` — додати `scope`

**Таблиця `breeze_theme_editor_publication`:**
- Додати колонку `scope VARCHAR(16) NOT NULL DEFAULT 'stores'`
- Видалити `<constraint xsi:type="foreign" referenceId="FK_PUBLICATION_STORE" .../>`
- `store_id` залишається (тепер = scopeId)

---

### Крок 2 — `Setup/Patch/Data/MigrateValueScope.php` (новий файл)

```php
// Мігрувати всі існуючі рядки — вони всі є store scope
UPDATE breeze_theme_editor_value SET scope = 'stores'
UPDATE breeze_theme_editor_publication SET scope = 'stores'
```

---

### Крок 3 — `Api/Data/ValueInterface.php`

Додати:
```php
const SCOPE = 'scope';
public function getScope(): string;
public function setScope(string $scope): self;
```

---

### Крок 4 — `Model/Value.php`

Додати `getScope()`/`setScope()` геттер/сеттер (стандартний Magento `getData`/`setData`).

---

### Крок 5 — `Model/ValueRepository.php`

У `save()` та `saveMultiple()` — додати `ValueInterface::SCOPE => $value->getScope()` до `$row`.

---

### Крок 6 — `Model/Service/ValueService.php`

Змінити сигнатуру **всіх** методів: `int $storeId` → `string $scope, int $scopeId`:

```php
// До:
public function getValuesByTheme(int $themeId, int $storeId, int $statusId, ?int $userId): array

// Після:
public function getValuesByTheme(int $themeId, string $scope, int $scopeId, int $statusId, ?int $userId): array
```

У фільтрах SearchCriteria замінити:
```php
// До:
->addFilter('store_id', $storeId)

// Після:
->addFilter('scope', $scope)
->addFilter('store_id', $scopeId)
```

Аналогічно для `getSingleValue`, `deleteValues`.

`copyValues` отримує `fromScope/fromScopeId` + `toScope/toScopeId`:
```php
public function copyValues(
    int $fromThemeId, string $fromScope, int $fromScopeId, int $fromStatusId, ?int $fromUserId,
    int $toThemeId,   string $toScope,   int $toScopeId,   int $toStatusId,   ?int $toUserId,
    ?array $sectionCodes = null
): int
```

---

### Крок 7 — `Model/Service/ValueInheritanceResolver.php`

**Центральна зміна** — додати scope inheritance chain поверх існуючого theme inheritance.

**Новий приватний метод `buildScopeChain(string $scope, int $scopeId): array`:**

```php
// scope='default', scopeId=0  →  [['default', 0]]
// scope='websites', scopeId=1 →  [['default', 0], ['websites', 1]]
// scope='stores', scopeId=3   →  [['default', 0], ['websites', W], ['stores', 3]]
// де W = StoreManager::getStore($scopeId)->getWebsiteId()
```

**Оновити `resolveAllValues(int $themeId, string $scope, int $scopeId, int $statusId, ?int $userId)`:**
```
Для кожного scope у chain (від default до конкретного):
  Для кожної теми у theme hierarchy (від предка до дитини):
    Завантажити values по (themeId, scope, scopeId, statusId)
    Merge — пізніші перетирають раніші
Повернути merged result
```

Всі публічні методи оновити: `storeId` → `scope + scopeId`.

---

### Крок 8 — `Model/Utility/ThemeResolver.php`

Додати метод `getThemeIdByScope(string $scope, int $scopeId): int`:
- `scope='stores'`   → існуюча логіка `getThemeIdByStoreId($scopeId)`
- `scope='websites'` → `getWebsite($scopeId)->getDefaultStore()->getId()` → `getThemeIdByStoreId(...)`
- `scope='default'`  → `getDefaultWebsite()->getDefaultGroup()->getDefaultStore()->getId()` → `getThemeIdByStoreId(...)`

---

### Крок 9 — `Model/Provider/StoreDataProvider.php`

Оновити `getHierarchicalStores()` — **на початок масиву** додати Default entry:
```php
[
    'type'             => 'default',
    'scope'            => 'default',
    'scopeId'          => 0,
    'name'             => 'All Store Views',
    'previewStoreId'   => $firstActiveStore->getId(),
    'previewStoreCode' => $firstActiveStore->getCode(),
]
```

Для кожного website — додати `'scope' => 'websites'`, `'scopeId' => $website->getId()`, `'previewStoreId'` (default store of website).  
Для кожного store view — додати `'scope' => 'stores'`, `'scopeId' => $store->getId()`.

---

### Крок 10 — `ViewModel/AdminToolbar.php`

- Перейменувати `getStoreId()` → `getScopeId()`, додати `getScope()`
- `getToolbarConfig()`:
  - `'storeId'` → `'scopeId'`
  - Додати `'scope'`

---

### Крок 11 — `etc/schema.graphqls`

**Додати enum:**
```graphql
enum BreezeThemeEditorScopeCode {
    default
    websites
    stores
}
```

**Всі Queries** — замінити `storeId: Int! / themeId: Int` на `scope: BreezeThemeEditorScopeCode! / scopeId: Int!`:
- `breezeThemeEditorConfig`
- `breezeThemeEditorValues`
- `breezeThemeEditorCompare`
- `breezeThemeEditorPublications`
- `breezeThemeEditorPresets`
- `getThemeEditorCss`

**`breezeThemeEditorConfigFromPublication`** — залишити тільки `publicationId: Int!`:
```graphql
breezeThemeEditorConfigFromPublication(
    publicationId: Int!
): BreezeThemeEditorConfig!
```

**Всі Input types:**
- `SaveBreezeThemeEditorValuesInput`: `storeId+themeId` → `scope+scopeId`
- `SaveBreezeThemeEditorValueInput`: те саме
- `PublishBreezeThemeEditorInput`: те саме
- `ApplyBreezeThemeEditorPresetInput`: те саме
- `ResetBreezeThemeEditorToDefaultsInput`: те саме
- `ImportBreezeThemeEditorSettingsInput`: те саме
- `CopyBreezeThemeEditorFromStoreInput`: `fromStoreId/toStoreId` → `fromScope/fromScopeId/toScope/toScopeId`

**Top-level mutations** без input:
- `discardBreezeThemeEditorDraft`: `storeId: Int! / themeId: Int` → `scope: BreezeThemeEditorScopeCode! / scopeId: Int!`
- `discardBreezeThemeEditorPublished`: те саме
- `exportBreezeThemeEditorSettings`: те саме

**`BreezeThemeEditorPublication` type** — додати `scope: String!`, перейменувати `storeId` → `scopeId`.

---

### Крок 12 — Query Resolvers

Для кожного з `Config.php`, `Values.php`, `Compare.php`, `Publications.php`, `Presets.php`, `GetCss.php`:

```php
// До:
$storeId = (int)$args['storeId'];
$themeId = isset($args['themeId']) && $args['themeId']
    ? (int)$args['themeId']
    : $this->themeResolver->getThemeIdByStoreId($storeId);

// Після:
$scope   = $args['scope'];
$scopeId = (int)$args['scopeId'];
$themeId = $this->themeResolver->getThemeIdByScope($scope, $scopeId);
```

Для `ConfigFromPublication.php`:
```php
// До: storeId + themeId з args
// Після:
$publicationId = (int)$args['publicationId'];
$publication = $this->publicationRepository->getById($publicationId);
$scope   = $publication->getScope();
$scopeId = (int)$publication->getScopeId(); // store_id column
$themeId = $publication->getThemeId();
// storeId та themeId з args — видалити
```

---

### Крок 13 — Mutation Resolvers

**`AbstractSaveMutation::prepareBaseParams()`:**
```php
// До: storeId + optional themeId
// Після:
$scope   = $input['scope'];
$scopeId = (int)$input['scopeId'];
$themeId = $this->themeResolver->getThemeIdByScope($scope, $scopeId);

return [
    'userId'     => $userId,
    'scope'      => $scope,
    'scopeId'    => $scopeId,
    'themeId'    => $themeId,
    'statusCode' => $statusCode,
    'statusId'   => $statusId,
];
```

**У кожному mutation що будує `$valueModel`** — додати `setScope(...)`:
- `SaveValues.php`
- `SaveValue.php`
- `SavePaletteValue.php`
- `ApplyPreset.php`
- `ResetToDefaults.php`

**`DiscardDraft.php`, `DiscardPublished.php`** — `$storeId = (int)$args['storeId']` → `$scope/$scopeId = $args[...]`

**`Publish.php`** — передати `$scope`, `$scopeId` у `PublishService::publish()`

**`CopyFromStore.php`** — `fromStoreId/toStoreId` → `fromScope/fromScopeId/toScope/toScopeId`

---

### Крок 14 — `Model/Service/PublishService.php`

```php
// До:
public function publish(int $themeId, int $storeId, int $userId, string $title, ?string $description): array

// Після:
public function publish(int $themeId, string $scope, int $scopeId, int $userId, string $title, ?string $description): array
```

При створенні publication record — записати `scope` колонку.

---

### Кроки 15-17 — JavaScript

**`scope-selector.html`:**
1. Додати "All Store Views" entry на початку (Default scope)
2. Website рядки — тепер клікабельні (вибір Website scope), не лише collapsible
3. Store view рядки — без змін у зовнішньому вигляді

**`scope-selector.js`:**

Замінити подію `storeChanged` на `scopeChanged`:
```js
// Подія несе: (scope, scopeId, previewStoreId, previewStoreCode)
$(this.element).trigger('scopeChanged', [scope, scopeId, previewStoreId, previewStoreCode]);
```

При виборі Default/Website — iframe переключати на `previewStoreId` (перший активний store view відповідного рівня), але `scope`/`scopeId` для GraphQL — по вибраному рівню.

При виборі Store View — `previewStoreId === scopeId`.

**`toolbar.js`:**
- Слухати `scopeChanged` замість `storeChanged`
- Передавати `previewStoreCode` для оновлення iframe URL

**`settings-editor.js`:**
- Слухати `scopeChanged` замість `storeChanged`
- Зберігати `this.scope` + `this.scopeId` замість `this.storeId`
- Передавати `scope`+`scopeId` у всі GraphQL запити

**GraphQL JS файли** — замінити `storeId` → `scopeId` + додати `scope` у:
- `get-config.js`
- `save-values.js`
- `save-value.js`
- `discard-draft.js`
- `save-palette-value.js`

**`config-manager.js`** (глобальний стан):
- Зберігати `scope` + `scopeId` замість лише `storeId`

---

### Крок 18 — `etc/db_schema_whitelist.json`

Оновити whitelist — додати нову колонку `scope` для таблиць:
- `breeze_theme_editor_value`
- `breeze_theme_editor_publication`

---

## Файли що потребують змін

### PHP
| Файл | Тип змін |
|------|----------|
| `etc/db_schema.xml` | Нова колонка scope, видалити FK |
| `etc/db_schema_whitelist.json` | Оновити whitelist |
| `Setup/Patch/Data/MigrateValueScope.php` | **Новий файл** |
| `Api/Data/ValueInterface.php` | Додати SCOPE константу + геттер/сеттер |
| `Model/Value.php` | Додати getScope/setScope |
| `Model/ValueRepository.php` | Додати scope до save/saveMultiple |
| `Model/Service/ValueService.php` | scope+scopeId замість storeId |
| `Model/Service/ValueInheritanceResolver.php` | Scope chain inheritance |
| `Model/Service/PublishService.php` | Додати scope параметр |
| `Model/Utility/ThemeResolver.php` | Новий метод getThemeIdByScope |
| `Model/Provider/StoreDataProvider.php` | Default+Website entries у hierarchy |
| `ViewModel/AdminToolbar.php` | scopeId+scope замість storeId |
| `etc/schema.graphqls` | Новий enum, перейменування скрізь |
| `Model/Resolver/Query/Config.php` | scope+scopeId |
| `Model/Resolver/Query/Values.php` | scope+scopeId |
| `Model/Resolver/Query/Compare.php` | scope+scopeId |
| `Model/Resolver/Query/ConfigFromPublication.php` | Лише publicationId |
| `Model/Resolver/Query/Publications.php` | scope+scopeId |
| `Model/Resolver/Query/Presets.php` | scope+scopeId |
| `Model/Resolver/Query/GetCss.php` | scope+scopeId |
| `Model/Resolver/Mutation/AbstractSaveMutation.php` | prepareBaseParams оновлення |
| `Model/Resolver/Mutation/SaveValues.php` | setScope |
| `Model/Resolver/Mutation/SaveValue.php` | setScope |
| `Model/Resolver/Mutation/SavePaletteValue.php` | setScope |
| `Model/Resolver/Mutation/ApplyPreset.php` | setScope |
| `Model/Resolver/Mutation/ResetToDefaults.php` | setScope |
| `Model/Resolver/Mutation/DiscardDraft.php` | scope+scopeId |
| `Model/Resolver/Mutation/DiscardPublished.php` | scope+scopeId |
| `Model/Resolver/Mutation/Publish.php` | scope+scopeId → PublishService |
| `Model/Resolver/Mutation/CopyFromStore.php` | fromScope/fromScopeId/toScope/toScopeId |

### JavaScript
| Файл | Тип змін |
|------|----------|
| `view/adminhtml/web/js/editor/toolbar/scope-selector.js` | Default+Website scope, нова подія scopeChanged |
| `view/adminhtml/web/template/editor/scope-selector.html` | Default entry, Website як clickable |
| `view/adminhtml/web/js/editor/toolbar.js` | Слухати scopeChanged |
| `view/adminhtml/web/js/editor/panel/settings-editor.js` | scope+scopeId замість storeId |
| `view/adminhtml/web/js/graphql/queries/get-config.js` | scope+scopeId |
| `view/adminhtml/web/js/graphql/mutations/save-values.js` | scope+scopeId |
| `view/adminhtml/web/js/graphql/mutations/save-value.js` | scope+scopeId |
| `view/adminhtml/web/js/graphql/mutations/discard-draft.js` | scope+scopeId |
| `view/adminhtml/web/js/graphql/mutations/save-palette-value.js` | scope+scopeId |
| `view/adminhtml/web/js/editor/utils/core/config-manager.js` | scope+scopeId у стані |
