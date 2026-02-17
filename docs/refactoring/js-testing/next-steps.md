# JS Test Framework - Migration Summary

## ✅ Що зроблено

### 1. Документація
- ✅ Створено детальний план міграції: `js-test-framework-migration.md`
- ✅ Створено README з overview: `README.md`
- ✅ Проаналізовано існуючий код (frontend + admin)

### 2. Аналіз поточної ситуації

**Frontend тести (працюють):**
- 23 тест-файли (~4,700 рядків коду)
- Test framework з assertions API
- Mock система для GraphQL
- UI панель з кнопками Run/Clear/Copy
- Активація через `?jstest=true&autorun=true`

**Admin компоненти (готові до тестування):**
- ~80 JS файлів
- GraphQL client з Bearer auth
- Toolbar з navigation/selectors/panels
- Config manager, URL builder, color utils
- Auth manager, error handler

### 3. Виявлені ключові відмінності

| Аспект | Frontend | Admin |
|--------|----------|-------|
| **GraphQL Auth** | Custom header | Bearer token (localStorage) |
| **Context** | `$iframe()` | `$('#theme-editor-panel')` |
| **Endpoint** | `/graphql` | `/graphql` |
| **UI Container** | Body → after.body.start | Admin content area |

---

## 📋 Next Steps

### Immediate (Фаза 1: Інфраструктура - 2 години)

#### Крок 1: Створити структуру директорій (5 хв)
```bash
mkdir -p view/adminhtml/web/js/test/helpers
mkdir -p view/adminhtml/web/js/test/tests
mkdir -p view/adminhtml/templates/admin
```

#### Крок 2: Скопіювати test-framework.js (5 хв)
```bash
cp view/frontend/web/js/test/test-framework.js \
   view/adminhtml/web/js/test/test-framework.js
```
**Зміни:** Мінімальні або без змін (universal код).

#### Крок 3: Адаптувати test-runner.js (30 хв)
```bash
cp view/frontend/web/js/test/test-runner.js \
   view/adminhtml/web/js/test/test-runner.js
```
**Зміни:**
- Логування: додати "(Admin Context)"
- Селектори: перевірити що працюють в admin
- Без інших змін (має бути сумісним)

#### Крок 4: Створити mock-helper.js (45 хв)
**Файл:** `view/adminhtml/web/js/test/helpers/mock-helper.js`

**Критичний крок!** Mock система повинна:
- Підмінити `graphql/client.js` execute метод
- Перехоплювати запити за operation name
- Повертати mock дані або проксіювати до реального клієнта
- Працювати з Bearer token auth

**Стратегія:** Зберегти оригінальний `execute`, підмінити на wrapper.

#### Крок 5: Розширити Block/TestRunner.php (30 хв)
**Додати методи:**
```php
public function isAdminContext(): bool
protected function getAdminTestModules(): array
protected function getFrontendTestModules(): array
```

#### Крок 6: Створити admin template + layout (30 хв)
**Файли:**
- `view/adminhtml/templates/admin/test-runner.phtml` - UI панель
- `view/adminhtml/layout/breeze_editor_editor_index.xml` - додати блок

---

### Short-term (Фаза 2: Перший тест - 1 година)

#### Крок 7: Перевірка базової роботи (15 хв)
1. Відкрити: `/admin/breeze_editor/editor/index?jstest=true`
2. Перевірити console: чи завантажується test-runner
3. Перевірити UI: чи відображається панель
4. Debug помилки RequireJS

#### Крок 8: Створити перший тест (45 хв)
**Файл:** `view/adminhtml/web/js/test/tests/admin-auth-manager-test.js`

**Тести:**
1. Bearer token існує в localStorage
2. Config доступний через ConfigManager
3. GraphQL client працює з mock системою

**Додати в Block/TestRunner.php:**
```php
'Swissup_BreezeThemeEditor/js/test/tests/admin-auth-manager-test'
```

---

### Mid-term (Фаза 3-4: Розширення - по потребі)

#### Component Tests
- [ ] admin-config-manager-test.js
- [ ] admin-graphql-client-test.js
- [ ] admin-toolbar-test.js
- [ ] admin-palette-manager-test.js
- [ ] admin-css-manager-test.js

#### Integration Tests
- [ ] Full workflow test
- [ ] Multi-store switching test
- [ ] Publication flow test

---

## 🎯 Success Criteria

### Фаза 1 готова коли:
- ✅ Панель відображається на `/admin/...?jstest=true`
- ✅ Кнопки Run/Clear/Copy присутні
- ✅ Console не має критичних помилок
- ✅ RequireJS завантажує test-framework.js і test-runner.js

