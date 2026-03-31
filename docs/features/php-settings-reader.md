# PHP Settings Reader

**GitHub issue:** #13  
**Date:** March 20, 2026  
**Status:** ✅ Завершено  

---

## Опис фічі

Можливість читати значення налаштувань теми безпосередньо з PHP-коду (`.phtml` шаблонів) через автоматично інжектовану змінну `$breezeThemeEditor`.

**Usecase:**
```php
// В .phtml шаблоні — без потреби явного inject'у через ViewModel
if ($breezeThemeEditor?->is('hero/layout', 'fullwidth')) {
    // рендерити повноширинний hero
}

$headerStyle = $breezeThemeEditor?->get('header/style'); // 'sticky' | 'static' | ...
```

Налаштування в `settings.json` може не мати `property` — воно не генерує CSS, але доступне з PHP:

```json
{
  "id": "layout",
  "type": "select",
  "label": "Hero Layout",
  "default": "contained",
  "options": [
    {"value": "contained", "label": "Contained"},
    {"value": "fullwidth", "label": "Full Width"}
  ]
}
```

---

## Як Magento інжектує `$secureRenderer`

Механізм, який ми повторюємо:

### 1. Клас `Magento\Framework\View\TemplateEngine\Php`

```php
class Php implements TemplateEngineInterface
{
    private array $blockVariables = [];

    public function __construct(
        ObjectManagerInterface $helperFactory,
        array $blockVariables = []   // ← інжектується через di.xml
    ) {
        $this->blockVariables = $blockVariables;
    }

    public function render(BlockInterface $block, $fileName, array $dictionary = [])
    {
        $dictionary = array_merge($this->blockVariables, $dictionary);
        extract($dictionary, EXTR_SKIP);  // ← стає локальними PHP змінними
        include $fileName;               // ← шаблон вже має $secureRenderer, $escaper, etc.
    }
}
```

### 2. Реєстрація через `di.xml`

`/vendor/magento/magento2-base/app/etc/di.xml`:
```xml
<type name="Magento\Framework\View\TemplateEngine\Php">
    <arguments>
        <argument name="blockVariables" xsi:type="array">
            <item name="secureRenderer" xsi:type="object">
                Magento\Framework\View\Helper\SecureHtmlRenderer\Proxy
            </item>
            <item name="escaper" xsi:type="object">Magento\Framework\Escaper</item>
        </argument>
    </arguments>
</type>
```

### 3. Proxy (lazy loading)

Magento автоматично генерує `\Proxy` клас під час `setup:di:compile`. Він відкладає реальну ініціалізацію об'єкта до першого виклику методу — критично важливо, бо `TemplateEngine\Php` створюється на початку бутстрапу.

**Важливо:** реєструємо тільки в `etc/frontend/di.xml`, щоб не засмічувати adminhtml шаблони.

---

## Архітектура

```
etc/frontend/di.xml
    └── blockVariables['breezeThemeEditor']
            = Swissup\BreezeThemeEditor\View\Helper\BreezeThemeEditor\Proxy
                    │
                    ▼ (перший виклик методу)
    Swissup\BreezeThemeEditor\View\Helper\BreezeThemeEditor
            │
            ├── StoreManagerInterface      → поточний storeId
            ├── ThemeResolver              → themeId по storeId
            ├── ScopeFactory               → Scope(stores, storeId)
            ├── ValueInheritanceResolver   → resolve value з DB + theme/scope chain
            ├── ConfigProvider             → default з settings.json
            └── StatusProvider             → statusId для PUBLISHED
```

### Метод `get(string $path): ?string`

```
$path = 'hero/layout'
    → $sectionCode = 'hero', $settingCode = 'layout'
    → ValueInheritanceResolver::resolveSingleValue(...)
    → повертає значення з DB або default з config
```

### Метод `is(string $path, string $value): bool`

```
$breezeThemeEditor->is('hero/layout', 'fullwidth')
    → $this->get('hero/layout') === 'fullwidth'
```

---

## Файли для реалізації

### Нові файли

| Файл | Призначення |
|------|-------------|
| `View/Helper/BreezeThemeEditor.php` | Головний helper: `get()`, `is()` |

### Змінені файли

| Файл | Зміна |
|------|-------|
| `etc/frontend/di.xml` | Додати `blockVariables` entry з Proxy |

---

## Детальний план реалізації

### Крок 1 — `View/Helper/BreezeThemeEditor.php`

