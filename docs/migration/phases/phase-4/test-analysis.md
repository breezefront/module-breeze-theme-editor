# Test Analysis — JS Test Classification (Phase 4 Step 1)

**Дата:** 24 лютого 2026  
**Автор:** Аудит Phase 4  
**Статус:** ✅ Завершено

---

## Класифікація

| Категорія | Опис | Дія |
|-----------|------|-----|
| **A** | Міграція JS→PHP завершена (PHP тест існує і повністю покриває) | Позначити obsolete |
| **B** | Дублює PHP частково, але JS версія має унікальну цінність (UI/integration) | Залишити обидва |
| **C** | Унікальна функціональність — UI/DOM/палітра/кольори, PHP не може протестувати | Залишити як є |

---

## Adminhtml JS Tests (14 файлів)

| № | Файл | Категорія | Обґрунтування |
|---|------|-----------|---------------|
| 1 | `admin-auth-manager-test.js` | **B** | Тестує Bearer token у localStorage + ConfigManager. PHP аналог: `AdminTokenGeneratorTest.php`. JS тест перевіряє runtime behavior (чи token реально в localStorage), PHP тестує генерацію. Обидва мають цінність. |
| 2 | `color-utils-test.js` | **C** | Тестує утиліти кольорів (HEX↔RGB, parse). Є і в PHP (`ColorConverterTest`, `ColorFormatterTest`), але JS тест валідує frontend-specific поведінку. |
| 3 | `critical-fixes-test.js` | **C** | Тести критичних UI fixes. Специфічно для frontend DOM — PHP не може перевірити. |
| 4 | `css-preview-manager-palette-test.js` | **C** | Тести palette injection у CSS preview (var() references, RGB формат). Чисто DOM/CSS логіка. PHP не може перевірити. *(Доданий 23.02)* |
| 5 | `navigation-widget-test.js` | **C** | Тестує навігацію в adminhtml UI. Специфічно для RequireJS widget. |
| 6 | `page-selector-sync-test.js` | **C** | Синхронізація page selector з iframe URL. Чисто UI/DOM. |
| 7 | `palette-reset-behavior-test.js` | **C** | Pure-logic тести guard-умов у palette-section-renderer (_justChanged, hasDirtyChanges). Ізольована логіка. *(Доданий 23.02)* |
| 8 | `panel-close-integration-test.js` | **C** | Тести закриття панелі. UI/DOM integration. |
| 9 | `panel-events-test.js` | **C** | Тести подій панелі (відкриття, закриття, resize). DOM events. |
| 10 | `panel-integration-test.js` | **C** | Integration тести повного flow панелі налаштувань. |
| 11 | `panel-positioning-test.js` | **C** | Позиціонування панелі відносно iframe. DOM/CSS. |
| 12 | `publication-events-alignment-test.js` | **C** | Alignment подій publication selector. UI flow. |
| 13 | `selector-alignment-test.js` | **C** | Alignment publication selector. DOM/CSS. |
| 14 | `url-navigation-persistence-test.js` | **C** | Персистенція URL навігації. localStorage + URL manipulation. |

**Підсумок Adminhtml:** 1×B, 13×C, 0×A

---

## Frontend JS Tests (23 файли)