### Фаза 2 готова коли:
- ✅ Перший тест запускається
- ✅ Assertions працюють (pass/fail)
- ✅ Mock система перехоплює GraphQL запити
- ✅ UI показує зелений/червоний результат

### Повна готовність коли:
- ✅ 5+ тестів працюють
- ✅ Mock система покриває всі необхідні операції
- ✅ Toolbar має кнопку "JS Tests" (опціонально)
- ✅ Документація оновлена з прикладами

---

## 🚀 Quick Commands

### Створити структуру одразу
```bash
cd view/adminhtml/web/js
mkdir -p test/helpers test/tests

# Копіювати framework
cp ../../../frontend/web/js/test/test-framework.js test/
cp ../../../frontend/web/js/test/test-runner.js test/

# Створити порожні файли
touch test/helpers/mock-helper.js
touch test/tests/admin-auth-manager-test.js

cd -
```

### Перевірити що файли на місці
```bash
ls -la view/adminhtml/web/js/test/
ls -la view/adminhtml/web/js/test/helpers/
ls -la view/adminhtml/web/js/test/tests/
```

### Відкрити тести після імплементації
```
URL: http://localhost/admin/breeze_editor/editor/index?jstest=true&autorun=true
```

---

## 📝 Important Notes

### Mock Helper - критичний компонент
**Проблема:** Admin GraphQL client відрізняється від frontend (Bearer vs custom headers).

**Рішення:** Mock helper має бути специфічний для admin:
1. Підмінити `GraphQLClient.execute`
2. Перехоплювати запити **до** відправки
3. Матчити по `operationName` + `variables`
4. Повертати mock або проксіювати

**Референс:** `view/frontend/web/js/test/helpers/mock-helper.js` (але потрібна адаптація!)

### RequireJS paths
**Питання:** Чи потрібен `requirejs-config.js` для admin?

**Відповідь:** Ні, якщо paths стандартні:
- `Swissup_BreezeThemeEditor/js/test/test-framework` → auto-resolved
- `Swissup_BreezeThemeEditor/js/test/test-runner` → auto-resolved

**Але:** Якщо є проблеми - створити `view/adminhtml/requirejs-config.js`.

### Auto-run delay
Frontend використовує 2 секунди затримки перед autorun:
```javascript
setTimeout(runAllTests, 2000);
```

**Причина:** CSS Manager потребує ~1.5s для ініціалізації.

**Admin:** Можливо потрібна така ж затримка або більша (toolbar components initialization).

---

## ❓ Questions / Decisions Needed

### 1. Toolbar Button
**Питання:** Додавати кнопку "JS Tests" в toolbar?

**Варіанти:**
- A. URL параметр достатньо (`?jstest=true`)
- B. Кнопка в toolbar (як на frontend)
- C. Dropdown меню з опціями

**Рекомендація:** Почати з A (простіше), додати B пізніше.

### 2. Development Mode Only
**Питання:** Обмежити тести тільки для dev mode?

**Варіанти:**
- A. Так, перевіряти `$appState->getMode() === 'developer'`
- B. Ні, дозволити з URL параметром завжди
- C. ACL перевірка (тільки super admin)

**Рекомендація:** A + C (dev mode + super admin).

### 3. Test Organization
**Питання:** Як організувати тести?

**Поточний план:**
```
tests/
├── admin-auth-manager-test.js       # Auth
├── admin-config-manager-test.js     # Config
├── admin-toolbar-test.js            # UI
├── admin-palette-manager-test.js    # Business logic
└── ...
```

**Альтернатива:**
```
tests/
├── util/
│   ├── auth-manager-test.js
│   └── config-manager-test.js
├── ui/
│   └── toolbar-test.js
└── business/
    └── palette-manager-test.js
```

**Рекомендація:** Flat structure спочатку, рефакторити якщо >20 тестів.

---

## 🔗 References

### Code Locations
- **Frontend tests:** `view/frontend/web/js/test/`
- **Admin JS:** `view/adminhtml/web/js/`
- **GraphQL client:** `view/adminhtml/web/js/graphql/client.js`
- **Toolbar:** `view/adminhtml/web/js/editor/toolbar.js`
- **Test Block:** `Block/TestRunner.php`

### Documentation
- **Main plan:** [js-test-framework-migration.md](./js-test-framework-migration.md)
- **Refactoring docs:** [README.md](./README.md)

---

**Статус:** 📋 Ready to implement  
**Next Action:** Крок 1 - створити структуру директорій  
**Estimated Time:** ~4 години (Фаза 1 + Фаза 2)  
**Priority:** Medium (можна робити паралельно з розробкою компонентів)

---

**Створено:** 2026-02-13  
**Останнє оновлення:** 2026-02-13