```php
<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\View\Helper;

use Magento\Store\Model\StoreManagerInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

class BreezeThemeEditor
{
    /** @var array<string, string|null> */
    private array $cache = [];

    public function __construct(
        private StoreManagerInterface $storeManager,
        private ThemeResolver $themeResolver,
        private ScopeFactory $scopeFactory,
        private ValueInheritanceResolver $valueInheritanceResolver,
        private ConfigProvider $configProvider,
        private StatusProvider $statusProvider
    ) {}

    /**
     * Отримати значення налаштування.
     *
     * @param string $path  Формат: 'section_code/setting_code'
     * @return string|null  Значення або null якщо не знайдено і немає default
     */
    public function get(string $path): ?string
    {
        if (array_key_exists($path, $this->cache)) {
            return $this->cache[$path];
        }

        $this->cache[$path] = $this->resolve($path);
        return $this->cache[$path];
    }

    /**
     * Перевірити чи налаштування має вказане значення.
     *
     * @param string $path   Формат: 'section_code/setting_code'
     * @param string $value  Значення для порівняння
     */
    public function is(string $path, string $value): bool
    {
        return $this->get($path) === $value;
    }

    private function resolve(string $path): ?string
    {
        [$sectionCode, $settingCode] = $this->parsePath($path);
        if (!$sectionCode || !$settingCode) {
            return null;
        }

        try {
            $storeId   = (int) $this->storeManager->getStore()->getId();
            $themeId   = $this->themeResolver->getThemeIdByStoreId($storeId);
            $scope     = $this->scopeFactory->create('stores', $storeId);
            $statusId  = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);

            $result = $this->valueInheritanceResolver->resolveSingleValue(
                $themeId, $scope, $statusId, $sectionCode, $settingCode
            );

            return $result['value'];
        } catch (\Exception) {
            return null;
        }
    }

    /** @return array{string, string} */
    private function parsePath(string $path): array
    {
        $parts = explode('/', $path, 2);
        return count($parts) === 2 ? $parts : ['', ''];
    }
}
```

### Крок 2 — `etc/frontend/di.xml`

Додати до існуючого файлу:

```xml
<!-- Inject $breezeThemeEditor into all frontend .phtml templates -->
<type name="Magento\Framework\View\TemplateEngine\Php">
    <arguments>
        <argument name="blockVariables" xsi:type="array">
            <item name="breezeThemeEditor" xsi:type="object">
                Swissup\BreezeThemeEditor\View\Helper\BreezeThemeEditor\Proxy
            </item>
        </argument>
    </arguments>
</type>
```

### Крок 3 — Proxy генерація

Після реалізації запустити:
```bash
bin/magento setup:di:compile
```

Magento автоматично згенерує:
```
generated/code/Swissup/BreezeThemeEditor/View/Helper/BreezeThemeEditor/Proxy.php
```

---

## API для розробників тем

### Налаштування без CSS-виводу (тільки для PHP)

```json
{
  "id": "my_section",
  "name": "Layout Settings",
  "settings": [
    {
      "id": "hero_layout",
      "type": "select",
      "label": "Hero Layout",
      "default": "contained",
      "options": [
        {"value": "contained", "label": "Contained"},
        {"value": "fullwidth",  "label": "Full Width"}
      ]
    }
  ]
}
```

Відсутність `property` → налаштування не генерує CSS. Це вже підтримується `CssGenerator` (поле просто пропускається).

### Використання в шаблоні

```php
<?php
// Простий рядковий варіант
$layout = $breezeThemeEditor?->get('my_section/hero_layout');

// Перевірка конкретного значення
if ($breezeThemeEditor?->is('my_section/hero_layout', 'fullwidth')) {
    // повноширинний hero
}

// Switch по значенню
switch ($breezeThemeEditor?->get('header/style')) {
    case 'sticky':   /* ... */ break;
    case 'static':   /* ... */ break;
    default:         /* ... */
}
```

**Nullsafe оператор `?->`** — стандартний PHP 8 синтаксис. Захищає від `null` у разі якщо DI не зміг створити helper (малоймовірно, але безпечно).

---

## Кешування

| Рівень | Що кешується | TTL |
|--------|--------------|-----|
| In-memory (`$this->cache`) | Значення per-request | Час запиту |
| Magento block cache | Блоки що використовують `$breezeThemeEditor` | Залежить від блоку |

**Важливо щодо block cache:** якщо `.phtml` шаблон рендериться через кешований блок (наприклад `ThemeCssVariables`), то `$breezeThemeEditor->get()` буде викликано один раз і результат кешується разом з HTML блоку. Розробник теми повинен включити значення налаштування в `getCacheKeyInfo()` свого блоку якщо від нього залежить вивід.

---

## Що НЕ входить в scope

- Адмінка — `blockVariables` реєструється тільки в `etc/frontend/di.xml`
- Draft-значення — завжди читаються `PUBLISHED` значення
- Запис/зміна значень — тільки читання
- Підтримка scope `websites` і `default` — завжди `stores/{currentStoreId}`

---

## Тести

| Файл | Що тестувати |
|------|--------------|
| `Test/Unit/View/Helper/BreezeThemeEditorTest.php` | `get()`, `is()`, `parsePath()`, кеш, fallback на default, exception handling |

### Сценарії

1. `get('section/field')` → повертає значення з DB
2. `get('section/field')` → fallback до `default` з `settings.json` якщо в DB немає
3. `get('section/field')` → `null` якщо немає ні в DB ні в config
4. `is('section/field', 'value')` → `true` / `false`
5. `get('section/field')` двічі → другий виклик з cache (без зайвих DB запитів)
6. `get('invalid')` → `null` (некоректний path без `/`)
7. Exception в `resolve()` → повертає `null`, не кидає виключення вгору

---

## Порядок впровадження

1. `View/Helper/BreezeThemeEditor.php` — реалізація класу
2. `etc/frontend/di.xml` — реєстрація в `blockVariables`
3. `bin/magento setup:di:compile` — генерація Proxy
4. `Test/Unit/View/Helper/BreezeThemeEditorTest.php` — юніт-тести
5. Оновити `docs/features/README.md` — статус фічі