| № | Файл | Категорія | Обґрунтування |
|---|------|-----------|---------------|
| 1 | `auth-manager-test.js` | **B** | Тестує token storage/retrieval. PHP аналог: `AdminTokenGeneratorTest.php`. JS тест перевіряє frontend localStorage behavior. Обидва мають цінність. |
| 2 | `badge-renderer-test.js` | **C** | Рендеринг badges у UI. Чисто DOM. |
| 3 | `cascade-behavior-test.js` | **C** | Каскадна поведінка полів (inheritance chain). Специфічна UI логіка. |
| 4 | `color-field-palette-ref-test.js` | **C** | Palette references у color fields. DOM + JS логіка. |
| 5 | `color-popup-test.js` | **C** | Color picker popup. DOM/UI. |
| 6 | `color-renderer-test.js` | **C** | Рендеринг кольорових полів. DOM. |
| 7 | `color-utils-rgb-wrapper-test.js` | **C** | RGB wrapper утиліта. JS-специфічна логіка. |
| 8 | `color-utils-test.js` | **C** | Color utils (HEX↔RGB parse). Frontend реалізація (відмінна від PHP). |
| 9 | `css-manager-test.js` | **C** | CSS injection у iframe. DOM/style management. |
| 10 | `edit-restrictions-test.js` | **C** | Обмеження редагування (publication mode). UI behavior. |
| 11 | `error-handling-test.js` | **B** | Тестує GraphQL client error handling. PHP аналог: `ValueServiceTest.php` (частково). JS тест перевіряє frontend GraphQL client — відмінна від PHP логіка. |
| 12 | `field-badges-reset-test.js` | **C** | Скидання badge-станів полів. DOM. |
| 13 | `live-preview-test.js` | **C** | Live CSS preview у iframe. DOM/iframe. |
| 14 | `media-attributes-test.js` | **C** | Media attributes (responsive breakpoints). DOM. |
| 15 | `mode-switching-test.js` | **C** | Switching між DRAFT/PUBLICATION/VIEW mode. UI state machine. |
| 16 | `palette-format-mapping-test.js` | **C** | Format mapping для palette values (hex/rgb/hsl). JS логіка. |
| 17 | `palette-graphql-test.js` | **B** | GraphQL мутації палітри. PHP аналоги: `ValuesTest.php`, `SavePaletteValueTest.php`. JS тест перевіряє структуру JS-модулів (не backend логіку). |
| 18 | `palette-integration-test.js` | **C** | Integration тест palette (вибір кольору → preview → reset). UI flow. |
| 19 | `palette-manager-test.js` | **C** | Palette manager (load, select, reset). UI/state. |
| 20 | `palette-preset-disabled-test.js` | **C** | Поведінка при вимкненому preset. UI logic. |
| 21 | `palette-section-renderer-test.js` | **C** | Рендеринг секцій палітри. DOM. |
| 22 | `panel-integration-test.js` | **C** | Integration тест панелі налаштувань у frontend контексті. |
| 23 | `publication-mode-test.js` | **B** | Publication mode behavior (CSS injection). PHP аналоги: `PublishTest.php`, `RollbackTest.php`. JS тест перевіряє DOM/CSS state — не backend. |

**Підсумок Frontend:** 4×B, 19×C, 0×A

---

## Зведена Таблиця

| Категорія | Adminhtml | Frontend | Всього | Дія |
|-----------|-----------|----------|--------|-----|
| **A** — Obsolete (міграція завершена) | 0 | 0 | **0** | — |
| **B** — Keep both (JS + PHP) | 1 | 4 | **5** | Залишити обидва |
| **C** — Keep JS only (унікальний) | 13 | 19 | **32** | Залишити як є |
| **ВСЬОГО** | **14** | **23** | **37** | |

---

## Висновки

### 1. Міграція JS→PHP не потрібна
Жоден JS тест не є повним дублікатом PHP. Всі 5 файлів категорії B мають унікальну цінність:
- Тестують frontend-specific поведінку (localStorage, DOM, UI state)
- PHP аналоги тестують backend логіку (генерацію, персистенцію, GraphQL resolvers)

### 2. Категорія A = 0 файлів
Немає тестів, які можна безпечно видалити.

### 3. Два нових тести (23.02.2026)
- `css-preview-manager-palette-test.js` — Category C, тестує Bug 3 fix (palette var() reference)
- `palette-reset-behavior-test.js` — Category C, pure-logic guards для focus-return cooldown

### 4. Рекомендація
- **Залишити всі 37 тест-файлів** — кожен має унікальне покриття
- Жодних видалень або міграцій не потрібно
- Наступний крок: запустити тести та валідувати що вони проходять

---

## Category B — Детальний Mapping

| JS Тест | PHP Аналог | Що тестує JS (унікально) | Що тестує PHP |
|---------|------------|--------------------------|---------------|
| `admin/admin-auth-manager-test.js` | `AdminTokenGeneratorTest.php` | Bearer token в localStorage, ConfigManager.get() runtime | Генерація токену, Magento service |
| `frontend/auth-manager-test.js` | `AdminTokenGeneratorTest.php` | Frontend token storage/retrieval, URL param parse | Backend token generation |
| `frontend/error-handling-test.js` | `ValueServiceTest.php` | GraphQL client JS error handling (_handleSuccess, _handleError) | Service-layer exceptions |
| `frontend/palette-graphql-test.js` | `ValuesTest.php`, `SavePaletteValueTest.php` | JS module structure (функція існує, правильний формат) | Backend GraphQL resolver logic |
| `frontend/publication-mode-test.js` | `PublishTest.php`, `RollbackTest.php` | DOM state (#bte-publication-css element), CSS injection | Backend publish/rollback logic |

---

_Документ створено автоматично в рамках Phase 4 — Test Audit & Validation._
